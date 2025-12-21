# PocketPal AI: Technical Documentation 📱🚀

This document provides a detailed overview of the technical architecture, optimization strategies, and hardware-specific techniques used in PocketPal AI to achieve high-speed, local LLM inference on mobile devices.

---

## 🏗️ 1. Core Architecture & Tech Stack

PocketPal AI is designed for high-performance native-to-javascript communication, ensuring that the heavy lifting of AI inference does not freeze the user interface.

| Component | Technology | Rationale |
| :--- | :--- | :--- |
| **Framework** | **React Native (0.79+)** | Enables cross-platform development with native performance characteristics. |
| **Inference Engine** | **llama.rn (JSI)** | A bridge to `llama.cpp` using the **JavaScript Interface (JSI)**. JSI allows the JS engine to hold a reference to C++ objects, enabling near-zero overhead communication. |
| **State Management** | **MobX** | Provides a reactive engine that handles high-frequency streaming updates (text generation) without unnecessary UI re-renders. |
| **Persistence** | **WatermelonDB** | A high-performance, reactive SQLite-based database designed for large data sets, used for chat history and session management. |
| **File System** | **@dr.pogodin/react-native-fs** | Managed file system access for multi-gigabyte GGUF model storage. |

---

## 🚀 2. Model Optimization Strategy

The speed of PocketPal comes from a combination of specialized model formats and low-level system optimizations.

### A. Format & Quantization
*   **GGUF (GPT-Generated Unified Format):** The optimized binary format for LLMs that allows for efficient metadata handling and fast memory loading.
*   **K-Quants (4-bit / 8-bit):** 
    *   **Q4_K_M:** The "Golden Standard" for mobile. It reduces a 16-bit model's size by ~75% while maintaining ~95%+ of the original intelligence.
    *   **Q8_0:** Used for higher accuracy on devices with ample RAM.

### B. Memory Management Techniques
*   **Memory Mapping (`mmap`):** Instead of loading a 2GB model into the app's heap, `mmap` maps the file content to the virtual address space. The OS manages which chunks are in physical RAM, preventing "Out of Memory" (OOM) crashes.
*   **Unified KV Cache (`kv_unified`):** A critical optimization that shares memory between prompt processing and token generation, potentially saving several gigabytes of RAM.
*   **Smart Release:** The app monitors `AppState`. When moved to the background, it releases the heavy AI context to keep the system stable but persists the session state for instant resumption.

---

## ⚡ 3. Hardware Acceleration

PocketPal AI dynamically detects device capabilities to apply hardware-specific optimizations.

### **iOS (Metal Performance Shaders)**
*   **Requirement:** iOS 18+ is prioritized for the latest Metal features.
*   **Acceleration:** Utilizes Apple's GPU for matrix multiplications.
*   **Flash Attention:** Automatically enabled on supported Apple Silicon (A-series/M-series) to drastically reduce "Prefill" time for long conversations.

### **Android (OpenCL & Vulkan)**
*   **Hardware Check:** The app scans for **Adreno GPUs** and internal CPU instructions like **i8mm** and **dotprod**.
*   **Acceleration:** If requirements are met, it uses OpenCL to offload calculations to the GPU.
*   **Thermal Control:** Dynamically calculates `n_threads` (usually `0.8 * Physical Cores`) to maximize speed without causing the device to overheat or throttle.

---

## 🛠️ 4. Advanced Features & Logic

### **Multimodal (Vision) Working**
*   **Projection Models:** For models like Llama-3.2-Vision, the app loads an additional `mmproj` (Multimodal Projection) file.
*   **Image Tokenization:** Images are converted into a series of mathematical vectors that are "injected" into the LLM's context window along with the text prompt.

### **The "Pals" Persona System**
*   **System Prompt Injection:** Pre-configured personalities use specialized system prompts.
*   **Roleplay Parameters:** The engine dynamically replaces variables (e.g., `{{user_location}}`, `{{ai_persona}}`) in the prompt template immediately before starting inference.

### **Streaming Performance**
*   **UI Throttling:** The app receives tokens in real-time but only refreshes the React component every **150ms** (`STREAMING_THROTTLE_MS`). This avoids "React updates" becoming a bottleneck.

---

## 📋 5. Developer "Cheat Sheet" for Local AI

If you are replicating this stack, follow these core principles:

1.  **Use JSI Bridges:** Never use standard `NativeModules` with JSON serialization for streaming text; it is too slow.
2.  **Quantize Everything:** Never try to run FP16 (full precision) models on mobile. Stick to Q4_K_M.
3.  **Keep Screen Awake:** Use `activateKeepAwake()` during inference, as local CPU/GPU usage is intense and can be interrupted by the OS sleeping.
4.  **Local Path Management:** Always store models in the `DocumentDirectory` or `ApplicationSupport` folders to prevent the OS from cleaning them up as "cache."

---

## 📦 6. Primary Libraries
*   Core Engine: [llama.cpp](https://github.com/ggerganov/llama.cpp)
*   RN Bridge: [llama.rn](https://github.com/mybigday/llama.rn)
*   Model Hub: [Hugging Face](https://huggingface.co/)
