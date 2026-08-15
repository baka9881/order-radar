import AsyncStorage from "@react-native-async-storage/async-storage";
import { DEFAULT_SETTINGS } from "./order-engine";
import type { CalculatorSettings, EnforcementPoint, HistoryItem } from "./types";

export const STORAGE_KEYS = {
  settings: "order-radar/settings/v1",
  history: "order-radar/history/v1",
  alertPoints: "order-radar/alert-points/v1",
  lastBackgroundAlert: "order-radar/last-background-alert/v1",
} as const;

export async function loadSettings() {
  const raw = await AsyncStorage.getItem(STORAGE_KEYS.settings);
  if (!raw) return DEFAULT_SETTINGS;
  try {
    return { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<CalculatorSettings>) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function saveSettings(settings: CalculatorSettings) {
  await AsyncStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(settings));
}

export async function loadHistory() {
  const raw = await AsyncStorage.getItem(STORAGE_KEYS.history);
  if (!raw) return [];
  try {
    return (JSON.parse(raw) as HistoryItem[]).slice(0, 500);
  } catch {
    return [];
  }
}

export async function saveHistory(history: HistoryItem[]) {
  await AsyncStorage.setItem(STORAGE_KEYS.history, JSON.stringify(history.slice(0, 500)));
}

export async function saveAlertPoints(points: EnforcementPoint[]) {
  await AsyncStorage.setItem(STORAGE_KEYS.alertPoints, JSON.stringify(points.slice(0, 250)));
}

export async function clearLocalData() {
  await AsyncStorage.multiRemove(Object.values(STORAGE_KEYS));
}
