import * as FileSystem from 'expo-file-system/legacy';
import OfflineLLMModule from 'offline-llm-module';
import { create } from 'zustand';

// Polyfill types if not exported directly
type DownloadProgressData = {
    totalBytesWritten: number;
    totalBytesExpectedToWrite: number;
};


export type Model = {
    id: string;
    name: string;
    url: string;
    filename: string;
    size: string;
    description: string;
};

export type DownloadStatus = 'idle' | 'downloading' | 'paused' | 'completed' | 'error';

export type LocalModel = Model & {
    localPath: string;
    downloadStatus: DownloadStatus;
    progress: number;
};

// Hardcoded catalog for demo
const CATALOG: Model[] = [
    {
        id: 'llama-3.2-3b',
        name: 'Llama 3.2 3B Instruct (Balanced)',
        url: 'https://huggingface.co/bartowski/Llama-3.2-3B-Instruct-GGUF/resolve/main/Llama-3.2-3B-Instruct-Q4_K_M.gguf',
        filename: 'Llama-3.2-3B-Instruct-Q4_K_M.gguf',
        size: '2.0 GB',
        description: 'Default. Best for Explain, Notes, and Homework. (Class 5-10)'
    },
    {
        id: 'qwen-2.5-3b',
        name: 'Qwen 2.5 3B Instruct (Fast)',
        url: 'https://huggingface.co/bartowski/Qwen2.5-3B-Instruct-GGUF/resolve/main/Qwen2.5-3B-Instruct-Q4_K_M.gguf',
        filename: 'Qwen2.5-3B-Instruct-Q4_K_M.gguf',
        size: '2.0 GB',
        description: 'Fastest. Best for simple queries. Recommended for Nursery - Class 4.'
    },
    {
        id: 'mistral-7b-v0.3',
        name: 'Mistral 7B v0.3 Instruct (Detailed)',
        url: 'https://huggingface.co/bartowski/Mistral-7B-v0.3-Instruct-GGUF/resolve/main/Mistral-7B-v0.3-Instruct-Q4_K_M.gguf',
        filename: 'Mistral-7B-v0.3-Instruct-Q4_K_M.gguf',
        size: '4.4 GB',
        description: 'Detailed Mode. Use only for complex Math/Science (Class 9-10).'
    }
];

interface ModelStore {
    catalog: Model[];
    localModels: Record<string, LocalModel>;
    activeModelId: string | null;
    downloadResumables: Record<string, any>;

    initialize: () => Promise<void>;
    startDownload: (model: Model) => Promise<void>;
    pauseDownload: (modelId: string) => Promise<void>;
    resumeDownload: (modelId: string) => Promise<void>;
    cancelDownload: (modelId: string) => Promise<void>;
    deleteModel: (modelId: string) => Promise<void>;
    loadModel: (modelId: string) => Promise<void>;
    unloadModel: () => void;
    setActiveModel: (modelId: string | null) => void;
}

const MODELS_DIR = FileSystem.documentDirectory + 'models/';

export const useModelStore = create<ModelStore>((set, get) => ({
    catalog: CATALOG,
    localModels: {},
    activeModelId: null,
    downloadResumables: {},

    initialize: async () => {
        // Check if models dir exists
        const dirInfo = await FileSystem.getInfoAsync(MODELS_DIR);
        if (!dirInfo.exists) {
            await FileSystem.makeDirectoryAsync(MODELS_DIR);
        }

        // Load persisted settings
        let lastActiveModelId: string | null = null;
        try {
            const settingsInfo = await FileSystem.getInfoAsync(MODELS_DIR + 'settings.json');
            if (settingsInfo.exists) {
                const settings = JSON.parse(await FileSystem.readAsStringAsync(MODELS_DIR + 'settings.json'));
                lastActiveModelId = settings.activeModelId;
            }
        } catch (e) {
            console.log("No previous settings found");
        }

        const localModels: Record<string, LocalModel> = {};

        // Check for each catalog item if it exists on disk
        for (const model of CATALOG) {
            const path = MODELS_DIR + model.filename;
            const fileInfo = await FileSystem.getInfoAsync(path);
            // GGUF models are always > 10MB. If smaller, it's likely a 404/Error page.
            if (fileInfo.exists && fileInfo.size > 10 * 1024 * 1024) {
                localModels[model.id] = {
                    ...model,
                    localPath: path,
                    downloadStatus: 'completed',
                    progress: 1.0
                };
            }
        }

        set({ localModels });

        // Auto-load last active model if available
        if (lastActiveModelId && localModels[lastActiveModelId]) {
            console.log("Restoring last active model:", lastActiveModelId);
            // We call the internal load logic directly
            try {
                const model = localModels[lastActiveModelId];
                console.log("Loading model via Native Module:", model.localPath);
                const success = await OfflineLLMModule.loadModel(model.localPath);
                if (success) {
                    set({ activeModelId: lastActiveModelId });
                    console.log("Model restored successfully");
                }
            } catch (e) {
                console.error("Failed to restore active model", e);
            }
        }
    },

    startDownload: async (model) => {
        const { localModels, downloadResumables } = get();

        if (downloadResumables[model.id]) return; // Already downloading

        const callback = (downloadProgress: DownloadProgressData) => {
            const progress = downloadProgress.totalBytesExpectedToWrite > 0
                ? downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite
                : 0;

            set(state => ({
                localModels: {
                    ...state.localModels,
                    [model.id]: {
                        ...model,
                        localPath: MODELS_DIR + model.filename,
                        downloadStatus: 'downloading',
                        progress
                    }
                }
            }));
        };

        const downloadResumable = FileSystem.createDownloadResumable(
            model.url,
            MODELS_DIR + model.filename,
            {},
            callback
        );

        set(state => ({
            downloadResumables: { ...state.downloadResumables, [model.id]: downloadResumable },
            localModels: {
                ...state.localModels,
                [model.id]: {
                    ...model,
                    localPath: MODELS_DIR + model.filename,
                    downloadStatus: 'downloading',
                    progress: 0
                }
            }
        }));

        try {
            const result = await downloadResumable.downloadAsync();
            if (result) {
                // Verify file actually contains data (avoiding empty/error files)
                const fileInfo = await FileSystem.getInfoAsync(result.uri);
                if (fileInfo.exists && fileInfo.size < 1024 * 1024) { // Less than 1MB is almost certainly an error page
                    throw new Error('Downloaded file is too small. The link might be expired.');
                }

                set(state => {
                    const newResumables = { ...state.downloadResumables };
                    delete newResumables[model.id];

                    return {
                        downloadResumables: newResumables,
                        localModels: {
                            ...state.localModels,
                            [model.id]: {
                                ...state.localModels[model.id],
                                downloadStatus: 'completed',
                                progress: 1,
                                localPath: result.uri
                            }
                        }
                    };
                });
            }
        } catch (e) {
            console.error(e);
            set(state => ({
                localModels: {
                    ...state.localModels,
                    [model.id]: {
                        ...state.localModels[model.id],
                        downloadStatus: 'error',
                        progress: 0
                    }
                }
            }));
        }
    },

    pauseDownload: async (modelId) => {
        const { downloadResumables } = get();
        const resumable = downloadResumables[modelId];
        if (resumable) {
            try {
                await resumable.pauseAsync();
                set(state => ({
                    localModels: {
                        ...state.localModels,
                        [modelId]: {
                            ...state.localModels[modelId],
                            downloadStatus: 'paused'
                        }
                    }
                }));
            } catch (e) {
                console.error('Pause failed:', e);
            }
        }
    },

    resumeDownload: async (modelId) => {
        const { downloadResumables, localModels } = get();
        const resumable = downloadResumables[modelId];
        if (resumable) {
            set(state => ({
                localModels: {
                    ...state.localModels,
                    [modelId]: {
                        ...state.localModels[modelId],
                        downloadStatus: 'downloading'
                    }
                }
            }));

            try {
                const result = await resumable.resumeAsync();
                if (result) {
                    // Success handling similar to startDownload
                    const fileInfo = await FileSystem.getInfoAsync(result.uri);
                    if (fileInfo.exists && fileInfo.size < 10 * 1024 * 1024) {
                        throw new Error('Downloaded file is too small.');
                    }

                    set(state => {
                        const newResumables = { ...state.downloadResumables };
                        delete newResumables[modelId];
                        return {
                            downloadResumables: newResumables,
                            localModels: {
                                ...state.localModels,
                                [modelId]: {
                                    ...state.localModels[modelId],
                                    downloadStatus: 'completed',
                                    progress: 1,
                                    localPath: result.uri
                                }
                            }
                        };
                    });
                }
            } catch (e) {
                console.error('Resume failed:', e);
                set(state => ({
                    localModels: {
                        ...state.localModels,
                        [modelId]: {
                            ...state.localModels[modelId],
                            downloadStatus: 'error'
                        }
                    }
                }));
            }
        }
    },

    cancelDownload: async (modelId: string) => {
        const { downloadResumables, localModels } = get();
        const resumable = downloadResumables[modelId];
        if (resumable) {
            try {
                await resumable.pauseAsync(); // Pause first to stop the request
            } catch (e) { }

            set(state => {
                const newResumables = { ...state.downloadResumables };
                delete newResumables[modelId];

                const newLocalModels = { ...state.localModels };
                delete newLocalModels[modelId];

                return {
                    downloadResumables: newResumables,
                    localModels: newLocalModels
                };
            });

            // Delete partial file
            const model = CATALOG.find(m => m.id === modelId);
            if (model) {
                const path = MODELS_DIR + model.filename;
                await FileSystem.deleteAsync(path, { idempotent: true });
            }
        }
    },

    deleteModel: async (modelId) => {
        const { localModels } = get();
        const model = localModels[modelId];
        if (model && model.localPath) {
            await FileSystem.deleteAsync(model.localPath, { idempotent: true });
            set(state => {
                const newModels = { ...state.localModels };
                delete newModels[modelId];
                return { localModels: newModels };
            });
        }
    },

    setActiveModel: async (modelId) => {
        set({ activeModelId: modelId });
        // Persist setting
        try {
            await FileSystem.writeAsStringAsync(
                MODELS_DIR + 'settings.json',
                JSON.stringify({ activeModelId: modelId })
            );
        } catch (e) {
            console.error("Failed to save model settings", e);
        }
    },

    loadModel: async (modelId) => {
        const { localModels } = get();
        const model = localModels[modelId];
        if (!model || !model.localPath) {
            console.warn("Model not found or not downloaded");
            return;
        }

        try {
            console.log("Loading model via Native Module:", model.localPath);
            const success = await OfflineLLMModule.loadModel(model.localPath);
            if (success) {
                get().setActiveModel(modelId); // Use wrapper to persist
                console.log("Model loaded successfully");
            } else {
                console.error("Failed to load model (native returned false)");
            }
        } catch (e) {
            console.error("Error loading model:", e);
        }
    },

    unloadModel: () => {
        try {
            OfflineLLMModule.unloadModel();
            set({ activeModelId: null });
            // Should we clear persistence? User said "don't unload on exit",
            // but explicit unload probably implies clearing.
            // For now, we'll keep it simple and assume explicit unload clears it.
            FileSystem.writeAsStringAsync(
                MODELS_DIR + 'settings.json',
                JSON.stringify({ activeModelId: null })
            ).catch(e => console.error(e));

            console.log("Model unloaded");
        } catch (e) {
            console.error("Error unloading model:", e);
        }
    }
}));
