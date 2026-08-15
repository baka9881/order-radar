import { describe, expect, it } from "vitest";
import { enforcementDataset, nearbyPoints } from "./enforcement";

describe("offline enforcement snapshot", () => {
  it("contains official fixed enforcement points across supported types", () => {
    expect(enforcementDataset.points.length).toBeGreaterThan(1000);
    expect(new Set(enforcementDataset.points.map((point) => point.type))).toEqual(
      new Set(["speed", "technology", "interval"]),
    );
  });

  it("sorts nearby points by distance", () => {
    const points = nearbyPoints({ latitude: 25.036, longitude: 121.432 }, 10);
    expect(points.length).toBeGreaterThan(0);
    expect(points[0].distanceKm).toBeLessThanOrEqual(points.at(-1)?.distanceKm ?? 0);
  });
});
