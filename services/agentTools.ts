import { AgentType, CalendarEvent, SearchResult, TextDocument, Email, PaymentTransaction, FinancialReport } from "../types";
import { db } from "./db";

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

                const gCalUrl = generateGoogleCalendarUrl(newEvent);

                return {
                    success: true,
                    message: `I've prepared an event for "${newEvent.title}". Please confirm details below.`,
                    data: { ...newEvent, gCalUrl },
                    payloadType: 'EVENT'
                };

            case 'list_events':
                const events = await db.getEvents();
                const upcoming = events.filter(e => e.status !== 'cancelled').slice(-3); // Get last 3 active for demo

                // Enhance with GCal URLs
                const upcomingWithUrls = upcoming.map(evt => ({
                    ...evt,
                    gCalUrl: generateGoogleCalendarUrl(evt)
                }));

                return {
                    success: true,
                    message: upcoming.length > 0
                        ? `You have ${upcoming.length} upcoming events.`
                        : "Your schedule is clear.",
                    data: upcomingWithUrls,
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

                let report: FinancialReport;

                // Attempt to parse the provided price
                const parsedPrice = parseNumber(params.price);

                // Logic: Only use Gemini's data if we successfully parsed a price > 0.
                // If params.price was "N/A", undefined, or empty, parseNumber returns 0.
                if (parsedPrice > 0) {

                    let week52High = parseNumber(params.week52High);
                    let week52Low = parseNumber(params.week52Low);

                    // Intelligent fallback for range if not found but price is found
                    if (week52High === 0 || week52Low === 0) {
                        week52High = parsedPrice * 1.25; // Estimate high
                        week52Low = parsedPrice * 0.75;  // Estimate low
                    }

                    report = {
                        symbol: params.symbol.toUpperCase(),
                        price: parsedPrice,
                        currency: params.currency || 'USD',
                        change: parseNumber(params.change),
                        changePercent: parseNumber(params.changePercent),
                        marketCap: params.marketCap || 'N/A',
                        peRatio: params.peRatio ? parseNumber(params.peRatio) : null,
                        week52High: week52High,
                        week52Low: week52Low,
                        recommendation: (params.recommendation as any) || 'HOLD',
                        analysis: params.analysis || `Real-time market data retrieved for ${params.symbol}.`
                    };
                } else {
                    // Fallback to mock data if Gemini returned no price or valid data
                    report = getMockStockData(params.symbol);
                    report.analysis += " (Note: Simulated Data - Search failed to retrieve live price)";
                }

                return {
                    success: true,
                    message: `I've analyzed the latest market data for ${report.symbol}.`,
                    data: report,
                    payloadType: 'FINANCE_REPORT'
                };
            default:
                return { success: false, message: "Unknown finance action." };
        }
    },

    // --- Search Agent Tools (Mocked) ---
    [AgentType.SEARCH]: async (action: string, params: any): Promise<AgentResult> => {
        // In a real app, this would call Google Search Grounding or a Custom Search API
        const query = params.query || "Unknown";

        // Mock Results
        const mockResults: SearchResult = {
            query: query,
            results: [
                { title: `${query} - Wikipedia`, snippet: "Detailed information about the topic found on the free encyclopedia...", source: "wikipedia.org" },
                { title: `Latest News: ${query}`, snippet: "Breaking news and updates regarding your search query...", source: "news.google.com" },
                { title: `Images for ${query}`, snippet: "View high resolution images...", source: "images.google.com" }
            ]
        };

        return {
            success: true,
            message: `Here is what I found for "${query}".`,
            data: mockResults,
            payloadType: 'SEARCH_RESULT'
        };
    },

    // --- Chat Agent (No Tools, just pass through) ---
    [AgentType.CHAT]: async () => {
        return { success: true, message: "" };
    }
};
