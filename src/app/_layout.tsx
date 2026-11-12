import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { LabPathProvider } from '../context/LabPathContext';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <LabPathProvider>
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
        </Stack>
      </LabPathProvider>
    </SafeAreaProvider>
  );
}
