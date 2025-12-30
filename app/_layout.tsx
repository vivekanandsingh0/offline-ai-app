import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { useChatStore } from '@/src/cortex/core/store/useChatStore';
import { useModelStore } from '@/src/cortex/core/store/useModelStore';
import { useUserStore } from '@/src/cortex/core/store/useUserStore';
import { useColorScheme } from '@/src/cortex/shared/hooks/use-color-scheme';
import { useEffect } from 'react';

export const unstable_settings = {
  anchor: '(tabs)',
};

function RootLayout() {
  const colorScheme = useColorScheme();

  // Initialize stores on app launch
  useEffect(() => {
    useModelStore.getState().initialize();
    useChatStore.getState().initialize();
    useUserStore.getState().initialize();
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
