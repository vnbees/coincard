import { Stack } from "expo-router";
import { useEffect, useState } from "react";
import { initDatabase } from "./services/database";
import * as SplashScreen from 'expo-splash-screen';
import { View } from "react-native";
import * as Font from 'expo-font';

// Giữ splash screen hiển thị cho đến khi ứng dụng sẵn sàng
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [appIsReady, setAppIsReady] = useState(false);

  useEffect(() => {
    async function prepare() {
      try {
        // Khởi tạo database
        await initDatabase();
        
        // Tải bất kỳ tài nguyên cần thiết nào, như fonts
        await Font.loadAsync({
          'SpaceMono-Regular': require('../assets/fonts/SpaceMono-Regular.ttf'),
        });
        
        // Thêm delay nhỏ để đảm bảo JS thread không bị block
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (e) {
        console.warn("Lỗi khi chuẩn bị ứng dụng:", e);
      } finally {
        // Đánh dấu ứng dụng đã sẵn sàng
        setAppIsReady(true);
      }
    }

    prepare();
  }, []);

  useEffect(() => {
    // Chỉ ẩn splash screen khi ứng dụng đã sẵn sàng
    if (appIsReady) {
      SplashScreen.hideAsync();
    }
  }, [appIsReady]);

  if (!appIsReady) {
    return null;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
    </Stack>
  );
}
