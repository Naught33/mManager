import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';
import { Stack } from 'expo-router';

export default function RootLayout() {
  return (
    <>
      <Stack>
        <Stack.Screen name="index" options={{ title: 'Home', headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ title: 'tabs', headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ title: 'auth', headerShown: false }} />
      </Stack>
    </>
  );
}
