import { AgentType } from "../types";
import { agentTools, AgentResult } from "./agentTools";
import { db } from "./db";

const apiKey = process.env.EXPO_PUBLIC_OPENROUTER_API_KEY || '';
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

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
    imageBase64?: string
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
            text: "I'm offline. Please check the OpenRouter API configuration.",
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
     2. **Step 2: Identify Context**: You MUST have a topic/context to write the email. If the user only says "Send email to bob@example.com" (without a topic), you MUST ASK: "What should the email be about?" or "Please provide the context."
     3. **Step 3: Auto-Drafting**: ONLY when you have BOTH recipient and context, call the 'send_email' tool. You must CREATIVELY draft a professional 'subject' and 'body' yourself based on the context.
     4. **Signature**: YOU MUST sign off the email body with: "Best regards,\n${userName}"
     5. **Formatting**: Use '\\n' for newlines in the body.
     6. **Final Response**: When the draft is ready, explicitly tell the user: "I've drafted the email below. You can edit the text directly in the box, then tap Send."
4. **Search Agent**: Find info.
   - Command: "web_search" | Params: query.
5. **Payment Agent**: Simulates financial transactions.
   - Command: "make_payment" | Params: amount (number), recipient (string), description (string).
   - **Rule**: If the user says "Pay for X" (e.g., "Pay for Al Noor Hotel") but does NOT specify the amount, you MUST ASK: "What is the amount to be paid?"
   - Do not invent an amount.
6. **Financial Agent** (SECRET AGENT): Analyze markets and stocks.
   - Activates when user asks about stocks, crypto, markets, investment advice, or "yfinance" data.
   - **EXECUTION RULE**: You MUST use the **Google Search** tool to find the LATEST REAL-TIME market data for the requested symbol.
   - Command: "analyze_stock"
   - Params: 
     - symbol (e.g., 'AAPL', 'BTC-USD')
     - price (number) - The current real-time price found via search.
     - change (number) - The price change value.
     - changePercent (number) - The percentage change.
     - marketCap (string) - e.g. "3.4T".
     - peRatio (number)
     - week52High (number)
     - week52Low (number)
     - recommendation ('BUY' | 'SELL' | 'HOLD') - Based on your analysis of the search results and recent news.
     - analysis (string) - A concise 1-sentence summary of the market sentiment found.
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
        const model = 'meta-llama/llama-3.3-70b-instruct:free'; // Using OpenRouter Model

        const messages: any[] = [
            { role: "system", content: SYSTEM_INSTRUCTION }
        ];

        // Add history
        // History format in this app is "Sender: Message", we need to parse it loosely or just dump it
        // Better to just dump it as context if we don't want to parse fully
        if (history.length > 0) {
            messages.push({ role: "user", content: `Previous Context:\n${history.join('\n')}` });
        }

        // Current User Message
        const userContent: any[] = [{ type: "text", text: message }];
        if (imageBase64) {
            userContent.push({
                type: "image_url",
                image_url: {
                    url: imageBase64 // OpenRouter/OpenAI accepts data:image/... base64 strings directly
                }
            });
        }

        messages.push({ role: "user", content: userContent });
        messages.push({ role: "user", content: "Respond in valid JSON." });


        const response = await fetch(OPENROUTER_URL, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "HTTP-Referer": "https://ai-surrogate-clone.com", // Required by OpenRouter
                "X-Title": "AI Surrogate Clone", // Optional
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: model,
                messages: messages
            })
        });

        if (!response.ok) {
            const errText = await response.text();
            console.error("OpenRouter API Error:", response.status, errText);
            throw new Error(`OpenRouter Error: ${response.status}`);
        }

        const data = await response.json();
        const jsonText = data.choices[0].message.content;

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
        console.error("Gemini/OpenRouter Error:", error);
        return {
            text: "I encountered a processing error. Please try again.",
            tone: "Error",
            language: "en",
            agent: AgentType.CHAT
        };
    }
};
