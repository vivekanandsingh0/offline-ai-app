import { useChatStore } from '@/src/cortex/core/store/useChatStore';
import { useModelStore } from '@/src/cortex/core/store/useModelStore';
import { processQuery } from '@/src/cortex/runtime/CortexRuntime';
import ChatHistoryModal from '@/src/cortex/shared/components/ChatHistoryModal';
import ChatSettingsModal, { ChatSettings, DEFAULT_SETTINGS } from '@/src/cortex/shared/components/ChatSettingsModal';
import { BorderRadius, Colors, Spacing } from '@/src/cortex/shared/constants/theme';
import { useColorScheme } from '@/src/cortex/shared/hooks/use-color-scheme';
import { Ionicons } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import OfflineLLMModule from 'offline-llm-module';
import React, { useEffect, useRef, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import Markdown from 'react-native-markdown-display';

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

export default function ChatScreen() {
  const activeModelId = useModelStore(s => s.activeModelId);
  const activeModelName = useModelStore(s => s.activeModelId ? s.localModels[s.activeModelId]?.name : undefined);

  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [generating, setGenerating] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [chatSettings, setChatSettings] = useState<ChatSettings>(DEFAULT_SETTINGS);

  const flatListRef = useRef<FlatList>(null);

  const TypingIndicator = () => (
    <View style={styles.typingContainer}>
      <View style={[styles.typingDot, { backgroundColor: theme.primary }]} />
      <View style={[styles.typingDot, { backgroundColor: theme.primary, opacity: 0.6 }]} />
      <View style={[styles.typingDot, { backgroundColor: theme.primary, opacity: 0.3 }]} />
    </View>
  );

  const saveCurrentSession = useChatStore(s => s.saveCurrentSession);
  const startNewSession = useChatStore(s => s.startNewSession);
  const currentSessionId = useChatStore(s => s.currentSessionId);

  const clearChat = () => {
    startNewSession();
    setMessages([{
      id: 'welcome',
      role: 'assistant',
      content: `Welcome to Cortex. Using ${activeModelName || 'model'}.`,
      metadata: { source: 'System' }
    }]);
  };

  useEffect(() => {
    if (messages.length > 0 && messages.some(m => m.id !== 'welcome')) {
      const msgsToSave = messages.filter(m => !m.pending && m.id !== 'welcome');
      if (msgsToSave.length > 0) {
        saveCurrentSession(msgsToSave);
      }
    }
  }, [messages]);

  const handleHistorySelect = (loadedMsgs: any[]) => {
    if (loadedMsgs && loadedMsgs.length > 0) {
      const formatted: Message[] = loadedMsgs.map(m => ({ ...m, pending: false }));
      setMessages(formatted);
    }
  };

  useEffect(() => {
    if (activeModelId && activeModelName) {
      if (messages.length === 0) {
        setMessages([{
          id: 'welcome',
          role: 'assistant',
          content: `Welcome to Cortex. Using ${activeModelName}.`,
          metadata: { source: 'System' }
        }]);
      }
    } else {
      setMessages([]);
    }
  }, [activeModelId, activeModelName]);

  const handleSend = async () => {
    if (!input.trim() || !activeModelId || generating) return;

    const startTime = Date.now();
    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setGenerating(true);

    const assistantMsgId = (Date.now() + 1).toString();
    setMessages(prev => [...prev, { id: assistantMsgId, role: 'assistant', content: '', pending: true }]);

    try {
      const modelName = activeModelName || 'Unknown';
      const chatHistory = messages.filter(m => m.id !== 'welcome').slice(-4).map(m => ({ role: m.role, content: m.content }));

      // Use the new CortexRuntime with streaming
      const result = await processQuery(userMsg.content, {
        userClass: null,
        subject: null,
        modelName,
        history: chatHistory,
        generationParams: {
          temperature: chatSettings.temperature,
          max_tokens: chatSettings.max_tokens
        },
        onToken: (token) => {
          setMessages(prev => prev.map(msg =>
            msg.id === assistantMsgId
              ? { ...msg, content: msg.content + token }
              : msg
          ));
        }
      });

      console.log(`[Chat] Query Result: ${result.packUsed ? 'Grounded (' + result.packUsed + ')' : 'Constitutional'}`);

      const endTime = Date.now();
      const duration = ((endTime - startTime) / 1000).toFixed(1) + 's';
      const sourceLabel = result.packUsed ? `Grounded: ${result.packUsed}` : 'Cortex';

      setMessages(prev => prev.map(msg =>
        msg.id === assistantMsgId
          ? { ...msg, content: result.response, pending: false, metadata: { time: duration, source: sourceLabel } }
          : msg
      ));
    } catch (e) {
      setMessages(prev => prev.map(msg =>
        msg.id === assistantMsgId
          ? { ...msg, content: "Runtime Error: " + e, pending: false }
          : msg
      ));
    } finally {
      setGenerating(false);
    }
  };

  const handleStop = async () => {
    if (generating) {
      await OfflineLLMModule.stopGeneration();
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.container, { backgroundColor: theme.background }]}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <Stack.Screen options={{
        title: 'Cortex',
        headerShown: true,
        headerStyle: { backgroundColor: theme.background },
        headerShadowVisible: false,
        headerRight: () => (
          <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 16, gap: 16 }}>
            <TouchableOpacity onPress={() => setShowSettingsModal(true)}>
              <Ionicons name="options-outline" size={22} color={theme.secondaryText} />
            </TouchableOpacity>
            {activeModelId ? (
              <TouchableOpacity onPress={clearChat}>
                <Ionicons name="add" size={26} color={theme.text} />
              </TouchableOpacity>
            ) : null}
          </View>
        ),
        headerLeft: () => (
          <TouchableOpacity onPress={() => setShowHistoryModal(true)} style={{ marginLeft: 16 }}>
            <Ionicons name="time-outline" size={24} color={theme.text} />
          </TouchableOpacity>
        ),
      }} />

      <ChatHistoryModal
        visible={showHistoryModal}
        onClose={() => setShowHistoryModal(false)}
        onSelectSession={handleHistorySelect}
      />
      <ChatSettingsModal
        visible={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        settings={chatSettings}
        onUpdateSettings={setChatSettings}
      />

      {!activeModelId ? (
        <View style={[styles.centerContainer, { backgroundColor: theme.background }]}>
          <View style={[styles.iconCircle, { backgroundColor: theme.card }]}>
            <Ionicons name="flash-outline" size={40} color={theme.primary} />
          </View>
          <Text style={[styles.placeholderTitle, { color: theme.text }]}>Runtime Offline</Text>
          <Text style={[styles.placeholderText, { color: theme.secondaryText }]}>
            Load a model in the Host tab to activate the Cortex Runtime.
          </Text>
        </View>
      ) : (
        <>
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
                  {item.role === 'assistant' && item.pending && !item.content ? (
                    <TypingIndicator />
                  ) : (
                    <Markdown style={{
                      body: {
                        color: item.role === 'user' ? '#FFF' : theme.text,
                        fontSize: 16,
                      },
                      paragraph: {
                        marginBottom: 0,
                      }
                    }}>{item.content}</Markdown>
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
                placeholder="Ask Cortex..."
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
        </>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: Spacing.xl },
  iconCircle: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center', marginBottom: Spacing.lg },
  placeholderTitle: { fontSize: 20, fontWeight: '700', marginBottom: Spacing.sm },
  placeholderText: { fontSize: 15, textAlign: 'center', lineHeight: 22 },
  list: { padding: Spacing.md, paddingBottom: Spacing.xl },
  msgContainer: { marginBottom: Spacing.md, width: '100%' },
  userContainer: { alignItems: 'flex-end' },
  assistantContainer: { alignItems: 'flex-start' },
  msgBubble: { maxWidth: '85%', paddingHorizontal: 16, paddingVertical: 12, borderRadius: BorderRadius.lg },
  userBubble: { borderBottomRightRadius: 4 },
  assistantBubble: { borderBottomLeftRadius: 4 },
  msgText: { fontSize: 16, lineHeight: 22 },
  pendingIndicator: { marginTop: 8, alignItems: 'flex-start' },
  metadataRow: { flexDirection: 'row', marginTop: 4, paddingHorizontal: 4 },
  metadataText: { fontSize: 11, color: '#8E8E93' },
  inputContainer: { paddingHorizontal: Spacing.md, paddingTop: Spacing.sm, paddingBottom: Platform.OS === 'ios' ? Spacing.lg : Spacing.md, borderTopWidth: 0.5 },
  inputWrapper: { flexDirection: 'row', alignItems: 'flex-end', borderRadius: BorderRadius.lg, paddingHorizontal: 12, paddingVertical: 8 },
  input: { flex: 1, fontSize: 16, maxHeight: 120, paddingTop: 8, paddingBottom: 8, paddingRight: 8 },
  sendButton: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#007AFF', justifyContent: 'center', alignItems: 'center', marginBottom: 2 },
  stopButton: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#FF3B3015', justifyContent: 'center', alignItems: 'center', marginBottom: 2 },
  typingContainer: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4, gap: 4 },
  typingDot: { width: 6, height: 6, borderRadius: 3 },
});
