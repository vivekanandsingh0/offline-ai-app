import { Ionicons } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useModelStore } from '../../store/useModelStore';
// Import native module directly if we need to listen to events or stream
import OfflineLLMModule from 'offline-llm-module';

type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  pending?: boolean;
};

export default function ChatScreen() {
  const { activeModelId, localModels } = useModelStore();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [generating, setGenerating] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const activeModel = activeModelId ? localModels[activeModelId] : null;

  useEffect(() => {
    if (activeModel) {
      setMessages([{
        id: 'system-1',
        role: 'assistant',
        content: `Loaded ${activeModel.name}. Ready to chat!`
      }]);
    } else {
      setMessages([]);
    }
  }, [activeModelId]);

  const handleSend = async () => {
    if (!input.trim() || !activeModelId || generating) return;

    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setGenerating(true);

    const assistantMsgId = (Date.now() + 1).toString();
    // Add placeholder assistant message
    setMessages(prev => [...prev, { id: assistantMsgId, role: 'assistant', content: '', pending: true }]);

    // Listener for streaming tokens
    const subscription = OfflineLLMModule.addListener('onToken', (event: { token: string }) => {
      setMessages(prev => prev.map(msg =>
        msg.id === assistantMsgId
          ? { ...msg, content: msg.content + event.token, pending: false }
          : msg
      ));
    });

    try {
      // Use TinyLlama / ChatML style template for better results
      const prompt = `<|user|>\n${userMsg.content}</s>\n<|assistant|>\n`;

      const response = await OfflineLLMModule.generate(prompt);

      // Final update to catch anything missed or to signal completion
      setMessages(prev => prev.map(msg =>
        msg.id === assistantMsgId
          ? { ...msg, content: response, pending: false }
          : msg
      ));
    } catch (e) {
      setMessages(prev => prev.map(msg =>
        msg.id === assistantMsgId
          ? { ...msg, content: "Error generating response: " + e, pending: false }
          : msg
      ));
    } finally {
      subscription.remove();
      setGenerating(false);
    }
  };

  if (!activeModelId) {
    return (
      <View style={styles.centerContainer}>
        <Stack.Screen options={{ title: 'Chat' }} />
        <Ionicons name="chatbubble-ellipses-outline" size={64} color="#ccc" />
        <Text style={styles.placeholderText}>Select a model from the Models tab to start chatting.</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <Stack.Screen options={{ title: activeModel?.name || 'Chat' }} />
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        renderItem={({ item }) => (
          <View style={[
            styles.msgBubble,
            item.role === 'user' ? styles.userBubble : styles.assistantBubble
          ]}>
            <Text style={[
              styles.msgText,
              item.role === 'user' ? styles.userText : styles.assistantText
            ]}>{item.content}</Text>
            {item.pending && <ActivityIndicator size="small" color="#555" style={{ marginTop: 4 }} />}
          </View>
        )}
      />

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder="Type a message..."
          onSubmitEditing={handleSend}
        />
        <TouchableOpacity
          style={[styles.sendButton, (!input.trim() || generating) && styles.disabledButton]}
          onPress={handleSend}
          disabled={!input.trim() || generating}
        >
          <Ionicons name="send" size={20} color="white" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centerContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  placeholderText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 16,
  },
  list: {
    padding: 16,
    paddingBottom: 32,
  },
  msgBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 16,
    marginBottom: 12,
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: '#007AFF',
    borderBottomRightRadius: 4,
  },
  assistantBubble: {
    alignSelf: 'flex-start',
    backgroundColor: '#E5E5EA',
    borderBottomLeftRadius: 4,
  },
  msgText: {
    fontSize: 16,
    lineHeight: 22,
  },
  userText: {
    color: 'white',
  },
  assistantText: {
    color: 'black',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 16,
    marginRight: 8,
    maxHeight: 100,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#B4B4B4',
  },
});
