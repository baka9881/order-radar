import { useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { NumericField } from "../components/NumericField";
import { calculateOrder, formatNumber, STATUS } from "../order-engine";
import { saveHistory } from "../storage";
import { COLORS, commonStyles } from "../theme";
import type { CalculatorSettings, HistoryItem } from "../types";

type Props = {
  settings: CalculatorSettings;
  history: HistoryItem[];
  onHistoryChange: (history: HistoryItem[]) => void;
};

export function CalculatorScreen({ settings, history, onHistoryChange }: Props) {
  const [amount, setAmount] = useState(132);
  const [distance, setDistance] = useState(8.4);
  const [minutes, setMinutes] = useState(35);
  const [extraWait, setExtraWait] = useState(0);
  const [returnRisk, setReturnRisk] = useState(false);
  const result = useMemo(
    () => calculateOrder({ amount, distance, minutes, extraWait, returnRisk }, settings),
    [amount, distance, minutes, extraWait, returnRisk, settings],
  );
  const signalColor = result.signal === "green" ? COLORS.green : result.signal === "yellow" ? COLORS.yellow : COLORS.red;

  const save = async () => {
    const item: HistoryItem = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      createdAt: new Date().toISOString(),
      amount,
      distance,
      minutes,
      extraWait,
      returnRisk,
      signal: result.signal,
      fullHourly: result.fullHourly,
      perKm: result.perKm,
    };
    const next = [item, ...history].slice(0, 500);
    onHistoryChange(next);
    await saveHistory(next);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert("已記錄", "這筆訂單只儲存在你的手機。", [{ text: "好" }]);
  };

  return (
    <ScrollView contentContainerStyle={commonStyles.content} style={commonStyles.screen}>
      <View>
        <Text style={commonStyles.eyebrow}>勁戰七代 125 ABS · 92 無鉛</Text>
        <Text style={commonStyles.title}>這張單值得接嗎？</Text>
        <Text style={commonStyles.subtitle}>完整成本已包含油錢、耗材、維修與折舊預留。</Text>
      </View>

      <LinearGradient
        colors={[`${signalColor}28`, COLORS.surface]}
        end={{ x: 1, y: 1 }}
        start={{ x: 0, y: 0 }}
        style={[styles.decision, { borderColor: `${signalColor}66` }]}
      >
        <Text style={[styles.decisionLabel, { color: signalColor }]}>{STATUS[result.signal].label}</Text>
        <Text style={styles.decisionAction}>{STATUS[result.signal].action}</Text>
        <View style={styles.decisionMetrics}>
          <View><Text style={styles.metricLabel}>完整淨時薪</Text><Text style={styles.metricValue}>${formatNumber(result.fullHourly)}</Text></View>
          <View><Text style={styles.metricLabel}>每公里</Text><Text style={styles.metricValue}>${formatNumber(result.perKm, 1)}</Text></View>
        </View>
      </LinearGradient>

      <View style={[commonStyles.card, { gap: 14 }]}>
        <View style={commonStyles.row}>
          <NumericField label="訂單金額" suffix="元" value={amount} onChange={setAmount} />
          <NumericField label="總里程" suffix="km" value={distance} onChange={setDistance} />
        </View>
        <View style={commonStyles.row}>
          <NumericField label="預估時間" suffix="分鐘" value={minutes} onChange={setMinutes} />
          <NumericField label="額外等待" suffix="分鐘" value={extraWait} onChange={setExtraWait} />
        </View>
        <View style={styles.switchRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.switchTitle}>偏遠回程風險</Text>
            <Text style={commonStyles.subtitle}>開啟後，里程成本增加 30%</Text>
          </View>
          <Switch
            onValueChange={setReturnRisk}
            thumbColor={returnRisk ? COLORS.green : "#d6ded9"}
            trackColor={{ false: "#27352d", true: COLORS.greenDark }}
            value={returnRisk}
          />
        </View>
      </View>

      <View style={[commonStyles.card, styles.costGrid]}>
        <View style={styles.costCell}><Text style={styles.costLabel}>油錢</Text><Text style={styles.costValue}>${formatNumber(result.fuelCost, 1)}</Text></View>
        <View style={styles.costCell}><Text style={styles.costLabel}>完整淨利</Text><Text style={styles.costValue}>${formatNumber(result.fullNet)}</Text></View>
        <View style={styles.costCell}><Text style={styles.costLabel}>綠燈最低</Text><Text style={styles.costValue}>${Math.ceil(result.greenMinimum)}</Text></View>
        <View style={styles.costCell}><Text style={styles.costLabel}>黃燈最低</Text><Text style={styles.costValue}>${Math.ceil(result.yellowMinimum)}</Text></View>
      </View>

      <Pressable onPress={() => void save()} style={commonStyles.primaryButton}>
        <Text style={commonStyles.primaryButtonText}>記錄這張訂單</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  decision: {
    minHeight: 220,
    padding: 22,
    borderWidth: 1,
    borderRadius: 26,
  },
  decisionLabel: { fontSize: 14, fontWeight: "900", letterSpacing: 1 },
  decisionAction: { marginTop: 2, color: COLORS.ink, fontSize: 76, fontWeight: "900", lineHeight: 88 },
  decisionMetrics: { flexDirection: "row", gap: 34, marginTop: "auto" },
  metricLabel: { color: COLORS.muted, fontSize: 10 },
  metricValue: { marginTop: 4, color: COLORS.ink, fontSize: 20, fontWeight: "900" },
  switchRow: { flexDirection: "row", alignItems: "center", paddingTop: 4 },
  switchTitle: { color: COLORS.ink, fontSize: 13, fontWeight: "800" },
  costGrid: { flexDirection: "row", flexWrap: "wrap", gap: 0 },
  costCell: { width: "50%", paddingVertical: 7 },
  costLabel: { color: COLORS.muted, fontSize: 10 },
  costValue: { marginTop: 5, color: COLORS.ink, fontSize: 18, fontWeight: "800" },
});
