import { useColorScheme } from '@/hooks/use-color-scheme';
import { Ionicons } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import React from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { BorderRadius, Colors, Spacing } from '../../constants/theme';

type RewardActivity = {
    id: string;
    type: 'hosting' | 'usage';
    amount: string;
    date: string;
    label: string;
};

const SAMPLE_HISTORY: RewardActivity[] = [
    { id: '1', type: 'hosting', amount: '+45', date: 'Today, 2:30 PM', label: 'Hosting Contribution' },
    { id: '2', type: 'usage', amount: '-10', date: 'Today, 10:15 AM', label: 'AI Inference' },
    { id: '3', type: 'hosting', amount: '+120', date: 'Yesterday', label: 'Overnight Hosting' },
    { id: '4', type: 'hosting', amount: '+25', date: 'Yesterday', label: 'Validation Reward' },
];

export default function RewardsScreen() {
    const colorScheme = useColorScheme() ?? 'light';
    const theme = Colors[colorScheme];

    const renderItem = ({ item }: { item: RewardActivity }) => (
        <View style={styles.activityItem}>
            <View style={[styles.iconBox, { backgroundColor: item.type === 'hosting' ? '#34C75915' : '#8E8E9315' }]}>
                <Ionicons
                    name={item.type === 'hosting' ? "server-outline" : "chatbubble-outline"}
                    size={18}
                    color={item.type === 'hosting' ? theme.accent : theme.secondaryText}
                />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={[styles.activityLabel, { color: theme.text }]}>{item.label}</Text>
                <Text style={[styles.activityDate, { color: theme.secondaryText }]}>{item.date}</Text>
            </View>
            <Text style={[
                styles.activityAmount,
                { color: item.amount.startsWith('+') ? theme.accent : theme.text }
            ]}>
                {item.amount}
            </Text>
        </View>
    );

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <Stack.Screen options={{ title: 'Rewards', headerShown: false }} />

            <View style={styles.header}>
                <Text style={[styles.headerTitle, { color: theme.text }]}>Rewards</Text>
            </View>

            <View style={styles.balanceCard}>
                <View style={[styles.cardBg, { backgroundColor: theme.primary }]}>
                    <Text style={styles.balanceLabel}>Available Credits</Text>
                    <Text style={styles.balanceValue}>2,540</Text>
                    <View style={styles.cardFooter}>
                        <Text style={styles.cardInfo}>Helping others use AI</Text>
                        <TouchableOpacity style={styles.secureButton} disabled>
                            <Text style={styles.secureText}>Secure rewards</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>

            <View style={styles.historySection}>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>Activity History</Text>
                <FlatList
                    data={SAMPLE_HISTORY}
                    renderItem={renderItem}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.list}
                    ItemSeparatorComponent={() => <View style={[styles.separator, { backgroundColor: theme.border }]} />}
                />
            </View>
        </View>
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
    balanceCard: {
        paddingHorizontal: Spacing.md,
        marginBottom: Spacing.xl,
    },
    cardBg: {
        borderRadius: BorderRadius.lg,
        padding: Spacing.lg,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 6,
    },
    balanceLabel: {
        color: '#FFFFFFCC',
        fontSize: 14,
        fontWeight: '500',
        marginBottom: 8,
    },
    balanceValue: {
        color: '#FFFFFF',
        fontSize: 42,
        fontWeight: '700',
        marginBottom: Spacing.lg,
    },
    cardFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    cardInfo: {
        color: '#FFFFFF99',
        fontSize: 12,
    },
    secureButton: {
        backgroundColor: '#FFFFFF20',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: BorderRadius.md,
    },
    secureText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '600',
    },
    historySection: {
        flex: 1,
        paddingHorizontal: Spacing.md,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        marginBottom: Spacing.md,
    },
    list: {
        paddingBottom: 40,
    },
    activityItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
    },
    iconBox: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    activityLabel: {
        fontSize: 15,
        fontWeight: '600',
        marginBottom: 2,
    },
    activityDate: {
        fontSize: 12,
    },
    activityAmount: {
        fontSize: 16,
        fontWeight: '700',
    },
    separator: {
        height: 0.5,
        opacity: 0.3,
    },
});
