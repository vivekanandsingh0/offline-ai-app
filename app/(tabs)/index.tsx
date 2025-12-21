import { useColorScheme } from '@/hooks/use-color-scheme';
import { Ionicons } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import OfflineLLMModule from 'offline-llm-module';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { BorderRadius, Colors, Spacing } from '../../constants/theme';
import { useModelStore } from '../../store/useModelStore';

type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  pending?: boolean;
  metadata?: {
    time?: string;
    source?: string;
  }
};

type Capability = 'Fast' | 'Balanced' | 'Accurate';

export default function ChatScreen() {
  const { activeModelId, localModels } = useModelStore();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [generating, setGenerating] = useState(false);
  const [capability, setCapability] = useState<Capability>('Balanced');
  const [showCapabilityMenu, setShowCapabilityMenu] = useState(false);

  const flatListRef = useRef<FlatList>(null);
  const activeModel = activeModelId ? localModels[activeModelId] : null;

  useEffect(() => {
    if (activeModel) {
      if (messages.length === 0) {
        setMessages([{
          id: 'welcome',
          role: 'assistant',
          content: `Hello! I'm using ${activeModel.name}. How can I help you today?`,
          metadata: { source: 'Local' }
        }]);
      }
    } else {
      setMessages([]);
    }
  }, [activeModelId]);

  const handleSend = async () => {
    if (!input.trim() || !activeModelId || generating) return;

    const startTime = Date.now();
    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setGenerating(true);

    const assistantMsgId = (Date.now() + 1).toString();
    setMessages(prev => [...prev, { id: assistantMsgId, role: 'assistant', content: '', pending: true }]);

    const subscription = OfflineLLMModule.addListener('onToken', (event: { token: string }) => {
      setMessages(prev => prev.map(msg =>
        msg.id === assistantMsgId
          ? { ...msg, content: msg.content + event.token, pending: false }
          : msg
      ));
    });

    try {
      // Use the correct template based on the model family
      const isLlama3 = activeModel?.name.toLowerCase().includes('llama-3');

      let prompt = '';
      if (isLlama3) {
        prompt = `<|begin_of_text|><|start_header_id|>system<|end_header_id|>\n\nYou are a helpful assistant.<|eot_id|><|start_header_id|>user<|end_header_id|>\n\n${userMsg.content}<|eot_id|><|start_header_id|>assistant<|end_header_id|>\n\n`;
      } else {
        // Fallback for Mistral / TinyLlama
        prompt = `<s>[INST] ${userMsg.content} [/INST]`;
      }

      const response = await OfflineLLMModule.generate(prompt);

      const endTime = Date.now();
      const duration = ((endTime - startTime) / 1000).toFixed(1) + 's';

      setMessages(prev => prev.map(msg =>
        msg.id === assistantMsgId
          ? { ...msg, content: response, pending: false, metadata: { time: duration, source: 'Local' } }
          : msg
      ));
    } catch (e) {
      setMessages(prev => prev.map(msg =>
        msg.id === assistantMsgId
          ? { ...msg, content: "Error: " + e, pending: false }
          : msg
      ));
    } finally {
      subscription.remove();
      setGenerating(false);
    }
  };

  const handleStop = async () => {
    if (generating) {
      await OfflineLLMModule.stopGeneration();
    }
  };

  if (!activeModelId) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: theme.background }]}>
        <Stack.Screen options={{ title: 'Chat' }} />
        <View style={[styles.iconCircle, { backgroundColor: theme.card }]}>
          <Ionicons name="chatbubble-ellipses-outline" size={40} color={theme.primary} />
        </View>
        <Text style={[styles.placeholderTitle, { color: theme.text }]}>No Model Loaded</Text>
        <Text style={[styles.placeholderText, { color: theme.secondaryText }]}>
          Head over to the Host tab to download and load a model to start chatting.
        </Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.container, { backgroundColor: theme.background }]}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <Stack.Screen options={{
        headerTitle: () => (
          <TouchableOpacity
            style={styles.headerTitleContainer}
            onPress={() => setShowCapabilityMenu(true)}
          >
            <Text style={[styles.headerTitle, { color: theme.text }]}>{capability}</Text>
            <Ionicons name="chevron-down" size={14} color={theme.secondaryText} style={{ marginLeft: 4 }} />
          </TouchableOpacity>
        ),
        headerShown: true,
        headerStyle: { backgroundColor: theme.background },
        headerShadowVisible: false,
      }} />

      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        renderItem={({ item }) => (
          <View style={[
            styles.msgContainer,
            item.role === 'user' ? styles.userContainer : styles.assistantContainer
          ]}>
            <View style={[
              styles.msgBubble,
              item.role === 'user'
                ? [styles.userBubble, { backgroundColor: theme.bubbleUser }]
                : [styles.assistantBubble, { backgroundColor: theme.bubbleAssistant }]
            ]}>
              <Text style={[
                styles.msgText,
                item.role === 'user' ? { color: '#FFF' } : { color: theme.text }
              ]}>{item.content}</Text>

              {item.pending && (
                <View style={styles.pendingIndicator}>
                  <ActivityIndicator size="small" color={theme.secondaryText} />
                </View>
              )}
            </View>

            {item.metadata && (
              <View style={[styles.metadataRow, item.role === 'user' && { justifyContent: 'flex-end' }]}>
                {item.metadata.time && <Text style={styles.metadataText}>{item.metadata.time} • </Text>}
                <Text style={styles.metadataText}>{item.metadata.source}</Text>
              </View>
            )}
          </View>
        )}
      />

      <View style={[styles.inputContainer, { backgroundColor: theme.background, borderTopColor: theme.border }]}>
        <View style={[styles.inputWrapper, { backgroundColor: theme.card }]}>
          <TextInput
            style={[styles.input, { color: theme.text }]}
            value={input}
            onChangeText={setInput}
            placeholder="Ask anything..."
            placeholderTextColor={theme.secondaryText}
            multiline
            editable={!generating}
          />
          {generating ? (
            <TouchableOpacity style={styles.stopButton} onPress={handleStop}>
              <Ionicons name="stop" size={20} color={theme.error} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.sendButton, !input.trim() && { opacity: 0.5 }]}
              onPress={handleSend}
              disabled={!input.trim()}
            >
              <Ionicons name="arrow-up" size={20} color="white" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <Modal
        visible={showCapabilityMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCapabilityMenu(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowCapabilityMenu(false)}
        >
          <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Selection Mode</Text>
            {(['Fast', 'Balanced', 'Accurate'] as Capability[]).map((cap) => (
              <TouchableOpacity
                key={cap}
                style={styles.modalOption}
                onPress={() => { setCapability(cap); setShowCapabilityMenu(false); }}
              >
                <View>
                  <Text style={[styles.optionTitle, { color: theme.text }]}>{cap}</Text>
                  <Text style={[styles.optionDesc, { color: theme.secondaryText }]}>
                    {cap === 'Fast' ? 'Speed prioritized' : cap === 'Balanced' ? 'Value and speed' : 'Highest precision'}
                  </Text>
                </View>
                {capability === cap && <Ionicons name="checkmark" size={20} color={theme.primary} />}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  placeholderTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: Spacing.sm,
  },
  placeholderText: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: BorderRadius.full,
    backgroundColor: '#00000005',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  list: {
    padding: Spacing.md,
    paddingBottom: Spacing.xl,
  },
  msgContainer: {
    marginBottom: Spacing.md,
    width: '100%',
  },
  userContainer: {
    alignItems: 'flex-end',
  },
  assistantContainer: {
    alignItems: 'flex-start',
  },
  msgBubble: {
    maxWidth: '85%',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: BorderRadius.lg,
  },
  userBubble: {
    borderBottomRightRadius: 4,
  },
  assistantBubble: {
    borderBottomLeftRadius: 4,
  },
  msgText: {
    fontSize: 16,
    lineHeight: 22,
  },
  pendingIndicator: {
    marginTop: 8,
    alignItems: 'flex-start',
  },
  metadataRow: {
    flexDirection: 'row',
    marginTop: 4,
    paddingHorizontal: 4,
  },
  metadataText: {
    fontSize: 11,
    color: '#8E8E93',
  },
  inputContainer: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    paddingBottom: Platform.OS === 'ios' ? Spacing.lg : Spacing.md,
    borderTopWidth: 0.5,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderRadius: BorderRadius.lg,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  input: {
    flex: 1,
    fontSize: 16,
    maxHeight: 120,
    paddingTop: 8,
    paddingBottom: 8,
    paddingRight: 8,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
  },
  stopButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FF3B3015',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: BorderRadius.lg,
    borderTopRightRadius: BorderRadius.lg,
    padding: Spacing.lg,
    paddingBottom: Spacing.xl * 2,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: Spacing.lg,
    textAlign: 'center',
  },
  modalOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderBottomWidth: 0.5,
    borderBottomColor: '#00000010',
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  optionDesc: {
    fontSize: 13,
  },
});
