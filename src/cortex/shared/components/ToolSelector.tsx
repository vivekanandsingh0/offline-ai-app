import { useUserStore } from '@/src/cortex/education/store/useUserStore';
import { ToolId, getAvailableTools } from '@/src/cortex/shared/constants/ToolDefinitions';
import { BorderRadius, Colors, Spacing } from '@/src/cortex/shared/constants/theme';
import { useColorScheme } from '@/src/cortex/shared/hooks/use-color-scheme';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface ToolSelectorProps {
    activeTool: ToolId | null;
    onSelectTool: (toolId: ToolId | null) => void;
}

export default function ToolSelector({ activeTool, onSelectTool }: ToolSelectorProps) {
    const { userClass } = useUserStore();
    const colorScheme = useColorScheme() ?? 'light';
    const theme = Colors[colorScheme];

    const availableTools = getAvailableTools(userClass);

    if (availableTools.length === 0) return null;

    return (
        <View style={[styles.container, { borderBottomColor: theme.border }]}>
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                <TouchableOpacity
                    style={[
                        styles.chip,
                        { borderColor: theme.border, backgroundColor: theme.card },
                        activeTool === null && { backgroundColor: theme.primary, borderColor: theme.primary }
                    ]}
                    onPress={() => onSelectTool(null)}
                >
                    <Ionicons
                        name="chatbubble-outline"
                        size={16}
                        color={activeTool === null ? '#FFF' : theme.text}
                    />
                    <Text style={[
                        styles.chipText,
                        { color: theme.text },
                        activeTool === null && { color: '#FFF', fontWeight: '600' }
                    ]}>
                        Chat
                    </Text>
                </TouchableOpacity>

                {availableTools.map((tool) => (
                    <TouchableOpacity
                        key={tool.id}
                        style={[
                            styles.chip,
                            { borderColor: theme.border, backgroundColor: theme.card },
                            activeTool === tool.id && { backgroundColor: theme.primary, borderColor: theme.primary }
                        ]}
                        onPress={() => onSelectTool(activeTool === tool.id ? null : tool.id)}
                    >
                        <Ionicons
                            name={tool.icon as any}
                            size={16}
                            color={activeTool === tool.id ? '#FFF' : theme.text}
                        />
                        <Text style={[
                            styles.chipText,
                            { color: theme.text },
                            activeTool === tool.id && { color: '#FFF', fontWeight: '600' }
                        ]}>
                            {tool.name}
                        </Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        borderBottomWidth: 0.5,
        paddingVertical: Spacing.sm,
    },
    scrollContent: {
        paddingHorizontal: Spacing.md,
        gap: 8,
    },
    chip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: BorderRadius.full,
        borderWidth: 1,
        gap: 6,
    },
    chipText: {
        fontSize: 14,
    }
});
