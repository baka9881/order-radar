import { useState } from "react";
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { COLORS, commonStyles } from "../theme";
import type { DataProgramStatus } from "../types";

const SITE_URL = "https://order-radar-tw.baka0406.chatgpt.site";

type Props = {
  onComplete: (dataProgramStatus: DataProgramStatus) => Promise<void>;
};

export function OnboardingScreen({ onComplete }: Props) {
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [dataChoice, setDataChoice] = useState<DataProgramStatus | null>(null);
  const [saving, setSaving] = useState(false);
  const canContinue = termsAccepted && dataChoice !== null && !saving;

  const complete = async () => {
    if (!canContinue || !dataChoice) return;
    setSaving(true);
    try {
      await onComplete(dataChoice);
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.content} style={commonStyles.screen}>
      <View style={styles.hero}>
        <Text style={commonStyles.eyebrow}>開始使用接單雷達</Text>
        <Text style={styles.title}>先確認兩個選擇</Text>
        <Text style={commonStyles.subtitle}>使用條款與匿名資料計畫分開記錄；資料計畫不影響核心功能。</Text>
      </View>

      <View style={[commonStyles.card, styles.section]}>
        <Text style={styles.step}>01 · 使用條款</Text>
        <Text style={styles.cardTitle}>安全、資料準確性與使用責任</Text>
        <Text style={commonStyles.subtitle}>接單結果僅為估算；騎乘時以現場標誌、速限與安全為優先。</Text>
        <View style={styles.links}>
          <Pressable onPress={() => void Linking.openURL(`${SITE_URL}/terms`)}>
            <Text style={styles.link}>閱讀使用條款</Text>
          </Pressable>
          <Pressable onPress={() => void Linking.openURL(`${SITE_URL}/privacy`)}>
            <Text style={styles.link}>閱讀隱私權政策</Text>
          </Pressable>
        </View>
        <Pressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked: termsAccepted }}
          onPress={() => setTermsAccepted((current) => !current)}
          style={styles.checkRow}
        >
          <View style={[styles.checkbox, termsAccepted && styles.checkboxChecked]}>
            <Text style={styles.checkmark}>{termsAccepted ? "✓" : ""}</Text>
          </View>
          <Text style={styles.checkText}>我已閱讀並接受使用條款與隱私權政策</Text>
        </Pressable>
      </View>

      <View style={[commonStyles.card, styles.section]}>
        <Text style={styles.step}>02 · 自願資料計畫</Text>
        <Text style={styles.cardTitle}>幫大家看懂商圈與時段</Text>
        <Text style={commonStyles.subtitle}>
          加入後，只有在你按下「記錄這張訂單」時，才會送出已區間化的金額、公里、時間、燈號，以及約 2 公里的區域。不上傳姓名、Email、裝置 ID、原始 GPS、完整路線、訂單編號或畫面。
        </Text>
        <Text style={styles.useNote}>資料可能彙整成商圈報表，付費提供餐廳或車隊；至少累積 20 筆才對外呈現。</Text>

        <Pressable
          accessibilityRole="radio"
          accessibilityState={{ checked: dataChoice === "enrolled" }}
          onPress={() => setDataChoice("enrolled")}
          style={[styles.choice, dataChoice === "enrolled" && styles.choiceActive]}
        >
          <View style={[styles.radio, dataChoice === "enrolled" && styles.radioActive]} />
          <View style={styles.choiceCopy}>
            <Text style={styles.choiceTitle}>同意加入匿名資料計畫</Text>
            <Text style={styles.choiceText}>可隨時在設定退出並刪除已上傳資料。</Text>
          </View>
        </Pressable>

        <Pressable
          accessibilityRole="radio"
          accessibilityState={{ checked: dataChoice === "declined" }}
          onPress={() => setDataChoice("declined")}
          style={[styles.choice, dataChoice === "declined" && styles.choiceActive]}
        >
          <View style={[styles.radio, dataChoice === "declined" && styles.radioActive]} />
          <View style={styles.choiceCopy}>
            <Text style={styles.choiceTitle}>暫不加入，資料只留手機</Text>
            <Text style={styles.choiceText}>導航、提醒、試算與紀錄都能正常使用。</Text>
          </View>
        </Pressable>
      </View>

      <Pressable
        accessibilityRole="button"
        disabled={!canContinue}
        onPress={() => void complete()}
        style={[commonStyles.primaryButton, !canContinue && styles.buttonDisabled]}
      >
        <Text style={commonStyles.primaryButtonText}>{saving ? "儲存選擇中…" : "開始使用"}</Text>
      </Pressable>
      <Text style={styles.footer}>資料計畫沒有預先勾選；你的選擇會保存在這台手機。</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 18, paddingTop: 28, paddingBottom: 52, gap: 14 },
  hero: { gap: 5, marginBottom: 3 },
  title: { color: COLORS.ink, fontSize: 32, fontWeight: "900", letterSpacing: -1 },
  section: { gap: 12 },
  step: { color: COLORS.green, fontSize: 10, fontWeight: "900", letterSpacing: 1 },
  cardTitle: { color: COLORS.ink, fontSize: 17, fontWeight: "900" },
  links: { flexDirection: "row", flexWrap: "wrap", gap: 18 },
  link: { color: COLORS.green, fontSize: 12, fontWeight: "800", textDecorationLine: "underline" },
  checkRow: { minHeight: 50, flexDirection: "row", alignItems: "center", gap: 11 },
  checkbox: { width: 24, height: 24, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: COLORS.muted, borderRadius: 7 },
  checkboxChecked: { borderColor: COLORS.green, backgroundColor: COLORS.green },
  checkmark: { color: "#06210f", fontSize: 16, fontWeight: "900" },
  checkText: { flex: 1, color: COLORS.ink, fontSize: 12, fontWeight: "700", lineHeight: 18 },
  useNote: { color: COLORS.yellow, fontSize: 11, lineHeight: 17 },
  choice: { minHeight: 66, flexDirection: "row", alignItems: "center", gap: 11, padding: 12, borderWidth: 1, borderColor: COLORS.line, borderRadius: 15, backgroundColor: "#09130e" },
  choiceActive: { borderColor: "rgba(57,224,121,0.7)", backgroundColor: "rgba(57,224,121,0.08)" },
  radio: { width: 18, height: 18, borderWidth: 2, borderColor: COLORS.muted, borderRadius: 9 },
  radioActive: { borderWidth: 5, borderColor: COLORS.green },
  choiceCopy: { flex: 1, gap: 3 },
  choiceTitle: { color: COLORS.ink, fontSize: 12, fontWeight: "900" },
  choiceText: { color: COLORS.muted, fontSize: 10, lineHeight: 15 },
  buttonDisabled: { opacity: 0.35 },
  footer: { color: COLORS.muted, fontSize: 9, lineHeight: 14, textAlign: "center" },
});
