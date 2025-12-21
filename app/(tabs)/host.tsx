import { useColorScheme } from '@/hooks/use-color-scheme';
import { Ionicons } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { BorderRadius, Colors, Spacing } from '../../constants/theme';
import { Model, useModelStore } from '../../store/useModelStore';

export default function HostScreen() {
    const { catalog, localModels, initialize, startDownload, deleteModel, loadModel, unloadModel, activeModelId } = useModelStore();
    const colorScheme = useColorScheme() ?? 'light';
    const theme = Colors[colorScheme];

    const [isHosting, setIsHosting] = useState(false);
    const [hostOnWifi, setHostOnWifi] = useState(true);
    const [hostOnCharging, setHostOnCharging] = useState(true);

    useEffect(() => {
        initialize();
    }, []);

    const renderModel = ({ item }: { item: Model }) => {
        const localModel = localModels[item.id];
        const isDownloaded = !!localModel && localModel.downloadStatus === 'completed';
        const isDownloading = !!localModel && localModel.downloadStatus === 'downloading';
        const isActive = activeModelId === item.id;

        return (
            <View style={[styles.card, { backgroundColor: theme.card }]}>
                <View style={styles.cardHeader}>
                    <View style={{ flex: 1 }}>
                        <Text style={[styles.modelName, { color: theme.text }]}>{item.name}</Text>
                        <Text style={[styles.modelDesc, { color: theme.secondaryText }]}>{item.description}</Text>
                    </View>
                    <View style={styles.badge}>
                        <Text style={styles.badgeText}>{item.size}</Text>
                    </View>
                </View>

                <View style={styles.actionRow}>
                    {isDownloaded ? (
                        <>
                            <TouchableOpacity
                                style={[styles.button, isActive ? styles.activeButton : { backgroundColor: theme.primary }]}
                                onPress={() => isActive ? unloadModel() : loadModel(item.id)}
                            >
                                <Text style={styles.buttonText}>{isActive ? 'Loaded' : 'Load'}</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.iconButton, { backgroundColor: theme.error + '20' }]}
                                onPress={() => {
                                    Alert.alert("Delete Model", "Are you sure you want to remove this model?", [
                                        { text: "Cancel", style: "cancel" },
                                        { text: "Delete", style: "destructive", onPress: () => deleteModel(item.id) }
                                    ]);
                                }}
                            >
                                <Ionicons name="trash-outline" size={20} color={theme.error} />
                            </TouchableOpacity>
                        </>
                    ) : isDownloading ? (
                        <View style={styles.progressContainer}>
                            <View style={[styles.progressBarBase, { backgroundColor: theme.border }]}>
                                <View style={[styles.progressBarFill, { width: `${(localModel?.progress || 0) * 100}%`, backgroundColor: theme.primary }]} />
                            </View>
                            <Text style={[styles.progressText, { color: theme.primary }]}>
                                {Math.round((localModel?.progress || 0) * 100)}%
                            </Text>
                        </View>
                    ) : (
                        <TouchableOpacity style={[styles.downloadButton, { backgroundColor: theme.primary }]} onPress={() => startDownload(item)}>
                            <Ionicons name="cloud-download-outline" size={20} color="white" />
                            <Text style={styles.buttonText}> Download</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>
        );
    };

    return (
        <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
            <Stack.Screen options={{ title: 'Host AI' }} />

            {/* Dashboard Section */}
            <View style={styles.section}>
                <View style={[styles.headerCard, { backgroundColor: theme.card }]}>
                    <View style={styles.headerRow}>
                        <View>
                            <Text style={[styles.greeting, { color: theme.secondaryText }]}>Power User Mode</Text>
                            <Text style={[styles.title, { color: theme.text }]}>Host Dashboard</Text>
                        </View>
                        <Switch
                            value={isHosting}
                            onValueChange={setIsHosting}
                            trackColor={{ false: theme.border, true: theme.accent }}
                            thumbColor="white"
                        />
                    </View>

                    <View style={styles.statsRow}>
                        <View style={styles.statItem}>
                            <Text style={[styles.statValue, { color: theme.text }]}>128</Text>
                            <Text style={[styles.statLabel, { color: theme.secondaryText }]}>Requests</Text>
                        </View>
                        <View style={[styles.divider, { backgroundColor: theme.border }]} />
                        <View style={styles.statItem}>
                            <Text style={[styles.statValue, { color: theme.text }]}>2.5k</Text>
                            <Text style={[styles.statLabel, { color: theme.secondaryText }]}>Credits</Text>
                        </View>
                        <View style={[styles.divider, { backgroundColor: theme.border }]} />
                        <View style={styles.statItem}>
                            <Text style={[styles.statValue, { color: theme.text }]}>98%</Text>
                            <Text style={[styles.statLabel, { color: theme.secondaryText }]}>Uptime</Text>
                        </View>
                    </View>
                </View>
            </View>

            {/* Model Manager Section */}
            <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>Model Manager</Text>
                {catalog.map(item => (
                    <View key={item.id}>
                        {renderModel({ item })}
                    </View>
                ))}
            </View>

            {/* Hosting Rules */}
            <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>Hosting Rules</Text>
                <View style={[styles.card, { backgroundColor: theme.card }]}>
                    <View style={styles.ruleItem}>
                        <View style={styles.ruleLabelRow}>
                            <Ionicons name="wifi-outline" size={20} color={theme.text} style={{ marginRight: 12 }} />
                            <Text style={[styles.ruleText, { color: theme.text }]}>Host only on Wi-Fi</Text>
                        </View>
                        <Switch
                            value={hostOnWifi}
                            onValueChange={setHostOnWifi}
                            trackColor={{ false: theme.border, true: theme.primary }}
                            thumbColor="white"
                        />
                    </View>
                    <View style={[styles.divider, { backgroundColor: theme.border, height: 1, marginVertical: 12 }]} />
                    <View style={styles.ruleItem}>
                        <View style={styles.ruleLabelRow}>
                            <Ionicons name="battery-charging-outline" size={20} color={theme.text} style={{ marginRight: 12 }} />
                            <Text style={[styles.ruleText, { color: theme.text }]}>Host only when charging</Text>
                        </View>
                        <Switch
                            value={hostOnCharging}
                            onValueChange={setHostOnCharging}
                            trackColor={{ false: theme.border, true: theme.primary }}
                            thumbColor="white"
                        />
                    </View>
                </View>
            </View>

            <View style={{ height: 40 }} />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    section: {
        paddingHorizontal: Spacing.md,
        marginTop: Spacing.lg,
    },
    headerCard: {
        borderRadius: BorderRadius.lg,
        padding: Spacing.lg,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing.xl,
    },
    greeting: {
        fontSize: 14,
        fontWeight: '500',
        marginBottom: 2,
    },
    title: {
        fontSize: 24,
        fontWeight: '700',
    },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
    },
    statItem: {
        alignItems: 'center',
    },
    statValue: {
        fontSize: 20,
        fontWeight: '700',
        marginBottom: 4,
    },
    statLabel: {
        fontSize: 12,
        fontWeight: '500',
    },
    divider: {
        width: 1,
        height: 30,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        marginBottom: Spacing.md,
        paddingLeft: 4,
    },
    card: {
        borderRadius: BorderRadius.lg,
        padding: Spacing.md,
        marginBottom: Spacing.md,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: Spacing.md,
    },
    modelName: {
        fontSize: 16,
        fontWeight: '700',
        marginBottom: 4,
    },
    modelDesc: {
        fontSize: 13,
        lineHeight: 18,
    },
    badge: {
        backgroundColor: '#00000010',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: BorderRadius.sm,
        height: 24,
    },
    badgeText: {
        fontSize: 11,
        fontWeight: '600',
        color: '#666',
    },
    actionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
        gap: 10,
    },
    button: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: BorderRadius.md,
        minWidth: 80,
        alignItems: 'center',
    },
    activeButton: {
        backgroundColor: '#34C759',
    },
    iconButton: {
        width: 40,
        height: 40,
        borderRadius: BorderRadius.md,
        alignItems: 'center',
        justifyContent: 'center',
    },
    downloadButton: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: BorderRadius.md,
        alignItems: 'center',
    },
    buttonText: {
        color: 'white',
        fontSize: 14,
        fontWeight: '600',
    },
    progressContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    progressBarBase: {
        flex: 1,
        height: 6,
        borderRadius: BorderRadius.full,
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
    },
    progressText: {
        fontSize: 12,
        fontWeight: '700',
        width: 40,
        textAlign: 'right',
    },
    ruleItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    ruleLabelRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    ruleText: {
        fontSize: 15,
        fontWeight: '500',
    },
});
