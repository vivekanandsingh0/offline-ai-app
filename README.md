# Offline AI App

An offline local LLM chat application built with React Native (Expo), calling `llama.cpp` via JNI for inference on Android.

## Features
- **Download Models**: Fetch quantized GGUF models directly from Hugging Face.
- **Offline Inference**: Run LLMs locally on your device without internet.
- **Chat Interface**: Simple chat UI to interact with loaded models.

## Setup

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Prebuild & Run on Android**:
   ```bash
   npx expo run:android
   ```
   *Note: This requires Android Studio and NDK to be installed.*

## Architecture
- **React Native**: UI and logic.
- **Expo Modules**: Bridge between JS and Native.
- **C++ Native Module**: `OfflineLLMModule` located in `native/OfflineLLMModule`.
- **llama.cpp**: Submoduled in `native/OfflineLLMModule/android/cpp/llama.cpp`.

## Troubleshooting
- **NDK Errors**: Ensure you have NDK (Side-by-side) installed via Android Studio SDK Manager.
- **CMake Errors**: Check `native/OfflineLLMModule/android/CMakeLists.txt` configuration.
