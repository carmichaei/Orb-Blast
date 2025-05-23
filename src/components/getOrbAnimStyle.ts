// src/components/getOrbAnimStyle.ts
import { Animated } from 'react-native';

export function getOrbAnimStyle(o: any) {
  return {
    transform: [
      { translateX: o.x },
      { translateY: o.y },
      { scale: Animated.multiply(
          o.scale ?? 1,
          o.fade.interpolate({
            inputRange: [0, 1],
            outputRange: [0.1, 1]
          })
        )
      },
      { translateX: -o.x },
      { translateY: -o.y },
    ]
  };
}
