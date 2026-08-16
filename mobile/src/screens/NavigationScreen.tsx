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
import { RadarMap } from "../components/RadarMap";
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
const INITIAL_REGION = {
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
  const mapRef = useRef<any>(null);
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
    const todayOrders = history.filter((item) => new Date(item.createdAt).toDateString() === today);
    const greenCount = todayOrders.filter((item) => item.signal === "green").length;
    const revenue = todayOrders.reduce((sum, item) => sum + item.amount, 0);
    const greenRate = todayOrders.length > 0 ? Math.round((greenCount / todayOrders.length) * 100) : 0;
    return {
      orders: todayOrders.length,
      revenue,
      greenRate,
    };
  }, [history]);

  useEffect(() => {
    if (!startedAt) {
      setElapsedSeconds(0);
      return;
    }
    const timer = setInterval(() => {
      setElapsedSeconds(Math.max(0, Math.floor((Date.now() - startedAt) / 1000)));
    }, 1000);
    return () => clearInterval(timer);
  }, [startedAt]);

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
      KeepAwake.deactivateKeepAwake("order-radar-navigation").catch(() => {});
    };
  }, [handleLocation]);

  const startForegroundTracking = async () => {
    const permission = await Location.requestForegroundPermissionsAsync();
    if (permission.status !== "granted") {
      setStatus("定位未開啟；仍可查看地圖並手動設定目的地。");
      return false;
    }
    try {
      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      await handleLocation(position);
      mapRef.current?.animateToRegion?.({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        latitudeDelta: 0.03,
        longitudeDelta: 0.02,
      }, 600);
    } catch {
      setStatus("無法取得目前位置，請確認 GPS 已開啟。");
    }
    locationSubscriptionRef.current = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        timeInterval: 3000,
        distanceInterval: 10,
      },
      (loc) => void handleLocation(loc),
    );
    await KeepAwake.activateKeepAwakeAsync("order-radar-navigation");
    setTracking(true);
    setStartedAt(Date.now());
    setStatus("前景安全提醒進行中；接近測速點時會發出語音與震動。");
    return true;
  };

  const requestBackgroundTracking = () => {
    if (IS_EXPO_GO) {
      Alert.alert(
        "Expo Go 限制",
        "Expo Go 不支援自訂原生背景定位；若要在鎖定畫面或換到外送 App 時持續提醒，需安裝 EAS 開發版（Dev Build）。",
        [{ text: "了解" }],
      );
      return;
    }
    if (backgroundEnabled) {
      Alert.alert("背景提醒已啟用", "若要停用，可直接點「停止所有提醒」或到系統設定關閉永遠定位。");
      return;
    }
    Alert.alert(
      "啟用背景安全提醒？",
      "接單雷達只會在行車提醒期間於背景比對附近公開設備，位置不會儲存行程或上傳伺服器。iOS 請選擇「永遠允許」。",
      [
        { text: "取消", style: "cancel" },
        {
          text: "前往授權",
          onPress: () => void (async () => {
            try {
              const bgPermission = await Location.requestBackgroundPermissionsAsync();
              if (bgPermission.status !== "granted") {
                setStatus("未取得背景定位權限；切換到其他 App 時將暫停提醒。");
                return;
              }
              const isRegistered = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
              if (!isRegistered) {
                await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
                  accuracy: Location.Accuracy.High,
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
    if (!IS_EXPO_GO && await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK)) {
      await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
    }
    setTracking(false);
    setBackgroundEnabled(false);
    setStartedAt(null);
    setSpeedKmh(0);
    setStatus("已停止定位與提醒；點擊綠色按鈕即可重新開始。");
    Speech.stop();
    await KeepAwake.deactivateKeepAwake("order-radar-navigation").catch(() => {});
  };

  const toggleTracking = async () => {
    if (tracking) {
      await stopTracking();
      return;
    }
    await startForegroundTracking();
  };

  const toggleVoice = () => {
    setVoiceEnabled((prev) => {
      const next = !prev;
      setStatus(next ? "已開啟語音與震動提醒" : "已關閉語音提醒（靜音模式）");
      return next;
    });
  };

  const recenter = async () => {
    try {
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      mapRef.current?.animateToRegion?.({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        latitudeDelta: 0.03,
        longitudeDelta: 0.02,
      }, 500);
      void handleLocation(loc);
    } catch {
      Alert.alert("定位失敗", "請確認手機 GPS 與定位權限已開啟。");
    }
  };

  const visiblePoints = useMemo(() => {
    return points.filter((p) => visibleLayers[p.type]).slice(0, 180);
  }, [points, visibleLayers]);

  const nearest = useMemo(() => visiblePoints[0] ?? null, [visiblePoints]);

  const navigationDestination = destination
    ? `${destination.latitude},${destination.longitude}`
    : destinationText.trim();

  const openMap = async (provider: "apple" | "google") => {
    if (!navigationDestination) {
      Alert.alert("請先設定目的地", "可以輸入地址，或直接在長按地圖設定點位。");
      return;
    }
    const encoded = encodeURIComponent(navigationDestination);
    const url = provider === "apple"
      ? `https://maps.apple.com/?daddr=${encoded}&dirflg=d`
      : `https://www.google.com/maps/dir/?api=1&destination=${encoded}&travelmode=driving`;
    await Linking.openURL(url);
  };

  const setMapDestination = (event: any) => {
    const next = event.nativeEvent.coordinate;
    setDestination(next);
    setDestinationText(`${next.latitude.toFixed(6)}, ${next.longitude.toFixed(6)}`);
    setStatus("已在地圖設定目的地；點右側導航鍵可開啟外部地圖。");
  };

  const locateAddress = async () => {
    if (!destinationText.trim()) return;
    try {
      const matches = await Location.geocodeAsync(destinationText.trim());
      const match = matches[0];
      if (!match) throw new Error("not-found");
      const next = { latitude: match.latitude, longitude: match.longitude };
      setDestination(next);
      mapRef.current?.animateToRegion?.({ ...next, latitudeDelta: 0.03, longitudeDelta: 0.02 }, 600);
      setSheet(null);
      setStatus(`已定位到：${destinationText.trim()}`);
    } catch {
      Alert.alert("找不到這個地址", "可以換一個較完整的地址，或直接長按地圖設定。");
    }
  };

  const showInfo = () => {
    Alert.alert(
      "政府公開執法設備說明",
      `目前離線收錄 ${enforcementDataset.points.length} 筆有座標的政府公開資料。資料可能延遲或缺漏，不包含流動執法；請以現場標誌、號誌與速限為準。`,
    );
  };

  const navigateFromMenu = (action: () => void) => {
    setSheet(null);
    action();
  };

  return (
    <View style={styles.screen}>
      <RadarMap
        darkMap={darkMap}
        destination={destination}
        initialRegion={INITIAL_REGION}
        onLongPress={setMapDestination}
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        visiblePoints={visiblePoints}
      />

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
          accessibilityLabel="重新定位"
          onPress={() => void recenter()}
          style={styles.roundButton}
        >
          <Text style={styles.roundButtonIcon}>◎</Text>
        </Pressable>

        <Pressable
          accessibilityLabel="圖層開關"
          onPress={() => setSheet("layers")}
          style={styles.roundButton}
        >
          <Text style={styles.roundButtonIcon}>☷</Text>
        </Pressable>

        <Pressable
          accessibilityLabel="設定目的地"
          onPress={() => setSheet("destination")}
          style={styles.roundButton}
        >
          <Text style={styles.roundButtonIcon}>⚑</Text>
        </Pressable>

        <Pressable
          accessibilityLabel="語音提示切換"
          onPress={toggleVoice}
          style={[styles.roundButton, voiceEnabled && styles.roundButtonActive]}
        >
          <Text style={[styles.roundButtonIcon, voiceEnabled && styles.roundButtonIconActive]}>
            {voiceEnabled ? "🔊" : "🔇"}
          </Text>
        </Pressable>
      </View>

      {nearest ? (
        <View pointerEvents="box-none" style={styles.nearestCard}>
          <View style={[styles.nearestDot, { backgroundColor: TYPE_COLOR[nearest.type] }]} />
          <View style={styles.nearestCopy}>
            <Text style={styles.nearestLabel}>最近設備 · {TYPE_LABEL[nearest.type]}</Text>
            <Text numberOfLines={1} style={styles.nearestValue}>
              {formatDistance(nearest.distanceKm ?? 0)} · {nearest.title}
              {nearest.speedLimit ? ` · 速限 ${nearest.speedLimit}` : ""}
            </Text>
          </View>
        </View>
      ) : null}

      <View pointerEvents="box-none" style={styles.bottomControls}>
        <View style={styles.timerCard}>
          <Text style={styles.timerValue}>{tracking ? formatElapsed(elapsedSeconds) : Math.round(speedKmh)}</Text>
          <Text style={styles.timerLabel}>{tracking ? "提醒時間" : "GPS km/h"}</Text>
        </View>

        <Pressable
          accessibilityLabel={tracking ? "停止提醒" : "開始提醒"}
          onPress={() => void toggleTracking()}
          style={[styles.startButton, tracking && styles.startButtonTracking]}
        >
          <Text style={styles.startButtonIcon}>{tracking ? "■" : "▶"}</Text>
        </Pressable>

        <Pressable
          accessibilityLabel="功能選單"
          onPress={() => setSheet("menu")}
          style={styles.menuButton}
        >
          <Text style={styles.menuButtonIcon}>≡</Text>
        </Pressable>
      </View>

      <BottomSheet onClose={() => setSheet(null)} visible={sheet === "menu"}>
        <Text style={styles.sheetTitle}>功能選單</Text>
        <Text style={styles.sheetSubtitle}>快速切換試算、紀錄與自訂設定</Text>
        <View style={styles.menuGrid}>
          <Pressable onPress={() => navigateFromMenu(onOpenCalculator)} style={styles.menuItem}>
            <Text style={styles.menuItemIcon}>$</Text>
            <Text style={styles.menuItemLabel}>接單試算</Text>
          </Pressable>
          <Pressable onPress={() => navigateFromMenu(onOpenHistory)} style={styles.menuItem}>
            <Text style={styles.menuItemIcon}>≡</Text>
            <Text style={styles.menuItemLabel}>跑單紀錄</Text>
          </Pressable>
          <Pressable onPress={() => navigateFromMenu(onOpenSettings)} style={styles.menuItem}>
            <Text style={styles.menuItemIcon}>⚙</Text>
            <Text style={styles.menuItemLabel}>車輛與設定</Text>
          </Pressable>
          <Pressable onPress={() => { setSheet(null); requestBackgroundTracking(); }} style={styles.menuItem}>
            <Text style={styles.menuItemIcon}>⌁</Text>
            <Text style={styles.menuItemLabel}>背景提醒</Text>
          </Pressable>
          <Pressable onPress={() => { setSheet(null); void openMap(Platform.OS === "ios" ? "apple" : "google"); }} style={styles.menuItem}>
            <Text style={styles.menuItemIcon}>↗</Text>
            <Text style={styles.menuItemLabel}>外部導航</Text>
          </Pressable>
          <Pressable onPress={() => { setSheet(null); showInfo(); }} style={styles.menuItem}>
            <Text style={styles.menuItemIcon}>ⓘ</Text>
            <Text style={styles.menuItemLabel}>資料說明</Text>
          </Pressable>
        </View>
      </BottomSheet>

      <BottomSheet onClose={() => setSheet(null)} visible={sheet === "layers"}>
        <Text style={styles.sheetTitle}>圖層與顯示</Text>
        <Text style={styles.sheetSubtitle}>自訂地圖上顯示的設備種類與深淺模式</Text>
        <View style={styles.layerCards}>
          {(Object.keys(visibleLayers) as EnforcementPoint["type"][]).map((type) => {
            const active = visibleLayers[type];
            return (
              <Pressable
                key={type}
                onPress={() => setVisibleLayers((prev) => ({ ...prev, [type]: !prev[type] }))}
                style={[styles.layerCard, active && styles.layerCardActive]}
              >
                <View style={[styles.layerDot, { backgroundColor: TYPE_COLOR[type] }]} />
                <Text style={styles.layerCardTitle}>{TYPE_LABEL[type]}</Text>
                <Text style={styles.layerCardState}>{active ? "顯示中" : "已隱藏"}</Text>
              </Pressable>
            );
          })}
        </View>
        <View style={styles.settingRow}>
          <View>
            <Text style={styles.settingTitle}>深色地圖模式</Text>
            <Text style={styles.settingDescription}>夜晚或暗處騎乘時減少反光與刺眼</Text>
          </View>
          <Switch
            onValueChange={setDarkMap}
            thumbColor={darkMap ? COLORS.green : "#f4f3f4"}
            trackColor={{ false: "#767577", true: "rgba(57,224,121,0.4)" }}
            value={darkMap}
          />
        </View>
      </BottomSheet>

      <BottomSheet onClose={() => setSheet(null)} visible={sheet === "destination"}>
        <Text style={styles.sheetTitle}>目的地導航</Text>
        <Text style={styles.sheetSubtitle}>輸入地址搜尋，或在主地圖直接長按任意點</Text>
        <TextInput
          onChangeText={(text) => { setDestinationText(text); setDestination(null); }}
          onSubmitEditing={() => void locateAddress()}
          placeholder="輸入地址或地標，例如：板橋車站"
          placeholderTextColor="#6f8190"
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
