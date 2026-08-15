import { Text, TextInput, View } from "react-native";
import { commonStyles } from "../theme";

type Props = {
  label: string;
  suffix?: string;
  value: number;
  onChange: (value: number) => void;
};

export function NumericField({ label, suffix, value, onChange }: Props) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={commonStyles.label}>{label}{suffix ? ` · ${suffix}` : ""}</Text>
      <TextInput
        accessibilityLabel={label}
        keyboardType="decimal-pad"
        onChangeText={(text) => {
          const next = Number(text.replace(",", "."));
          onChange(Number.isFinite(next) ? next : 0);
        }}
        selectTextOnFocus
        style={commonStyles.input}
        value={String(value)}
      />
    </View>
  );
}
