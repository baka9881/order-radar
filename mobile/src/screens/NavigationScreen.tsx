import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Linking,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import * as Haptics from "expo-haptics";
import * as KeepAwake from "expo-keep-awake";
import * as Location from "expo-location";
import * as Notifications from "expo-notifications";
import * as Speech from "expo-speech";
import MapView, { Marker, type LongPressEvent, type Region } from "react-native-maps";
import { BACKGROUND_LOCATION_TASK } from "../background-location";
import {
  distanceKm,
  enforcementDataset,
  formatDistance,
  nearbyPoints,
  TYPE_COLOR,
  TYPE_LABEL,
} from "../enforcement";
import { IS_EXPO_GO } from "../runtime";
import { saveAlertPoints } from "../storage";
import { COLORS } from "../theme";
import type { Coordinates, EnforcementPoint, HistoryItem } from "../types";

const DEFAULT_CENTER: Coordinates = { latitude: 25.036, longitude: 121.432 };
const INITIAL_REGION: Region = {
  ...DEFAULT_CENTER,
  latitudeDelta: 0.12,
  longitudeDelta: 0.08,
};

type SheetName = "menu" | "layers" | "destination" | null;
type LayerVisibility = Record<EnforcementPoint["type"], boolean>;

type Props = {
  history: HistoryItem[];
  onOpenCalculator: () => void;
  onOpenHistory: () => void;
  onOpenSettings: () => void;
};

type BottomSheetProps = {
  children: ReactNode;
  onClose: () => void;
  visible: boolean;
};

function BottomSheet({ children, onClose, visible }: BottomSheetProps) {
  return (
    <Modal animationType="slide" onRequestClose={onClose} transparent visible={visible}>
      <Pressable accessibilityRole="button" onPress={onClose} style={styles.backdrop}>
        <Pressable onPress={(event) => event.stopPropagation()} style={styles.sheet}>
          <View style={styles.sheetHandle} />
          {children}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function formatElapsed(seconds: number) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, "0")}`
    : `${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`;
}

export function NavigationScreen({ history, onOpenCalculator, onOpenHistory, onOpenSettings }: Props) {
  const mapRef = useRef<MapView | null>(null);
  const locationSubscriptionRef = useRef<Location.LocationSubscription | null>(null);
  const lastAlertIdRef = useRef<string | null>(null);
  const lastPointRefreshRef = useRef<Coordinates | null>(null);
  const [speedKmh, setSpeedKmh] = useState(0);
  const [tracking, setTracking] = useState(false);
  const [backgroundEnabled, setBackgroundEnabled] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [status, setStatus] = useState("點下綠色按鈕，開始前景安全提醒");
  const [points, setPoints] = useState(() => nearbyPoints(DEFAULT_CENTER));
  const [destination, setDestination] = useState<Coordinates | null>(null);
  const [destinationText, setDestinationText] = useState("");
  const [sheet, setSheet] = useState<SheetName>(null);
  const [darkMap, setDarkMap] = useState(true);
  const [visibleLayers, setVisibleLayers] = useState<LayerVisibility>({
    speed: true,
    technology: true,
    interval: true,
  });

  const todaySummary = useMemo(() => {
    const today = new Date().toDateString();
    const todayItems = history.filter((item) => new Date(item.createdAt).toDateString() === today);
    const greenCount = todayItems.filter((item) => item.signal === "green").length;
    return {
      orders: todayItems.length,
      greenRate: todayItems.length ? Math.round((greenCount / todayItems.length) * 100) : 0,
      revenue: Math.round(todayItems.reduce((sum, item) => sum + item.amount, 0)),
    };
  }, [history]);

  const visiblePoints = useMemo(
    () => points.filter((point) => visibleLayers[point.type]).slice(0, 140),
    [points, visibleLayers],
  );

  const nearest = useMemo(() => points[0] ?? null, [points]);
  const navigationDestination = destination
    ? `${destination.latitude},${destination.longitude}`
    : destinationText.trim();

  const alertIfNeeded = useCallback((origin: Coordinates, currentPoints: EnforcementPoint[]) => {
    if (!voiceEnabled) return;
    const nearestPoint = currentPoints[0];
    if (!nearestPoint || (nearestPoint.distanceKm ?? Infinity) > 0.4 || nearestPoint.id === lastAlertIdRef.current) return;
    lastAlertIdRef.current = nearestPoint.id;
    const limit = nearestPoint.speedLimit ? `，速限 ${nearestPoint.speedLimit}` : "";
    const message = `前方 ${TYPE_LABEL[nearestPoint.type]}${limit}，請依現場標誌安全駕駛`;
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
    if (IS_EXPO_GO) {
      setBackgroundEnabled(false);
    } else {
      void Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK)
        .then(setBackgroundEnabled)
        .catch(() => setBackgroundEnabled(false));
    }
    void Location.getLastKnownPositionAsync().then((location) => {
      if (location) void handleLocation(location);
    });
    return () => {
      locationSubscriptionRef.current?.remove();
      Speech.stop();
      void KeepAwake.deactivateKeepAwake("order-radar-navigation");
    };
  }, [handleLocation]);

  useEffect(() => {
    if (startedAt === null) return undefined;
    const timer = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - startedAt) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, [startedAt]);

  const startForegroundTracking = async () => {
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== "granted") {
        setStatus("定位未開啟；仍可查看地圖並設定目的地");
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
      setElapsedSeconds(0);
      setStartedAt(Date.now());
      setStatus("前景安全提醒已啟用");
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
    } catch {
      setStatus("目前無法取得定位，請確認系統定位與網路設定");
      return false;
    }
  };

  const requestBackgroundTracking = () => {
    setSheet(null);
    if (IS_EXPO_GO) {
      Alert.alert(
        "Expo Go 測試限制",
        "Expo Go 不支援 iPhone 背景定位；目前可以測試前景定位、地圖、語音與科技執法提醒。正式開發版會保留背景安全提醒。",
      );
      return;
    }
    Alert.alert(
      "背景安全提醒",
      "只有你主動開啟時才使用背景定位。位置只在手機上比對，不會儲存完整行程；持續 GPS 會增加耗電。",
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
              setStatus("未取得背景定位；前景提醒仍可使用");
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
              setStatus("背景安全提醒已啟用");
            } catch {
              setStatus("背景定位需要安裝 EAS 開發版");
            }
          })(),
        },
      ],
    );
  };

  const stopTracking = async () => {
    locationSubscriptionRef.current?.remove();
    locationSubscriptionRef.current = null;
    if (!IS_EXPO_GO && await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK)) {
      await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
    }
    setTracking(false);
    setBackgroundEnabled(false);
    setStartedAt(null);
    setSpeedKmh(0);
    setStatus("安全提醒已停止");
    Speech.stop();
    await KeepAwake.deactivateKeepAwake("order-radar-navigation");
  };

  const toggleTracking = () => void (tracking ? stopTracking() : startForegroundTracking());

  const openMap = async (provider: "apple" | "google") => {
    if (!navigationDestination) {
      Alert.alert("請先設定目的地", "可以輸入地址，或長按地圖上的位置。");
      return;
    }
    const encoded = encodeURIComponent(navigationDestination);
    const url = provider === "apple"
      ? `https://maps.apple.com/?daddr=${encoded}&dirflg=d`
      : `https://www.google.com/maps/dir/?api=1&destination=${encoded}&travelmode=driving`;
    setSheet(null);
    await Linking.openURL(url);
  };

  const setMapDestination = (event: LongPressEvent) => {
    const next = event.nativeEvent.coordinate;
    setDestination(next);
    setDestinationText(`${next.latitude.toFixed(6)}, ${next.longitude.toFixed(6)}`);
    setStatus("目的地已設定；點右側箭頭開始導航");
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
      setSheet(null);
      setStatus("目的地已定位；點右側箭頭開始導航");
    } catch {
      Alert.alert("找不到這個地址", "可以換一個較完整的地址，或長按地圖設定。");
    }
  };

  const showInfo = () => {
    setSheet(null);
    Alert.alert(
      "公開設備提醒",
      `目前離線收錄 ${enforcementDataset.points.length} 筆有座標的政府公開資料。資料可能延遲或缺漏，不包含流動執法；請以現場標誌、號誌與速限為準。`,
    );
  };

  const navigateFromMenu = (action: () => void) => {
    setSheet(null);
    action();
  };

  return (
    <View style={styles.screen}>
      <MapView
        initialRegion={INITIAL_REGION}
        mapType="standard"
        onLongPress={setMapDestination}
        ref={mapRef}
        showsCompass={false}
        showsMyLocationButton={false}
        showsUserLocation
        style={StyleSheet.absoluteFillObject}
        userInterfaceStyle={darkMap ? "dark" : "light"}
      >
        {visiblePoints.map((point) => (
          <Marker
            coordinate={point}
            description={[point.direction, point.speedLimit ? `速限 ${point.speedLimit}` : "", point.source].filter(Boolean).join(" · ")}
            key={point.id}
            title={`${TYPE_LABEL[point.type]} · ${point.title}`}
            tracksViewChanges={false}
          >
            <View style={[styles.mapMarker, { borderColor: TYPE_COLOR[point.type] }]}>
              <View style={[styles.mapMarkerCore, { backgroundColor: TYPE_COLOR[point.type] }]} />
            </View>
          </Marker>
        ))}
        {destination ? <Marker coordinate={destination} pinColor={COLORS.blue} title="目的地" /> : null}
      </MapView>

      <View pointerEvents="box-none" style={styles.topArea}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>接單雷達 · <Text style={styles.summaryAccent}>今日儀表</Text></Text>
          <View style={styles.summaryMetrics}>
            <View style={styles.summaryMetric}>
              <Text style={styles.summaryLabel}>綠燈率</Text>
              <Text style={styles.summaryValue}>{todaySummary.greenRate}%</Text>
            </View>
            <View style={styles.summaryMetric}>
              <Text style={styles.summaryLabel}>今日單量</Text>
              <Text style={styles.summaryValue}>{todaySummary.orders}</Text>
            </View>
            <View style={styles.summaryMetric}>
              <Text style={styles.summaryLabel}>今日營收</Text>
              <Text style={styles.summaryValue}>${todaySummary.revenue}</Text>
            </View>
          </View>
          <View style={[styles.summaryStrip, tracking && styles.summaryStripActive]}>
            <Text style={styles.summaryStripText}>{tracking ? "安全提醒運作中" : "停妥後再操作手機"}</Text>
          </View>
        </View>

        <Pressable accessibilityLabel="資料說明" onPress={showInfo} style={styles.infoButton}>
          <Text style={styles.infoButtonText}>說明</Text>
        </Pressable>

        <View style={styles.statusPill}>
          <View style={[styles.statusDot, tracking && styles.statusDotActive]} />
          <Text numberOfLines={2} style={styles.statusText}>{status}</Text>
        </View>
      </View>

      <View pointerEvents="box-none" style={styles.rightControls}>
        <Pressable
          accessibilityLabel="切換語音提醒"
          onPress={() => setVoiceEnabled((value) => !value)}
          style={[styles.roundButton, voiceEnabled && styles.roundButtonActive]}
        >
          <Text style={[styles.roundButtonIcon, voiceEnabled && styles.roundButtonIconActive]}>{voiceEnabled ? "◖" : "×"}</Text>
        </Pressable>
        <Pressable accessibilityLabel="地圖圖層" onPress={() => setSheet("layers")} style={styles.roundButton}>
          <Text style={styles.roundButtonIcon}>◇</Text>
        </Pressable>
        <Pressable accessibilityLabel="設定目的地" onPress={() => setSheet("destination")} style={styles.roundButton}>
          <Text style={styles.roundButtonIcon}>↗</Text>
        </Pressable>
      </View>

      <View pointerEvents="box-none" style={styles.bottomControls}>
        <View style={styles.timerCard}>
          <Text style={styles.timerValue}>{tracking ? formatElapsed(elapsedSeconds) : `${Math.round(speedKmh)}`}</Text>
          <Text style={styles.timerLabel}>{tracking ? "行車時間" : "km/h"}</Text>
        </View>

        <Pressable
          accessibilityLabel={tracking ? "停止安全提醒" : "開始安全提醒"}
          onPress={toggleTracking}
          style={[styles.startButton, tracking && styles.startButtonTracking]}
        >
          <Text style={styles.startButtonIcon}>{tracking ? "■" : "➤"}</Text>
        </Pressable>

        <Pressable accessibilityLabel="開啟功能選單" onPress={() => setSheet("menu")} style={styles.menuButton}>
          <Text style={styles.menuButtonIcon}>•••</Text>
        </Pressable>
      </View>

      {nearest ? (
        <View pointerEvents="none" style={styles.nearestCard}>
          <View style={[styles.nearestDot, { backgroundColor: TYPE_COLOR[nearest.type] }]} />
          <View style={styles.nearestCopy}>
            <Text style={styles.nearestLabel}>最近設備 · {TYPE_LABEL[nearest.type]}</Text>
            <Text numberOfLines={1} style={styles.nearestValue}>
              {formatDistance(nearest.distanceKm ?? 0)} · {nearest.title}
            </Text>
          </View>
        </View>
      ) : null}

      <BottomSheet onClose={() => setSheet(null)} visible={sheet === "menu"}>
        <Text style={styles.sheetTitle}>快捷工具</Text>
        <Text style={styles.sheetSubtitle}>常用功能集中在這裡，地圖保持乾淨。</Text>
        <View style={styles.menuGrid}>
          <Pressable onPress={() => navigateFromMenu(onOpenCalculator)} style={styles.menuItem}>
            <Text style={styles.menuItemIcon}>$</Text><Text style={styles.menuItemLabel}>成本試算</Text>
          </Pressable>
          <Pressable onPress={() => navigateFromMenu(onOpenHistory)} style={styles.menuItem}>
            <Text style={styles.menuItemIcon}>≡</Text><Text style={styles.menuItemLabel}>訂單紀錄</Text>
          </Pressable>
          <Pressable onPress={() => navigateFromMenu(onOpenSettings)} style={styles.menuItem}>
            <Text style={styles.menuItemIcon}>⚙</Text><Text style={styles.menuItemLabel}>偏好設定</Text>
          </Pressable>
          <Pressable onPress={requestBackgroundTracking} style={styles.menuItem}>
            <Text style={styles.menuItemIcon}>◎</Text><Text style={styles.menuItemLabel}>{backgroundEnabled ? "背景已開" : "背景提醒"}</Text>
          </Pressable>
          <Pressable onPress={() => { setVoiceEnabled((value) => !value); setSheet(null); }} style={styles.menuItem}>
            <Text style={styles.menuItemIcon}>◖</Text><Text style={styles.menuItemLabel}>{voiceEnabled ? "關閉語音" : "開啟語音"}</Text>
          </Pressable>
          <Pressable onPress={showInfo} style={styles.menuItem}>
            <Text style={styles.menuItemIcon}>i</Text><Text style={styles.menuItemLabel}>資料說明</Text>
          </Pressable>
        </View>
      </BottomSheet>

      <BottomSheet onClose={() => setSheet(null)} visible={sheet === "layers"}>
        <Text style={styles.sheetTitle}>地圖圖層</Text>
        <Text style={styles.sheetSubtitle}>只顯示你需要的公開設備，減少地圖雜訊。</Text>
        <View style={styles.layerCards}>
          {(Object.keys(TYPE_LABEL) as EnforcementPoint["type"][]).map((type) => {
            const enabled = visibleLayers[type];
            return (
              <Pressable
                key={type}
                onPress={() => setVisibleLayers((current) => ({ ...current, [type]: !current[type] }))}
                style={[styles.layerCard, enabled && styles.layerCardActive]}
              >
                <View style={[styles.layerDot, { backgroundColor: TYPE_COLOR[type] }]} />
                <Text style={styles.layerCardTitle}>{TYPE_LABEL[type]}</Text>
                <Text style={styles.layerCardState}>{enabled ? "顯示中" : "已隱藏"}</Text>
              </Pressable>
            );
          })}
        </View>
        <View style={styles.settingRow}>
          <View>
            <Text style={styles.settingTitle}>亮色地圖主題</Text>
            <Text style={styles.settingDescription}>白天強光環境可切換使用</Text>
          </View>
          <Switch
            onValueChange={(value) => setDarkMap(!value)}
            thumbColor="#ffffff"
            trackColor={{ false: "#66717d", true: COLORS.greenDark }}
            value={!darkMap}
          />
        </View>
      </BottomSheet>

      <BottomSheet onClose={() => setSheet(null)} visible={sheet === "destination"}>
        <Text style={styles.sheetTitle}>設定目的地</Text>
        <Text style={styles.sheetSubtitle}>輸入地址，或關閉面板後長按地圖選點。</Text>
        <TextInput
          onChangeText={(text) => { setDestinationText(text); setDestination(null); }}
          onSubmitEditing={() => void locateAddress()}
          placeholder="例如：輔仁大學正門"
          placeholderTextColor="#7c8a94"
          returnKeyType="search"
          style={styles.destinationInput}
          value={destinationText}
        />
        <View style={styles.destinationActions}>
          <Pressable onPress={() => void locateAddress()} style={styles.secondaryAction}>
            <Text style={styles.secondaryActionText}>在地圖定位</Text>
          </Pressable>
          <Pressable onPress={() => void openMap(Platform.OS === "ios" ? "apple" : "google")} style={styles.primaryAction}>
            <Text style={styles.primaryActionText}>開始導航</Text>
          </Pressable>
        </View>
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, overflow: "hidden", backgroundColor: "#0c141c" },
  topArea: { position: "absolute", top: 10, left: 12, right: 12, alignItems: "center" },
  summaryCard: {
    width: 258,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    borderRadius: 17,
    backgroundColor: "rgba(5,9,8,0.94)",
    shadowColor: "#000",
    shadowOpacity: 0.34,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  summaryTitle: { paddingTop: 9, color: "#dbe8e1", fontSize: 11, fontWeight: "800", textAlign: "center" },
  summaryAccent: { color: COLORS.green },
  summaryMetrics: { flexDirection: "row", justifyContent: "space-around", paddingHorizontal: 8, paddingVertical: 7 },
  summaryMetric: { minWidth: 66, alignItems: "center" },
  summaryLabel: { color: "#78dba0", fontSize: 9, fontWeight: "700" },
  summaryValue: { marginTop: 2, color: "#f5fbf7", fontSize: 19, fontWeight: "900" },
  summaryStrip: { alignItems: "center", paddingVertical: 5, backgroundColor: "#29443a" },
  summaryStripActive: { backgroundColor: "#34a967" },
  summaryStripText: { color: "#f3fbf6", fontSize: 10, fontWeight: "900" },
  infoButton: {
    position: "absolute",
    top: 88,
    right: 0,
    minWidth: 48,
    paddingHorizontal: 11,
    paddingVertical: 9,
    borderRadius: 16,
    backgroundColor: "#2c79f1",
    shadowColor: "#000",
    shadowOpacity: 0.24,
    shadowRadius: 10,
    elevation: 8,
  },
  infoButtonText: { color: "#fff", fontSize: 11, fontWeight: "900", textAlign: "center" },
  statusPill: {
    maxWidth: 230,
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    borderRadius: 999,
    backgroundColor: "rgba(4,8,7,0.88)",
  },
  statusDot: { width: 7, height: 7, borderRadius: 7, backgroundColor: "#88948e" },
  statusDotActive: { backgroundColor: COLORS.green },
  statusText: { flexShrink: 1, color: "#e7eee9", fontSize: 10, fontWeight: "700", textAlign: "center" },
  rightControls: { position: "absolute", right: 14, bottom: 152, gap: 10 },
  roundButton: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.13)",
    borderRadius: 17,
    backgroundColor: "rgba(5,9,8,0.94)",
    shadowColor: "#000",
    shadowOpacity: 0.28,
    shadowRadius: 10,
    elevation: 8,
  },
  roundButtonActive: { borderColor: "rgba(57,224,121,0.38)" },
  roundButtonIcon: { color: "#f4f8f6", fontSize: 22, fontWeight: "900" },
  roundButtonIconActive: { color: COLORS.green },
  bottomControls: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 18,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
  },
  timerCard: {
    width: 74,
    minHeight: 56,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 7,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    borderRadius: 18,
    backgroundColor: "rgba(5,9,8,0.94)",
  },
  timerValue: { color: "#fff", fontSize: 16, fontWeight: "900" },
  timerLabel: { marginTop: 2, color: "#91a39a", fontSize: 8, fontWeight: "700" },
  startButton: {
    width: 68,
    height: 68,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 22,
    backgroundColor: COLORS.green,
    shadowColor: "#000",
    shadowOpacity: 0.35,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },
  startButtonTracking: { backgroundColor: COLORS.red },
  startButtonIcon: { color: "#06210f", fontSize: 28, fontWeight: "900", transform: [{ rotate: "-45deg" }] },
  menuButton: {
    width: 56,
    height: 56,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.13)",
    borderRadius: 18,
    backgroundColor: "rgba(5,9,8,0.94)",
  },
  menuButtonIcon: { color: "#fff", fontSize: 17, fontWeight: "900", letterSpacing: 2 },
  nearestCard: {
    position: "absolute",
    left: 16,
    right: 88,
    bottom: 96,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    minHeight: 48,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.11)",
    borderRadius: 16,
    backgroundColor: "rgba(5,9,8,0.90)",
  },
  nearestDot: { width: 9, height: 9, borderRadius: 9 },
  nearestCopy: { flex: 1 },
  nearestLabel: { color: "#aab8b0", fontSize: 8, fontWeight: "700" },
  nearestValue: { marginTop: 2, color: "#f1f6f3", fontSize: 11, fontWeight: "800" },
  mapMarker: {
    width: 18,
    height: 18,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.94)",
  },
  mapMarkerCore: { width: 6, height: 6, borderRadius: 6 },
  backdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.50)" },
  sheet: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 28,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    backgroundColor: "#1d2a37",
  },
  sheetHandle: { alignSelf: "center", width: 52, height: 4, marginBottom: 17, borderRadius: 4, backgroundColor: "#8e9aa5" },
  sheetTitle: { color: "#f5f7f8", fontSize: 27, fontWeight: "900", letterSpacing: -0.6 },
  sheetSubtitle: { marginTop: 5, color: "#aab5bf", fontSize: 11, lineHeight: 17 },
  menuGrid: { flexDirection: "row", flexWrap: "wrap", marginTop: 18 },
  menuItem: { width: "33.333%", minHeight: 82, alignItems: "center", justifyContent: "center", gap: 7 },
  menuItemIcon: { color: "#f5f7f8", fontSize: 25, fontWeight: "800" },
  menuItemLabel: { color: "#e5e9ed", fontSize: 11, fontWeight: "800" },
  layerCards: { flexDirection: "row", gap: 9, marginTop: 18 },
  layerCard: {
    flex: 1,
    minHeight: 118,
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    borderRadius: 16,
    backgroundColor: "#111a23",
  },
  layerCardActive: { borderColor: "rgba(57,224,121,0.34)", backgroundColor: "#244d3b" },
  layerDot: { width: 10, height: 10, borderRadius: 10 },
  layerCardTitle: { marginTop: 16, color: "#f1f5f3", fontSize: 12, fontWeight: "900" },
  layerCardState: { marginTop: 4, color: "#a8b3ad", fontSize: 9 },
  settingRow: {
    marginTop: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 13,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.08)",
  },
  settingTitle: { color: "#f3f6f4", fontSize: 14, fontWeight: "800" },
  settingDescription: { marginTop: 3, color: "#9eabb4", fontSize: 10 },
  destinationInput: {
    minHeight: 52,
    marginTop: 18,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    borderRadius: 15,
    backgroundColor: "#111a23",
    color: "#f3f6f4",
    fontSize: 16,
  },
  destinationActions: { flexDirection: "row", gap: 10, marginTop: 12 },
  secondaryAction: {
    flex: 1,
    minHeight: 50,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(82,221,142,0.32)",
    borderRadius: 15,
    backgroundColor: "rgba(82,221,142,0.08)",
  },
  secondaryActionText: { color: "#63e19a", fontSize: 12, fontWeight: "900" },
  primaryAction: {
    flex: 1,
    minHeight: 50,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 15,
    backgroundColor: "#52dd8e",
  },
  primaryActionText: { color: "#07160d", fontSize: 12, fontWeight: "900" },
});
