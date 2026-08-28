type Signal = "green" | "yellow" | "red";
type ReturnMode = "local" | "hotspot" | "full";

const SETTINGS = {
  fullCostPerKm: 3,
  greenHourly: 250,
  yellowHourly: 200,
  greenPerKm: 15,
  yellowPerKm: 12,
};

const RETURN_MULTIPLIERS: Record<ReturnMode, number> = {
  local: 1,
  hotspot: 1.3,
  full: 2,
};

function currencyValues(text: string) {
  return [...text.matchAll(/[$＄]\s*([\d,]+(?:\.\d+)?)/g)]
    .map((match) => Number(match[1].replaceAll(",", "")))
    .filter(Number.isFinite);
}

function parseMinutes(text: string) {
  const hoursAndMinutes = text.match(
    /(\d+(?:\.\d+)?)\s*(?:小時|時|hours?|hrs?|h)\s*(?:(\d+(?:\.\d+)?)\s*(?:分鐘|分|minutes?|mins?|m))?/i,
  );
  if (hoursAndMinutes) {
    return Number(hoursAndMinutes[1]) * 60 + Number(hoursAndMinutes[2] ?? 0);
  }

  const minutesOnly = text.match(/(\d+(?:\.\d+)?)\s*(?:分鐘|分|minutes?|mins?|m)/i);
  return minutesOnly ? Number(minutesOnly[1]) : Number.NaN;
}

function parseOffer(text: string) {
  const amounts = currencyValues(text);
  const distances = [...text.matchAll(/(\d+(?:\.\d+)?)\s*(?:公里|公裏|km)/gi)]
    .map((match) => Number(match[1]))
    .filter(Number.isFinite);
  const minutes = parseMinutes(text);

  if (!amounts.length || !distances.length || !Number.isFinite(minutes)) return null;
  return {
    amount: Math.max(...amounts),
    distance: Math.max(...distances),
    minutes,
  };
}

function calculate(amount: number, distance: number, minutes: number, returnMode: ReturnMode) {
  const multiplier = RETURN_MULTIPLIERS[returnMode];
  const effectiveDistance = distance * multiplier;
  const effectiveMinutes = minutes * multiplier;
  const fullNet = amount - effectiveDistance * SETTINGS.fullCostPerKm;
  const fullHourly = (fullNet * 60) / Math.max(effectiveMinutes, 1);
  const perKm = amount / Math.max(effectiveDistance, 0.1);
  const greenMinimum = Math.max(
    45,
    effectiveDistance * SETTINGS.greenPerKm,
    effectiveDistance * SETTINGS.fullCostPerKm + (SETTINGS.greenHourly * effectiveMinutes) / 60,
  );
  const yellowMinimum = Math.max(
    45,
    effectiveDistance * SETTINGS.yellowPerKm,
    effectiveDistance * SETTINGS.fullCostPerKm + (SETTINGS.yellowHourly * effectiveMinutes) / 60,
  );

  let signal: Signal = "red";
  if (amount >= greenMinimum) signal = "green";
  else if (amount >= yellowMinimum) signal = "yellow";

  const action = signal === "green" ? "接" : signal === "yellow" ? "看情況" : "不要接";
  return {
    signal,
    action,
    fullNet,
    fullHourly,
    perKm,
    effectiveDistance,
    effectiveMinutes,
    message: `${action}｜淨時薪 $${Math.round(fullHourly)}｜每公里 $${perKm.toFixed(1)}`,
  };
}

function json(body: unknown, status = 200) {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

export async function POST(request: Request) {
  let payload: { text?: unknown; returnMode?: unknown; returnRisk?: unknown };
  try {
    payload = (await request.json()) as typeof payload;
  } catch {
    return json({ error: "請提供捷徑辨識文字" }, 400);
  }

  if (typeof payload.text !== "string" || !payload.text.trim() || payload.text.length > 2000) {
    return json({ error: "辨識文字格式不正確" }, 400);
  }

  const offer = parseOffer(payload.text);
  if (!offer) {
    return json({ error: "找不到金額、公里或時間，請重新截圖" }, 422);
  }

  const automaticReturnMode: ReturnMode = /包裹/.test(payload.text) && offer.distance >= 15 ? "full" : "local";
  const returnMode: ReturnMode = typeof payload.returnMode === "string" && payload.returnMode in RETURN_MULTIPLIERS
    ? payload.returnMode as ReturnMode
    : typeof payload.returnRisk === "boolean"
      ? payload.returnRisk ? "hotspot" : "local"
      : automaticReturnMode;
  const result = calculate(offer.amount, offer.distance, offer.minutes, returnMode);

  return json({
    ...result,
    ...offer,
    returnMode,
    returnRisk: returnMode !== "local",
    privacy: "不儲存文字、截圖或判單結果",
  });
}
