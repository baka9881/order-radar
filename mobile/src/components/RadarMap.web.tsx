import React, { forwardRef, useImperativeHandle } from "react";
import { StyleSheet, Text, View } from "react-native";
import { COLORS } from "../theme";
import type { RadarMapHandle, RadarMapProps } from "./RadarMap.types";

export type { MapRegion, RadarMapHandle } from "./RadarMap.types";

// Web preview only: react-native-maps has no web implementation, so show an
// OpenStreetMap embed and the number of loaded enforcement points.
export const RadarMap = forwardRef<RadarMapHandle, RadarMapProps>(function RadarMap(
  { initialRegion, visiblePoints, style },
  ref,
) {
  useImperativeHandle(ref, () => ({ animateToRegion: () => undefined }));
  const { latitude, longitude, latitudeDelta, longitudeDelta } = initialRegion;
  const bbox = [
    longitude - longitudeDelta / 2,
    latitude - latitudeDelta / 2,
    longitude + longitudeDelta / 2,
    latitude + latitudeDelta / 2,
  ].map((value) => value.toFixed(4)).join("%2C");

  return (
    <View style={[styles.container, style ?? StyleSheet.absoluteFill]}>
      <iframe
        src={`https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik`}
        style={{
          width: "100%",
          height: "100%",
          border: "none",
          filter: "invert(90%) hue-rotate(180deg) brightness(85%) contrast(120%)",
        }}
        title="Web Map"
      />
      <View style={styles.overlay}>
        <Text style={styles.overlayText}>網頁預覽：已載入 {visiblePoints.length} 筆執法點位</Text>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: { backgroundColor: COLORS.surface, position: "relative", overflow: "hidden" },
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
  overlayText: { color: COLORS.green, fontSize: 11, fontWeight: "700", textAlign: "center" },
});
