export enum Sender {
    USER = 'user',
    AGENT = 'agent',
    SYSTEM = 'system'
}

export enum AgentType {
    CHAT = 'Chat Agent',
    SCHEDULE = 'Schedule Agent',
    DOCS = 'Docs Agent',
    SEARCH = 'Search Agent',
    EMAIL = 'Email Agent',
    PAYMENT = 'Payment Agent',
    FINANCE = 'Financial Agent'
}

export interface Message {
    id: string;
    text: string;
    sender: Sender;
    timestamp: Date;
    tone?: string;
    language?: string;
    processingAgent?: AgentType;
    // Payload carries structured data from agent actions (e.g., an event object)
    payload?: any;
    payloadType?: 'EVENT' | 'DOC' | 'SEARCH_RESULT' | 'EMAIL' | 'PAYMENT' | 'FINANCE_REPORT';
}

export interface ChatSession {
    id: string;
    title: string;
    messages: Message[];
    lastMessage: string;
    updatedAt: Date;
}

export interface TaskLog {
    id: string;
    agent: AgentType;
    action: string;
    status: 'Pending' | 'Completed' | 'Failed';
    timestamp: Date;
}

export interface UserContext {
    name: string;
    preferredLanguage: string; // 'en', 'ur', 'pa'
    hasSeenIntro?: boolean;
    theme: 'light' | 'dark';
}

// --- Agent Specific Types ---

export interface CalendarEvent {
    id: string;
    title: string;
    date: string; // ISO String
    time: string;
    description?: string;
    status?: 'pending' | 'confirmed' | 'cancelled';
}

export interface TextDocument {
    id: string;
    title: string;
    content: string;
    createdAt: string;
}

export interface Email {
    id: string;
    to: string;
    subject: string;
    body: string;
    sentAt: string;
}

export interface PaymentTransaction {
    id: string;
    amount: number;
    currency: string;
    recipient: string;
    description: string;
    status: 'Success' | 'Failed';
    timestamp: string;
}

export interface SearchResult {
    query: string;
    results: Array<{ title: string; snippet: string; source: string }>;
}

export interface FinancialReport {
    symbol: string;
    price: number;
    currency: string;
    change: number;
    changePercent: number;
    marketCap: string;
    peRatio: number | null;
    week52High: number;
    week52Low: number;
    recommendation: 'BUY' | 'SELL' | 'HOLD';
    analysis: string;
}
