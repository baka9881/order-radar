import React, { forwardRef } from "react";
import MapView, { Marker, type MapPressEvent, type Region } from "react-native-maps";
import { TYPE_COLOR, TYPE_LABEL } from "../enforcement";
import { COLORS } from "../theme";
import type { Coordinates, EnforcementPoint } from "../types";

type Props = {
  initialRegion: Region;
  points: EnforcementPoint[];
  destination: Coordinates | null;
  onPress: (event: MapPressEvent) => void;
  style?: any;
};

export const RadarMap = forwardRef<MapView, Props>(function RadarMap(
  { initialRegion, points, destination, onPress, style },
  ref
) {
  return (
    <MapView
      initialRegion={initialRegion}
      mapType="standard"
      onPress={onPress}
      ref={ref}
      showsCompass
      showsMyLocationButton
      showsUserLocation
      style={style}
      userInterfaceStyle="dark"
    >
      {points.slice(0, 180).map((point) => (
        <Marker
          coordinate={point}
          description={[point.direction, point.speedLimit ? `速限 ${point.speedLimit}` : "", point.source].filter(Boolean).join(" · ")}
          key={point.id}
          pinColor={TYPE_COLOR[point.type]}
          title={`${TYPE_LABEL[point.type]} · ${point.title}`}
        />
      ))}
      {destination ? <Marker coordinate={destination} pinColor={COLORS.blue} title="目的地" /> : null}
    </MapView>
  );
});
