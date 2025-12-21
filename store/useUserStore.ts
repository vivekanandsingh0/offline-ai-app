import * as FileSystem from 'expo-file-system/legacy';
import { create } from 'zustand';

const SETTINGS_FILE = FileSystem.documentDirectory + 'user-settings.json';

export type UserClass =
    | 'Nursery' | 'LKG' | 'UKG'
    | '1' | '2' | '3' | '4' | '5'
    | '6' | '7' | '8' | '9' | '10';

export type AppTheme = 'light' | 'dark' | 'system';
export type AppLanguage = 'English' | 'Spanish' | 'Hindi' | 'French';

type UserSettings = {
    userClass: UserClass | null;
    onboardingCompleted: boolean;
    theme: AppTheme;
    language: AppLanguage;
};

interface UserStore {
    userClass: UserClass | null;
    onboardingCompleted: boolean;
    theme: AppTheme;
    language: AppLanguage;
    initialized: boolean;

    initialize: () => Promise<void>;
    setUserClass: (cls: UserClass) => Promise<void>;
    completeOnboarding: () => Promise<void>;
    setTheme: (theme: AppTheme) => Promise<void>;
    setLanguage: (lang: AppLanguage) => Promise<void>;
    resetUser: () => Promise<void>;
}

export const useUserStore = create<UserStore>((set, get) => ({
    userClass: null,
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
                    userClass: settings.userClass,
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

    setUserClass: async (cls) => {
        set({ userClass: cls });
        await saveSettings(get());
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

    resetUser: async () => {
        set({ userClass: null, onboardingCompleted: false, theme: 'system', language: 'English' });
        await FileSystem.deleteAsync(SETTINGS_FILE, { idempotent: true });
    }
}));

const saveSettings = async (store: UserStore) => {
    const settings: UserSettings = {
        userClass: store.userClass,
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
