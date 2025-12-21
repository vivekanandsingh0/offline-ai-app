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
    ctx_params.n_ctx = 2048; // Default context window
    ctx_params.n_batch = 512;
    
    ctx = llama_init_from_model(model, ctx_params);

    if (!ctx) {
        LOGE("Failed to create context");
        llama_model_free(model);
        model = nullptr;
        return JNI_FALSE;
    }

    // Initialize sampler: Temp=0.8, Top-K=40, Top-P=0.95
    llama_sampler_chain_params sparams = llama_sampler_chain_default_params();
    sampler = llama_sampler_chain_init(sparams);
    
    llama_sampler_chain_add(sampler, llama_sampler_init_top_k(40));
    llama_sampler_chain_add(sampler, llama_sampler_init_top_p(0.95f, 1));
    llama_sampler_chain_add(sampler, llama_sampler_init_temp(0.8f));
    llama_sampler_chain_add(sampler, llama_sampler_init_dist(1234));

    LOGI("Model loaded successfully");
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

    // Init batch
    // We allocate a batch capable of holding the max context or at least our prompt
    // For decoding loop we only need 1 slot, but for prompt we need n_tokens_real
    int batch_alloc = n_tokens_real > 2048 ? n_tokens_real : 2048;
    llama_batch batch = llama_batch_init(batch_alloc, 0, 1); 

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
    const int max_new_tokens = 256; // hardcoded limit for now
    
    while (n_decode < max_new_tokens) {
        // Sample next token
        llama_token new_token_id = llama_sampler_sample(sampler, ctx, -1);
        llama_sampler_accept(sampler, new_token_id);
        
        // Check End of Generation
        if (llama_vocab_is_eog(vocab, new_token_id)) {
            break;
        }

        // Convert token to string
        char buf[256];
        int n = llama_token_to_piece(vocab, new_token_id, buf, sizeof(buf), 0, false);
        if (n > 0) {
            result += std::string(buf, n);
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
            LOGE("llama_decode failed during generation");
            break;
        }
    }
    
    llama_batch_free(batch);
    
    return env->NewStringUTF(result.c_str());
}

}
