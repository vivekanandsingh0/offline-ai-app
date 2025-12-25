import * as React from 'react';

import { OfflineLLMModuleViewProps } from './OfflineLLMModule.types';

export default function OfflineLLMModuleView(props: OfflineLLMModuleViewProps) {
  return (
    <div>
      <iframe
        style={{ flex: 1 }}
        src={props.url}
        onLoad={() => props.onLoad({ nativeEvent: { url: props.url } })}
      />
    </div>
  );
}
