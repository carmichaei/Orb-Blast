import React, { useState, useEffect } from 'react';
import { View, Text } from 'react-native';
import { COLORS } from '../constants';
import { styles } from '../styles'; // import your styles

export default function AnimatedOrbBlastTitle() {
  const title = "ORB BLAST";
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let frame;
    const animate = () => {
      setTick(t => t + 1);
      frame = requestAnimationFrame(animate);
    };
    animate();
    return () => cancelAnimationFrame(frame);
  }, []);

  const AMPLITUDE = 6;
  const SPEED = 0.04;
  const WAVELENGTH = -0.99;

  return (
    <View style={{ flexDirection: 'row', justifyContent: 'center', marginBottom: 32 }}>
      {title.split('').map((char, i) => {
        const phase = tick * SPEED + i * WAVELENGTH;
        const y = Math.sin(phase) * AMPLITUDE;
        return (
          <Text
            key={i}
            style={[
              styles.title,
              {
                fontSize: 64,
                color: COLORS[i % COLORS.length],
                transform: [{ translateY: y }],
                marginLeft: 0,
                marginRight: 0,
                padding: 0,
              },
            ]}
          >
            {char}
          </Text>
        );
      })}
    </View>
  );
}
