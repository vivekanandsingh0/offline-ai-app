cmake_minimum_required(VERSION 3.4.1)

project(offlinellm)

set(NAME offlinellm)

# Force Release build and enable NEON for Android ARM speed
set(CMAKE_BUILD_TYPE Release CACHE STRING "" FORCE)
set(GGML_NEON ON CACHE BOOL "" FORCE)
set(GGML_F16C ON CACHE BOOL "" FORCE)
set(GGML_FMA ON CACHE BOOL "" FORCE)

# Configure llama.cpp build options
set(LLAMA_BUILD_COMMON OFF CACHE BOOL "" FORCE)
set(LLAMA_BUILD_TESTS OFF CACHE BOOL "" FORCE)
set(LLAMA_BUILD_EXAMPLES OFF CACHE BOOL "" FORCE)
set(LLAMA_BUILD_SERVER OFF CACHE BOOL "" FORCE)
set(LLAMA_STATIC ON CACHE BOOL "" FORCE)

# Add llama.cpp subdirectory
add_subdirectory(cpp/llama.cpp)

# Add our JNI bridge
add_library(${NAME} SHARED
    cpp/bridge.cpp
)

# Include directories
target_include_directories(${NAME} PRIVATE
    cpp/llama.cpp/include
    cpp/llama.cpp/common
    cpp/llama.cpp/ggml/include
)

# Link libraries
target_link_libraries(${NAME}
    llama
    log
    android
)
