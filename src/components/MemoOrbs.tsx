import React from 'react';
import { Circle } from 'react-native-svg';
import { Image } from 'react-native';

type Orb = {
  id: string;
  x: number;
  y: number;
  radius: number;
  collected: boolean;
};

interface MemoOrbsProps {
  orbs: Orb[];
  color: string;
  skinFile?: any; // If undefined, draw SVG; else, draw PNG
}

const OUTER_RADIUS = 10;
const INNER_RADIUS = 4;
const DOT_RADIUS = 2.2;
const OUTER_OPACITY = 0.22;
const INNER_OPACITY = 0.75;

export default function MemoOrbs({ orbs, color, skinFile }: MemoOrbsProps) {
  return (
    <>
      {orbs.map((orb) =>
        skinFile ? (
          <Image
            // Center the image by offsetting half size
            key={orb.id}
            source={skinFile}
            style={{
              position: 'absolute',
              left: orb.x - 8, // Adjust if your PNG is bigger/smaller
              top: orb.y - 8,
              width: 16,
              height: 16,
              resizeMode: 'contain',
              zIndex: 10,
            }}
          />
        ) : (
          <React.Fragment key={orb.id}>
            <Circle
              cx={orb.x}
              cy={orb.y}
              r={OUTER_RADIUS}
              fill={color}
              fillOpacity={OUTER_OPACITY}
            />
            <Circle
              cx={orb.x}
              cy={orb.y}
              r={INNER_RADIUS}
              fill={color}
              fillOpacity={INNER_OPACITY}
            />
            <Circle
              cx={orb.x}
              cy={orb.y}
              r={DOT_RADIUS}
              fill="#fff"
              fillOpacity={1}
            />
          </React.Fragment>
        )
      )}
    </>
  );
}
