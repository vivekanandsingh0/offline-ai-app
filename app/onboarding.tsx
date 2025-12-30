import { CONSTITUTION } from '@/src/cortex/runtime/Constitution';
import { BorderRadius, Colors, Spacing } from '@/src/cortex/shared/constants/theme';
import { useColorScheme } from '@/src/cortex/shared/hooks/use-color-scheme';
import { Ionicons } from '@expo/vector-icons';
import { router, Stack } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function OnboardingScreen() {
    const colorScheme = useColorScheme() ?? 'light';
    const theme = Colors[colorScheme];

    const handleAccept = () => {
        router.replace('/(tabs)');
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
            <Stack.Screen options={{ headerShown: false }} />

            <View style={styles.content}>
                <View style={styles.topSection}>
                    <View style={[styles.logoBox, { backgroundColor: theme.primary + '10' }]}>
                        <Ionicons name="shield-checkmark-outline" size={40} color={theme.primary} />
                    </View>
                    <Text style={[styles.headline, { color: theme.text }]}>
                        Cortex Constitution
                    </Text>
                    <Text style={[styles.subtext, { color: theme.secondaryText }]}>
                        Cortex is a local-first AI runtime governed by strict ethical and safety rules.
                    </Text>
                </View>

                <ScrollView style={styles.constContainer}>
                    {CONSTITUTION.principles.map((p, i) => (
                        <View key={i} style={styles.constItem}>
                            <Ionicons name="checkmark-circle-outline" size={20} color={theme.primary} style={{ marginRight: 12 }} />
                            <Text style={[styles.constText, { color: theme.text }]}>{p}</Text>
                        </View>
                    ))}
                </ScrollView>

                <View style={styles.footer}>
                    <TouchableOpacity style={[styles.primaryButton, { backgroundColor: theme.primary }]} onPress={handleAccept}>
                        <Text style={styles.buttonText}>Accept & Continue</Text>
                    </TouchableOpacity>
                    <Text style={[styles.disclaimer, { color: theme.secondaryText }]}>
                        By continuing, you agree to run intelligence locally and ethically.
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
    },
    topSection: {
        alignItems: 'center',
        marginTop: 20,
        marginBottom: 30,
    },
    logoBox: {
        width: 70,
        height: 70,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: Spacing.md,
    },
    headline: {
        fontSize: 24,
        fontWeight: '800',
        textAlign: 'center',
        marginBottom: Spacing.sm,
    },
    subtext: {
        fontSize: 15,
        textAlign: 'center',
        lineHeight: 22,
        paddingHorizontal: 20,
    },
    constContainer: {
        flex: 1,
        marginBottom: 20,
    },
    constItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 16,
        paddingHorizontal: 10,
    },
    constText: {
        fontSize: 15,
        lineHeight: 22,
        flex: 1,
    },
    footer: {
        marginTop: 10,
    },
    primaryButton: {
        height: 56,
        borderRadius: BorderRadius.lg,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: Spacing.md,
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
