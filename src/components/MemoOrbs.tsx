import React from 'react';
import OrbAnimatedCircles from './OrbAnimatedCircles';

// Define the types for your orb and animation map
type Orb = {
  id: string;
  x: number;
  y: number;
  radius: number;
  collected: boolean;
};

type OrbAnim = {
  fade: any; // You can specify this as SharedValue<number> if you import from 'react-native-reanimated'
  scale: any;
};

interface MemoOrbsProps {
  orbs: Orb[];
  orbAnimMap: { [id: string]: OrbAnim };
  color: string;
}

export default function MemoOrbs({ orbs, orbAnimMap, color }: MemoOrbsProps) {
  const safeOrbs = Array.isArray(orbs) ? orbs : [];
  return (
    <>
      {safeOrbs.filter(o => !o.collected).map(o => (
        <OrbAnimatedCircles
          key={o.id}
          orb={o}
          anim={orbAnimMap[o.id]}
          color={color}
        />
      ))}
    </>
  );
}
