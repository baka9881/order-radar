import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import * as Haptics from "expo-haptics";
import * as KeepAwake from "expo-keep-awake";
import * as Location from "expo-location";
import * as Notifications from "expo-notifications";
import * as Speech from "expo-speech";
import MapView, { Marker, type MapPressEvent, type Region } from "react-native-maps";
import { BACKGROUND_LOCATION_TASK } from "../background-location";
import {
  distanceKm,
  enforcementDataset,
  formatDistance,
  nearbyPoints,
  TYPE_COLOR,
  TYPE_LABEL,
} from "../enforcement";
import { saveAlertPoints } from "../storage";
import { COLORS, commonStyles } from "../theme";
import type { Coordinates, EnforcementPoint } from "../types";

const DEFAULT_CENTER: Coordinates = { latitude: 25.036, longitude: 121.432 };
const INITIAL_REGION: Region = {
  ...DEFAULT_CENTER,
  latitudeDelta: 0.12,
  longitudeDelta: 0.08,
};

export function NavigationScreen() {
  const mapRef = useRef<MapView | null>(null);
  const locationSubscriptionRef = useRef<Location.LocationSubscription | null>(null);
  const lastAlertIdRef = useRef<string | null>(null);
  const lastPointRefreshRef = useRef<Coordinates | null>(null);
  const [speedKmh, setSpeedKmh] = useState(0);
  const [tracking, setTracking] = useState(false);
  const [backgroundEnabled, setBackgroundEnabled] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [status, setStatus] = useState("尚未定位；開始前請先將手機固定在車架上。");
  const [points, setPoints] = useState(() => nearbyPoints(DEFAULT_CENTER));
  const [destination, setDestination] = useState<Coordinates | null>(null);
  const [destinationText, setDestinationText] = useState("");

  const alertIfNeeded = useCallback((origin: Coordinates, currentPoints: EnforcementPoint[]) => {
    if (!voiceEnabled) return;
    const nearest = currentPoints[0];
    if (!nearest || (nearest.distanceKm ?? Infinity) > 0.4 || nearest.id === lastAlertIdRef.current) return;
    lastAlertIdRef.current = nearest.id;
    const limit = nearest.speedLimit ? `，速限 ${nearest.speedLimit}` : "";
    const message = `前方 ${TYPE_LABEL[nearest.type]}${limit}，請依現場標誌安全駕駛`;
    setStatus(message);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Speech.stop();
    Speech.speak(message, { language: "zh-TW", rate: 1.02 });
  }, [voiceEnabled]);

  const handleLocation = useCallback(async (location: Location.LocationObject) => {
    const next = {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
    };
    setSpeedKmh(Math.max(0, (location.coords.speed ?? 0) * 3.6));
    const currentPoints = nearbyPoints(next);
    setPoints(currentPoints);
    const refreshOrigin = lastPointRefreshRef.current;
    if (!refreshOrigin || distanceKm(refreshOrigin, next) > 5) {
      await saveAlertPoints(currentPoints);
      lastPointRefreshRef.current = next;
    }
    alertIfNeeded(next, currentPoints);
  }, [alertIfNeeded]);

  useEffect(() => {
    void Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK)
      .then(setBackgroundEnabled)
      .catch(() => setBackgroundEnabled(false));
    void Location.getLastKnownPositionAsync().then((location) => {
      if (location) void handleLocation(location);
    });
    return () => {
      locationSubscriptionRef.current?.remove();
      Speech.stop();
      void KeepAwake.deactivateKeepAwake("order-radar-navigation");
    };
  }, [handleLocation]);

  const startForegroundTracking = async () => {
    const permission = await Location.requestForegroundPermissionsAsync();
    if (permission.status !== "granted") {
      setStatus("定位未開啟；仍可查看地圖並手動設定目的地。");
      return false;
    }
    locationSubscriptionRef.current?.remove();
    locationSubscriptionRef.current = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.BestForNavigation,
        distanceInterval: 15,
        timeInterval: 3000,
      },
      (location) => void handleLocation(location),
    );
    const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
    await handleLocation(current);
    setTracking(true);
    setStatus("前景安全提醒已啟用；畫面開啟時會提供語音與震動。");
    await KeepAwake.activateKeepAwakeAsync("order-radar-navigation");
    mapRef.current?.animateToRegion(
      {
        latitude: current.coords.latitude,
        longitude: current.coords.longitude,
        latitudeDelta: 0.04,
        longitudeDelta: 0.03,
      },
      600,
    );
    return true;
  };

  const requestBackgroundTracking = () => {
    Alert.alert(
      "背景安全提醒",
      "只有你主動開啟行車提醒時才會使用背景定位。位置只在手機上比對，不會寫入訂單或上傳伺服器；持續 GPS 會增加耗電。",
      [
        { text: "先不要", style: "cancel" },
        {
          text: "繼續設定",
          onPress: () => void (async () => {
            const foregroundReady = tracking || await startForegroundTracking();
            if (!foregroundReady) return;
            await Notifications.requestPermissionsAsync();
            const permission = await Location.requestBackgroundPermissionsAsync();
            if (permission.status !== "granted") {
              setStatus("未取得背景定位；前景提醒仍可使用。可稍後到 iPhone 設定調整。");
              return;
            }
            try {
              if (!await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK)) {
                await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
                  accuracy: Location.Accuracy.BestForNavigation,
                  activityType: Location.ActivityType.AutomotiveNavigation,
                  distanceInterval: 35,
                  deferredUpdatesDistance: 80,
                  deferredUpdatesInterval: 15000,
                  foregroundService: {
                    notificationTitle: "接單雷達安全提醒",
                    notificationBody: "背景定位使用中；點一下返回地圖。",
                  },
                  pausesUpdatesAutomatically: true,
                  showsBackgroundLocationIndicator: true,
                });
              }
              setBackgroundEnabled(true);
              setStatus("背景安全提醒已啟用；完全關閉 App 後系統可能停止更新。");
            } catch {
              setStatus("背景定位需要安裝 EAS 開發版，Expo Go 不支援這項功能。");
            }
          })(),
        },
      ],
    );
  };

  const stopTracking = async () => {
    locationSubscriptionRef.current?.remove();
    locationSubscriptionRef.current = null;
    if (await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK)) {
      await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
    }
    setTracking(false);
    setBackgroundEnabled(false);
    setSpeedKmh(0);
    setStatus("已停止定位與背景提醒。");
    Speech.stop();
    await KeepAwake.deactivateKeepAwake("order-radar-navigation");
  };

  const nearest = useMemo(() => points[0] ?? null, [points]);
  const navigationDestination = destination
    ? `${destination.latitude},${destination.longitude}`
    : destinationText.trim();

  const openMap = async (provider: "apple" | "google") => {
    if (!navigationDestination) {
      Alert.alert("請先設定目的地", "可以輸入地址，或直接點地圖上的位置。");
      return;
    }
    const encoded = encodeURIComponent(navigationDestination);
    const url = provider === "apple"
      ? `https://maps.apple.com/?daddr=${encoded}&dirflg=d`
      : `https://www.google.com/maps/dir/?api=1&destination=${encoded}&travelmode=driving`;
    await Linking.openURL(url);
  };

  const setMapDestination = (event: MapPressEvent) => {
    const next = event.nativeEvent.coordinate;
    setDestination(next);
    setDestinationText(`${next.latitude.toFixed(6)}, ${next.longitude.toFixed(6)}`);
  };

  const locateAddress = async () => {
    if (!destinationText.trim()) return;
    try {
      const matches = await Location.geocodeAsync(destinationText.trim());
      const match = matches[0];
      if (!match) throw new Error("not-found");
      const next = { latitude: match.latitude, longitude: match.longitude };
      setDestination(next);
      mapRef.current?.animateToRegion({ ...next, latitudeDelta: 0.03, longitudeDelta: 0.02 }, 600);
    } catch {
      Alert.alert("找不到這個地址", "可以換一個較完整的地址，或直接點地圖設定。");
    }
  };

  return (
    <ScrollView contentContainerStyle={commonStyles.content} keyboardShouldPersistTaps="handled" style={commonStyles.screen}>
      <View>
        <Text style={commonStyles.eyebrow}>安全導航 BETA · 本機比對</Text>
        <Text style={commonStyles.title}>前方設備提醒</Text>
        <Text style={commonStyles.subtitle}>使用 Apple Maps 底圖；雷達比對在 App 內完成，不會上傳即時位置或完整行程。</Text>
      </View>

      <View style={styles.mapCard}>
        <MapView
          initialRegion={INITIAL_REGION}
          mapType="standard"
          onPress={setMapDestination}
          ref={mapRef}
          showsCompass
          showsMyLocationButton
          showsUserLocation
          style={styles.map}
          userInterfaceStyle="dark"
        >
          {points.slice(0, 180).map((point) => (
            <Marker
              coordinate={point}
              description={[point.direction, point.speedLimit ? `速限 ${point.speedLimit}` : "", point.source].filter(Boolean).join(" · ")}
              key={point.id}
              pinColor={TYPE_COLOR[point.type]}
              title={`${TYPE_LABEL[point.type]} · ${point.title}`}
            />
          ))}
          {destination ? <Marker coordinate={destination} pinColor={COLORS.blue} title="目的地" /> : null}
        </MapView>
        <View style={styles.legend}>
          {(Object.keys(TYPE_LABEL) as EnforcementPoint["type"][]).map((type) => (
            <View key={type} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: TYPE_COLOR[type] }]} />
              <Text style={styles.legendText}>{TYPE_LABEL[type]}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.metricsRow}>
        <View style={[commonStyles.card, styles.metricCard]}>
          <Text style={styles.metricLabel}>GPS 速度</Text>
          <Text style={styles.speed}>{Math.round(speedKmh)}</Text>
          <Text style={styles.metricUnit}>km/h · 僅供參考</Text>
        </View>
        <View style={[commonStyles.card, styles.metricCard]}>
          <Text style={styles.metricLabel}>最近公開設備</Text>
          <Text style={styles.nearest}>{nearest ? TYPE_LABEL[nearest.type] : "等待定位"}</Text>
          <Text numberOfLines={2} style={styles.metricUnit}>
            {nearest ? `${formatDistance(nearest.distanceKm ?? 0)} · ${nearest.title}` : "—"}
          </Text>
        </View>
      </View>

      <View style={[commonStyles.card, { gap: 10 }]}>
        <Text style={commonStyles.label}>行車提醒</Text>
        <Pressable onPress={() => void (tracking ? stopTracking() : startForegroundTracking())} style={commonStyles.primaryButton}>
          <Text style={commonStyles.primaryButtonText}>{tracking ? "停止所有提醒" : "開始前景安全提醒"}</Text>
        </Pressable>
        <Pressable onPress={requestBackgroundTracking} style={commonStyles.secondaryButton}>
          <Text style={commonStyles.secondaryButtonText}>{backgroundEnabled ? "背景提醒已啟用" : "另行允許背景提醒"}</Text>
        </Pressable>
        <Pressable onPress={() => setVoiceEnabled((value) => !value)} style={styles.inlineToggle}>
          <Text style={styles.inlineToggleLabel}>語音＋震動</Text>
          <Text style={[styles.toggleState, voiceEnabled && styles.toggleStateActive]}>{voiceEnabled ? "開" : "關"}</Text>
        </Pressable>
        <Text accessibilityLiveRegion="polite" style={styles.status}>{status}</Text>
      </View>

      <View style={[commonStyles.card, { gap: 10 }]}>
        <Text style={commonStyles.label}>目的地地址，或直接點地圖</Text>
        <TextInput
          onChangeText={(text) => { setDestinationText(text); setDestination(null); }}
          onSubmitEditing={() => void locateAddress()}
          placeholder="例如：輔仁大學正門"
          placeholderTextColor="#607168"
          returnKeyType="search"
          style={commonStyles.input}
          value={destinationText}
        />
        <View style={styles.buttonRow}>
          <Pressable onPress={() => void locateAddress()} style={[commonStyles.secondaryButton, { flex: 1 }]}>
            <Text style={commonStyles.secondaryButtonText}>在地圖定位</Text>
          </Pressable>
          <Pressable onPress={() => void openMap(Platform.OS === "ios" ? "apple" : "google")} style={[commonStyles.primaryButton, { flex: 1 }]}>
            <Text style={commonStyles.primaryButtonText}>開始正式導航</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.safetyNote}>
        <Text style={styles.safetyTitle}>安全優先</Text>
        <Text style={styles.safetyText}>僅顯示政府公開且有座標的固定設備，不包含流動執法，也可能延遲或缺漏。請以現場標誌、號誌與速限為準，停妥後再操作。</Text>
      </View>
      <Text style={styles.dataFootnote}>離線資料：{new Date(enforcementDataset.generatedAt).toLocaleDateString("zh-TW")} · {enforcementDataset.points.length} 筆</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  mapCard: { height: 390, overflow: "hidden", borderWidth: 1, borderColor: COLORS.line, borderRadius: 22, backgroundColor: COLORS.surface },
  map: { flex: 1 },
  legend: { position: "absolute", top: 10, left: 10, flexDirection: "row", gap: 9, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 12, backgroundColor: "rgba(7,17,13,0.9)" },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  legendDot: { width: 7, height: 7, borderRadius: 7 },
  legendText: { color: COLORS.ink, fontSize: 9, fontWeight: "700" },
  metricsRow: { flexDirection: "row", gap: 10 },
  metricCard: { flex: 1, minHeight: 126 },
  metricLabel: { color: COLORS.muted, fontSize: 10, fontWeight: "700" },
  speed: { marginTop: 4, color: COLORS.green, fontSize: 44, fontWeight: "900", letterSpacing: -2 },
  nearest: { marginTop: 10, color: COLORS.ink, fontSize: 17, fontWeight: "900" },
  metricUnit: { marginTop: 4, color: COLORS.muted, fontSize: 9, lineHeight: 14 },
  inlineToggle: { minHeight: 42, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 12, borderWidth: 1, borderColor: COLORS.line, borderRadius: 12 },
  inlineToggleLabel: { color: COLORS.ink, fontSize: 12, fontWeight: "700" },
  toggleState: { minWidth: 34, paddingVertical: 5, overflow: "hidden", borderRadius: 999, backgroundColor: "#27352d", color: COLORS.muted, fontSize: 10, fontWeight: "900", textAlign: "center" },
  toggleStateActive: { backgroundColor: "rgba(57,224,121,0.15)", color: COLORS.green },
  status: { padding: 11, borderRadius: 11, backgroundColor: "rgba(57,224,121,0.055)", color: "#b2c1b8", fontSize: 10, lineHeight: 15 },
  buttonRow: { flexDirection: "row", gap: 8 },
  safetyNote: { padding: 15, borderWidth: 1, borderColor: "rgba(255,203,71,0.2)", borderRadius: 16, backgroundColor: "rgba(255,203,71,0.045)" },
  safetyTitle: { color: COLORS.yellow, fontSize: 11, fontWeight: "900" },
  safetyText: { marginTop: 5, color: "#b5c0ba", fontSize: 10, lineHeight: 16 },
  dataFootnote: { color: COLORS.muted, fontSize: 9, textAlign: "center" },
});
