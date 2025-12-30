import { useChatStore } from '@/src/cortex/core/store/useChatStore';
import { AppTheme, useUserStore } from '@/src/cortex/core/store/useUserStore';
import { BorderRadius, Colors, Spacing } from '@/src/cortex/shared/constants/theme';
import { useColorScheme } from '@/src/cortex/shared/hooks/use-color-scheme';
import { Ionicons } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';

export default function SettingsScreen() {
    const colorScheme = useColorScheme() ?? 'light';
    const theme = Colors[colorScheme];

    const { theme: appTheme, setTheme } = useUserStore();
    const { startNewSession, deleteSession, sessions } = useChatStore();

    const [advancedOpen, setAdvancedOpen] = useState(false);

    const toggleTheme = () => {
        const next: AppTheme = appTheme === 'system' ? 'light' : appTheme === 'light' ? 'dark' : 'system';
        setTheme(next);
    };

    const handleClearHistory = () => {
        Alert.alert(
            "Clear History",
            "Are you sure you want to delete all chat history? This cannot be undone.",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete All",
                    style: "destructive",
                    onPress: async () => {
                        for (const s of sessions) {
                            await deleteSession(s.id);
                        }
                        startNewSession();
                    }
                }
            ]
        );
    };

    const SettingItem = ({ icon, label, value, type = 'chevron', onPress }: any) => (
        <TouchableOpacity style={styles.item} onPress={onPress} disabled={!onPress && type !== 'switch'}>
            <View style={styles.itemLeft}>
                <View style={[styles.iconBox, { backgroundColor: theme.card }]}>
                    <Ionicons name={icon} size={20} color={theme.text} />
                </View>
                <Text style={[styles.itemLabel, { color: theme.text }]}>{label}</Text>
            </View>
            {type === 'chevron' && (
                <View style={styles.itemRight}>
                    {value && <Text style={[styles.itemValue, { color: theme.secondaryText }]}>{value}</Text>}
                    <Ionicons name="chevron-forward" size={18} color={theme.border} />
                </View>
            )}
            {type === 'switch' && (
                <Switch value={value} trackColor={{ false: theme.border, true: theme.primary }} thumbColor="white" />
            )}
        </TouchableOpacity>
    );

    return (
        <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
            <Stack.Screen options={{ title: 'Settings', headerShown: false }} />

            <View style={styles.header}>
                <Text style={[styles.headerTitle, { color: theme.text }]}>Settings</Text>
            </View>

            <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: theme.secondaryText }]}>Cortex Preference</Text>
                <View style={[styles.card, { backgroundColor: theme.card }]}>
                    <SettingItem
                        icon="moon-outline"
                        label="Appearance"
                        value={appTheme ? appTheme.charAt(0).toUpperCase() + appTheme.slice(1) : 'System'}
                        onPress={toggleTheme}
                    />
                    <SettingItem icon="language-outline" label="Default Language" value="English" />
                </View>
            </View>

            <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: theme.secondaryText }]}>Privacy & Data</Text>
                <View style={[styles.card, { backgroundColor: theme.card }]}>
                    <SettingItem
                        icon="trash-outline"
                        label="Clear Chat History"
                        onPress={handleClearHistory}
                    />
                    <SettingItem icon="document-text-outline" label="Cortex Constitution" />
                </View>
            </View>

            <View style={styles.section}>
                <TouchableOpacity
                    style={styles.advancedHeader}
                    onPress={() => setAdvancedOpen(!advancedOpen)}
                >
                    <Text style={[styles.sectionTitle, { color: theme.secondaryText, marginBottom: 0 }]}>Advanced</Text>
                    <Ionicons name={advancedOpen ? "chevron-up" : "chevron-down"} size={16} color={theme.secondaryText} />
                </TouchableOpacity>

                {advancedOpen && (
                    <View style={[styles.card, { backgroundColor: theme.card, marginTop: Spacing.sm }]}>
                        <SettingItem icon="bug-outline" label="Runtime Status" value="Healthy" />
                        <SettingItem icon="cube-outline" label="Active Model" value="Local" />
                    </View>
                )}
            </View>

            <View style={styles.footer}>
                <Text style={[styles.version, { color: theme.secondaryText }]}>Cortex Runtime v1.0.0</Text>
            </View>

            <View style={{ height: 40 }} />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        paddingTop: 60,
        paddingHorizontal: Spacing.md,
        marginBottom: Spacing.lg,
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: '700',
    },
    section: {
        marginBottom: Spacing.lg,
        paddingHorizontal: Spacing.md,
    },
    sectionTitle: {
        fontSize: 13,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: Spacing.sm,
        paddingLeft: 4,
    },
    card: {
        borderRadius: BorderRadius.lg,
        overflow: 'hidden',
    },
    item: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: Spacing.md,
        borderBottomWidth: 0.5,
        borderBottomColor: '#00000008',
    },
    itemLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconBox: {
        width: 32,
        height: 32,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    itemLabel: {
        fontSize: 16,
        fontWeight: '500',
    },
    itemRight: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    itemValue: {
        fontSize: 14,
        marginRight: 8,
    },
    advancedHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 4,
    },
    footer: {
        alignItems: 'center',
        marginTop: Spacing.xl,
        marginBottom: Spacing.xl,
    },
    version: {
        fontSize: 12,
    },
});
