import type { CalculatorSettings, OrderInput, OrderResult, ReturnMode, Signal } from "./types";

export const DEFAULT_SETTINGS: CalculatorSettings = {
  fuelPrice: 30.5,
  fuelEconomy: 44.8,
  cashCostPerKm: 1.6,
  fullCostPerKm: 3,
  greenHourly: 250,
  yellowHourly: 200,
  greenPerKm: 15,
  yellowPerKm: 12,
};

export const STATUS: Record<Signal, { label: string; action: string }> = {
  green: { label: "值得接", action: "接" },
  yellow: { label: "看情況", action: "看" },
  red: { label: "先不要", action: "拒" },
};

export const RETURN_MODES: Record<
  ReturnMode,
  { label: string; description: string; multiplier: number }
> = {
  local: { label: "當地續跑", description: "送達後留在當地等下一單", multiplier: 1 },
  hotspot: { label: "回附近熱區", description: "加計 30% 回程距離與時間", multiplier: 1.3 },
  full: { label: "原路空返", description: "加計完整回程距離與時間", multiplier: 2 },
};

export function normalizeReturnMode(returnMode?: ReturnMode, returnRisk?: boolean): ReturnMode {
  if (returnMode && returnMode in RETURN_MODES) return returnMode;
  return returnRisk ? "hotspot" : "local";
}

export function getTripMultiplier(input: Pick<OrderInput, "returnMode" | "returnRisk">) {
  return RETURN_MODES[normalizeReturnMode(input.returnMode, input.returnRisk)].multiplier;
}

export function calculateOrder(
  input: OrderInput,
  settings: CalculatorSettings = DEFAULT_SETTINGS,
): OrderResult {
  const amount = Number.isFinite(input.amount) ? Math.max(input.amount, 0) : 0;
  const distance = Number.isFinite(input.distance) ? Math.max(input.distance, 0) : 0;
  const minutes = Number.isFinite(input.minutes) ? Math.max(input.minutes, 0) : 0;
  const extraWait = Number.isFinite(input.extraWait) ? Math.max(input.extraWait, 0) : 0;
  const tripMultiplier = getTripMultiplier(input);
  const effectiveDistance = distance * tripMultiplier;
  const effectiveMinutes = Math.max(minutes * tripMultiplier + extraWait, 1);
  const fuelPerKm = settings.fuelPrice / Math.max(settings.fuelEconomy, 1);
  const fuelCost = effectiveDistance * fuelPerKm;
  const cashNet = amount - effectiveDistance * settings.cashCostPerKm;
  const fullNet = amount - effectiveDistance * settings.fullCostPerKm;
  const cashHourly = (cashNet * 60) / effectiveMinutes;
  const fullHourly = (fullNet * 60) / effectiveMinutes;
  const perKm = effectiveDistance > 0 ? amount / effectiveDistance : 0;
  const greenMinimum = Math.max(
    45,
    effectiveDistance * settings.greenPerKm,
    effectiveDistance * settings.fullCostPerKm +
      (settings.greenHourly * effectiveMinutes) / 60,
  );
  const yellowMinimum = Math.max(
    45,
    effectiveDistance * settings.yellowPerKm,
    effectiveDistance * settings.fullCostPerKm +
      (settings.yellowHourly * effectiveMinutes) / 60,
  );

  let signal: Signal = "red";
  if (amount >= greenMinimum) signal = "green";
  else if (amount >= yellowMinimum) signal = "yellow";

  return {
    signal,
    effectiveDistance,
    effectiveMinutes,
    fuelPerKm,
    fuelCost,
    cashNet,
    fullNet,
    cashHourly,
    fullHourly,
    perKm,
    greenMinimum,
    yellowMinimum,
  };
}

export function parseOfferText(input: string) {
  const amounts = [...input.matchAll(/(?:NT\s*)?[$＄]\s*([\d,]+(?:\.\d+)?)/gi)]
    .map((match) => Number(match[1].replaceAll(",", "")))
    .filter(Number.isFinite);
  const hourMatch = input.match(/(\d+(?:\.\d+)?)\s*(?:小時|時|hours?|hrs?|h)\s*(?:(\d+(?:\.\d+)?)\s*(?:分鐘|分|minutes?|mins?|m))?/i);
  const minuteMatch = input.match(/(\d+(?:\.\d+)?)\s*(?:分鐘|分|minutes?|mins?|m)/i);
  const minutes = hourMatch
    ? Number(hourMatch[1]) * 60 + Number(hourMatch[2] ?? 0)
    : minuteMatch
      ? Number(minuteMatch[1])
      : Number.NaN;
  const distanceMatch = input.match(/(\d+(?:\.\d+)?)\s*(?:公里|km)/i);
  if (!amounts.length || !Number.isFinite(minutes) || !distanceMatch) return null;
  return {
    amount: Math.max(...amounts),
    distance: Number(distanceMatch[1]),
    minutes,
  };
}

export function formatNumber(value: number, digits = 0) {
  if (!Number.isFinite(value)) return "—";
  return new Intl.NumberFormat("zh-TW", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}
