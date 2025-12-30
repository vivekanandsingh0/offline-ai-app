import * as FileSystem from 'expo-file-system/legacy';
import { create } from 'zustand';

const SETTINGS_FILE = FileSystem.documentDirectory + 'user-settings.json';

export type AppTheme = 'light' | 'dark' | 'system';
export type AppLanguage = 'English' | 'Spanish' | 'Hindi' | 'French';

type UserSettings = {
    onboardingCompleted: boolean;
    theme: AppTheme;
    language: AppLanguage;
};

interface UserStore {
    onboardingCompleted: boolean;
    theme: AppTheme;
    language: AppLanguage;
    initialized: boolean;

    initialize: () => Promise<void>;
    completeOnboarding: () => Promise<void>;
    setTheme: (theme: AppTheme) => Promise<void>;
    setLanguage: (lang: AppLanguage) => Promise<void>;
}

export const useUserStore = create<UserStore>((set, get) => ({
    onboardingCompleted: false,
    theme: 'system',
    language: 'English',
    initialized: false,

    initialize: async () => {
        try {
            const fileInfo = await FileSystem.getInfoAsync(SETTINGS_FILE);
            if (fileInfo.exists) {
                const content = await FileSystem.readAsStringAsync(SETTINGS_FILE);
                const settings: UserSettings = JSON.parse(content);
                set({
                    onboardingCompleted: settings.onboardingCompleted,
                    theme: settings.theme || 'system',
                    language: settings.language || 'English',
                    initialized: true
                });
            } else {
                set({ initialized: true });
            }
        } catch (e) {
            console.error('Failed to load user settings:', e);
            set({ initialized: true });
        }
    },

    completeOnboarding: async () => {
        set({ onboardingCompleted: true });
        await saveSettings(get());
    },

    setTheme: async (theme) => {
        set({ theme });
        await saveSettings(get());
    },

    setLanguage: async (language) => {
        set({ language });
        await saveSettings(get());
    },
}));

const saveSettings = async (store: UserStore) => {
    const settings: UserSettings = {
        onboardingCompleted: store.onboardingCompleted,
        theme: store.theme,
        language: store.language
    };
    try {
        await FileSystem.writeAsStringAsync(SETTINGS_FILE, JSON.stringify(settings));
    } catch (e) {
        console.error('Failed to save user settings:', e);
    }
};
