import AsyncStorage from '@react-native-async-storage/async-storage';
import { ChatSession, Message, UserContext, CalendarEvent, TextDocument, Email, PaymentTransaction } from '../types';

const CHATS_KEY = 'surrogate_chats_db';
const SETTINGS_KEY = 'surrogate_settings_db';
const EVENTS_KEY = 'surrogate_events_db';
const DOCS_KEY = 'surrogate_docs_db';
const EMAILS_KEY = 'surrogate_emails_db';
const PAYMENTS_KEY = 'surrogate_payments_db';

export const db = {
    // --- Chat Operations ---

    getChats: async (): Promise<ChatSession[]> => {
        try {
            const data = await AsyncStorage.getItem(CHATS_KEY);
            if (!data) return [];
            const parsed = JSON.parse(data);
            // Rehydrate Dates
            return parsed.map((c: any) => ({
                ...c,
                updatedAt: new Date(c.updatedAt),
                messages: c.messages.map((m: any) => ({ ...m, timestamp: new Date(m.timestamp) }))
            })).sort((a: ChatSession, b: ChatSession) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
        } catch (e) {
            console.error("DB Load Error", e);
            return [];
        }
    },

    getChat: async (id: string): Promise<ChatSession | undefined> => {
        const chats = await db.getChats();
        return chats.find(c => c.id === id);
    },

    saveChat: async (session: ChatSession) => {
        const chats = await db.getChats();
        const index = chats.findIndex(c => c.id === session.id);
        if (index >= 0) {
            chats[index] = session;
        } else {
            chats.push(session);
        }
        await AsyncStorage.setItem(CHATS_KEY, JSON.stringify(chats));
    },

    createChat: async (): Promise<ChatSession> => {
        const newChat: ChatSession = {
            id: Date.now().toString(),
            title: 'New Conversation',
            messages: [],
            lastMessage: '',
            updatedAt: new Date()
        };
        await db.saveChat(newChat);
        return newChat;
    },

    deleteChat: async (id: string) => {
        const chats = await db.getChats();
        const newChats = chats.filter(c => c.id !== id);
        await AsyncStorage.setItem(CHATS_KEY, JSON.stringify(newChats));
    },

    clearAllChats: async () => {
        await AsyncStorage.removeItem(CHATS_KEY);
    },

    clearAllData: async () => {
        await AsyncStorage.removeItem(CHATS_KEY);
        await AsyncStorage.removeItem(SETTINGS_KEY);
        await AsyncStorage.removeItem(EVENTS_KEY);
        await AsyncStorage.removeItem(DOCS_KEY);
        await AsyncStorage.removeItem(EMAILS_KEY);
        await AsyncStorage.removeItem(PAYMENTS_KEY);
    },

    // --- User Settings Operations ---

    getUserContext: async (): Promise<UserContext> => {
        try {
            const data = await AsyncStorage.getItem(SETTINGS_KEY);
            if (data) return JSON.parse(data);
        } catch (e) {
            console.error("Settings Load Error", e);
        }
        return { name: 'Boss', preferredLanguage: 'en', hasSeenIntro: false, theme: 'light' };
    },

    saveUserContext: async (ctx: UserContext) => {
        await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(ctx));
    },

    // --- Agent Data Operations (Agentic Framework) ---

    getEvents: async (): Promise<CalendarEvent[]> => {
        try {
            const data = await AsyncStorage.getItem(EVENTS_KEY);
            return data ? JSON.parse(data) : [];
        } catch { return []; }
    },

    addEvent: async (event: CalendarEvent) => {
        const events = await db.getEvents();
        events.push(event);
        await AsyncStorage.setItem(EVENTS_KEY, JSON.stringify(events));
        return event;
    },

    updateEvent: async (id: string, updates: Partial<CalendarEvent>) => {
        const events = await db.getEvents();
        const index = events.findIndex(e => e.id === id);
        if (index !== -1) {
            events[index] = { ...events[index], ...updates };
            await AsyncStorage.setItem(EVENTS_KEY, JSON.stringify(events));
            return events[index];
        }
        return null;
    },

    deleteEvent: async (id: string) => {
        const events = await db.getEvents();
        const newEvents = events.filter(e => e.id !== id);
        await AsyncStorage.setItem(EVENTS_KEY, JSON.stringify(newEvents));
    },

    getDocuments: async (): Promise<TextDocument[]> => {
        try {
            const data = await AsyncStorage.getItem(DOCS_KEY);
            return data ? JSON.parse(data) : [];
        } catch { return []; }
    },

    addDocument: async (doc: TextDocument) => {
        const docs = await db.getDocuments();
        docs.push(doc);
        await AsyncStorage.setItem(DOCS_KEY, JSON.stringify(docs));
        return doc;
    },

    getEmails: async (): Promise<Email[]> => {
        try {
            const data = await AsyncStorage.getItem(EMAILS_KEY);
            return data ? JSON.parse(data) : [];
        } catch { return []; }
    },

    addEmail: async (email: Email) => {
        const emails = await db.getEmails();
        emails.push(email);
        await AsyncStorage.setItem(EMAILS_KEY, JSON.stringify(emails));
        return email;
    },

    getPayments: async (): Promise<PaymentTransaction[]> => {
        try {
            const data = await AsyncStorage.getItem(PAYMENTS_KEY);
            return data ? JSON.parse(data) : [];
        } catch { return []; }
    },

    addPayment: async (tx: PaymentTransaction) => {
        const txs = await db.getPayments();
        txs.push(tx);
        await AsyncStorage.setItem(PAYMENTS_KEY, JSON.stringify(txs));
        return tx;
    }
};
