import { describe, expect, it } from "vitest";
import { calculateOrder, DEFAULT_SETTINGS, parseOfferText } from "./order-engine";

describe("order engine", () => {
  it("keeps the same Cygnus Gryphus 125 defaults as the web calculator", () => {
    expect(DEFAULT_SETTINGS.fuelEconomy).toBe(44.8);
    expect(DEFAULT_SETTINGS.fuelPrice).toBe(30.5);
    expect(DEFAULT_SETTINGS.fullCostPerKm).toBe(3);
  });

  it("marks a strong order green", () => {
    const result = calculateOrder({
      amount: 180,
      distance: 5,
      minutes: 25,
      extraWait: 0,
      returnRisk: false,
    });
    expect(result.signal).toBe("green");
    expect(result.fullHourly).toBeGreaterThan(250);
  });

  it("adds both distance and time when returning to a nearby hotspot", () => {
    const normal = calculateOrder({ amount: 100, distance: 8, minutes: 30, extraWait: 0, returnMode: "local" });
    const remote = calculateOrder({ amount: 100, distance: 8, minutes: 30, extraWait: 0, returnMode: "hotspot" });
    expect(remote.effectiveDistance).toBeCloseTo(10.4);
    expect(remote.effectiveMinutes).toBeCloseTo(39);
    expect(remote.fullNet).toBeLessThan(normal.fullNet);
    expect(remote.fullHourly).toBeLessThan(normal.fullHourly);
  });

  it("counts a full empty return for the long package order", () => {
    const result = calculateOrder({
      amount: 795,
      distance: 29.8,
      minutes: 63,
      extraWait: 0,
      returnMode: "full",
    });
    expect(result.effectiveDistance).toBeCloseTo(59.6);
    expect(result.effectiveMinutes).toBeCloseTo(126);
    expect(result.fullNet).toBeCloseTo(616.2);
    expect(result.fullHourly).toBeCloseTo(293.43, 1);
    expect(result.perKm).toBeCloseTo(13.34, 1);
    expect(result.signal).toBe("yellow");
  });

  it("keeps old return-risk records compatible", () => {
    const result = calculateOrder({ amount: 100, distance: 8, minutes: 30, extraWait: 0, returnRisk: true });
    expect(result.effectiveDistance).toBeCloseTo(10.4);
    expect(result.effectiveMinutes).toBeCloseTo(39);
  });

  it("parses pasted offer text", () => {
    expect(parseOfferText("$132 · 8.4 公里 · 35 分鐘")).toEqual({
      amount: 132,
      distance: 8.4,
      minutes: 35,
    });
  });

  it("parses hours and ignores a smaller base amount", () => {
    expect(parseOfferText("包裹 $795 包含基本報酬加成 $136.00 總計 1 小時 3 分鐘 (29.8 公里)")).toEqual({
      amount: 795,
      distance: 29.8,
      minutes: 63,
    });
  });
});
