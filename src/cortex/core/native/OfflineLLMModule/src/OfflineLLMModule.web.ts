import { registerWebModule, NativeModule } from 'expo';

import { ChangeEventPayload } from './OfflineLLMModule.types';

type OfflineLLMModuleEvents = {
  onChange: (params: ChangeEventPayload) => void;
}

class OfflineLLMModule extends NativeModule<OfflineLLMModuleEvents> {
  PI = Math.PI;
  async setValueAsync(value: string): Promise<void> {
    this.emit('onChange', { value });
  }
  hello() {
    return 'Hello world! 👋';
  }
};

export default registerWebModule(OfflineLLMModule, 'OfflineLLMModule');
