import * as Crypto from "expo-crypto";
import * as Location from "expo-location";
import {
  quantizeCoordinate,
  toAmountBand,
  toDistanceBand,
  toDurationBand,
  toHourBucket,
  toWaitBand,
} from "./market-data-privacy";
import type { HistoryItem } from "./types";

const DEFAULT_API_URL = "https://order-radar-tw.baka0406.chatgpt.site";
const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? DEFAULT_API_URL).replace(/\/$/, "");

export type MarketContribution = {
  receiptId: string;
  consentVersion: string;
  observedHour: string;
  amountBand: number;
  distanceBand: number;
  durationBand: number;
  waitBand: number;
  signal: HistoryItem["signal"];
  areaLat: number | null;
  areaLng: number | null;
};

async function getCoarseArea() {
  const permission = await Location.getForegroundPermissionsAsync();
  if (!permission.granted) return { areaLat: null, areaLng: null };

  const position = await Location.getLastKnownPositionAsync({
    maxAge: 5 * 60 * 1000,
    requiredAccuracy: 5000,
  });
  if (!position) return { areaLat: null, areaLng: null };

  return {
    areaLat: quantizeCoordinate(position.coords.latitude),
    areaLng: quantizeCoordinate(position.coords.longitude),
  };
}

export async function submitMarketContribution(
  item: HistoryItem,
  consentVersion: string,
): Promise<string> {
  const receiptId = Crypto.randomUUID();
  const area = await getCoarseArea();
  const contribution: MarketContribution = {
    receiptId,
    consentVersion,
    observedHour: toHourBucket(item.createdAt),
    amountBand: toAmountBand(item.amount),
    distanceBand: toDistanceBand(item.distance),
    durationBand: toDurationBand(item.minutes),
    waitBand: toWaitBand(item.extraWait),
    signal: item.signal,
    ...area,
  };

  const response = await fetch(`${API_URL}/api/data-program/contributions`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(contribution),
  });
  if (!response.ok) throw new Error("contribution-upload-failed");
  return receiptId;
}

export async function deleteMarketContributions(receiptIds: string[]) {
  if (!receiptIds.length) return;
  for (let index = 0; index < receiptIds.length; index += 500) {
    const response = await fetch(`${API_URL}/api/data-program/contributions`, {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ receiptIds: receiptIds.slice(index, index + 500) }),
    });
    if (!response.ok) throw new Error("contribution-delete-failed");
  }
}
