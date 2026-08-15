import { describe, expect, it } from "vitest";
import {
  quantizeCoordinate,
  toAmountBand,
  toDistanceBand,
  toDurationBand,
  toHourBucket,
  toWaitBand,
} from "./market-data-privacy";

describe("anonymous market contribution", () => {
  it("removes exact order values before upload", () => {
    expect(toAmountBand(137)).toBe(120);
    expect(toDistanceBand(8.4)).toBe(8);
    expect(toDurationBand(37)).toBe(30);
    expect(toWaitBand(7)).toBe(5);
  });

  it("coarsens timestamps and coordinates", () => {
    expect(toHourBucket("2026-08-15T10:47:28.000Z")).toBe("2026-08-15T10:00:00.000Z");
    expect(quantizeCoordinate(25.033964)).toBe(25.04);
    expect(quantizeCoordinate(121.564468)).toBe(121.56);
  });
});
