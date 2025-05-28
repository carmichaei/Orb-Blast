import React, { useEffect } from 'react';
import Animated, { useSharedValue, withTiming, useAnimatedProps, runOnJS } from 'react-native-reanimated';
import { Circle } from 'react-native-svg';

type OrbProps = {
  orb: {
    id: number;
    x: number;
    y: number;
    radius: number;
    collected: boolean;
  };
  color: string;
  onFadeComplete: (id: number) => void;
};

export default function OrbAnimatedCircles({ orb, color, onFadeComplete }: OrbProps) {
  const AnimatedCircle = Animated.createAnimatedComponent(Circle);
  const fade = useSharedValue(1);

  useEffect(() => {
    if (orb.collected) {
      fade.value = withTiming(0, { duration: 320 }, (finished) => {
        if (finished) {
          runOnJS(onFadeComplete)(orb.id);
        }
      });
    }
  }, [orb.collected]);

  const orbX = orb.x;
  const orbY = orb.y;
  const orbRadius = orb.radius;

  const animatedPropsOuter = useAnimatedProps(() => ({
    cx: orbX,
    cy: orbY,
    r: orbRadius + 7,
    fillOpacity: 0.22,
    opacity: fade.value,
  }));

  const animatedPropsCore = useAnimatedProps(() => ({
    cx: orbX,
    cy: orbY,
    r: orbRadius,
    fillOpacity: 0.93,
    opacity: fade.value,
  }));

  const animatedPropsDot = useAnimatedProps(() => ({
    cx: orbX,
    cy: orbY,
    r: 3.2,
    fillOpacity: 0.87,
    opacity: fade.value,
  }));

  return (
    <>
      <AnimatedCircle animatedProps={animatedPropsOuter} fill={color} />
      <AnimatedCircle animatedProps={animatedPropsCore} fill={color} />
      {/* Small white dot in the center */}
      {!orb.collected && (
        <AnimatedCircle animatedProps={animatedPropsDot} fill="#fff" />
      )}
    </>
  );
}
