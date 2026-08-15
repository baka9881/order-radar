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

  it("raises effective distance for a remote return", () => {
    const normal = calculateOrder({ amount: 100, distance: 8, minutes: 30, extraWait: 0, returnRisk: false });
    const remote = calculateOrder({ amount: 100, distance: 8, minutes: 30, extraWait: 0, returnRisk: true });
    expect(remote.effectiveDistance).toBeCloseTo(10.4);
    expect(remote.fullNet).toBeLessThan(normal.fullNet);
  });

  it("parses pasted offer text", () => {
    expect(parseOfferText("$132 · 8.4 公里 · 35 分鐘")).toEqual({
      amount: 132,
      distance: 8.4,
      minutes: 35,
    });
  });
});
