const GRID_DEGREES = 0.02;

export function toAmountBand(value: number) {
  return Math.min(5000, Math.max(0, Math.floor(value / 20) * 20));
}

export function toDistanceBand(value: number) {
  return Math.min(200, Math.max(0, Math.floor(value / 2) * 2));
}

export function toDurationBand(value: number) {
  return Math.min(300, Math.max(0, Math.floor(value / 10) * 10));
}

export function toWaitBand(value: number) {
  return Math.min(120, Math.max(0, Math.floor(value / 5) * 5));
}

export function toHourBucket(value: string) {
  const date = new Date(value);
  date.setUTCMinutes(0, 0, 0);
  return date.toISOString();
}

export function quantizeCoordinate(value: number) {
  return Number((Math.round(value / GRID_DEGREES) * GRID_DEGREES).toFixed(2));
}
