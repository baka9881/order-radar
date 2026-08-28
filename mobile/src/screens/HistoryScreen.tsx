import { ScrollView, StyleSheet, Text, View } from "react-native";
import { formatNumber, getTripMultiplier, normalizeReturnMode, RETURN_MODES, STATUS } from "../order-engine";
import { COLORS, commonStyles } from "../theme";
import type { HistoryItem } from "../types";

type Props = { history: HistoryItem[] };

export function HistoryScreen({ history }: Props) {
  const totals = history.reduce(
    (sum, item) => {
      sum.amount += item.amount;
      const multiplier = getTripMultiplier(item);
      sum.minutes += item.minutes * multiplier + item.extraWait;
      sum.distance += item.distance * multiplier;
      sum.green += item.signal === "green" ? 1 : 0;
      return sum;
    },
    { amount: 0, minutes: 0, distance: 0, green: 0 },
  );

  return (
    <ScrollView contentContainerStyle={commonStyles.content} style={commonStyles.screen}>
      <View>
        <Text style={commonStyles.eyebrow}>只存在這台手機</Text>
        <Text style={commonStyles.title}>訂單紀錄</Text>
        <Text style={commonStyles.subtitle}>不用登入，刪除 App 或清除資料後即移除。</Text>
      </View>

      <View style={[commonStyles.card, styles.summary]}>
        <View><Text style={styles.summaryLabel}>訂單</Text><Text style={styles.summaryValue}>{history.length}</Text></View>
        <View><Text style={styles.summaryLabel}>總金額</Text><Text style={styles.summaryValue}>${formatNumber(totals.amount)}</Text></View>
        <View><Text style={styles.summaryLabel}>綠燈率</Text><Text style={styles.summaryValue}>{history.length ? formatNumber((totals.green / history.length) * 100) : 0}%</Text></View>
      </View>

      {history.length === 0 ? (
        <View style={[commonStyles.card, styles.empty]}>
          <Text style={styles.emptyTitle}>還沒有紀錄</Text>
          <Text style={commonStyles.subtitle}>到「試算」輸入第一張訂單，判斷後即可儲存。</Text>
        </View>
      ) : history.map((item) => {
        const color = item.signal === "green" ? COLORS.green : item.signal === "yellow" ? COLORS.yellow : COLORS.red;
        return (
          <View key={item.id} style={[commonStyles.card, styles.item]}>
            <View style={[styles.signal, { backgroundColor: `${color}20` }]}><Text style={{ color, fontWeight: "900" }}>{STATUS[item.signal].action}</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.itemTitle}>${formatNumber(item.amount)} · {formatNumber(item.distance, 1)} km</Text>
              <Text style={styles.itemMeta}>
                {new Date(item.createdAt).toLocaleString("zh-TW")} · {RETURN_MODES[normalizeReturnMode(item.returnMode, item.returnRisk)].label}
              </Text>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={styles.itemTitle}>${formatNumber(item.fullHourly)}/h</Text>
              <Text style={styles.itemMeta}>${formatNumber(item.perKm, 1)}/km</Text>
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  summary: { flexDirection: "row", justifyContent: "space-between" },
  summaryLabel: { color: COLORS.muted, fontSize: 10 },
  summaryValue: { marginTop: 5, color: COLORS.ink, fontSize: 21, fontWeight: "900" },
  empty: { alignItems: "center", paddingVertical: 36 },
  emptyTitle: { marginBottom: 7, color: COLORS.ink, fontSize: 16, fontWeight: "900" },
  item: { flexDirection: "row", alignItems: "center", gap: 12, padding: 13 },
  signal: { width: 38, height: 38, alignItems: "center", justifyContent: "center", borderRadius: 12 },
  itemTitle: { color: COLORS.ink, fontSize: 13, fontWeight: "800" },
  itemMeta: { marginTop: 4, color: COLORS.muted, fontSize: 9 },
});
