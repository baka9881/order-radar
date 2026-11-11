import type { StyleProp, ViewStyle } from "react-native";
import type { Coordinates, EnforcementPoint } from "../types";

export type MapRegion = Coordinates & { latitudeDelta: number; longitudeDelta: number };

export type RadarMapHandle = {
  animateToRegion: (region: MapRegion, duration?: number) => void;
};

export type RadarMapProps = {
  initialRegion: MapRegion;
  darkMap?: boolean;
  visiblePoints: EnforcementPoint[];
  destination: Coordinates | null;
  onLongPress?: (coordinate: Coordinates) => void;
  style?: StyleProp<ViewStyle>;
};
