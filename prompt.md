Offline AI Model Downloader & Chat App (Android)
🎯 Objective

Build an Android application that allows users to:

Download AI models (quantized GGUF format) from Hugging Face

Manage installed models locally on device

Chat with selected AI models fully offline

Run inference on-device, without internet, after model download

The app must be built using:

React Native

Expo (Bare workflow / Dev Client)

EAS Build

Native C++ inference via llama.cpp

Android-first (no iOS required initially)

🧱 Tech Stack & Constraints
Frontend

React Native (TypeScript)

Expo Bare Workflow

Expo Dev Client

React Navigation

Zustand (or Redux Toolkit)

Expo File System

Native / AI

llama.cpp (C++)

Android NDK

JNI bridge

Custom React Native Native Module

Models

Only quantized GGUF models

Examples:

Phi-2 GGUF (default)

Gemma 2B GGUF

TinyLLaMA

No PyTorch, no safetensors, no Transformers.js

🧠 High-Level Architecture
React Native UI (Expo)
   ↓ JS Bridge
Native Module (JNI)
   ↓
llama.cpp (C++)
   ↓
Local GGUF Model Files


All inference must happen locally on device.

📱 App Screens & Features
1️⃣ Model Download Screen

Purpose:
Allow users to browse and download approved AI models.

Requirements:

Fetch model metadata from:

Hugging Face model URLs (GGUF only)

OR a static JSON index hosted remotely

Show:

Model name

Model size (GB)

RAM requirement

Recommended device tier

Download features:

Progress bar

Pause / resume

Cancel

Save models to:

/Android/data/<app-id>/files/models/


Important:

Download must be resumable

Verify file integrity (size/hash)

2️⃣ Model Management Screen

Purpose:
Manage locally installed models.

Features:

List all installed models

Show:

Storage size

Load status

Inference speed (tokens/sec)

Actions:

Select active model

Delete model

Rename model (local alias)

Persistence:

Use local JSON or SQLite to store:

Model metadata

Last used model

User preferences

3️⃣ Offline Chat Screen

Purpose:
Chat with selected AI model without internet.

Chat Features:

Chat-style UI (ChatGPT-like)

Streaming token output

Conversation history

Reset context

Adjustable settings:

Temperature

Max tokens

Top-p

Offline Requirement:

Must function with airplane mode ON

⚙️ Native Module Requirements
Native Module Name
OfflineLLMModule

Exposed JS Methods
loadModel(modelPath: string): Promise<boolean>

generate(
  prompt: string,
  options: {
    temperature: number
    maxTokens: number
    topP: number
  }
): EventEmitter (token streaming)

unloadModel(): Promise<void>

🧠 llama.cpp Integration

Compile llama.cpp using Android NDK

Enable:

ARM64

CPU inference only

Disable:

GPU

Metal

CUDA

Inference Flow:

Load GGUF model from local path

Initialize context

Tokenize prompt

Stream generated tokens back to JS layer

📦 Expo & EAS Configuration
Expo Mode

Bare workflow

Expo Dev Client

Custom native code enabled

EAS

Configure:

Android NDK

CMake

Build profile:

Development

Production

🔐 Permissions

Android Storage Access (scoped)

No internet required after model download

🗂️ Project Folder Structure
/app
 ├─ screens/
 │   ├─ ModelDownloadScreen.tsx
 │   ├─ ModelManagerScreen.tsx
 │   └─ ChatScreen.tsx
 ├─ components/
 ├─ store/
 ├─ services/
 ├─ utils/
 └─ navigation/

/native
 └─ OfflineLLMModule/
     ├─ android/
     │   ├─ cpp/
     │   │   ├─ llama.cpp
     │   │   └─ bridge.cpp
     │   └─ java/

🚀 Performance Constraints

Target devices:

6GB+ RAM recommended

Token speed:

5–15 tokens/sec (acceptable)

Memory usage must be monitored

Gracefully fail on unsupported devices

🧪 Testing Requirements

Test with:

Internet OFF

App restart

Model switching

Verify:

No crashes

Context reset works

Storage cleanup works

🛑 Explicit Non-Goals

❌ Cloud inference

❌ Login / auth

❌ Analytics

❌ iOS support (for now)

❌ Large 7B+ unquantized models

📌 Final Deliverables

Working Android APK / AAB

Offline inference functional

Model download + management

Clean UI with smooth chat experience

Expo + EAS compatible build

🔥 Build Priority Order

Native llama.cpp integration

Single model inference

Offline chat UI

Model download manager

UX polish