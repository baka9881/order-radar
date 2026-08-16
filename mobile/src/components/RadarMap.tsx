import React, { forwardRef } from "react";
import { StyleSheet, View } from "react-native";
import MapView, { Marker, type LongPressEvent, type Region } from "react-native-maps";
import { TYPE_COLOR, TYPE_LABEL } from "../enforcement";
import { COLORS } from "../theme";
import type { Coordinates, EnforcementPoint } from "../types";

type Props = {
  initialRegion: Region;
  darkMap?: boolean;
  visiblePoints: EnforcementPoint[];
  destination: Coordinates | null;
  onLongPress?: (event: LongPressEvent) => void;
  style?: any;
};

export const RadarMap = forwardRef<MapView, Props>(function RadarMap(
  { initialRegion, darkMap = true, visiblePoints, destination, onLongPress, style },
  ref
) {
  return (
    <MapView
      initialRegion={initialRegion}
      mapType="standard"
      onLongPress={onLongPress}
      ref={ref}
      showsCompass={false}
      showsMyLocationButton={false}
      showsUserLocation
      style={style || StyleSheet.absoluteFill}
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
  );
});

const styles = StyleSheet.create({
  mapMarker: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(7,17,13,0.9)",
  },
  mapMarkerCore: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
