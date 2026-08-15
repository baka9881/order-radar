import AsyncStorage from "@react-native-async-storage/async-storage";
import { DEFAULT_SETTINGS } from "./order-engine";
import type { CalculatorSettings, EnforcementPoint, HistoryItem, PrivacyChoices } from "./types";

export const STORAGE_KEYS = {
  settings: "order-radar/settings/v1",
  history: "order-radar/history/v1",
  alertPoints: "order-radar/alert-points/v1",
  lastBackgroundAlert: "order-radar/last-background-alert/v1",
  privacyChoices: "order-radar/privacy-choices/v1",
} as const;

export const TERMS_VERSION = "2026-08-15";
export const DATA_PROGRAM_CONSENT_VERSION = "2026-08-15-v1";

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

export async function loadPrivacyChoices(): Promise<PrivacyChoices | null> {
  const raw = await AsyncStorage.getItem(STORAGE_KEYS.privacyChoices);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<PrivacyChoices>;
    if (!parsed.termsAcceptedAt || !parsed.dataProgramStatus) return null;
    return {
      termsVersion: parsed.termsVersion ?? TERMS_VERSION,
      termsAcceptedAt: parsed.termsAcceptedAt,
      dataProgramStatus: parsed.dataProgramStatus,
      consentVersion: parsed.consentVersion ?? null,
      consentedAt: parsed.consentedAt ?? null,
      contributionReceipts: Array.isArray(parsed.contributionReceipts)
        ? parsed.contributionReceipts.slice(0, 10000)
        : [],
      deletionPending: Boolean(parsed.deletionPending),
    };
  } catch {
    return null;
  }
}

export async function savePrivacyChoices(choices: PrivacyChoices) {
  await AsyncStorage.setItem(STORAGE_KEYS.privacyChoices, JSON.stringify(choices));
}

export async function clearLocalData(options?: { preservePrivacyChoices?: boolean }) {
  const keys = Object.values(STORAGE_KEYS).filter(
    (key) => !(options?.preservePrivacyChoices && key === STORAGE_KEYS.privacyChoices),
  );
  await AsyncStorage.multiRemove(keys);
}
