import { useColorScheme } from '@/hooks/use-color-scheme';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { FlatList, Modal, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { BorderRadius, Colors, Spacing } from '../constants/theme';
import { Message, useChatStore } from '../store/useChatStore';

type Props = {
    visible: boolean;
    onClose: () => void;
    onSelectSession: (messages: Message[]) => void;
};

export default function ChatHistoryModal({ visible, onClose, onSelectSession }: Props) {
    const { sessions, loadSession, deleteSession, currentSessionId } = useChatStore();
    const colorScheme = useColorScheme() ?? 'light';
    const theme = Colors[colorScheme];

    const handleSelect = async (sessionId: string) => {
        const messages = await loadSession(sessionId);
        onSelectSession(messages);
        onClose();
    };

    const handleDelete = async (sessionId: string) => {
        await deleteSession(sessionId);
    };

    return (
        <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
            <View style={[styles.container, { backgroundColor: theme.background }]}>
                <View style={styles.header}>
                    <Text style={[styles.title, { color: theme.text }]}>Chat History</Text>
                    <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                        <Ionicons name="close" size={24} color={theme.text} />
                    </TouchableOpacity>
                </View>

                {sessions.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Ionicons name="chatbubbles-outline" size={48} color={theme.secondaryText} />
                        <Text style={[styles.emptyText, { color: theme.secondaryText }]}>
                            No chat history yet.
                        </Text>
                    </View>
                ) : (
                    <FlatList
                        data={sessions}
                        keyExtractor={item => item.id}
                        contentContainerStyle={styles.list}
                        renderItem={({ item }) => (
                            <TouchableOpacity
                                style={[
                                    styles.item,
                                    { backgroundColor: theme.card, borderColor: theme.border },
                                    item.id === currentSessionId && { borderColor: theme.primary, borderWidth: 1.5 }
                                ]}
                                onPress={() => handleSelect(item.id)}
                            >
                                <View style={styles.itemContent}>
                                    <Text style={[styles.itemTitle, { color: theme.text }]} numberOfLines={1}>
                                        {item.title}
                                    </Text>
                                    <Text style={[styles.itemPreview, { color: theme.secondaryText }]} numberOfLines={2}>
                                        {item.preview}
                                    </Text>
                                    <Text style={[styles.itemDate, { color: theme.secondaryText }]}>
                                        {new Date(item.lastUpdated).toLocaleDateString()} • {new Date(item.lastUpdated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </Text>
                                </View>
                                <TouchableOpacity
                                    style={styles.deleteButton}
                                    onPress={() => handleDelete(item.id)}
                                >
                                    <Ionicons name="trash-outline" size={20} color={theme.error} />
                                </TouchableOpacity>
                            </TouchableOpacity>
                        )}
                    />
                )}
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingTop: Platform.OS === 'ios' ? 20 : 0,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: Spacing.lg,
        borderBottomWidth: 0.5,
        borderBottomColor: '#00000020',
    },
    title: {
        fontSize: 20,
        fontWeight: '700',
    },
    closeButton: {
        padding: 4,
    },
    list: {
        padding: Spacing.md,
    },
    item: {
        flexDirection: 'row',
        marginBottom: Spacing.md,
        borderRadius: BorderRadius.lg,
        borderWidth: 1,
        overflow: 'hidden',
    },
    itemContent: {
        flex: 1,
        padding: Spacing.md,
    },
    itemTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 4,
    },
    itemPreview: {
        fontSize: 14,
        marginBottom: 8,
    },
    itemDate: {
        fontSize: 12,
    },
    deleteButton: {
        padding: Spacing.md,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#FF3B3010',
    },
    emptyState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        gap: Spacing.md,
    },
    emptyText: {
        fontSize: 16,
    },
});
