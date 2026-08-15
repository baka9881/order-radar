import { useState } from "react";
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import { NumericField } from "../components/NumericField";
import { enforcementDataset } from "../enforcement";
import { saveSettings } from "../storage";
import { COLORS, commonStyles } from "../theme";
import type { CalculatorSettings } from "../types";

const SITE_URL = "https://order-radar-tw.baka0406.chatgpt.site";

type Props = {
  settings: CalculatorSettings;
  onSettingsChange: (settings: CalculatorSettings) => void;
  onClearData: () => Promise<void>;
  dataProgramEnabled: boolean;
  deletionPending: boolean;
  onDataProgramChange: (status: "enrolled" | "declined") => Promise<boolean>;
};

export function SettingsScreen({
  settings,
  onSettingsChange,
  onClearData,
  dataProgramEnabled,
  deletionPending,
  onDataProgramChange,
}: Props) {
  const [draft, setDraft] = useState(settings);
  const [privacyStatus, setPrivacyStatus] = useState("");

  const update = (key: keyof CalculatorSettings, value: number) => {
    setDraft((current) => ({ ...current, [key]: value }));
  };

  const save = async () => {
    onSettingsChange(draft);
    await saveSettings(draft);
    Alert.alert("已儲存", "新的成本門檻會立即套用到接單試算。", [{ text: "好" }]);
  };

  const confirmClear = () => {
    Alert.alert("清除本機資料？", "會刪除訂單紀錄、成本設定與提醒狀態，無法復原。", [
      { text: "取消", style: "cancel" },
      { text: "清除", style: "destructive", onPress: () => void onClearData() },
    ]);
  };

  const changeDataProgram = (enabled: boolean) => {
    if (enabled) {
      Alert.alert(
        "加入匿名資料計畫？",
        "按下同意後，只有你記錄訂單時才會送出區間化資料與約 2 公里區域。資料可能彙整成付費商圈報表提供餐廳或車隊；不包含姓名、Email、裝置 ID、原始 GPS、完整路線或畫面。",
        [
          { text: "取消", style: "cancel" },
          {
            text: "同意加入",
            onPress: () => void onDataProgramChange("enrolled").then(() => setPrivacyStatus("已加入，可隨時退出。")),
          },
        ],
      );
      return;
    }

    Alert.alert(
      "退出並刪除匿名資料？",
      "會立即停止新的上傳，並使用這台手機保存的刪除憑證移除過去貢獻。",
      [
        { text: "取消", style: "cancel" },
        {
          text: "退出並刪除",
          style: "destructive",
          onPress: () => void onDataProgramChange("declined").then((deleted) => {
            setPrivacyStatus(deleted ? "已退出，過去貢獻已刪除。" : "已停止上傳；目前離線，刪除憑證已保留供稍後重試。");
          }),
        },
      ],
    );
  };

  return (
    <ScrollView contentContainerStyle={commonStyles.content} style={commonStyles.screen}>
      <View>
        <Text style={commonStyles.eyebrow}>勁戰七代 125 ABS</Text>
        <Text style={commonStyles.title}>成本與隱私設定</Text>
        <Text style={commonStyles.subtitle}>預設使用 92 無鉛、官方油耗 44.8 km/L；之後可依實際紀錄修正。</Text>
      </View>

      <View style={[commonStyles.card, { gap: 14 }]}>
        <View style={commonStyles.row}>
          <NumericField label="92 油價" suffix="元/L" value={draft.fuelPrice} onChange={(value) => update("fuelPrice", value)} />
          <NumericField label="實際油耗" suffix="km/L" value={draft.fuelEconomy} onChange={(value) => update("fuelEconomy", value)} />
        </View>
        <View style={commonStyles.row}>
          <NumericField label="現金成本" suffix="元/km" value={draft.cashCostPerKm} onChange={(value) => update("cashCostPerKm", value)} />
          <NumericField label="完整成本" suffix="元/km" value={draft.fullCostPerKm} onChange={(value) => update("fullCostPerKm", value)} />
        </View>
        <View style={commonStyles.row}>
          <NumericField label="綠燈淨時薪" suffix="元/h" value={draft.greenHourly} onChange={(value) => update("greenHourly", value)} />
          <NumericField label="黃燈淨時薪" suffix="元/h" value={draft.yellowHourly} onChange={(value) => update("yellowHourly", value)} />
        </View>
        <View style={commonStyles.row}>
          <NumericField label="綠燈每公里" suffix="元" value={draft.greenPerKm} onChange={(value) => update("greenPerKm", value)} />
          <NumericField label="黃燈每公里" suffix="元" value={draft.yellowPerKm} onChange={(value) => update("yellowPerKm", value)} />
        </View>
        <Pressable onPress={() => void save()} style={commonStyles.primaryButton}>
          <Text style={commonStyles.primaryButtonText}>儲存成本設定</Text>
        </Pressable>
      </View>

      <View style={[commonStyles.card, { gap: 11 }]}>
        <Text style={styles.cardTitle}>資料與隱私</Text>
        <Text style={commonStyles.subtitle}>核心功能不需登入。完整訂單、設定、原始位置與背景提醒比對留在手機。</Text>
        <View style={styles.programRow}>
          <View style={styles.programCopy}>
            <Text style={styles.programTitle}>匿名商圈資料計畫</Text>
            <Text style={commonStyles.subtitle}>{dataProgramEnabled ? "已加入：記錄訂單時送出區間化資料。" : "未加入：不會上傳訂單資料。"}</Text>
          </View>
          <Switch
            onValueChange={changeDataProgram}
            thumbColor={dataProgramEnabled ? COLORS.green : "#d6ded9"}
            trackColor={{ false: "#27352d", true: COLORS.greenDark }}
            value={dataProgramEnabled}
          />
        </View>
        {deletionPending ? (
          <Pressable onPress={() => changeDataProgram(false)} style={styles.retryButton}>
            <Text style={styles.retryText}>重試刪除過去匿名資料</Text>
          </Pressable>
        ) : null}
        {privacyStatus ? <Text style={styles.privacyStatus}>{privacyStatus}</Text> : null}
        <View style={styles.linkRow}>
          <Pressable onPress={() => void Linking.openURL(`${SITE_URL}/privacy`)} style={[commonStyles.secondaryButton, { flex: 1 }]}>
            <Text style={commonStyles.secondaryButtonText}>隱私權政策</Text>
          </Pressable>
          <Pressable onPress={() => void Linking.openURL(`${SITE_URL}/support`)} style={[commonStyles.secondaryButton, { flex: 1 }]}>
            <Text style={commonStyles.secondaryButtonText}>支援中心</Text>
          </Pressable>
        </View>
        <Pressable onPress={confirmClear} style={styles.dangerButton}>
          <Text style={styles.dangerText}>清除這台手機上的所有資料</Text>
        </Pressable>
      </View>

      <View style={[commonStyles.card, { gap: 7 }]}>
        <Text style={styles.cardTitle}>公開執法資料</Text>
        <Text style={commonStyles.subtitle}>快照日期：{new Date(enforcementDataset.generatedAt).toLocaleDateString("zh-TW")} · {enforcementDataset.points.length} 筆</Text>
        {enforcementDataset.sources.map((source) => (
          <Text key={source.label} style={styles.source}>• {source.label}</Text>
        ))}
        <Text style={styles.disclaimer}>資料可能延遲或缺漏，App 不包含流動執法資訊。請永遠依現場標誌、號誌與速限行駛。</Text>
      </View>

      <Text style={styles.version}>接單雷達 1.0.0 · App Store Beta 準備版</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  cardTitle: { color: COLORS.ink, fontSize: 15, fontWeight: "900" },
  linkRow: { flexDirection: "row", gap: 8 },
  programRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 5 },
  programCopy: { flex: 1, gap: 2 },
  programTitle: { color: COLORS.ink, fontSize: 13, fontWeight: "900" },
  retryButton: { minHeight: 42, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(255,203,71,0.35)", borderRadius: 13 },
  retryText: { color: COLORS.yellow, fontSize: 11, fontWeight: "900" },
  privacyStatus: { color: COLORS.green, fontSize: 10, lineHeight: 15 },
  dangerButton: { minHeight: 44, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(255,106,98,0.32)", borderRadius: 13, backgroundColor: "rgba(255,106,98,0.06)" },
  dangerText: { color: COLORS.red, fontSize: 11, fontWeight: "900" },
  source: { color: "#bdcac2", fontSize: 10, lineHeight: 15 },
  disclaimer: { marginTop: 4, color: COLORS.yellow, fontSize: 9, lineHeight: 15 },
  version: { color: COLORS.muted, fontSize: 9, textAlign: "center" },
});
