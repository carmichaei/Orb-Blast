import React from 'react';
import { Animated } from 'react-native';
import { Circle } from 'react-native-svg';
import { MemoOrbsProps } from '../types';
import { getOrbAnimStyle } from './getOrbAnimStyle';


const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const MemoOrbs = React.memo(
  function MemoOrbs({ orbs, color }: MemoOrbsProps) {
    return (
      <>
        {orbs.map(o => !o.collected && (
          <React.Fragment key={o.id}>
            <AnimatedCircle
              cx={o.x}
              cy={o.y}
              r={o.radius + 7}
              fill={color}
              fillOpacity={0.22}
              transform={getOrbAnimStyle(o).transform}
            />
            <AnimatedCircle
              cx={o.x}
              cy={o.y}
              r={o.radius + 2}
              fill={color}
              fillOpacity={0.45}
              transform={getOrbAnimStyle(o).transform}
            />
            <AnimatedCircle
              cx={o.x}
              cy={o.y}
              r={o.radius}
              fill="#fff"
              fillOpacity={0.82}
              opacity={o.fade}
              transform={getOrbAnimStyle(o).transform}
            />
          </React.Fragment>
        ))}
      </>
    );
  },
  (prev, next) => prev.color === next.color && prev.orbs === next.orbs
);

export default MemoOrbs;
