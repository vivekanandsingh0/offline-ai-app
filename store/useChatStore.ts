
import * as FileSystem from 'expo-file-system/legacy';
import { create } from 'zustand';

export type Message = {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    pending?: boolean;
    metadata?: {
        time?: string;
        source?: string;
    }
};

export type ChatSession = {
    id: string;
    title: string;
    preview: string;
    lastUpdated: number;
    messages: Message[];
};

interface ChatStore {
    sessions: ChatSession[];
    currentSessionId: string | null;

    initialize: () => Promise<void>;
    startNewSession: () => void;
    saveCurrentSession: (messages: Message[]) => Promise<void>;
    loadSession: (sessionId: string) => Promise<Message[]>;
    deleteSession: (sessionId: string) => Promise<void>;
}

const HISTORY_DIR = FileSystem.documentDirectory + 'history/';

export const useChatStore = create<ChatStore>((set, get) => ({
    sessions: [],
    currentSessionId: null,

    initialize: async () => {
        const dirInfo = await FileSystem.getInfoAsync(HISTORY_DIR);
        if (!dirInfo.exists) {
            await FileSystem.makeDirectoryAsync(HISTORY_DIR);
        }

        // Load list of sessions
        // We will store a specialized index file 'index.json' for fast listing
        // instead of reading every single file.
        try {
            const indexInfo = await FileSystem.getInfoAsync(HISTORY_DIR + 'index.json');
            if (indexInfo.exists) {
                const indexContent = await FileSystem.readAsStringAsync(HISTORY_DIR + 'index.json');
                set({ sessions: JSON.parse(indexContent) });
            }
        } catch (e) {
            console.error("Failed to load history index", e);
        }
    },

    startNewSession: () => {
        set({ currentSessionId: null });
    },

    saveCurrentSession: async (messages: Message[]) => {
        if (messages.length === 0) return;

        let { currentSessionId, sessions } = get();
        const now = Date.now();

        // Generate title from first user message
        const firstUserMsg = messages.find(m => m.role === 'user');
        const title = firstUserMsg ? firstUserMsg.content.slice(0, 30).trim() + (firstUserMsg.content.length > 30 ? '...' : '') : 'New Chat';
        const preview = messages[messages.length - 1].content.slice(0, 50).replace(/\n/g, ' ') + '...';

        if (!currentSessionId) {
            // Create new session
            currentSessionId = now.toString();
        }

        const sessionSummary: ChatSession = {
            id: currentSessionId,
            title,
            preview,
            lastUpdated: now,
            messages: [] // We don't store full messages in the index/summary array to keep it light
        };

        // Update sessions list (move to top)
        const otherSessions = sessions.filter(s => s.id !== currentSessionId);
        const newSessions = [sessionSummary, ...otherSessions];

        set({
            currentSessionId,
            sessions: newSessions
        });

        // 1. Save Index
        await FileSystem.writeAsStringAsync(
            HISTORY_DIR + 'index.json',
            JSON.stringify(newSessions)
        ).catch(e => console.error("Failed to save index", e));

        // 2. Save Session Data
        await FileSystem.writeAsStringAsync(
            HISTORY_DIR + `${currentSessionId}.json`,
            JSON.stringify(messages)
        ).catch(e => console.error("Failed to save session", e));
    },

    loadSession: async (sessionId: string) => {
        try {
            const fileInfo = await FileSystem.getInfoAsync(HISTORY_DIR + `${sessionId}.json`);
            if (fileInfo.exists) {
                const content = await FileSystem.readAsStringAsync(HISTORY_DIR + `${sessionId}.json`);
                set({ currentSessionId: sessionId });
                return JSON.parse(content) as Message[];
            }
        } catch (e) {
            console.error("Failed to load session", e);
        }
        return [];
    },

    deleteSession: async (sessionId: string) => {
        const { sessions, currentSessionId } = get();
        const newSessions = sessions.filter(s => s.id !== sessionId);

        set({ sessions: newSessions });
        if (currentSessionId === sessionId) {
            set({ currentSessionId: null });
        }

        await FileSystem.writeAsStringAsync(
            HISTORY_DIR + 'index.json',
            JSON.stringify(newSessions)
        ).catch(e => console.error("Failed to update index", e));

        await FileSystem.deleteAsync(HISTORY_DIR + `${sessionId}.json`, { idempotent: true })
            .catch(e => console.error("Failed to delete file", e));
    }
}));
