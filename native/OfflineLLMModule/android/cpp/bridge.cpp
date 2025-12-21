#include <jni.h>
#include <string>
#include <vector>
#include <android/log.h>
#include "llama.h"

#define TAG "OfflineLLMWrapper"
#define LOGI(...) __android_log_print(ANDROID_LOG_INFO, TAG, __VA_ARGS__)
#define LOGE(...) __android_log_print(ANDROID_LOG_ERROR, TAG, __VA_ARGS__)

static llama_model *model = nullptr;
static llama_context *ctx = nullptr;
static llama_sampler *sampler = nullptr;
static std::atomic<bool> shouldStop(false);

static jclass javaClassRef = nullptr;

// Helper to emit tokens to Kotlin
void emit_token(JNIEnv *env, const char *token) {
    if (javaClassRef == nullptr) {
        LOGE("Java class reference is null");
        return;
    }
    jmethodID method = env->GetStaticMethodID(javaClassRef, "onTokenFromNative", "(Ljava/lang/String;)V");
    if (method == nullptr) {
        LOGE("Could not find onTokenFromNative method");
        return;
    }
    
    jstring jtoken = env->NewStringUTF(token);
    env->CallStaticVoidMethod(javaClassRef, method, jtoken);
    env->DeleteLocalRef(jtoken);
}

extern "C" {

JNIEXPORT jboolean JNICALL
Java_expo_modules_offlinellmmodule_OfflineLLMModule_loadModelNative(
    JNIEnv *env,
    jobject thiz,
    jstring modelPath
) {
    if (model) {
        LOGI("Model is already loaded");
        return JNI_TRUE;
    }

    if (javaClassRef == nullptr) {
        jclass clazz = env->FindClass("expo/modules/offlinellmmodule/OfflineLLMModule");
        javaClassRef = (jclass)env->NewGlobalRef(clazz);
    }

    const char *path = env->GetStringUTFChars(modelPath, nullptr);
    LOGI("Loading model from %s", path);

    // Initialize backend
    llama_backend_init();

    llama_model_params model_params = llama_model_default_params();
    model = llama_model_load_from_file(path, model_params);

    env->ReleaseStringUTFChars(modelPath, path);

    if (!model) {
        LOGE("Failed to load model");
        return JNI_FALSE;
    }

    llama_context_params ctx_params = llama_context_default_params();
    ctx_params.n_ctx = 512; // Smaller context = significantly faster pre-fill
    ctx_params.n_batch = 256; 
    ctx_params.n_threads = 4; // 4 is stable; 6-8 can cause overheating
    ctx_params.n_threads_batch = 4;
    
    ctx = llama_init_from_model(model, ctx_params);

    if (!ctx) {
        LOGE("Failed to create context");
        llama_model_free(model);
        model = nullptr;
        return JNI_FALSE;
    }

    // Initialize sampler: Penalties -> Temp -> Top-K -> Top-P -> Dist
    llama_sampler_chain_params sparams = llama_sampler_chain_default_params();
    sampler = llama_sampler_chain_init(sparams);
    
    // Optimized for speed and coherence on mobile
    llama_sampler_chain_add(sampler, llama_sampler_init_penalties(64, 1.1f, 0.0f, 0.0f));
    llama_sampler_chain_add(sampler, llama_sampler_init_temp(0.6f));
    llama_sampler_chain_add(sampler, llama_sampler_init_top_k(30));
    llama_sampler_chain_add(sampler, llama_sampler_init_top_p(0.90f, 1));
    llama_sampler_chain_add(sampler, llama_sampler_init_dist(1234));

    LOGI("Model loaded successfully with 4 threads and 1024 context");
    return JNI_TRUE;
}

JNIEXPORT void JNICALL
Java_expo_modules_offlinellmmodule_OfflineLLMModule_unloadModelNative(
    JNIEnv *env,
    jobject thiz
) {
    if (sampler) {
        llama_sampler_free(sampler);
        sampler = nullptr;
    }
    if (ctx) {
        llama_free(ctx);
        ctx = nullptr;
    }
    if (model) {
        llama_model_free(model);
        model = nullptr;
    }
    llama_backend_free();
    LOGI("Model unloaded");
}

JNIEXPORT jstring JNICALL
Java_expo_modules_offlinellmmodule_OfflineLLMModule_generateNative(
    JNIEnv *env,
    jobject thiz,
    jstring prompt
) {
    if (!model || !ctx) {
         LOGE("Model/Context not initialized");
         return env->NewStringUTF("Error: Model not loaded");
    }

    const char *promptStr = env->GetStringUTFChars(prompt, nullptr);
    std::string prompt_text(promptStr);
    env->ReleaseStringUTFChars(prompt, promptStr);

    LOGI("Generating for prompt: %s", prompt_text.c_str());
    shouldStop = false;

    // Clear KV cache for fresh generation
    llama_memory_seq_rm(llama_get_memory(ctx), -1, -1, -1);

    // Tokenize
    const struct llama_vocab * vocab = llama_model_get_vocab(model);
    
    // Allocate enough space for tokens
    int32_t n_tokens_alloc = prompt_text.length() + 2; 
    std::vector<llama_token> tokens_list(n_tokens_alloc);
    
    // tokenize
    int32_t n_tokens_real = llama_tokenize(vocab, prompt_text.c_str(), prompt_text.length(), tokens_list.data(), tokens_list.size(), true, false);
    
    if (n_tokens_real < 0) {
        // Buffer too small, resize and retry
        tokens_list.resize(-n_tokens_real);
        n_tokens_real = llama_tokenize(vocab, prompt_text.c_str(), prompt_text.length(), tokens_list.data(), tokens_list.size(), true, false);
    }
    
    if (n_tokens_real < 0) { // Should not happen after resize
        return env->NewStringUTF("Error: Tokenization failed");
    }

    LOGI("Tokenized into %d tokens", n_tokens_real);

    // Init batch
    llama_batch batch = llama_batch_init(512, 0, 1); 

    // Fill batch with prompt
    batch.n_tokens = n_tokens_real;
    for (int32_t i = 0; i < n_tokens_real; i++) {
        batch.token[i] = tokens_list[i];
        batch.pos[i] = i;
        batch.n_seq_id[i] = 1;
        batch.seq_id[i][0] = 0;
        batch.logits[i] = false;
    }
    batch.logits[n_tokens_real - 1] = true; // predict next token

    // Decode prompt
    if (llama_decode(ctx, batch) != 0) {
        LOGE("llama_decode failed on prompt");
        llama_batch_free(batch);
        return env->NewStringUTF("Error: Decode failed");
    }
    
    std::string result = "";
    int n_cur = n_tokens_real;
    int n_decode = 0;
    const int max_new_tokens = 256; 
    
    LOGI("Starting generation loop with streaming");
    while (n_decode < max_new_tokens) {
        if (n_decode % 10 == 0) LOGI("Heartbeat: generated %d tokens", n_decode);
        if (shouldStop) {
            LOGI("Generation interrupted by user");
            break;
        }
        // Sample next token
        llama_token new_token_id = llama_sampler_sample(sampler, ctx, -1);
        llama_sampler_accept(sampler, new_token_id);
        
        // Check End of Generation
        if (llama_vocab_is_eog(vocab, new_token_id)) {
            LOGI("EOG token reached");
            break;
        }

        // Convert token to string
        char buf[256];
        int n = llama_token_to_piece(vocab, new_token_id, buf, sizeof(buf), 0, false);
        if (n > 0) {
            std::string piece(buf, n);
            result += piece;
            
            // EMIT TOKEN TO JS
            emit_token(env, piece.c_str());
        }
        
        // Prepare next batch (single token)
        batch.n_tokens = 1;
        batch.token[0] = new_token_id;
        batch.pos[0] = n_cur;
        batch.n_seq_id[0] = 1;
        batch.seq_id[0][0] = 0;
        batch.logits[0] = true;
        
        n_cur++;
        n_decode++;
        
        if (llama_decode(ctx, batch) != 0) {
            LOGE("llama_decode failed during generation at token %d", n_decode);
            break;
        }
    }
    
    LOGI("Generation finished. Total tokens: %d", n_decode);
    llama_batch_free(batch);
    
    return env->NewStringUTF(result.c_str());
}

JNIEXPORT void JNICALL
Java_expo_modules_offlinellmmodule_OfflineLLMModule_stopGenerationNative(
    JNIEnv *env,
    jobject thiz
) {
    shouldStop = true;
}

}
