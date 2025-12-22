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
    model_params.use_mmap = true;   // Essential for multi-GB models
    model_params.use_mlock = false; // Don't lock to RAM (prevents system-wide slowdowns)
    
    model = llama_model_load_from_file(path, model_params);

    if (model) {
        LOGI("Model loaded with MMAP. Memory management prioritized.");
    }

    env->ReleaseStringUTFChars(modelPath, path);

    if (!model) {
        LOGE("Failed to load model");
        return JNI_FALSE;
    }

    llama_context_params ctx_params = llama_context_default_params();
    ctx_params.n_ctx = 1024; // Strict PocketPal limit
    ctx_params.n_batch = 64; 
    ctx_params.n_threads = 4;
    ctx_params.n_threads_batch = 4;
    
    ctx = llama_init_from_model(model, ctx_params);

    if (!ctx) {
        LOGE("Failed to create context");
        llama_model_free(model);
        model = nullptr;
        return JNI_FALSE;
    }

    // Sampler is now initialized per-generation in generateNative
    
    LOGI("Engine: PocketPal Ready (Ctx 1024)");
    return JNI_TRUE;
}

static int n_past = 0; // State for KV Cache reuse

JNIEXPORT void JNICALL
Java_expo_modules_offlinellmmodule_OfflineLLMModule_unloadModelNative(
    JNIEnv *env,
    jobject thiz
) {
    n_past = 0; // Reset cache state
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
    jstring prompt,
    jdouble temperature,
    jint top_k,
    jdouble top_p,
    jint max_tokens
) {
    if (!model || !ctx) {
         LOGE("Model/Context not initialized");
         return env->NewStringUTF("Error: Model not loaded");
    }

    const char *promptStr = env->GetStringUTFChars(prompt, nullptr);
    std::string prompt_text(promptStr);
    env->ReleaseStringUTFChars(prompt, promptStr);

    shouldStop = false;

    // Flush cache for every new prompt to ensure clean history handling in JS
    llama_memory_seq_rm(llama_get_memory(ctx), -1, -1, -1);
    n_past = 0;

    const struct llama_vocab * vocab = llama_model_get_vocab(model);
    std::vector<llama_token> tokens_list(prompt_text.length() + 2);
    // CRITICAL FIX: add_special=false (we add it in JS), parse_special=true (interpret <|eot_id|> as tokens)
    int32_t n_tokens_real = llama_tokenize(vocab, prompt_text.c_str(), prompt_text.length(), tokens_list.data(), tokens_list.size(), false, true);
    
    if (n_tokens_real < 0) {
        tokens_list.resize(-n_tokens_real);
        n_tokens_real = llama_tokenize(vocab, prompt_text.c_str(), prompt_text.length(), tokens_list.data(), tokens_list.size(), false, true);
    }

    llama_batch batch = llama_batch_init(256, 0, 1); 

    int n_processed = 0;
    while (n_processed < n_tokens_real) {
        int n_batch = std::min(64, n_tokens_real - n_processed);
        batch.n_tokens = n_batch;
        for (int i = 0; i < n_batch; i++) {
            batch.token[i] = tokens_list[n_processed + i];
            batch.pos[i] = n_processed + i;
            batch.n_seq_id[i] = 1;
            batch.seq_id[i][0] = 0;
            batch.logits[i] = (n_processed + i == n_tokens_real - 1);
        }
        if (llama_decode(ctx, batch) != 0) break;
        n_processed += n_batch;
    }
    
    // Initialize Sampler for this request
    llama_sampler_chain_params sparams = llama_sampler_chain_default_params();
    sampler = llama_sampler_chain_init(sparams);
    
    llama_sampler_chain_add(sampler, llama_sampler_init_penalties(64, 1.1f, 0.0f, 0.0f)); 
    llama_sampler_chain_add(sampler, llama_sampler_init_temp((float)temperature)); 
    llama_sampler_chain_add(sampler, llama_sampler_init_top_k(top_k));
    llama_sampler_chain_add(sampler, llama_sampler_init_top_p((float)top_p, 1));
    llama_sampler_chain_add(sampler, llama_sampler_init_dist(1234));

    std::string result = "";
    int n_cur = n_tokens_real;
    int n_decode = 0;
    const int max_new_tokens = max_tokens; 
    
    while (n_decode < max_new_tokens) {
        if (shouldStop) break;

        llama_token new_token_id = llama_sampler_sample(sampler, ctx, -1);
        llama_sampler_accept(sampler, new_token_id);
        
        if (llama_vocab_is_eog(vocab, new_token_id)) break;

        char buf[256];
        int n = llama_token_to_piece(vocab, new_token_id, buf, sizeof(buf), 0, false);
        if (n > 0) {
            std::string piece(buf, n);
            result += piece;
            
            // --- AGGRESSIVE STOP CHECK ---
            // We check if the piece we just added finished a stop word
            if (result.find("<|eot_id|>") != std::string::npos || 
                result.find("<|start_header_id|>") != std::string::npos ||
                result.find("User:") != std::string::npos ||
                result.find("user:") != std::string::npos ||
                result.find("Assistant:") != std::string::npos ||
                result.find("assistant:") != std::string::npos) {
                break;
            }

            emit_token(env, piece.c_str());
        }
        
        batch.n_tokens = 1;
        batch.token[0] = new_token_id;
        batch.pos[0] = n_cur;
        batch.n_seq_id[0] = 1;
        batch.seq_id[0][0] = 0;
        batch.logits[0] = true;
        
        n_cur++;
        n_decode++;
        
        if (llama_decode(ctx, batch) != 0) break;
    }
    
    llama_batch_free(batch);

    // Sanitize before return
    size_t stop1 = result.find("<|");
    size_t stop2 = result.find("User:");
    size_t stop3 = result.find("Assistant:");
    size_t final_stop = std::string::npos;
    
    if (stop1 != std::string::npos) final_stop = stop1;
    if (stop2 != std::string::npos && (final_stop == std::string::npos || stop2 < final_stop)) final_stop = stop2;
    if (stop3 != std::string::npos && (final_stop == std::string::npos || stop3 < final_stop)) final_stop = stop3;

    if (final_stop != std::string::npos) {
        result = result.substr(0, final_stop);
    }

    // Cleanup sampler for this request
    llama_sampler_free(sampler);
    sampler = nullptr;

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
