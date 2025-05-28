import React, { useEffect } from 'react';
import Animated, {
  useSharedValue,
  withTiming,
  useAnimatedProps,
  runOnJS,
} from 'react-native-reanimated';
import { Circle as SvgCircle } from 'react-native-svg';
import { Image } from 'react-native';

const AnimatedCircle = Animated.createAnimatedComponent(SvgCircle);
const AnimatedImage = Animated.createAnimatedComponent(Image);

type Props = {
  start: { x: number, y: number };
  end: { x: number, y: number };
  color: string;
  size: number;
  onArrive: () => void;
  imageSrc?: any; // <- Accept PNG skin
};

const DURATION = 650;

const OUTER_RADIUS = 7;
const INNER_RADIUS = 2;
const DOT_RADIUS = 1;
const OUTER_OPACITY = 0.22;
const INNER_OPACITY = 0.75;

export default function AnimatedOrbFlyToScore({
  start,
  end,
  color,
  size,
  onArrive,
  imageSrc,
}: Props) {
  const cx = useSharedValue(start.x);
  const cy = useSharedValue(start.y);

  useEffect(() => {
    cx.value = withTiming(end.x, { duration: DURATION });
    cy.value = withTiming(end.y, { duration: DURATION }, (finished) => {
      if (finished) runOnJS(onArrive)();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [start.x, start.y, end.x, end.y]);

  // For SVG: animatedProps for cx, cy
  const animatedProps = useAnimatedProps(() => ({
    cx: cx.value,
    cy: cy.value,
  }));

  // For Image: animated style for left/top (centered)
  const animatedImgStyle = useAnimatedProps(() => ({
    left: cx.value - size / 2,
    top: cy.value - size / 2,
    // You could add scale/opacity animation here if desired
  }));

  if (imageSrc) {
    // Render the animated PNG skin
    return (
      <AnimatedImage
        source={imageSrc}
        style={[
          {
            position: 'absolute',
            width: size,
            height: size,
            zIndex: 20,
            pointerEvents: 'none',
          },
          animatedImgStyle as any, // as any: RN Animated doesn't type .left/.top well
        ]}
        resizeMode="contain"
      />
    );
  }

  // Fallback: Render the animated SVG orb
  return (
    <>
      <AnimatedCircle
        animatedProps={animatedProps}
        r={OUTER_RADIUS}
        fill={color}
        fillOpacity={OUTER_OPACITY}
      />
      <AnimatedCircle
        animatedProps={animatedProps}
        r={INNER_RADIUS}
        fill={color}
        fillOpacity={INNER_OPACITY}
      />
      <AnimatedCircle
        animatedProps={animatedProps}
        r={DOT_RADIUS}
        fill="#fff"
        fillOpacity={1}
      />
    </>
  );
}
