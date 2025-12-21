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
        id: 'tinyllama-1.1b-chat',
        name: 'TinyLlama 1.1B Chat',
        url: 'https://huggingface.co/TheBloke/TinyLlama-1.1B-Chat-v1.0-GGUF/resolve/main/tinyllama-1.1b-chat-v1.0.Q4_K_M.gguf',
        filename: 'tinyllama-1.1b-chat-v1.0.Q4_K_M.gguf',
        size: '638 MB',
        description: 'A small, fast model suitable for basic chat.'
    },
    {
        id: 'phi-2',
        name: 'Phi-2',
        url: 'https://huggingface.co/TheBloke/phi-2-GGUF/resolve/main/phi-2.Q4_K_M.gguf',
        filename: 'phi-2.Q4_K_M.gguf',
        size: '1.7 GB',
        description: 'Microsoft Phi-2, great reasoning capabilities for its size.'
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

        // Load existing files
        // Ideally we persist state in AsyncStorage, but for now we scan directory + simple state
        // For a real app, use persist middleware
        // We'll just init from catalog as idle if not found

        // In a real implementation, we would check the file system for existing models
        const localModels: Record<string, LocalModel> = {};

        // Check for each catalog item if it exists on disk
        for (const model of CATALOG) {
            const path = MODELS_DIR + model.filename;
            const fileInfo = await FileSystem.getInfoAsync(path);
            if (fileInfo.exists) {
                localModels[model.id] = {
                    ...model,
                    localPath: path,
                    downloadStatus: 'completed',
                    progress: 1.0
                };
            }
        }

        set({ localModels });
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
        // Implementation for pause
    },

    resumeDownload: async (modelId) => {
        // Implementation for resume
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

    setActiveModel: (modelId) => set({ activeModelId: modelId }),

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
                set({ activeModelId: modelId });
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
            console.log("Model unloaded");
        } catch (e) {
            console.error("Error unloading model:", e);
        }
    }
}));
