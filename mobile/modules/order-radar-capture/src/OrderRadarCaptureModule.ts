import { NativeModule, requireOptionalNativeModule } from 'expo';

import type {
  CaptureStatus,
  DetectedOrder,
  OrderRadarCaptureModuleEvents,
  RadarCalculationSettings,
} from './OrderRadarCapture.types';

declare class OrderRadarCaptureModule extends NativeModule<OrderRadarCaptureModuleEvents> {
  canDrawOverlaysAsync(): Promise<boolean>;
  getLastDetectionAsync(): Promise<DetectedOrder | null>;
  getStatusAsync(): Promise<CaptureStatus>;
  openOverlaySettingsAsync(): Promise<void>;
  startCaptureAsync(settings: RadarCalculationSettings): Promise<CaptureStatus>;
  stopCaptureAsync(): Promise<CaptureStatus>;
}

export default requireOptionalNativeModule<OrderRadarCaptureModule>('OrderRadarCapture');
