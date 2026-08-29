import type {
  CalculatorSettings,
  OrderInput,
  OrderResult,
  ReturnMode,
  Signal,
} from "../../shared/order-engine";

export type { CalculatorSettings, OrderInput, OrderResult, ReturnMode, Signal };

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

export type HistoryItem = OrderInput & {
  id: string;
  createdAt: string;
  signal: Signal;
  fullHourly: number;
  perKm: number;
};

export type DataProgramStatus = "enrolled" | "declined";

export type PrivacyChoices = {
  termsVersion: string;
  termsAcceptedAt: string;
  dataProgramStatus: DataProgramStatus;
  consentVersion: string | null;
  consentedAt: string | null;
  contributionReceipts: string[];
  deletionPending: boolean;
};
