import { requireNativeView } from 'expo';
import * as React from 'react';

import { OfflineLLMModuleViewProps } from './OfflineLLMModule.types';

const NativeView: React.ComponentType<OfflineLLMModuleViewProps> =
  requireNativeView('OfflineLLMModule');

export default function OfflineLLMModuleView(props: OfflineLLMModuleViewProps) {
  return <NativeView {...props} />;
}
