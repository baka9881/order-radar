import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from "react-native";
import * as Location from "expo-location";
import * as Notifications from "expo-notifications";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { BACKGROUND_LOCATION_TASK } from "./src/background-location";
import { DEFAULT_SETTINGS } from "./src/order-engine";
import { CalculatorScreen } from "./src/screens/CalculatorScreen";
import { HistoryScreen } from "./src/screens/HistoryScreen";
import { NavigationScreen } from "./src/screens/NavigationScreen";
import { OnboardingScreen } from "./src/screens/OnboardingScreen";
import { SettingsScreen } from "./src/screens/SettingsScreen";
import { deleteMarketContributions } from "./src/market-data";
import { IS_EXPO_GO } from "./src/runtime";
import { stopOrderCapture } from "./src/order-capture";
import {
  clearLocalData,
  DATA_PROGRAM_CONSENT_VERSION,
  loadHistory,
  loadPrivacyChoices,
  loadSettings,
  savePrivacyChoices,
  TERMS_VERSION,
} from "./src/storage";
import { COLORS } from "./src/theme";
import type { CalculatorSettings, DataProgramStatus, HistoryItem, PrivacyChoices } from "./src/types";

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
  const [privacyChoices, setPrivacyChoices] = useState<PrivacyChoices | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    void Promise.all([loadSettings(), loadHistory(), loadPrivacyChoices()]).then(([storedSettings, storedHistory, storedPrivacyChoices]) => {
      setSettings(storedSettings);
      setHistory(storedHistory);
      setPrivacyChoices(storedPrivacyChoices);
      setReady(true);
    });
  }, []);

  const completeOnboarding = async (dataProgramStatus: DataProgramStatus) => {
    const now = new Date().toISOString();
    const next: PrivacyChoices = {
      termsVersion: TERMS_VERSION,
      termsAcceptedAt: now,
      dataProgramStatus,
      consentVersion: dataProgramStatus === "enrolled" ? DATA_PROGRAM_CONSENT_VERSION : null,
      consentedAt: dataProgramStatus === "enrolled" ? now : null,
      contributionReceipts: [],
      deletionPending: false,
    };
    await savePrivacyChoices(next);
    setPrivacyChoices(next);
  };

  const changeDataProgram = async (status: DataProgramStatus) => {
    if (!privacyChoices) return false;

    if (status === "enrolled") {
      const now = new Date().toISOString();
      const next: PrivacyChoices = {
        ...privacyChoices,
        dataProgramStatus: "enrolled",
        consentVersion: DATA_PROGRAM_CONSENT_VERSION,
        consentedAt: now,
        deletionPending: false,
      };
      await savePrivacyChoices(next);
      setPrivacyChoices(next);
      return true;
    }

    let deleted = true;
    try {
      await deleteMarketContributions(privacyChoices.contributionReceipts);
    } catch {
      deleted = false;
    }
    const next: PrivacyChoices = {
      ...privacyChoices,
      dataProgramStatus: "declined",
      consentVersion: null,
      consentedAt: null,
      contributionReceipts: deleted ? [] : privacyChoices.contributionReceipts,
      deletionPending: !deleted && privacyChoices.contributionReceipts.length > 0,
    };
    await savePrivacyChoices(next);
    setPrivacyChoices(next);
    return deleted;
  };

  const addContributionReceipt = async (receiptId: string) => {
    if (!privacyChoices || privacyChoices.dataProgramStatus !== "enrolled") return;
    const next = {
      ...privacyChoices,
      contributionReceipts: [receiptId, ...privacyChoices.contributionReceipts].slice(0, 10000),
    };
    await savePrivacyChoices(next);
    setPrivacyChoices(next);
  };

  const clearEverything = async () => {
    await stopOrderCapture();
    if (!IS_EXPO_GO && await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK)) {
      await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
    }
    await Notifications.cancelAllScheduledNotificationsAsync();
    const deleted = privacyChoices ? await changeDataProgram("declined") : true;
    await clearLocalData({ preservePrivacyChoices: !deleted });
    setSettings(DEFAULT_SETTINGS);
    setHistory([]);
    if (deleted) setPrivacyChoices(null);
    else Alert.alert("已清除本機紀錄", "匿名資料已停止上傳；目前無法連線刪除過去貢獻，刪除憑證已保留，請稍後在設定重試。");
  };

  const renderScreen = () => {
    if (tab === "radar") {
      return (
        <NavigationScreen
          history={history}
          onOpenCalculator={() => setTab("calculator")}
          onOpenHistory={() => setTab("history")}
          onOpenSettings={() => setTab("settings")}
          settings={settings}
        />
      );
    }
    if (tab === "calculator") {
      return (
        <CalculatorScreen
          consentVersion={privacyChoices?.consentVersion ?? null}
          dataProgramEnabled={privacyChoices?.dataProgramStatus === "enrolled"}
          history={history}
          onContributionReceipt={addContributionReceipt}
          onHistoryChange={setHistory}
          settings={settings}
        />
      );
    }
    if (tab === "history") return <HistoryScreen history={history} />;
    return (
      <SettingsScreen
        dataProgramEnabled={privacyChoices?.dataProgramStatus === "enrolled"}
        deletionPending={privacyChoices?.deletionPending ?? false}
        key={JSON.stringify(settings)}
        onClearData={clearEverything}
        onDataProgramChange={changeDataProgram}
        onSettingsChange={setSettings}
        settings={settings}
      />
    );
  };

  return (
    <SafeAreaProvider>
      <SafeAreaView edges={["top", "left", "right"]} style={styles.safeArea}>
        <StatusBar style="light" />
        {ready && !privacyChoices ? (
          <OnboardingScreen onComplete={completeOnboarding} />
        ) : ready ? renderScreen() : (
          <View style={styles.loading}>
            <ActivityIndicator color={COLORS.green} size="large" />
            <Text style={styles.loadingText}>載入接單雷達…</Text>
          </View>
        )}
        {ready && privacyChoices && tab !== "radar" ? <View style={styles.tabBar}>
          {TABS.map((item) => {
            const active = tab === item.id;
            return (
              <Pressable accessibilityRole="button" key={item.id} onPress={() => setTab(item.id)} style={styles.tabButton}>
                <Text style={[styles.tabIcon, active && styles.tabActive]}>{item.icon}</Text>
                <Text style={[styles.tabLabel, active && styles.tabActive]}>{item.label}</Text>
              </Pressable>
            );
          })}
        </View> : null}
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
