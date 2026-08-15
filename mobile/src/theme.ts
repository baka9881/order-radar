import { StyleSheet } from "react-native";

export const COLORS = {
  canvas: "#07110d",
  surface: "#0d1a14",
  surfaceRaised: "#13241b",
  line: "rgba(205,236,216,0.14)",
  ink: "#edf7f0",
  muted: "#91a39a",
  green: "#39e079",
  greenDark: "#0a8c42",
  yellow: "#ffcb47",
  red: "#ff6a62",
  purple: "#a990ff",
  blue: "#5aa8ff",
};

export const commonStyles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.canvas,
  },
  content: {
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 130,
    gap: 14,
  },
  eyebrow: {
    color: COLORS.green,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.2,
  },
  title: {
    color: COLORS.ink,
    fontSize: 26,
    fontWeight: "900",
    letterSpacing: -0.8,
  },
  subtitle: {
    color: COLORS.muted,
    fontSize: 12,
    lineHeight: 18,
  },
  card: {
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.line,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  label: {
    marginBottom: 7,
    color: COLORS.muted,
    fontSize: 11,
    fontWeight: "700",
  },
  input: {
    minHeight: 48,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: COLORS.line,
    borderRadius: 14,
    backgroundColor: "#09130e",
    color: COLORS.ink,
    fontSize: 16,
  },
  primaryButton: {
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: COLORS.green,
  },
  primaryButtonText: {
    color: "#06210f",
    fontSize: 13,
    fontWeight: "900",
  },
  secondaryButton: {
    minHeight: 46,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: "rgba(57,224,121,0.3)",
    borderRadius: 14,
    backgroundColor: "rgba(57,224,121,0.08)",
  },
  secondaryButtonText: {
    color: COLORS.green,
    fontSize: 12,
    fontWeight: "800",
  },
});
