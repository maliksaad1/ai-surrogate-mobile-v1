import { AgentType, CalendarEvent, SearchResult, TextDocument, Email, PaymentTransaction, FinancialReport } from "../types";
import { db } from "./db";
import { craftSearchResponse } from "./geminiService";

export interface AgentResult {
    success: boolean;
    message: string;
    data?: any;
    payloadType?: 'EVENT' | 'DOC' | 'SEARCH_RESULT' | 'EMAIL' | 'PAYMENT' | 'FINANCE_REPORT';
}

// Helper to generate Google Calendar Link
const generateGoogleCalendarUrl = (event: CalendarEvent) => {
    try {
        // Construct Date Objects
        // Note: 'date' is YYYY-MM-DD, 'time' is HH:mm
        const startDateStr = `${event.date}T${event.time}:00`;
        const startDate = new Date(startDateStr);

        // Default duration 1 hour
        const endDate = new Date(startDate.getTime() + 60 * 60 * 1000);

        const formatGCalDate = (date: Date) => {
            return date.toISOString().replace(/-|:|\.\d+/g, '');
        };

        return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(event.title)}&dates=${formatGCalDate(startDate)}/${formatGCalDate(endDate)}&details=${encodeURIComponent(event.description || "")}`;
    } catch (e) {
        console.error("Error generating GCal URL", e);
        return null;
    }
};

// Robust Number Parser for Financial Data
const parseNumber = (value: any): number => {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
        // Remove ',' and '$' and '%' and spaces
        const clean = value.replace(/,/g, '').replace(/\$/g, '').replace(/%/g, '').replace(/\s/g, '');
        const num = parseFloat(clean);
        return isNaN(num) ? 0 : num;
    }
    return 0;
};

// Mock Financial Data Generator (Fallback)
const getMockStockData = (symbol: string): FinancialReport => {
    const basePrice = Math.random() * 1000 + 50;
    const change = (Math.random() * 20) - 10;
    const percent = (change / basePrice) * 100;

    return {
        symbol: symbol.toUpperCase(),
        price: parseFloat(basePrice.toFixed(2)),
        currency: 'USD',
        change: parseFloat(change.toFixed(2)),
        changePercent: parseFloat(percent.toFixed(2)),
        marketCap: (Math.random() * 2 + 0.5).toFixed(1) + 'T',
        peRatio: parseFloat((Math.random() * 50 + 10).toFixed(2)),
        week52High: parseFloat((basePrice * 1.2).toFixed(2)),
        week52Low: parseFloat((basePrice * 0.8).toFixed(2)),
        recommendation: percent > 1 ? 'BUY' : percent < -1 ? 'SELL' : 'HOLD',
        analysis: "Generated based on simulated market volatility and technical indicators."
    };
};

// The Execution Layer for the Agents
export const agentTools: Record<AgentType, (action: string, params: any) => Promise<AgentResult>> = {

    // --- Schedule Agent Tools ---
    [AgentType.SCHEDULE]: async (action: string, params: any): Promise<AgentResult> => {
        switch (action) {
            case 'create_event':
                if (!params.title || !params.time) {
                    return { success: false, message: "Missing title or time for event." };
                }
                const newEvent: CalendarEvent = {
                    id: Date.now().toString(),
                    title: params.title,
                    date: params.date || new Date().toISOString().split('T')[0],
                    time: params.time,
                    description: params.description || '',
                    status: 'pending'
                };

                await db.addEvent(newEvent);

                // Generate Google Calendar URL for direct scheduling
                const gCalUrl = generateGoogleCalendarUrl(newEvent);

                return {
                    success: true,
                    message: `✅ Event created! Add "${newEvent.title}" to your Google Calendar to get reminders.`,
                    data: { ...newEvent, gCalUrl },
                    payloadType: 'EVENT'
                };

            case 'list_events':
                const allEvents = await db.getEvents();
                // Filter out cancelled events and sort by date/time
                const activeEvents = allEvents
                    .filter(e => e.status !== 'cancelled')
                    .sort((a, b) => {
                        const dateA = new Date(`${a.date}T${a.time}`);
                        const dateB = new Date(`${b.date}T${b.time}`);
                        return dateA.getTime() - dateB.getTime();
                    });

                // Enhance with GCal URLs
                const eventsWithUrls = activeEvents.map(evt => ({
                    ...evt,
                    gCalUrl: generateGoogleCalendarUrl(evt)
                }));

                return {
                    success: true,
                    message: activeEvents.length > 0
                        ? `📅 You have ${activeEvents.length} scheduled event${activeEvents.length > 1 ? 's' : ''}.`
                        : "Your schedule is clear. No events scheduled.",
                    data: eventsWithUrls,
                    payloadType: 'EVENT'
                };

            default:
                return { success: false, message: "Unknown schedule action." };
        }
    },

    // --- Docs Agent Tools ---
    [AgentType.DOCS]: async (action: string, params: any): Promise<AgentResult> => {
        switch (action) {
            case 'create_doc':
                if (!params.content) {
                    return { success: false, message: "No content provided for document." };
                }
                const newDoc: TextDocument = {
                    id: Date.now().toString(),
                    title: params.title || 'Untitled Draft',
                    content: params.content,
                    createdAt: new Date().toISOString()
                };
                await db.addDocument(newDoc);
                return {
                    success: true,
                    message: `Document "${newDoc.title}" created successfully.`,
                    data: newDoc,
                    payloadType: 'DOC'
                };

            default:
                return { success: false, message: "Unknown doc action." };
        }
    },

    // --- Email Agent Tools ---
    [AgentType.EMAIL]: async (action: string, params: any): Promise<AgentResult> => {
        switch (action) {
            case 'send_email':
                if (!params.to || !params.subject || !params.body) {
                    return { success: false, message: "Missing 'to', 'subject', or 'body' for email." };
                }

                // Save to DB for history
                const newEmail: Email = {
                    id: Date.now().toString(),
                    to: params.to,
                    subject: params.subject,
                    body: params.body,
                    sentAt: new Date().toISOString()
                };
                await db.addEmail(newEmail);

                // Construct mailto link
                // Newlines in mailto body MUST be %0D%0A (CRLF) for correct parsing in many email clients
                const bodyContent = params.body.replace(/\n/g, "\r\n");
                const subjectEncoded = encodeURIComponent(params.subject);
                const bodyEncoded = encodeURIComponent(bodyContent);

                const mailtoLink = `mailto:${params.to}?subject=${subjectEncoded}&body=${bodyEncoded}`;
                const gmailLink = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(params.to)}&su=${encodeURIComponent(params.subject)}&body=${encodeURIComponent(params.body)}`;

                return {
                    success: true,
                    message: `Email draft prepared for ${params.to}.`,
                    data: { ...newEmail, mailto: mailtoLink, gmail: gmailLink },
                    payloadType: 'EMAIL'
                };
            default:
                return { success: false, message: "Unknown email action." };
        }
    },

    // --- Payment Agent Tools ---
    [AgentType.PAYMENT]: async (action: string, params: any): Promise<AgentResult> => {
        switch (action) {
            case 'make_payment':
                if (!params.amount || !params.recipient) {
                    return { success: false, message: "Missing amount or recipient for payment." };
                }

                const newTx: PaymentTransaction = {
                    id: Date.now().toString(),
                    amount: Number(params.amount),
                    currency: params.currency || 'USD',
                    recipient: params.recipient,
                    description: params.description || 'Payment',
                    status: 'Success',
                    timestamp: new Date().toISOString()
                };

                await db.addPayment(newTx);

                return {
                    success: true,
                    message: `✅ Payment Processed\nSent $${newTx.amount.toFixed(2)} ${newTx.currency} to ${newTx.recipient}\nRef: ${newTx.id.slice(-6)}`,
                    data: newTx,
                    payloadType: 'PAYMENT'
                };
            default:
                return { success: false, message: "Unknown payment action." };
        }
    },

    // --- Financial Agent Tools ---
    [AgentType.FINANCE]: async (action: string, params: any): Promise<AgentResult> => {
        switch (action) {
            case 'analyze_stock':
                if (!params.symbol) {
                    return { success: false, message: "Missing stock symbol (e.g., AAPL, BTC)." };
                }

                const { getRealMarketData } = require('./financeService');
                const { generateMarketAnalysis } = require('./analysisService');

                let report = await getRealMarketData(params.symbol);

                if (report) {
                    // Enrich with AI Analysis
                    report.analysis = await generateMarketAnalysis(report.symbol, report.price, report.changePercent);
                } else {
                    // Fallback to mock data if API fails
                    report = getMockStockData(params.symbol);
                    report.analysis += " (Note: Simulated Data - Live feed unavailable via Yahoo Finance)";
                }

                return {
                    success: true,
                    message: `I've analyzed the live market data for ${report.symbol}.`,
                    data: report,
                    payloadType: 'FINANCE_REPORT'
                };
            default:
                return { success: false, message: "Unknown finance action." };
        }
    },

    // --- Search Agent Tools (Jina AI Reader - Free & Reliable) ---
    [AgentType.SEARCH]: async (action: string, params: any): Promise<AgentResult> => {
        const query = params.query || "Unknown";

        try {
            // Jina AI Reader approach: Read search results directly
            // First, construct a Google search URL and let Jina extract the content
            const searchQuery = encodeURIComponent(query);

            // Try Wikipedia first for factual queries (most reliable)
            const wikiUrl = `https://en.wikipedia.org/wiki/${query.replace(/\s+/g, '_')}`;

            try {
                // Use Jina AI Reader to extract clean content from Wikipedia
                const jinaResponse = await fetch(`https://r.jina.ai/${wikiUrl}`, {
                    method: 'GET',
                    headers: {
                        'Accept': 'application/json',
                        'X-Return-Format': 'markdown'
                    }
                });

                if (jinaResponse.ok) {
                    const jinaData = await jinaResponse.json();
                    const content = jinaData.data?.content || jinaData.content || '';

                    if (content && content.length > 100) {
                        // Extract first few paragraphs (limit to ~500 chars for AI processing)
                        const excerpt = content.substring(0, 800).trim();

                        // Craft response using the extracted content
                        const craftedMessage = await craftSearchResponse(query, [{
                            title: `Wikipedia: ${query}`,
                            snippet: excerpt,
                            source: 'wikipedia.org'
                        }]);

                        return {
                            success: true,
                            message: craftedMessage,
                            data: {
                                query: query,
                                results: [{
                                    title: `Wikipedia: ${query}`,
                                    snippet: excerpt.substring(0, 200) + '...',
                                    source: 'wikipedia.org'
                                }]
                            },
                            payloadType: 'SEARCH_RESULT'
                        };
                    }
                }
            } catch (wikiError) {
                console.log("Wikipedia not found, trying web search");
            }

            // Fallback: Use Jina AI to search Google results
            const googleSearchUrl = `https://www.google.com/search?q=${searchQuery}`;

            const jinaSearchResponse = await fetch(`https://r.jina.ai/${googleSearchUrl}`, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'X-Return-Format': 'markdown'
                }
            });

            if (!jinaSearchResponse.ok) {
                throw new Error(`Jina AI search error: ${jinaSearchResponse.status}`);
            }

            const searchData = await jinaSearchResponse.json();
            const searchContent = searchData.data?.content || searchData.content || '';

            if (!searchContent || searchContent.length < 50) {
                throw new Error('No search results found');
            }

            // Extract meaningful content (first 1000 chars)
            const excerpt = searchContent.substring(0, 1000).trim();

            // Craft response using the search results
            const craftedMessage = await craftSearchResponse(query, [{
                title: `Search results for "${query}"`,
                snippet: excerpt,
                source: 'google.com'
            }]);

            return {
                success: true,
                message: craftedMessage,
                data: {
                    query: query,
                    results: [{
                        title: `Web search: ${query}`,
                        snippet: excerpt.substring(0, 300) + '...',
                        source: 'web search'
                    }]
                },
                payloadType: 'SEARCH_RESULT'
            };

        } catch (error) {
            console.error("Search Error:", error);

            // Ultimate fallback: Use Mistral AI's knowledge directly
            try {
                const fallbackMessage = await craftSearchResponse(query, [{
                    title: `Information about "${query}"`,
                    snippet: `Based on general knowledge about ${query}`,
                    source: 'AI Knowledge Base'
                }]);

                return {
                    success: true,
                    message: `🤖 Based on my knowledge: ${fallbackMessage}\n\n*Note: Unable to fetch live internet data. This is from my training data.*`,
                    data: {
                        query: query,
                        results: [{
                            title: query,
                            snippet: 'Information from AI knowledge base',
                            source: 'AI Training Data'
                        }]
                    },
                    payloadType: 'SEARCH_RESULT'
                };
            } catch {
                return {
                    success: false,
                    message: `Unable to search for "${query}" right now. Please try rephrasing your question or try again later.`,
                    data: {
                        query: query,
                        results: []
                    },
                    payloadType: 'SEARCH_RESULT'
                };
            }
        }
    },

    // --- Chat Agent (No Tools, just pass through) ---
    [AgentType.CHAT]: async () => {
        return { success: true, message: "" };
    }
};
