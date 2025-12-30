# Cortex AI 🚀

Cortex is a **fully offline**, privacy-focused AI educational assistant built with **React Native (Expo)**. It runs Large Language Models (LLMs) directly on your Android device using a custom native C++ bridge to **llama.cpp**, ensuring zero data leaves your phone.

> **Status**: Active Development (Phase 3 - Education Module & Packs)

## 🌟 Key Features

### 🧠 Offline AI Inference
- **Zero Internet Required**: Chat with AI anywhere, anytime.
- **Local LLMs**: Supports GGUF models (e.g., Llama 3.2, Qwen 2.5, Mistral).
- **Capability Modes**:
  - **Fast**: Uses optimized small models (e.g., Qwen 2.5 3B).
  - **Balanced**: Standard performance (e.g., Llama 3.2 3B).
  - **Accurate**: High-precision models (e.g., Mistral 7B).

### 💬 Chat Experience
- **Persistent History**: Auto-saves conversations. View and restore past chats.
- **Context-Aware Prompts**: System prompts adapt based on the user's class (Nursery to Class 10).
- **Tool Support**: (UI Ready) Selector for tools like Calculator, Canvas, etc.
- **Response Caching**: Instant responses for previously asked questions to save battery and time.

### ⚙️ Model Management
- **Download Manager**: Native UI to download supported GGUF models directly to device storage.
- **Progress Tracking**: Real-time download progress bars.
- **Auto-Load**: Automatically loads the last used model on app startup.

### 🎨 User Customization
- **Class-Based Personalization**: Tailors AI complexity and tone based on user's grade level.
- **Theming**: System, Light, and Dark mode support.
- **Language**: UI support for English, Hindi, Spanish, French.

## 🛠️ Technical Stack

- **Framework**: React Native (Expo SDK 52)
- **Language**: TypeScript
- **State Management**: Zustand (Stores: `User`, `Chat`, `Model`)
- **Native Module**: Custom Android Module (`OfflineLLMModule`)
  - **Language**: Kotlin (Android) + C++ (JNI)
  - **Core Engine**: `llama.cpp` (GGUF inference)
- **Storage**: `expo-file-system` (Settings, Chat History, Model Files)
- **Navigation**: `expo-router`

## 📂 Project Structure

```
offline-ai-app/
├── app/                    # Expo Router pages
│   ├── (tabs)/             # Main tab navigation (Chat, Host, Settings)
│   ├── _layout.tsx         # Root layout & providers
│   └── index.tsx           # Entry & redirections
├── components/             # Reusable UI components
│   ├── ChatHistoryModal    # Sidebar for past chats
│   ├── ClassSelectionModal # Onboarding/Settings modal
│   └── ...
├── native/                 # Custom Native Modules
│   └── OfflineLLMModule/   # The bridge to llama.cpp
│       ├── android/        # Kotlin & C++ source implementation
│       └── src/            # TS definitions
├── store/                  # Zustand State Stores
│   ├── useChatStore.ts     # Chat history persistence
│   ├── useModelStore.ts    # Model download & state
│   └── useUserStore.ts     # User settings & preferences
└── utils/                  # Helpers (PromptBuilder, ResponseCache)
```

## 🚀 Getting Started

### Prerequisites
- Node.js & npm/yarn
- Android Studio (for compiling the C++ native module)
- Android Device (Emulator support is limited for extensive local LLM inference)

### Installation

1.  **Clone the repository**:
    ```bash
    cd cortex-app
    ```

2.  **Install dependencies**:
    ```bash
    npm install
    ```

3.  **Run on Android**:
    ```bash
    npx expo run:android
    ```
    *Note: This will trigger the Gradle build process to compile the C++ `llama.cpp` libraries. The first build may take several minutes.*

## 🧩 Native Module Info

The app uses a custom JNI bridge to communicate with `llama.cpp`.
- **Java/Kotlin Layer**: Handles file downloads and exposes methods like `loadModel()`, `generate()`, `stopGeneration()`.
- **C++ Layer**: Directly calls `llama.cpp` functions to load GGUF files and run inference on the CPU/NPU.

## 📝 Usage Guide

1.  **Onboarding**: Select your class (Grade) to personalize the AI.
2.  **Download Model**: Go to the **Host** tab and download a model (e.g., "Fast" for Qwen).
3.  **Chat**: Return to the **Chat** tab. The model will load automatically.
4.  **History**: Tap the **Time/Clock** icon in the top-left to see past chats.
5.  **Settings**: Customize theme and language in the **Settings** tab.

## 📄 License
[MIT](LICENSE)
