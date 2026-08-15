import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import * as Location from "expo-location";
import * as Notifications from "expo-notifications";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { BACKGROUND_LOCATION_TASK } from "./src/background-location";
import { DEFAULT_SETTINGS } from "./src/order-engine";
import { CalculatorScreen } from "./src/screens/CalculatorScreen";
import { HistoryScreen } from "./src/screens/HistoryScreen";
import { NavigationScreen } from "./src/screens/NavigationScreen";
import { SettingsScreen } from "./src/screens/SettingsScreen";
import { clearLocalData, loadHistory, loadSettings } from "./src/storage";
import { COLORS } from "./src/theme";
import type { CalculatorSettings, HistoryItem } from "./src/types";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

type Tab = "radar" | "calculator" | "history" | "settings";

const TABS: Array<{ id: Tab; icon: string; label: string }> = [
  { id: "radar", icon: "◎", label: "雷達" },
  { id: "calculator", icon: "$", label: "試算" },
  { id: "history", icon: "≡", label: "紀錄" },
  { id: "settings", icon: "⚙", label: "設定" },
];

export default function App() {
  const [tab, setTab] = useState<Tab>("radar");
  const [settings, setSettings] = useState<CalculatorSettings>(DEFAULT_SETTINGS);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    void Promise.all([loadSettings(), loadHistory()]).then(([storedSettings, storedHistory]) => {
      setSettings(storedSettings);
      setHistory(storedHistory);
      setReady(true);
    });
  }, []);

  const clearEverything = async () => {
    if (await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK)) {
      await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
    }
    await Notifications.cancelAllScheduledNotificationsAsync();
    await clearLocalData();
    setSettings(DEFAULT_SETTINGS);
    setHistory([]);
  };

  const renderScreen = () => {
    if (tab === "radar") return <NavigationScreen />;
    if (tab === "calculator") {
      return <CalculatorScreen history={history} onHistoryChange={setHistory} settings={settings} />;
    }
    if (tab === "history") return <HistoryScreen history={history} />;
    return <SettingsScreen key={JSON.stringify(settings)} onClearData={clearEverything} onSettingsChange={setSettings} settings={settings} />;
  };

  return (
    <SafeAreaProvider>
      <SafeAreaView edges={["top", "left", "right"]} style={styles.safeArea}>
        <StatusBar style="light" />
        {ready ? renderScreen() : (
          <View style={styles.loading}>
            <ActivityIndicator color={COLORS.green} size="large" />
            <Text style={styles.loadingText}>載入接單雷達…</Text>
          </View>
        )}
        <View style={styles.tabBar}>
          {TABS.map((item) => {
            const active = tab === item.id;
            return (
              <Pressable accessibilityRole="button" key={item.id} onPress={() => setTab(item.id)} style={styles.tabButton}>
                <Text style={[styles.tabIcon, active && styles.tabActive]}>{item.icon}</Text>
                <Text style={[styles.tabLabel, active && styles.tabActive]}>{item.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.canvas },
  loading: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  loadingText: { color: COLORS.muted, fontSize: 12 },
  tabBar: { position: "absolute", left: 12, right: 12, bottom: 12, height: 70, flexDirection: "row", paddingHorizontal: 5, paddingVertical: 7, borderWidth: 1, borderColor: COLORS.line, borderRadius: 23, backgroundColor: "rgba(13,26,20,0.97)", shadowColor: "#000", shadowOpacity: 0.34, shadowRadius: 22, shadowOffset: { width: 0, height: 10 }, elevation: 12 },
  tabButton: { flex: 1, alignItems: "center", justifyContent: "center", gap: 3 },
  tabIcon: { color: COLORS.muted, fontSize: 19, fontWeight: "800" },
  tabLabel: { color: COLORS.muted, fontSize: 9, fontWeight: "700" },
  tabActive: { color: COLORS.green },
});
