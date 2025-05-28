// OrbAnimatedCircles.tsx
import React from 'react';
import Animated, { useAnimatedProps } from 'react-native-reanimated';
import { Circle } from 'react-native-svg';

type Orb = {
  id: string;
  x: number;
  y: number;
  radius: number;
  collected: boolean;
};

type OrbAnim = {
  fade: any; // Should be SharedValue<number>
  scale: any; // Should be SharedValue<number>
};

type OrbAnimatedCirclesProps = {
  orb: Orb;
  anim: OrbAnim;
  color: string;
};

export default function OrbAnimatedCircles({ orb, anim, color }: OrbAnimatedCirclesProps) {
  const AnimatedCircle = Animated.createAnimatedComponent(Circle);

  const animatedPropsOuter = useAnimatedProps(() => ({
    cx: orb.x,
    cy: orb.y,
    r: orb.radius + 7,
    fillOpacity: 0.22,
    opacity: anim?.fade?.value ?? 1,
  }));

  const animatedPropsMiddle = useAnimatedProps(() => ({
    cx: orb.x,
    cy: orb.y,
    r: orb.radius + 2,
    fillOpacity: 0.45,
    opacity: anim?.fade?.value ?? 1,
  }));

  const animatedPropsCore = useAnimatedProps(() => ({
    cx: orb.x,
    cy: orb.y,
    r: orb.radius * (anim?.scale?.value ?? 1),
    fillOpacity: 0.82,
    opacity: anim?.fade?.value ?? 1,
  }));

  return (
    <>
      <AnimatedCircle animatedProps={animatedPropsOuter} fill={color} />
      <AnimatedCircle animatedProps={animatedPropsMiddle} fill={color} />
      <AnimatedCircle animatedProps={animatedPropsCore} fill="#fff" />
    </>
  );
}
