import { NativeModule, requireNativeModule } from 'expo';

declare class OfflineLLMModule extends NativeModule {
  loadModel(modelPath: string): Promise<boolean>;
  unloadModel(): void;
  generate(prompt: string): Promise<string>;
  stopGeneration(): Promise<void>;
  addListener(eventName: 'onToken', listener: (event: { token: string }) => void): any;
}

export default requireNativeModule<OfflineLLMModule>('OfflineLLMModule');
