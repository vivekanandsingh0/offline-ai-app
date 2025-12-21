@echo off
"C:\\Users\\birba\\AppData\\Local\\Android\\Sdk\\cmake\\3.22.1\\bin\\cmake.exe" ^
  "-HC:\\Vivekanand folder\\offline-ai-app\\native\\OfflineLLMModule\\android" ^
  "-DCMAKE_SYSTEM_NAME=Android" ^
  "-DCMAKE_EXPORT_COMPILE_COMMANDS=ON" ^
  "-DCMAKE_SYSTEM_VERSION=24" ^
  "-DANDROID_PLATFORM=android-24" ^
  "-DANDROID_ABI=x86_64" ^
  "-DCMAKE_ANDROID_ARCH_ABI=x86_64" ^
  "-DANDROID_NDK=C:\\Users\\birba\\AppData\\Local\\Android\\Sdk\\ndk\\27.0.12077973" ^
  "-DCMAKE_ANDROID_NDK=C:\\Users\\birba\\AppData\\Local\\Android\\Sdk\\ndk\\27.0.12077973" ^
  "-DCMAKE_TOOLCHAIN_FILE=C:\\Users\\birba\\AppData\\Local\\Android\\Sdk\\ndk\\27.0.12077973\\build\\cmake\\android.toolchain.cmake" ^
  "-DCMAKE_MAKE_PROGRAM=C:\\Users\\birba\\AppData\\Local\\Android\\Sdk\\cmake\\3.22.1\\bin\\ninja.exe" ^
  "-DCMAKE_CXX_FLAGS=-std=c++17 -O3" ^
  "-DCMAKE_LIBRARY_OUTPUT_DIRECTORY=C:\\Vivekanand folder\\offline-ai-app\\native\\OfflineLLMModule\\android\\build\\intermediates\\cxx\\Release\\584o5w3u\\obj\\x86_64" ^
  "-DCMAKE_RUNTIME_OUTPUT_DIRECTORY=C:\\Vivekanand folder\\offline-ai-app\\native\\OfflineLLMModule\\android\\build\\intermediates\\cxx\\Release\\584o5w3u\\obj\\x86_64" ^
  "-BC:\\Vivekanand folder\\offline-ai-app\\native\\OfflineLLMModule\\android\\.cxx\\Release\\584o5w3u\\x86_64" ^
  -GNinja ^
  "-DANDROID_STL=c++_shared" ^
  "-DCMAKE_BUILD_TYPE=Release" ^
  "-DGGML_NEON=ON"
