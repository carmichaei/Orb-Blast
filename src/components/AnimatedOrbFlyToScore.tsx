import React, { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import { Canvas, Circle, Image as SkiaImage, useImage, Group, Path, Skia } from '@shopify/react-native-skia';
import { useSharedValue, withTiming, Easing } from 'react-native-reanimated';

type Props = {
  start: { x: number, y: number },
  end: { x: number, y: number },
  color: string,
  onArrive?: () => void,
  imageSrc?: any,
  size?: number
};

const duration = 650; // ms
const trailLength = 22;

export default function AnimatedOrbFlyToScore({
  start, end, color, onArrive, imageSrc, size = 20
}: Props) {
  const t = useSharedValue(0);
  const orbImage = useImage(imageSrc);
  const [, setTick] = useState(0);

  useEffect(() => {
    t.value = 0;
    t.value = withTiming(
      1,
      { duration, easing: Easing.out(Easing.cubic) },
      (finished) => {
        if (finished && onArrive) onArrive();
      }
    );
    const interval = setInterval(() => setTick(tick => tick + 1), 16);
    return () => clearInterval(interval);
  }, []);

  // Bezier
  const cx = (start.x + end.x) / 2;
  const cy = Math.min(start.y, end.y) - 90;

  const tVal = t.value;
  const u = 1 - tVal;
  const posX = u * u * start.x + 2 * u * tVal * cx + tVal * tVal * end.x;
  const posY = u * u * start.y + 2 * u * tVal * cy + tVal * tVal * end.y;
  const scale = 1 - 0.4 * tVal;
  const opacity = 1 - tVal;

  // Defensive trail
  let trailPath = null;
  const steps = trailLength;
  const points: { x: number, y: number }[] = [];
  for (let i = 0; i < steps; i++) {
    const trailT = Math.max(0, tVal - (i / steps) * 0.15);
    const uu = 1 - trailT;
    const tx = uu * uu * start.x + 2 * uu * trailT * cx + trailT * trailT * end.x;
    const ty = uu * uu * start.y + 2 * uu * trailT * cy + trailT * trailT * end.y;
    points.push({ x: tx, y: ty });
  }
  if (points.length > 1) {
    const path = Skia.Path.Make();
    path.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      path.lineTo(points[i].x, points[i].y);
    }
    trailPath = path;
  }

  return (
    <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
      {trailPath && (
        <Path
          path={trailPath}
          color={color}
          style="stroke"
          strokeWidth={size * 0.6}
          opacity={opacity}
        />
      )}
      <Group
        transform={[
          { translateX: posX },
          { translateY: posY },
          { scale: scale }
        ]}
        opacity={opacity}
      >
        {orbImage ? (
          <SkiaImage
            image={orbImage}
            width={size}
            height={size}
            x={-size / 2}
            y={-size / 2}
          />
        ) : (
          <Circle
            cx={0}
            cy={0}
            r={size / 2}
            color={color}
            opacity={0.97}
            style="fill"
          />
        )}
      </Group>
    </Canvas>
  );
}
