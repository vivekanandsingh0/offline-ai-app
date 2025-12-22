import { NativeModule, requireNativeModule } from 'expo';

declare class OfflineLLMModule extends NativeModule {
  loadModel(modelPath: string): Promise<boolean>;
  unloadModel(): void;
  generate(prompt: string, options?: {
    temperature?: number;
    top_k?: number;
    top_p?: number;
    max_tokens?: number;
  }): Promise<string>;
  stopGeneration(): Promise<void>;
  addListener(eventName: 'onToken', listener: (event: { token: string }) => void): any;
}

export default requireNativeModule<OfflineLLMModule>('OfflineLLMModule');
