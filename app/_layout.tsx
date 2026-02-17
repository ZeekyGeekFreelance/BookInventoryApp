import { QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { queryClient } from "@/lib/query-client";
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from "@expo-google-fonts/inter";
import Colors from "@/constants/colors";

SplashScreen.preventAutoHideAsync();

function RootLayoutNav() {
  return (
    <Stack
      screenOptions={{
        headerBackTitle: "Back",
        headerStyle: { backgroundColor: Colors.surface },
        headerTintColor: Colors.text,
        headerTitleStyle: { fontFamily: "Inter_600SemiBold" },
        contentStyle: { backgroundColor: Colors.background },
      }}
    >
      <Stack.Screen name="index" options={{ title: "Book Shop Manager" }} />
      <Stack.Screen name="inventory" options={{ title: "Inventory" }} />
      <Stack.Screen name="add-book" options={{ title: "Add Book" }} />
      <Stack.Screen name="restock" options={{ title: "Restock Order" }} />
      <Stack.Screen name="analytics" options={{ title: "Sales Analytics" }} />
      <Stack.Screen name="stats-detail" options={{ title: "Details" }} />
      <Stack.Screen name="expenses" options={{ title: "Expenses" }} />
      <Stack.Screen name="data-manage" options={{ title: "Backup & Restore" }} />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    console.log("RootLayout: fontsLoaded =", fontsLoaded);
    if (fontsLoaded) {
      SplashScreen.hideAsync().catch(err => console.log("Splash hide error:", err));
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    console.log("RootLayout: Waiting for fonts...");
    return null;
  }

  console.log("RootLayout: Rendering Providers");
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <RootLayoutNav />
        </GestureHandlerRootView>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
