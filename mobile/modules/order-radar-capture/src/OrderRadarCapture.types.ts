export type OrderRadarCaptureModuleEvents = {
  onCaptureStatus: (event: CaptureStatus) => void;
  onOrderDetected: (event: DetectedOrder) => void;
};

export type CaptureState = 'idle' | 'requesting' | 'running' | 'stopped' | 'error';

export type CaptureStatus = {
  state: CaptureState;
  message: string;
  canDrawOverlays: boolean;
  lastError?: string;
};

export type RadarCalculationSettings = {
  cashCostPerKm: number;
  fullCostPerKm: number;
  fuelEconomy: number;
  fuelPrice: number;
  greenHourly: number;
  greenPerKm: number;
  yellowHourly: number;
  yellowPerKm: number;
};

export type DetectedOrder = {
  amount: number;
  distance: number;
  minutes: number;
  signal: 'green' | 'yellow' | 'red';
  fullNet: number;
  fullHourly: number;
  perKm: number;
  confidence: number;
  detectedAt: string;
  sourceText: string;
};
