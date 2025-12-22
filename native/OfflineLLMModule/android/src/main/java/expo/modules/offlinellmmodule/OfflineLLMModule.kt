package expo.modules.offlinellmmodule

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class OfflineLLMModule : Module() {
  companion object {
    private var instance: OfflineLLMModule? = null

    init {
      System.loadLibrary("offlinellm")
    }

    @JvmStatic
    fun onTokenFromNative(token: String) {
      instance?.sendEvent("onToken", mapOf("token" to token))
    }
  }

  override fun definition() = ModuleDefinition {
    Name("OfflineLLMModule")

    Events("onToken")

    OnCreate {
      instance = this@OfflineLLMModule
    }

    OnDestroy {
      instance = null
    }

    AsyncFunction("loadModel") { modelPath: String ->
      val sanitizedPath = if (modelPath.startsWith("file://")) {
        modelPath.substring(7)
      } else {
        modelPath
      }
      loadModelNative(sanitizedPath)
    }

    Function("unloadModel") {
      unloadModelNative()
    }

    val executor = java.util.concurrent.Executors.newSingleThreadExecutor()

    AsyncFunction("generate") { prompt: String, options: Map<String, Any>?, promise: expo.modules.kotlin.Promise ->
      val temperature = (options?.get("temperature") as? Number)?.toDouble() ?: 0.7
      val topK = (options?.get("top_k") as? Number)?.toInt() ?: 40
      val topP = (options?.get("top_p") as? Number)?.toDouble() ?: 0.9
      val maxTokens = (options?.get("max_tokens") as? Number)?.toInt() ?: 256

      executor.execute {
        try {
          val result = generateNative(prompt, temperature, topK, topP, maxTokens)
          promise.resolve(result)
        } catch (e: Exception) {
          promise.reject("ERR_GENERATE", e.message, e)
        }
      }
    }

    AsyncFunction("stopGeneration") {
      stopGenerationNative()
    }
  }



  external fun loadModelNative(modelPath: String): Boolean
  external fun unloadModelNative()
  external fun generateNative(prompt: String, temperature: Double, topK: Int, topP: Double, maxTokens: Int): String
  external fun stopGenerationNative()
}
