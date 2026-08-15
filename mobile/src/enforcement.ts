import datasetJson from "../assets/enforcement.json";
import type { Coordinates, EnforcementDataset, EnforcementPoint } from "./types";

export const enforcementDataset = datasetJson as EnforcementDataset;

export const TYPE_LABEL: Record<EnforcementPoint["type"], string> = {
  speed: "固定測速",
  technology: "科技執法",
  interval: "區間測速",
};

export const TYPE_COLOR: Record<EnforcementPoint["type"], string> = {
  speed: "#ff6a62",
  technology: "#ffcb47",
  interval: "#a990ff",
};

export function distanceKm(origin: Coordinates, target: Coordinates) {
  const radians = (value: number) => (value * Math.PI) / 180;
  const latitudeDelta = radians(target.latitude - origin.latitude);
  const longitudeDelta = radians(target.longitude - origin.longitude);
  const a =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(radians(origin.latitude)) *
      Math.cos(radians(target.latitude)) *
      Math.sin(longitudeDelta / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function nearbyPoints(origin: Coordinates, radiusKm = 35, limit = 250) {
  return enforcementDataset.points
    .map((point) => ({ ...point, distanceKm: distanceKm(origin, point) }))
    .filter((point) => (point.distanceKm ?? Infinity) <= radiusKm)
    .sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity))
    .slice(0, limit);
}

export function formatDistance(distance: number) {
  return distance < 1
    ? `${Math.max(1, Math.round(distance * 1000))} 公尺`
    : `${distance.toFixed(1)} 公里`;
}
