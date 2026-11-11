import React, { forwardRef, useImperativeHandle, useRef } from "react";
import { StyleSheet, View } from "react-native";
import MapView, { Marker } from "react-native-maps";
import { TYPE_COLOR, TYPE_LABEL } from "../enforcement";
import { COLORS } from "../theme";
import type { RadarMapHandle, RadarMapProps } from "./RadarMap.types";

export type { MapRegion, RadarMapHandle } from "./RadarMap.types";

export const RadarMap = forwardRef<RadarMapHandle, RadarMapProps>(function RadarMap(
  { initialRegion, darkMap = true, visiblePoints, destination, onLongPress, style },
  ref,
) {
  const mapRef = useRef<MapView | null>(null);
  useImperativeHandle(ref, () => ({
    animateToRegion: (region, duration) => mapRef.current?.animateToRegion(region, duration),
  }));

  return (
    <MapView
      initialRegion={initialRegion}
      mapType="standard"
      onLongPress={(event) => onLongPress?.(event.nativeEvent.coordinate)}
      ref={mapRef}
      showsCompass={false}
      showsMyLocationButton={false}
      showsUserLocation
      style={style ?? StyleSheet.absoluteFill}
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
    width: 18,
    height: 18,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.94)",
  },
  mapMarkerCore: { width: 6, height: 6, borderRadius: 6 },
});
