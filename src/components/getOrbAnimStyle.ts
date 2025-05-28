// src/components/getOrbAnimStyle.ts
import { Animated } from 'react-native';

export function getOrbAnimStyle(o: any) {
  const scaleAnim =
    o.fade && typeof o.fade.interpolate === 'function'
      ? Animated.multiply(
          o.scale ?? 1,
          o.fade.interpolate({
            inputRange: [0, 1],
            outputRange: [0.1, 1]
          })
        )
      : o.scale ?? 1;
  return {
    transform: [
      { translateX: o.x },
      { translateY: o.y },
      { scale: scaleAnim },
      { translateX: -o.x },
      { translateY: -o.y },
    ]
  };
}
