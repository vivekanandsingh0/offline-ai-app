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

    AsyncFunction("generate") { prompt: String ->
      generateNative(prompt)
    }

    AsyncFunction("stopGeneration") {
      stopGenerationNative()
    }
  }



  external fun loadModelNative(modelPath: String): Boolean
  external fun unloadModelNative()
  external fun generateNative(prompt: String): String
  external fun stopGenerationNative()
}
