import React, { forwardRef, useImperativeHandle } from "react";
import { StyleSheet, Text, View } from "react-native";
import { COLORS } from "../theme";
import type { Coordinates, EnforcementPoint } from "../types";

type Props = {
  initialRegion?: any;
  darkMap?: boolean;
  visiblePoints: EnforcementPoint[];
  destination?: Coordinates | null;
  onLongPress?: (event: any) => void;
  style?: any;
};

export const RadarMap = forwardRef<any, Props>(function RadarMap(
  { visiblePoints, style },
  ref
) {
  useImperativeHandle(ref, () => ({
    animateToRegion: () => {},
  }));

  return (
    <View style={[styles.container, style || StyleSheet.absoluteFill]}>
      <iframe
        src="https://www.openstreetmap.org/export/embed.html?bbox=121.38%2C24.98%2C121.58%2C25.10&amp;layer=mapnik"
        style={{
          width: "100%",
          height: "100%",
          border: "none",
          filter: "invert(90%) hue-rotate(180deg) brightness(85%) contrast(120%)",
        }}
        title="Web Map"
      />
      <View style={styles.overlay}>
        <Text style={styles.overlayText}>
          ⚡ Web 模擬模式：已載入 {visiblePoints.length} 筆執法點位
        </Text>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.surface,
    position: "relative",
    overflow: "hidden",
  },
  overlay: {
    position: "absolute",
    top: 70,
    left: 16,
    right: 16,
    backgroundColor: "rgba(7, 17, 13, 0.9)",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.line,
    zIndex: 10,
  },
  overlayText: {
    color: COLORS.green,
    fontSize: 11,
    fontWeight: "700",
    textAlign: "center",
  },
});
