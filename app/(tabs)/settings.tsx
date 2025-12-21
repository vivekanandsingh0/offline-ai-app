import { useColorScheme } from '@/hooks/use-color-scheme';
import { Ionicons } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { BorderRadius, Colors, Spacing } from '../../constants/theme';

export default function SettingsScreen() {
    const colorScheme = useColorScheme() ?? 'light';
    const theme = Colors[colorScheme];

    const [advancedOpen, setAdvancedOpen] = useState(false);

    const SettingItem = ({ icon, label, value, type = 'chevron' }: any) => (
        <TouchableOpacity style={styles.item}>
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
                <Text style={[styles.sectionTitle, { color: theme.secondaryText }]}>Preferences</Text>
                <View style={[styles.card, { backgroundColor: theme.card }]}>
                    <SettingItem icon="moon-outline" label="Appearance" value="System" />
                    <SettingItem icon="notifications-outline" label="Notifications" />
                    <SettingItem icon="language-outline" label="Language" value="English" />
                </View>
            </View>

            <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: theme.secondaryText }]}>Hosting</Text>
                <View style={[styles.card, { backgroundColor: theme.card }]}>
                    <SettingItem icon="wifi-outline" label="Only on Wi-Fi" value={true} type="switch" />
                    <SettingItem icon="battery-charging-outline" label="Only when charging" value={true} type="switch" />
                </View>
            </View>

            <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: theme.secondaryText }]}>Privacy & Data</Text>
                <View style={[styles.card, { backgroundColor: theme.card }]}>
                    <SettingItem icon="shield-checkmark-outline" label="Privacy Policy" />
                    <SettingItem icon="document-text-outline" label="Terms of Service" />
                    <SettingItem icon="trash-outline" label="Clear Chat History" />
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
                        <SettingItem icon="podium-outline" label="Network Info" />
                        <SettingItem icon="bug-outline" label="Debug Status" value="Healthy" />
                        <SettingItem icon="finger-print-outline" label="Anonymous ID" value="0x...492" />
                        <SettingItem icon="refresh-outline" label="Reset ID" />
                    </View>
                )}
            </View>

            <View style={styles.footer}>
                <Text style={[styles.version, { color: theme.secondaryText }]}>Version 1.0.0 (342)</Text>
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
