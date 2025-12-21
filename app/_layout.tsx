import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { useEffect } from 'react'; // Added import
import { useChatStore } from '../store/useChatStore';
import { useModelStore } from '../store/useModelStore'; // Added import

export const unstable_settings = {
  anchor: '(tabs)',
};

function RootLayout() {
  const colorScheme = useColorScheme();

  // Initialize stores on app launch
  useEffect(() => {
    useModelStore.getState().initialize();
    useChatStore.getState().initialize();
  }, []);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}

export default RootLayout;
