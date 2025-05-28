import React from 'react';
import OrbAnimatedCircles from './OrbAnimatedCircles';

export interface Orb {
  id: number;
  x: number;
  y: number;
  radius: number;
  collected: boolean;
}

interface MemoOrbsProps {
  orbs: Orb[];
  color: string;
  onFadeComplete: (id: number) => void;
}

export default function MemoOrbs({ orbs, color, onFadeComplete }: MemoOrbsProps) {
  // Always render all orbs, so collected orbs can animate out before being removed from state
  return (
    <>
      {orbs.map(o => (
        <OrbAnimatedCircles
          key={o.id}
          orb={o}
          color={color}
          onFadeComplete={onFadeComplete}
        />
      ))}
    </>
  );
}
