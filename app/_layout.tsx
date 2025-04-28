import { Stack } from "expo-router";
import { useEffect } from "react";
import { initDatabase } from "./services/database";

export default function RootLayout() {
  useEffect(() => {
    initDatabase();
  }, []);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
    </Stack>
  );
}
