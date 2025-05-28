import { SharedValue } from 'react-native-reanimated';
import { Animated } from 'react-native';

export type Wall = { x: number; y: number; width: number; height: number };

export interface Orb {
  id: string | number;
  x: number;
  y: number;
  radius: number;
  collected: boolean;
  _pendingFlyToScore?: boolean;
}

export type HighScoreEntry = { score: number; level: number };

export type InlineColorPickerPanelProps = {
  visible: boolean;
  onClose: () => void;
  selectedWallColor: string;
  setSelectedWallColor: (color: string) => void;
  selectedOrbColor: string;
  setSelectedOrbColor: (color: string) => void;
  selectedRippleColor: string;
  setSelectedRippleColor: (color: string) => void;
};

export type Ripple = {
  x: number;
  y: number;
  radius: number;
  segments: number;
  limits: number[];
};

export type WallSpark = {
  x: number;
  y: number;
  radius: number;
  opacity: number;
};

export type Burst = {
  x: number;
  y: number;
  radius: number;
  opacity: number;
};

