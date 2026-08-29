import {
  calculateOrder,
  parseOfferText,
  RETURN_MODES,
  type ReturnMode,
} from "../../../shared/order-engine";

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

  const offer = parseOfferText(payload.text);
  if (!offer) {
    return json({ error: "找不到金額、公里或時間，請重新截圖" }, 422);
  }

  const automaticReturnMode: ReturnMode = /包裹/.test(payload.text) && offer.distance >= 15 ? "full" : "local";
  const returnMode: ReturnMode = typeof payload.returnMode === "string" && payload.returnMode in RETURN_MODES
    ? payload.returnMode as ReturnMode
    : typeof payload.returnRisk === "boolean"
      ? payload.returnRisk ? "hotspot" : "local"
      : automaticReturnMode;
  const result = calculateOrder({ ...offer, extraWait: 0, returnMode });
  const action = result.signal === "green" ? "接" : result.signal === "yellow" ? "看情況" : "不要接";

  return json({
    ...result,
    action,
    ...offer,
    returnMode,
    returnRisk: returnMode !== "local",
    message: `${action}｜淨時薪 $${Math.round(result.fullHourly)}｜每公里 $${result.perKm.toFixed(1)}`,
    privacy: "不儲存文字、截圖或判單結果",
  });
}
