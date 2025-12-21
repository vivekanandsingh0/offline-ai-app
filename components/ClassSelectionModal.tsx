import { useColorScheme } from '@/hooks/use-color-scheme';
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { BorderRadius, Colors, Spacing } from '../constants/theme';
import { UserClass, useUserStore } from '../store/useUserStore';

type Props = {
    visible?: boolean;
    onClose?: () => void;
};

export default function ClassSelectionModal({ visible, onClose }: Props) {
    const { userClass, onboardingCompleted, setUserClass, completeOnboarding } = useUserStore();
    const colorScheme = useColorScheme() ?? 'light';
    const theme = Colors[colorScheme];

    // Show if manually visible OR if onboarding is NOT complete
    const showModal = visible || !onboardingCompleted;

    const [selected, setSelected] = useState<UserClass | null>(userClass);

    // If we're not supposed to show it, return null. 
    // BUT we must render hooks first. 
    // Wait, if it's a Modal, we can just control the `visible` prop of the React Native Modal.
    // However, if we return null, hooks won't run? 
    // Ideally we always render the hooks, and just return null if not visible at the very end.
    // But `ClassSelectionModal` logic was "return null if hidden".
    // Let's stick to "hooks always run", and return null if not visible.

    // Actually, React Native Modal handles visibility. We can return the Modal structure always
    // but with visible={showModal}.

    const classes: UserClass[] = [
        'Nursery', 'LKG', 'UKG',
        '1', '2', '3', '4', '5',
        '6', '7', '8', '9', '10'
    ];

    const handleConfirm = async () => {
        if (selected) {
            await setUserClass(selected);
            if (!onboardingCompleted) {
                await completeOnboarding();
            }
            if (onClose) onClose();
        }
    };

    if (!showModal) return null;

    return (
        <Modal visible={showModal} animationType="slide" transparent>
            <View style={[styles.container, { backgroundColor: theme.background }]}>
                <View style={[styles.content, { backgroundColor: theme.background }]}>
                    <View style={styles.header}>
                        <View style={[styles.iconCircle, { backgroundColor: theme.primary + '20' }]}>
                            <Ionicons name="school-outline" size={32} color={theme.primary} />
                        </View>
                        <Text style={[styles.title, { color: theme.text }]}>
                            {onboardingCompleted ? 'Update Class' : 'Welcome, Student!'}
                        </Text>
                        <Text style={[styles.subtitle, { color: theme.secondaryText }]}>
                            Select your class so I can help you better.
                        </Text>
                    </View>

                    <ScrollView contentContainerStyle={styles.grid}>
                        {classes.map((cls) => (
                            <TouchableOpacity
                                key={cls}
                                style={[
                                    styles.option,
                                    { borderColor: theme.border, backgroundColor: theme.card },
                                    selected === cls && { borderColor: theme.primary, backgroundColor: theme.primary + '10' }
                                ]}
                                onPress={() => setSelected(cls)}
                            >
                                <Text style={[
                                    styles.optionText,
                                    { color: theme.text },
                                    selected === cls && { color: theme.primary, fontWeight: '700' }
                                ]}>
                                    {['Nursery', 'LKG', 'UKG'].includes(cls) ? cls : `Class ${cls}`}
                                </Text>
                                {selected === cls && (
                                    <Ionicons name="checkmark-circle" size={20} color={theme.primary} style={styles.checkIcon} />
                                )}
                            </TouchableOpacity>
                        ))}
                    </ScrollView>

                    <TouchableOpacity
                        style={[
                            styles.confirmButton,
                            { backgroundColor: theme.primary },
                            !selected && { opacity: 0.5, backgroundColor: theme.border }
                        ]}
                        disabled={!selected}
                        onPress={handleConfirm}
                    >
                        <Text style={styles.confirmText}>Start Learning</Text>
                        <Ionicons name="arrow-forward" size={20} color="#FFF" />
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        padding: Spacing.lg,
    },
    content: {
        flex: 1,
        marginTop: 60,
        marginBottom: 40,
    },
    header: {
        alignItems: 'center',
        marginBottom: Spacing.xl,
    },
    iconCircle: {
        width: 64,
        height: 64,
        borderRadius: 32,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: Spacing.md,
    },
    title: {
        fontSize: 24,
        fontWeight: '800',
        marginBottom: Spacing.sm,
    },
    subtitle: {
        fontSize: 16,
        textAlign: 'center',
        lineHeight: 22,
        paddingHorizontal: Spacing.lg,
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        paddingHorizontal: Spacing.xs,
    },
    option: {
        width: '31%',
        aspectRatio: 1.4,
        marginBottom: Spacing.md,
        borderRadius: BorderRadius.lg,
        borderWidth: 1.5,
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
    },
    optionText: {
        fontSize: 15,
        fontWeight: '600',
    },
    checkIcon: {
        position: 'absolute',
        top: 6,
        right: 6,
    },
    confirmButton: {
        flexDirection: 'row',
        height: 56,
        borderRadius: BorderRadius.full,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: Spacing.md,
        gap: 8,
    },
    confirmText: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: '600',
    },
});
