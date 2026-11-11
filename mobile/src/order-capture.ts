import { Platform } from "react-native";
import NativeOrderRadarCapture from "../modules/order-radar-capture/src/OrderRadarCaptureModule";
import type {
  CaptureStatus,
  DetectedOrder,
  RadarCalculationSettings,
} from "../modules/order-radar-capture/src/OrderRadarCapture.types";
import { IS_EXPO_GO } from "./runtime";
import type { CalculatorSettings } from "./types";

export type { CaptureStatus, DetectedOrder };

export const ORDER_CAPTURE_AVAILABLE =
  Platform.OS === "android" && !IS_EXPO_GO && NativeOrderRadarCapture !== null;

export const DEFAULT_CAPTURE_STATUS: CaptureStatus = {
  state: "idle",
  message: Platform.OS === "android"
    ? "自動判單尚未啟動"
    : "iPhone 需使用截圖分享辨識，無法持續監看其他 App",
  canDrawOverlays: false,
  hasNotificationAccess: false,
};

function toNativeSettings(settings: CalculatorSettings): RadarCalculationSettings {
  return {
    cashCostPerKm: settings.cashCostPerKm,
    fullCostPerKm: settings.fullCostPerKm,
    fuelEconomy: settings.fuelEconomy,
    fuelPrice: settings.fuelPrice,
    greenHourly: settings.greenHourly,
    greenPerKm: settings.greenPerKm,
    yellowHourly: settings.yellowHourly,
    yellowPerKm: settings.yellowPerKm,
  };
}

export async function getCaptureStatus() {
  if (!ORDER_CAPTURE_AVAILABLE || !NativeOrderRadarCapture) return DEFAULT_CAPTURE_STATUS;
  return NativeOrderRadarCapture.getStatusAsync();
}

export async function getLastDetection() {
  if (!ORDER_CAPTURE_AVAILABLE || !NativeOrderRadarCapture) return null;
  return NativeOrderRadarCapture.getLastDetectionAsync();
}

export async function startOrderCapture(settings: CalculatorSettings) {
  if (!ORDER_CAPTURE_AVAILABLE || !NativeOrderRadarCapture) {
    throw new Error("此功能需要安裝含原生辨識模組的 Android 測試版");
  }
  return NativeOrderRadarCapture.startCaptureAsync(toNativeSettings(settings));
}

export async function stopOrderCapture() {
  if (!ORDER_CAPTURE_AVAILABLE || !NativeOrderRadarCapture) return DEFAULT_CAPTURE_STATUS;
  return NativeOrderRadarCapture.stopCaptureAsync();
}

export async function openOverlayPermissionSettings() {
  if (!ORDER_CAPTURE_AVAILABLE || !NativeOrderRadarCapture) return;
  await NativeOrderRadarCapture.openOverlaySettingsAsync();
}

export async function openNotificationAccessSettings() {
  if (!ORDER_CAPTURE_AVAILABLE || !NativeOrderRadarCapture) return;
  await NativeOrderRadarCapture.openNotificationAccessSettingsAsync();
}

export function addCaptureStatusListener(listener: (status: CaptureStatus) => void) {
  return NativeOrderRadarCapture?.addListener("onCaptureStatus", listener) ?? null;
}

export function addOrderDetectedListener(listener: (order: DetectedOrder) => void) {
  return NativeOrderRadarCapture?.addListener("onOrderDetected", listener) ?? null;
}
