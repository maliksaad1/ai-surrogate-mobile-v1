import { AgentType } from "../types";
import { agentTools, AgentResult } from "./agentTools";
import { db } from "./db";

const apiKey = process.env.EXPO_PUBLIC_MISTRAL_API_KEY || '';
const MISTRAL_API_URL = "https://api.mistral.ai/v1/chat/completions";

// Helper to robustly extract JSON from text that might contain markdown or trailing chars
const extractJSONString = (text: string): string => {
    // 1. First, try to remove markdown code blocks if they exist
    let cleanText = text.replace(/```json/g, '').replace(/```/g, '');

    // 2. Find the first '{'
    let startIndex = cleanText.indexOf('{');
    if (startIndex === -1) return text; // No JSON object found, let JSON.parse fail naturally

    // 3. Brace Counting Logic to find the *correct* closing brace
    let balance = 0;
    let inString = false;
    let escaped = false;

    for (let i = startIndex; i < cleanText.length; i++) {
        const char = cleanText[i];

        if (escaped) {
            escaped = false;
            continue;
        }

        if (char === '\\') {
            escaped = true;
            continue;
        }

        if (char === '"') {
            inString = !inString;
            continue;
        }

        if (!inString) {
            if (char === '{') {
                balance++;
            } else if (char === '}') {
                balance--;
                if (balance === 0) {
                    // We found the matching closing brace for the root object
                    return cleanText.substring(startIndex, i + 1);
                }
            }
        }
    }

    // 4. Fallback: If we didn't find a perfectly balanced end (e.g. truncated), 
    // fall back to the last '}' found, as a last ditch effort.
    const lastIndex = cleanText.lastIndexOf('}');
    if (lastIndex > startIndex) {
        return cleanText.substring(startIndex, lastIndex + 1);
    }

    return cleanText;
};

export const generateSurrogateResponse = async (
    message: string,
    history: string[],
    fileData?: { mimeType: string; base64: string }
): Promise<{
    text: string;
    tone: string;
    language: string;
    agent: AgentType;
    payload?: any;
    payloadType?: 'EVENT' | 'DOC' | 'SEARCH_RESULT' | 'EMAIL' | 'PAYMENT' | 'FINANCE_REPORT';
}> => {
    if (!apiKey) {
        return {
            text: "I'm offline. Please check the Mistral API configuration.",
            tone: "Neutral",
            language: "en",
            agent: AgentType.CHAT,
        };
    }

    // Inject Context (Time, Existing Events, User Info)
    const now = new Date();
    const events = await db.getEvents();
    const contextEvents = events.map(e => `${e.date} ${e.time}: ${e.title}`).join("; ");
    const userCtx = await db.getUserContext();
    const userName = userCtx.name || "User";

    const SYSTEM_INSTRUCTION = `
You are the "AI Surrogate Human Clone", an intelligent agentic system.
Current Time: ${now.toLocaleString()}
User Name: ${userName}
Existing Events in DB: ${contextEvents || "None"}

**CAPABILITIES:**
- **Multimodal Integration**: You can view images, read PDFs, and **listen to audio messages**.
- **Audio Handling**: If the user sends an audio file, you MUST internally transcribe it to understand the intent. Respond naturally to the spoken content.
- **PDF Handling**: Review the content of attached PDF files to answer potential questions.

**AGENTS & TOOLS:**
1. **Schedule Agent**: Manage calendar.
   - Command: "create_event" | Params: title, time (e.g., "14:00"), date (YYYY-MM-DD), description.
   - Command: "list_events" | Params: none.
2. **Docs Agent**: Write content.
   - Command: "create_doc" | Params: title, content (markdown supported).
   - NOTE: If user provides a topic, draft the full content yourself.
3. **Email Agent**: Prepare emails for the user to send.
    - Command: "send_email" | Params: to (email address), subject, body.
    - **CRITICAL RULES for Email**:
      1. **Step 1: Identify Recipient**: You MUST have a valid email address. If the user only gives a name (e.g., "Bob"), you MUST ASK: "What is the email address for Bob?"
      2. **Step 2: Identify Context**: You MUST have a topic/context to write the email.
      3. **Step 3: Auto-Drafting**: **YOU MUST USE THE TOOL**. Do NOT just write the text in the response. You MUST call "activeAgent": "Email Agent" and providing the "command": "send_email" with the drafted content.
      4. **Signature**: YOU MUST sign off the email body with: "Best regards,n${userName}"
     5. **Formatting**: Use '\n' for newlines in the body.
     6. **Final Response**: When the draft is ready, explicitly tell the user: "I've drafted the email below. You can edit the text directly in the box, then tap Send."
4. **Search Agent**: Find info.
   - Command: "web_search" | Params: query.
5. **Payment Agent**: Simulates financial transactions.
   - Command: "make_payment" | Params: amount (number), recipient (string), description (string).
   - **Rule**: If the user says "Pay for X" (e.g., "Pay for Al Noor Hotel") but does NOT specify the amount, you MUST ASK: "What is the amount to be paid?"
   - Do not invent an amount.
6. **Financial Agent** (SECRET AGENT): Analyze markets and stocks.
   - Activates when user asks about stocks, crypto, markets, investment advice, or "yfinance" data.
   - **EXECUTION RULE**: You must calls the "analyze_stock" command.
   - Command: "analyze_stock"
   - Params: 
     - symbol (e.g., 'AAPL', 'BTC-USD', 'ETH-USD') - REQUIRED. Determine from user query.
   - **Persona**: Highly analytical, "Matrix" style hacker.
7. **Chat Agent**: General conversation.

**INSTRUCTIONS:**
- Determine the user's intent.
- If missing critical parameters (like email address, or payment amount), ask the user.
- If ready, select the appropriate Agent and Command.

**OUTPUT FORMAT (JSON ONLY):**
{
  "response": "Natural language response.",
  "detectedTone": "Emotion",
  "detectedLanguage": "en, ur, pa",
  "activeAgent": "AgentType Enum Value",
  "command": "string (optional)",
  "parameters": { ... } (optional)
}
`;

    try {
        const model = 'mistral-large-latest'; // Using Mistral Large (123B) - powerful reasoning and context understanding

        const messages: any[] = [
            { role: "system", content: SYSTEM_INSTRUCTION }
        ];

        // Add history
        if (history.length > 0) {
            messages.push({ role: "user", content: `Previous Context:\n${history.join('\n')}` });
        }

        // Current User Message
        const userContent: any[] = [{ type: "text", text: message }];

        if (fileData) {
            console.log("Attaching File Data:", fileData.mimeType, "Length:", fileData.base64.length);
            // Check if it is PDF or Image or Audio
            if (fileData.mimeType === 'application/pdf') {
                userContent.push({
                    type: "image_url", // OpenRouter often reuses this field or generic 'file_url'
                    image_url: {
                        url: `data:${fileData.mimeType};base64,${fileData.base64}`
                    }
                });
            } else if (fileData.mimeType.startsWith('image/')) {
                userContent.push({
                    type: "image_url",
                    image_url: {
                        url: `data:${fileData.mimeType};base64,${fileData.base64}`
                    }
                });
            } else if (fileData.mimeType.startsWith('audio/')) {
                userContent.push({
                    type: "image_url", // Temporary fallback or check OpenRouter spec for 'audio_url'
                    image_url: {
                        url: `data:${fileData.mimeType};base64,${fileData.base64}`
                    }
                });
            }
        }

        messages.push({ role: "user", content: userContent });
        messages.push({ role: "user", content: "Respond in valid JSON." });


        const response = await fetch(MISTRAL_API_URL, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: model,
                messages: messages
            })
        });

        if (!response.ok) {
            const errText = await response.text();
            console.error("Mistral API Error:", response.status, errText);
            throw new Error(`Mistral API Error: ${response.status}`);
        }

        const data = await response.json();
        const jsonText = data.choices[0].message.content;
        console.log("Gemini Raw Response:", jsonText);

        if (!jsonText) throw new Error("Empty response from OpenRouter");

        // Robustly Extract JSON using the helper
        const cleanJson = extractJSONString(jsonText);

        let parsed;
        try {
            parsed = JSON.parse(cleanJson);
        } catch (e) {
            console.error("JSON Parse Error on string:", cleanJson);
            throw e;
        }

        let finalResponseText = parsed.response;
        let payload = undefined;
        let payloadType = undefined;

        // --- AGENT EXECUTION LAYER ---
        if (parsed.activeAgent && parsed.command && parsed.activeAgent !== AgentType.CHAT) {
            const toolFn = agentTools[parsed.activeAgent as AgentType];
            if (toolFn) {
                const result: AgentResult = await toolFn(parsed.command, parsed.parameters || {});

                if (result.success) {
                    payload = result.data;
                    payloadType = result.payloadType;
                    // Append tool success message (e.g., Payment confirmation details)
                    if (result.message) {
                        finalResponseText += `\n\n${result.message}`;
                    }
                } else {
                    finalResponseText += ` (System: ${result.message})`;
                }
            }
        }

        return {
            text: finalResponseText || "Processed.",
            tone: parsed.detectedTone || "Neutral",
            language: parsed.detectedLanguage || "en",
            agent: parsed.activeAgent || AgentType.CHAT,
            payload,
            payloadType
        };

    } catch (error) {
        console.error("Mistral AI Error:", error);
        return {
            text: "I encountered a processing error. Please try again.",
            tone: "Error",
            language: "en",
            agent: AgentType.CHAT
        };
    }
};

// Generate smart conversation title using Mistral Small (faster)
export const generateConversationTitle = async (userMessage: string): Promise<string> => {
    try {
        const response = await fetch(MISTRAL_API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'mistral-small-latest',
                messages: [
                    {
                        role: 'user',
                        content: `Generate a very short, concise title (3-5 words) for a chat conversation based on this first message. Return ONLY the title, nothing else. Do NOT include quotes.\n\nMessage: "${userMessage}"`
                    }
                ],
                temperature: 0.3,
                max_tokens: 50
            })
        });

        if (!response.ok) {
            console.error("Title Generation API Error:", response.status);
            return userMessage.substring(0, 30) + (userMessage.length > 30 ? '...' : '');
        }

        const data = await response.json();
        let title = data.choices?.[0]?.message?.content?.trim() || '';
        
        // Remove any surrounding quotes
        title = title.replace(/^["']|["']$/g, '');
        
        // Fallback if title is empty or too long
        if (!title || title.length > 50) {
            return userMessage.substring(0, 30) + (userMessage.length > 30 ? '...' : '');
        }

        return title;
    } catch (error) {
        console.error("Title Generation Error:", error);
        // Fallback: use first 30 chars of message
        return userMessage.substring(0, 30) + (userMessage.length > 30 ? '...' : '');
    }
};

// Craft response using real search results from DuckDuckGo
export const craftSearchResponse = async (query: string, searchResults: any[]): Promise<string> => {
    try {
        // Format search results for AI
        const resultsText = searchResults
            .map((result, idx) => `${idx + 1}. **${result.title}**\n   ${result.snippet}\n   Source: ${result.source}`)
            .join('\n\n');

        const response = await fetch(MISTRAL_API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'mistral-small-latest',
                messages: [
                    {
                        role: 'user',
                        content: `Based on these real search results about "${query}", provide a helpful, natural response that synthesizes the information. Be concise and informative.\n\nSearch Results:\n${resultsText}`
                    }
                ],
                temperature: 0.7,
                max_tokens: 300
            })
        });

        if (!response.ok) {
            console.error("Search Response Generation Error:", response.status);
            return `I found information about "${query}" but couldn't synthesize it. Here are the raw results:\n\n${resultsText}`;
        }

        const data = await response.json();
        const craftedResponse = data.choices?.[0]?.message?.content?.trim() || '';

        if (!craftedResponse) {
            return `I found information about "${query}":\n\n${resultsText}`;
        }

        return craftedResponse;
    } catch (error) {
        console.error("Search Response Crafting Error:", error);
        return `I was searching for "${query}" but encountered an error. Please try again.`;
    }
};
