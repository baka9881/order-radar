export type Signal = "green" | "yellow" | "red";

export type Coordinates = {
  latitude: number;
  longitude: number;
};

export type EnforcementPoint = Coordinates & {
  id: string;
  type: "speed" | "technology" | "interval";
  city: string;
  title: string;
  detail: string;
  direction: string;
  speedLimit: number | null;
  source: string;
  distanceKm?: number;
};

export type EnforcementDataset = {
  generatedAt: string;
  notice: string;
  points: EnforcementPoint[];
  sources: Array<{
    label: string;
    url: string;
    available: boolean;
    total: number;
  }>;
};

export type CalculatorSettings = {
  fuelPrice: number;
  fuelEconomy: number;
  cashCostPerKm: number;
  fullCostPerKm: number;
  greenHourly: number;
  yellowHourly: number;
  greenPerKm: number;
  yellowPerKm: number;
};

export type OrderInput = {
  amount: number;
  distance: number;
  minutes: number;
  extraWait: number;
  returnRisk: boolean;
};

export type OrderResult = {
  signal: Signal;
  effectiveDistance: number;
  effectiveMinutes: number;
  fuelPerKm: number;
  fuelCost: number;
  cashNet: number;
  fullNet: number;
  cashHourly: number;
  fullHourly: number;
  perKm: number;
  greenMinimum: number;
  yellowMinimum: number;
};

export type HistoryItem = OrderInput & {
  id: string;
  createdAt: string;
  signal: Signal;
  fullHourly: number;
  perKm: number;
};
