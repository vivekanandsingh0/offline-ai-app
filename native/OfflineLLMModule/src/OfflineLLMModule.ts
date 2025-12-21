import { NativeModule, requireNativeModule } from 'expo';

declare class OfflineLLMModule extends NativeModule {
  loadModel(modelPath: string): Promise<boolean>;
  unloadModel(): void;
  generate(prompt: string): Promise<string>;
}

export default requireNativeModule<OfflineLLMModule>('OfflineLLMModule');
