import { Colors } from '@/src/cortex/shared/constants/theme';
import { useColorScheme } from '@/src/cortex/shared/hooks/use-color-scheme';
import { Ionicons } from '@expo/vector-icons';
import React, { useRef } from 'react';
import {
    Modal,
    PanResponder,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';

export type ChatSettings = {
    temperature: number;
    top_k: number;
    top_p: number;
    max_tokens: number;
    systemPrompt: string;
};

export const DEFAULT_SETTINGS: ChatSettings = {
    temperature: 0.7,
    top_k: 40,
    top_p: 0.9,
    max_tokens: 256,
    systemPrompt: '',
};

type Props = {
    visible: boolean;
    onClose: () => void;
    settings: ChatSettings;
    onUpdateSettings: (newSettings: ChatSettings) => void;
};

const CustomSlider = ({
    label,
    value,
    min,
    max,
    step,
    onChange,
    theme
}: {
    label: string;
    value: number;
    min: number;
    max: number;
    step: number;
    onChange: (val: number) => void;
    theme: typeof Colors.light;
}) => {
    const trackWidth = 250;
    const thumbSize = 20;

    // Calculate position
    const getPosFromValue = (v: number) => {
        const range = max - min;
        const percent = (v - min) / range;
        return percent * trackWidth;
    };

    const getValueFromPos = (x: number) => {
        let percent = x / trackWidth;
        if (percent < 0) percent = 0;
        if (percent > 1) percent = 1;
        const range = max - min;
        let rawVal = min + (range * percent);

        // Snap to step
        if (step > 0) {
            rawVal = Math.round(rawVal / step) * step;
        }
        return Number(rawVal.toFixed(step < 1 ? 2 : 0));
    };

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: () => true,
            onPanResponderGrant: (evt, gestureState) => {
                // Initial tap handling could go here
            },
            onPanResponderMove: (evt, gestureState) => {
                // We need relative coordinates. 
                // For simplicity in this "premium" custom slider, we use a fixed width approach 
                // or we could use onLayout to get exact width.
                // Let's assume touch location relative to the view is needed.
                // simpler: just use dx/dy from initial ? No, absolute move.

                // Better approach for robust slider:
                // Just use a simple horizontal View and map gesture x to value.
            },
            onPanResponderRelease: () => { },
        })
    ).current;

    // Simplified interactions for the sake of stability in this snippet:
    // We will use a standard View with onTouch to set value for now, 
    // or better, a simple "invisible" touch overlay.

    // Actually, writing a robust custom slider from scratch in one go can be tricky with exact coordinates.
    // Let's use a simpler "Button-based" stepper or just a direct visual representation 
    // where clicking the track sets the value.

    // REVISION: Let's just implement a simple "Touch Track" slider.
    const containerRef = useRef<View>(null);

    const handleTouch = (evt: any) => {
        const locationX = evt.nativeEvent.locationX;
        const newValue = getValueFromPos(locationX);
        onChange(newValue);
    };

    const leftPos = getPosFromValue(value);

    return (
        <View style={styles.sliderContainer}>
            <View style={styles.sliderHeader}>
                <Text style={[styles.sliderLabel, { color: theme.text }]}>{label}</Text>
                <Text style={[styles.sliderValue, { color: theme.primary }]}>{value}</Text>
            </View>
            <View
                style={[styles.trackContainer, { backgroundColor: theme.border }]}
                onTouchStart={handleTouch}
                onTouchMove={handleTouch}
            >
                <View style={[styles.trackFill, { backgroundColor: theme.primary, width: leftPos }]} />
                <View style={[styles.thumb, { backgroundColor: '#FFF', left: leftPos - (thumbSize / 2) }]} />
            </View>
        </View>
    );
};


export default function ChatSettingsModal({ visible, onClose, settings, onUpdateSettings }: Props) {
    const colorScheme = useColorScheme() ?? 'light';
    const theme = Colors[colorScheme];

    const handleChange = (key: keyof ChatSettings, val: number | string) => {
        onUpdateSettings({ ...settings, [key]: val });
    };

    const handleReset = () => {
        onUpdateSettings(DEFAULT_SETTINGS);
    };

    if (!visible) return null;

    return (
        <Modal visible={visible} animationType="slide" transparent>
            <View style={styles.overlay}>
                {/* Blur Effect Background could be here if using expo-blur */}
                <View style={[styles.modalContent, { backgroundColor: theme.background }]}>
                    <View style={styles.header}>
                        <Text style={[styles.title, { color: theme.text }]}>Adjutsment</Text>
                        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                            <Ionicons name="close" size={24} color={theme.text} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView contentContainerStyle={styles.scrollContent}>

                        {/* System Prompt Section */}
                        <View style={[styles.section, { backgroundColor: theme.card }]}>
                            <View style={styles.sectionHeader}>
                                <Ionicons name="person-outline" size={20} color={theme.primary} />
                                <Text style={[styles.sectionTitle, { color: theme.text }]}>System Persona</Text>
                            </View>
                            <Text style={[styles.desc, { color: theme.secondaryText }]}>
                                Override the default AI persona. Safety rules will still apply.
                            </Text>
                            <TextInput
                                style={[styles.textArea, { color: theme.text, borderColor: theme.border }]}
                                multiline
                                placeholder="E.g., You are a pirate..."
                                placeholderTextColor={theme.secondaryText}
                                value={settings.systemPrompt}
                                onChangeText={(t) => handleChange('systemPrompt', t)}
                            />
                        </View>

                        {/* Sliders Section */}
                        <View style={[styles.section, { backgroundColor: theme.card }]}>
                            <View style={styles.sectionHeader}>
                                <Ionicons name="options-outline" size={20} color={theme.primary} />
                                <Text style={[styles.sectionTitle, { color: theme.text }]}>Generation Parameters</Text>
                            </View>

                            <CustomSlider
                                label="Temperature (Creativity)"
                                value={settings.temperature}
                                min={0.1} max={2.0} step={0.1}
                                onChange={(v) => handleChange('temperature', v)}
                                theme={theme}
                            />

                            <CustomSlider
                                label="Top P (Nucleus)"
                                value={settings.top_p}
                                min={0.1} max={1.0} step={0.05}
                                onChange={(v) => handleChange('top_p', v)}
                                theme={theme}
                            />

                            <CustomSlider
                                label="Top K (Vocab)"
                                value={settings.top_k}
                                min={1} max={100} step={1}
                                onChange={(v) => handleChange('top_k', v)}
                                theme={theme}
                            />

                            <CustomSlider
                                label="Max Tokens"
                                value={settings.max_tokens}
                                min={64} max={2048} step={64}
                                onChange={(v) => handleChange('max_tokens', v)}
                                theme={theme}
                            />
                        </View>

                        <TouchableOpacity style={styles.resetBtn} onPress={handleReset}>
                            <Text style={[styles.resetText, { color: theme.secondaryText }]}>Reset to Defaults</Text>
                        </TouchableOpacity>

                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        height: '85%',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingTop: 20,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
        elevation: 5,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        marginBottom: 20,
    },
    title: {
        fontSize: 22,
        fontWeight: 'bold',
    },
    closeBtn: {
        padding: 4,
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingBottom: 40,
    },
    section: {
        borderRadius: 16,
        padding: 16,
        marginBottom: 20,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
        gap: 8,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '700',
    },
    desc: {
        fontSize: 13,
        marginBottom: 12,
    },
    textArea: {
        borderWidth: 1,
        borderRadius: 12,
        padding: 12,
        height: 100,
        textAlignVertical: 'top',
        fontSize: 15,
    },
    sliderContainer: {
        marginBottom: 20,
    },
    sliderHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 10,
    },
    sliderLabel: {
        fontSize: 14,
        fontWeight: '500',
    },
    sliderValue: {
        fontSize: 14,
        fontWeight: '700',
    },
    trackContainer: {
        height: 40, // Increased touch area
        justifyContent: 'center',
    },
    trackFill: {
        height: 4,
        borderRadius: 2,
    },
    thumb: {
        width: 20,
        height: 20,
        borderRadius: 10,
        position: 'absolute',
        top: 10, // (40 - 20) / 2
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.3,
        shadowRadius: 2,
        elevation: 3,
    },
    resetBtn: {
        alignItems: 'center',
        marginTop: 10,
        padding: 10,
    },
    resetText: {
        fontSize: 14,
        textDecorationLine: 'underline',
    }
});
