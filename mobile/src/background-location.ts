import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";
import * as Notifications from "expo-notifications";
import * as TaskManager from "expo-task-manager";
import { distanceKm, TYPE_LABEL } from "./enforcement";
import { STORAGE_KEYS } from "./storage";
import type { EnforcementPoint } from "./types";

export const BACKGROUND_LOCATION_TASK = "order-radar-background-location";

type BackgroundPayload = {
  locations?: Location.LocationObject[];
};

TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }) => {
  if (error || !data) return;
  const locations = (data as BackgroundPayload).locations ?? [];
  const location = locations.at(-1);
  if (!location) return;

  const rawPoints = await AsyncStorage.getItem(STORAGE_KEYS.alertPoints);
  if (!rawPoints) return;
  const points = JSON.parse(rawPoints) as EnforcementPoint[];
  const origin = {
    latitude: location.coords.latitude,
    longitude: location.coords.longitude,
  };
  const nearest = points
    .map((point) => ({ point, distance: distanceKm(origin, point) }))
    .sort((a, b) => a.distance - b.distance)[0];
  if (!nearest || nearest.distance > 0.4) return;

  const previousRaw = await AsyncStorage.getItem(STORAGE_KEYS.lastBackgroundAlert);
  const previous = previousRaw
    ? (JSON.parse(previousRaw) as { id: string; alertedAt: number })
    : null;
  if (previous?.id === nearest.point.id && Date.now() - previous.alertedAt < 10 * 60 * 1000) return;

  await AsyncStorage.setItem(
    STORAGE_KEYS.lastBackgroundAlert,
    JSON.stringify({ id: nearest.point.id, alertedAt: Date.now() }),
  );
  const limit = nearest.point.speedLimit ? `，速限 ${nearest.point.speedLimit}` : "";
  await Notifications.scheduleNotificationAsync({
    content: {
      title: `前方 ${TYPE_LABEL[nearest.point.type]}${limit}`,
      body: "請注意現場標誌、號誌與速限，安全駕駛。",
      sound: true,
    },
    trigger: null,
  });
});
