import { useColorScheme } from '@/hooks/use-color-scheme';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import OfflineLLMModule from 'offline-llm-module';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import ChatHistoryModal from '../../components/ChatHistoryModal';
import ChatSettingsModal, { ChatSettings, DEFAULT_SETTINGS } from '../../components/ChatSettingsModal'; // Added
import ClassSelectionModal from '../../components/ClassSelectionModal';
import ToolSelector from '../../components/ToolSelector';
import { BorderRadius, Colors, Spacing } from '../../constants/theme';
import { ToolId } from '../../constants/ToolDefinitions';
import { useChatStore } from '../../store/useChatStore'; // Added
import { useModelStore } from '../../store/useModelStore';
import { useUserStore } from '../../store/useUserStore';
import { buildPrompt } from '../../utils/PromptBuilder';
import { cacheResponse, getCachedResponse } from '../../utils/ResponseCache';

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
  console.log("Rendering ChatScreen...");
  // useKeepAwake(); // PocketPal principle: Keep screen alive during inference

  // Use specific selectors to avoid unnecessary re-renders
  const activeModelId = useModelStore(s => s.activeModelId);
  const activeModelName = useModelStore(s => s.activeModelId ? s.localModels[s.activeModelId]?.name : undefined);

  const userClass = useUserStore(s => s.userClass);
  const initUserStore = useUserStore(s => s.initialize);

  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [generating, setGenerating] = useState(false);
  const [capability, setCapability] = useState<Capability>('Balanced');
  const [showCapabilityMenu, setShowCapabilityMenu] = useState(false);
  const [activeTool, setActiveTool] = useState<ToolId | null>(null);
  const [showClassModal, setShowClassModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false); // Added
  const [chatSettings, setChatSettings] = useState<ChatSettings>(DEFAULT_SETTINGS); // Added
  const router = useRouter();

  const flatListRef = useRef<FlatList>(null);

  // Chat Store Hooks
  const saveCurrentSession = useChatStore(s => s.saveCurrentSession);
  const startNewSession = useChatStore(s => s.startNewSession);
  const loadSession = useChatStore(s => s.loadSession);
  const currentSessionId = useChatStore(s => s.currentSessionId);

  const clearChat = () => {
    startNewSession(); // Reset session in store
    setMessages([{
      id: 'welcome',
      role: 'assistant',
      content: `Hello! I'm using ${activeModelName || 'the model'}. How can I help you today?`,
      metadata: { source: 'Local' }
    }]);
  };

  // Auto-save chat when messages change
  useEffect(() => {
    if (messages.length > 0 && messages.some(m => m.id !== 'welcome')) {
      const msgsToSave = messages.filter(m => !m.pending && m.id !== 'welcome');
      if (msgsToSave.length > 0) {
        saveCurrentSession(msgsToSave);
      }
    }
  }, [messages]);

  const handleHistorySelect = (loadedMsgs: any[]) => {
    // We receive strict Message[] from the modal but need to cast for state compatibility if types diverge
    if (loadedMsgs && loadedMsgs.length > 0) {
      // Add 'pending' and 'metadata' fields if missing to match Component State Message type
      const formatted: Message[] = loadedMsgs.map(m => ({
        ...m,
        pending: false, // History items are never pending
      }));
      setMessages(formatted);
    }
  };

  useEffect(() => {
    if (activeModelId && activeModelName) {
      if (messages.length === 0) {
        setMessages([{
          id: 'welcome',
          role: 'assistant',
          content: `Hello! I'm using ${activeModelName}. How can I help you today?`,
          metadata: { source: 'Local' }
        }]);
      }
    } else {
      setMessages([]);
    }
  }, [activeModelId, activeModelName]);

  // Initialize user store on mount (guarded)
  const initRef = useRef(false);
  useEffect(() => {
    if (!initRef.current) {
      console.log("[ChatScreen] Initializing UserStore...");
      initUserStore();
      initRef.current = true;
    }
  }, []);

  const handleSend = async () => {
    if (!input.trim() || !activeModelId || generating) return;

    const startTime = Date.now();
    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setGenerating(true);

    const assistantMsgId = (Date.now() + 1).toString();
    setMessages(prev => [...prev, { id: assistantMsgId, role: 'assistant', content: '', pending: true }]);

    let tokenBuffer = '';
    let lastUpdateTime = Date.now();
    const UPDATE_INTERVAL = 150; // PocketPal's recommended interval

    const subscription = OfflineLLMModule.addListener('onToken', (event: { token: string }) => {
      tokenBuffer += event.token;

      const now = Date.now();
      if (now - lastUpdateTime > UPDATE_INTERVAL) {
        const currentBuffer = tokenBuffer;
        tokenBuffer = '';
        lastUpdateTime = now;

        setMessages(prev => prev.map(msg =>
          msg.id === assistantMsgId
            ? { ...msg, content: msg.content + currentBuffer, pending: false }
            : msg
        ));
      }
    });

    try {
      if (userMsg.content.length > 2000) throw new Error("Input too long.");

      if (userMsg.content.length > 2000) throw new Error("Input too long.");

      const modelName = (activeModelName || '').toLowerCase();
      const chatHistory = messages.filter(m => m.id !== 'welcome').slice(-4).map(m => ({ role: m.role, content: m.content }));

      // --- CACHE CHECK ---
      const cacheParams = { userClass, tool: activeTool, input: userMsg.content };
      const cached = getCachedResponse(cacheParams);

      if (cached) {
        console.log("Cache hit! Serving instant response.");
        setMessages(prev => prev.map(msg =>
          msg.id === assistantMsgId
            ? {
              ...msg,
              content: cached,
              pending: false,
              metadata: { time: '0.0s', source: 'Cache' }
            }
            : msg
        ));
        subscription.remove();
        setGenerating(false);
        return;
      }

      const prompt = buildPrompt({
        userClass,
        activeTool,
        input: userMsg.content,
        modelName,
        history: chatHistory,
        customSystemPrompt: chatSettings.systemPrompt // Added
      });

      console.log("Feeding prompt to model:", prompt.substring(0, 100) + "...");

      // Pass generation parameters
      const response = await OfflineLLMModule.generate(prompt, {
        temperature: chatSettings.temperature,
        top_k: chatSettings.top_k,
        top_p: chatSettings.top_p,
        max_tokens: chatSettings.max_tokens
      });

      // --- AGGRESSIVE CLEANUP ---
      let cleanResponse = response.trim();
      // Remove any hallucinated tags from the response
      const tagsToRemove = [
        '<|eot_id|>', '<|start_header_id|>', '<|end_header_id|>',
        '<s>', '</s>', '[INST]', '[/INST]', '<<SYS>>', '<<sys>>', '<</SYS>>', '<</sys>>',
        'User:', 'Assistant:', 'user:', 'assistant:'
      ];
      tagsToRemove.forEach(tag => {
        cleanResponse = cleanResponse.split(tag)[0]; // Cut everything after the first tag hallucination
      });
      cleanResponse = cleanResponse.trim();

      const endTime = Date.now();
      const duration = ((endTime - startTime) / 1000).toFixed(1) + 's';

      setMessages(prev => prev.map(msg =>
        msg.id === assistantMsgId
          ? { ...msg, content: cleanResponse, pending: false, metadata: { time: duration, source: 'Local' } }
          : msg
      ));

      // --- SAVE TO CACHE ---
      if (cleanResponse.length > 10) {
        cacheResponse(cacheParams, cleanResponse);
      }
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
      console.log("Stopping AI generation...");
      await OfflineLLMModule.stopGeneration();
    }
  };

  const activeModelIdSelector = useModelStore(s => s.activeModelId);
  const localModelsSelector = useModelStore(s => s.localModels);
  const loadModel = useModelStore(s => s.loadModel);

  const handleCapabilitySelect = (cap: Capability) => {
    setCapability(cap);
    setShowCapabilityMenu(false);

    let targetModelId = '';
    if (cap === 'Fast') targetModelId = 'qwen-2.5-3b';
    else if (cap === 'Balanced') targetModelId = 'llama-3.2-3b';
    else if (cap === 'Accurate') targetModelId = 'mistral-7b-v0.3';

    const targetModel = localModelsSelector[targetModelId];

    // Check if already active
    if (activeModelIdSelector === targetModelId) return;

    if (targetModel && targetModel.downloadStatus === 'completed' && targetModel.localPath) {
      loadModel(targetModelId);
    } else {
      Alert.alert(
        "Model Not Found",
        `The ${cap} mode requires ${targetModelId}. It is not installed.`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Go to Download",
            onPress: () => router.push('/(tabs)/host')
          }
        ]
      );
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.container, { backgroundColor: theme.background }]}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <Stack.Screen options={{
        title: 'Chat',
        headerTitle: () => (
          activeModelId ? (
            <TouchableOpacity
              style={styles.headerTitleContainer}
              onPress={() => setShowCapabilityMenu(true)}
            >
              <Text style={[styles.headerTitle, { color: theme.text }]}>{capability}</Text>
              <Ionicons name="chevron-down" size={14} color={theme.secondaryText} style={{ marginLeft: 4 }} />
            </TouchableOpacity>
          ) : <Text style={[styles.headerTitle, { color: theme.text }]}>Chat</Text>
        ),
        headerShown: true,
        headerStyle: { backgroundColor: theme.background },
        headerShadowVisible: false,
        headerRight: () => (
          <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 16, gap: 16 }}>
            <TouchableOpacity onPress={() => setShowClassModal(true)}>
              <Ionicons name="settings-outline" size={22} color={theme.secondaryText} />
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

      <ClassSelectionModal visible={showClassModal} onClose={() => setShowClassModal(false)} />
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
            <Ionicons name="chatbubble-ellipses-outline" size={40} color={theme.primary} />
          </View>
          <Text style={[styles.placeholderTitle, { color: theme.text }]}>No Model Loaded</Text>
          <Text style={[styles.placeholderText, { color: theme.secondaryText }]}>
            Head over to the Host tab to download and load a model to start chatting.
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
            <ToolSelector activeTool={activeTool} onSelectTool={setActiveTool} />
            <View style={[styles.inputWrapper, { backgroundColor: theme.card }]}>
              {/* Settings Icon */}
              <TouchableOpacity onPress={() => setShowSettingsModal(true)} style={styles.settingsIcon}>
                <Ionicons name="options" size={20} color={theme.secondaryText} />
              </TouchableOpacity>
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
        </>
      )}

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
                onPress={() => handleCapabilitySelect(cap)}
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
  settingsIcon: {
    marginBottom: 10,
    marginRight: 8,
    padding: 4,
  },
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
