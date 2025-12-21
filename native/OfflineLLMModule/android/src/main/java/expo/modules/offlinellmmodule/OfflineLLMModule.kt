package expo.modules.offlinellmmodule

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class OfflineLLMModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("OfflineLLMModule")

    AsyncFunction("loadModel") { modelPath: String ->
      loadModelNative(modelPath)
    }

    Function("unloadModel") {
      unloadModelNative()
    }

    AsyncFunction("generate") { prompt: String ->
      generateNative(prompt)
    }
  }

  companion object {
    init {
      System.loadLibrary("offlinellm")
    }
  }

  external fun loadModelNative(modelPath: String): Boolean
  external fun unloadModelNative()
  external fun generateNative(prompt: String): String
}
