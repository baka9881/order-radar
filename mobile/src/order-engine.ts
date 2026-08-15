import type { CalculatorSettings, OrderInput, OrderResult, Signal } from "./types";

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

export function calculateOrder(
  input: OrderInput,
  settings: CalculatorSettings = DEFAULT_SETTINGS,
): OrderResult {
  const amount = Number.isFinite(input.amount) ? Math.max(input.amount, 0) : 0;
  const distance = Number.isFinite(input.distance) ? Math.max(input.distance, 0) : 0;
  const minutes = Number.isFinite(input.minutes) ? Math.max(input.minutes, 0) : 0;
  const extraWait = Number.isFinite(input.extraWait) ? Math.max(input.extraWait, 0) : 0;
  const effectiveDistance = distance * (input.returnRisk ? 1.3 : 1);
  const effectiveMinutes = Math.max(minutes + extraWait, 1);
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
  const amountMatch = input.match(/(?:NT\s*)?\$\s*([\d,]+(?:\.\d+)?)/i);
  const timeMatch = input.match(/(\d+(?:\.\d+)?)\s*(?:分鐘|min)/i);
  const distanceMatch = input.match(/(\d+(?:\.\d+)?)\s*(?:公里|km)/i);
  if (!amountMatch || !timeMatch || !distanceMatch) return null;
  return {
    amount: Number(amountMatch[1].replaceAll(",", "")),
    distance: Number(distanceMatch[1]),
    minutes: Number(timeMatch[1]),
  };
}

export function formatNumber(value: number, digits = 0) {
  if (!Number.isFinite(value)) return "—";
  return new Intl.NumberFormat("zh-TW", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}
