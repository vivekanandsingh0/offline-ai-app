import { useColorScheme } from '@/hooks/use-color-scheme';
import { Ionicons } from '@expo/vector-icons';
import { router, Stack } from 'expo-router';
import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BorderRadius, Colors, Spacing } from '../constants/theme';

export default function OnboardingScreen() {
    const colorScheme = useColorScheme() ?? 'light';
    const theme = Colors[colorScheme];
    const [mode, setMode] = useState<'use' | 'share'>('use');

    const handleGetStarted = () => {
        router.replace('/(tabs)');
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
            <Stack.Screen options={{ headerShown: false }} />

            <View style={styles.content}>
                <View style={styles.topSection}>
                    <View style={[styles.logoBox, { backgroundColor: theme.primary + '10' }]}>
                        <Ionicons name="flash-outline" size={40} color={theme.primary} />
                    </View>
                    <Text style={[styles.headline, { color: theme.text }]}>
                        AI that works without{"\n"}installing models
                    </Text>
                    <Text style={[styles.subtext, { color: theme.secondaryText }]}>
                        Get answers from nearby or online devices. Distributed intelligence, in your pocket.
                    </Text>
                </View>

                <View style={styles.middleSection}>
                    <Text style={[styles.choiceTitle, { color: theme.text }]}>How would you like to start?</Text>

                    <TouchableOpacity
                        style={[styles.modeCard, mode === 'use' && { borderColor: theme.primary, borderWidth: 2, backgroundColor: theme.primary + '05' }, { backgroundColor: theme.card }]}
                        onPress={() => setMode('use')}
                    >
                        <View style={[styles.iconBox, { backgroundColor: theme.primary + '20' }]}>
                            <Ionicons name="chatbubble-ellipses-outline" size={24} color={theme.primary} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.modeLabel, { color: theme.text }]}>Use AI</Text>
                            <Text style={[styles.modeDesc, { color: theme.secondaryText }]}>Access intelligence instantly from the network.</Text>
                        </View>
                        {mode === 'use' && <Ionicons name="checkmark-circle" size={24} color={theme.primary} />}
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.modeCard, mode === 'share' && { borderColor: theme.primary, borderWidth: 2, backgroundColor: theme.primary + '05' }, { backgroundColor: theme.card }]}
                        onPress={() => setMode('share')}
                    >
                        <View style={[styles.iconBox, { backgroundColor: theme.accent + '20' }]}>
                            <Ionicons name="server-outline" size={24} color={theme.accent} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.modeLabel, { color: theme.text }]}>Share AI & earn</Text>
                            <Text style={[styles.modeDesc, { color: theme.secondaryText }]}>Host models and get rewarded for serving requests.</Text>
                        </View>
                        {mode === 'share' && <Ionicons name="checkmark-circle" size={24} color={theme.primary} />}
                    </TouchableOpacity>
                </View>

                <View style={styles.footer}>
                    <TouchableOpacity style={[styles.primaryButton, { backgroundColor: theme.primary }]} onPress={handleGetStarted}>
                        <Text style={styles.buttonText}>Get Started</Text>
                    </TouchableOpacity>
                    <Text style={[styles.disclaimer, { color: theme.secondaryText }]}>
                        By continuing, you agree to our Terms of Service.
                    </Text>
                </View>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        flex: 1,
        padding: Spacing.xl,
        justifyContent: 'space-between',
    },
    topSection: {
        alignItems: 'center',
        marginTop: 40,
    },
    logoBox: {
        width: 80,
        height: 80,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: Spacing.lg,
    },
    headline: {
        fontSize: 28,
        fontWeight: '800',
        textAlign: 'center',
        marginBottom: Spacing.md,
        lineHeight: 36,
    },
    subtext: {
        fontSize: 16,
        textAlign: 'center',
        lineHeight: 24,
        paddingHorizontal: 10,
    },
    middleSection: {
        flex: 1,
        justifyContent: 'center',
    },
    choiceTitle: {
        fontSize: 17,
        fontWeight: '600',
        marginBottom: Spacing.md,
        textAlign: 'center',
    },
    modeCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: Spacing.md,
        borderRadius: BorderRadius.lg,
        marginBottom: Spacing.md,
        borderWidth: 2,
        borderColor: 'transparent',
    },
    iconBox: {
        width: 48,
        height: 48,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    modeLabel: {
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 4,
    },
    modeDesc: {
        fontSize: 13,
        lineHeight: 18,
    },
    footer: {
        marginBottom: 20,
    },
    primaryButton: {
        height: 56,
        borderRadius: BorderRadius.lg,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: Spacing.md,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    buttonText: {
        color: 'white',
        fontSize: 18,
        fontWeight: '700',
    },
    disclaimer: {
        fontSize: 12,
        textAlign: 'center',
    },
});
