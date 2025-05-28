import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  Dimensions,
  TouchableWithoutFeedback,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Animated,
  Image,
} from 'react-native';
import Svg, { Path, Rect, Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { Audio } from 'expo-av';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { GestureResponderEvent } from 'react-native';
import { useSharedValue, withTiming } from 'react-native-reanimated';

import {
  WALL_COLORS, ORB_COLORS, RIPPLE_COLORS,
  BG_GRADIENT_START, BG_GRADIENT_END,
  ORB_SKINS, SEGMENT_THRESHOLDS, MAX_TAPS
} from '../constants';
import {
  Orb,
  Ripple,
  WallSpark,
  Burst,
} from '../types';
import {
  getSegmentsForRadius,
  generateLimits,
  getEquippedSkin,
  generateWalls,
  generateOrbs,
} from '../utils/game';

import MemoOrbs from '../components/MemoOrbs';
import InlineColorPickerPanel from '../components/InlineColorPickerPanel';
import { styles } from '../styles';

const { width, height } = Dimensions.get('window');

function safeArray<T>(arr: T[] | undefined | null): T[] {
  return Array.isArray(arr) ? arr : [];
}

const GameScreen: React.FC<{ navigation?: any }> = ({ navigation }) => {
  // Game state
  const [level, setLevel] = useState(1);
  const [tapsUsed, setTapsUsed] = useState(0);
  const [score, setScore] = useState(0);

  const [walls, setWalls] = useState(() => safeArray(generateWalls(width, height, 1)));
  // Orbs now have no fade/scale; these will be mapped in a ref
  const [orbs, setOrbs] = useState<Orb[]>(() =>
    generateOrbs(width, height, walls, 1)
  );

  const [ripples, setRipples] = useState<Ripple[]>([]);
  const [bursts, setBursts] = useState<Burst[]>([]);
  const [wallSparks, setWallSparks] = useState<WallSpark[]>([]);
  const [loading, setLoading] = useState(false);
  const [nextLevel, setNextLevel] = useState(2);
  const [levelUpPending, setLevelUpPending] = useState(false);
  const [muteOrbSound, setMuteOrbSound] = useState(false);
  const [colorPanelOpen, setColorPanelOpen] = useState(false);

  const [selectedWallColor, setSelectedWallColor] = useState(safeArray(WALL_COLORS)[0] || '#ccc');
  const [selectedOrbColor, setSelectedOrbColor] = useState(safeArray(ORB_COLORS)[0] || '#ccc');
  const [selectedRippleColor, setSelectedRippleColor] = useState(safeArray(RIPPLE_COLORS)[0] || '#ccc');
  const [equippedSkin, setEquippedSkinState] = useState('default');

  // Audio
  const orbSoundRef = useRef<Audio.Sound | null>(null);

  // Animation Refs (for overlays)
  const loadingAnim = useRef(new Animated.Value(1)).current;
  const barAnim = useRef(new Animated.Value(0)).current;

  // Stable Refs for Mutable State
  const orbsRef = useRef(orbs);
  useEffect(() => { orbsRef.current = orbs; }, [orbs]);
  const ripplesRef = useRef(ripples);
  useEffect(() => { ripplesRef.current = ripples; }, [ripples]);
  const wallsRef = useRef(walls);
  useEffect(() => { wallsRef.current = walls; }, [walls]);

  // --------- NEW: Orb Animation Map (SAFE) -----------
  // Holds fade/scale for each orb by orb.id
  const orbAnimMapRef = useRef<{ [id: string]: { fade: any; scale: any } }>({});

  // Create/update animation values for all orbs when orbs change
  useEffect(() => {
    const animMap = { ...orbAnimMapRef.current };
    for (const orb of orbs) {
      if (!animMap[orb.id]) {
        animMap[orb.id] = {
          fade: useSharedValue(1),
          scale: useSharedValue(1)
        };
      }
    }
    // Remove animations for orbs that no longer exist
    Object.keys(animMap).forEach((id) => {
      if (!orbs.find(o => o.id === id)) {
        delete animMap[id];
      }
    });
    orbAnimMapRef.current = animMap;
  }, [orbs]);
  // ---------------------------------------------------

  // Load Skins/Points on mount
  useEffect(() => {
    (async () => {
      setEquippedSkinState(await getEquippedSkin());
    })();
  }, []);

  // Audio Setup (orb only for this screen)
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const orb = new Audio.Sound();
        await orb.loadAsync(require('../../assets/sounds/orb.mp3'));
        if (isMounted) orbSoundRef.current = orb;
      } catch (e) { }
    })();
    return () => { isMounted = false; orbSoundRef.current?.unloadAsync(); };
  }, []);

  // Play orb sound utility
  const playOrbSound = useCallback(async () => {
    if (muteOrbSound) return;
    try {
      const sound = new Audio.Sound();
      await sound.loadAsync(require('../../assets/sounds/orb.mp3'));
      await sound.setVolumeAsync(0.7 + Math.random() * 0.2);
      await sound.setRateAsync(0.95 + Math.random() * 0.10, false);
      await sound.playAsync();
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) sound.unloadAsync();
      });
    } catch (e) { }
  }, [muteOrbSound]);

  // Main Game Loop (unchanged)
  useEffect(() => {
    let frame: number;
    const animate = () => {
      setRipples((prevRipples: Ripple[]) => {
        const nextRipples: Ripple[] = [];
        const newSparks: WallSpark[] = [];
        for (const ripple of ripplesRef.current) {
          const targetSegments = getSegmentsForRadius(ripple.radius, ripple.segments);
          let updatedLimits = ripple.limits;
          if (targetSegments > ripple.segments) {
            updatedLimits = generateLimits(
              ripple.x, ripple.y, targetSegments, width, height, wallsRef.current
            );
          }
          const newRadius = ripple.radius + 2;
          if (newRadius < Math.hypot(width, height)) {
            for (let j = 0; j < targetSegments; j++) {
              const limit = updatedLimits[j];
              if (ripple.radius < limit && newRadius >= limit) {
                const angle = (j / targetSegments) * 2 * Math.PI;
                const sx = ripple.x + Math.cos(angle) * limit;
                const sy = ripple.y + Math.sin(angle) * limit;
                newSparks.push({ x: sx, y: sy, radius: 0, opacity: 1 });
              }
            }
            nextRipples.push({
              ...ripple,
              radius: newRadius,
              segments: targetSegments,
              limits: updatedLimits,
            });
          }
        }
        setWallSparks((ws: WallSpark[]) =>
          ws
            .map((w) => ({ ...w, radius: w.radius + 3, opacity: w.opacity - 0.08 }))
            .filter((w) => w.opacity > 0)
            .concat(newSparks)
            .slice(-50)
        );
        setOrbs((obs: Orb[]) => {
          let didUpdate = false;
          const newOrbs = obs.map((o, idx) => {
            if (o.collected) return o;
            let hit = false;
            for (let k = 0; k < ripplesRef.current.length; k++) {
              const r = ripplesRef.current[k];
              const angle = Math.atan2(o.y - r.y, o.x - r.x);
              const dist = Math.hypot(o.x - r.x, o.y - r.y);
              const segIdx = Math.floor(
                (((angle + 2 * Math.PI) % (2 * Math.PI)) / (2 * Math.PI)) * r.segments
              );
              if (dist <= r.radius && dist <= r.limits[segIdx]) hit = true;
            }
            if (hit) {
              didUpdate = true;
              playOrbSound();
              setScore((s) => s + 1);
              setBursts((bs: Burst[]) =>
                [...bs, { x: o.x, y: o.y, radius: 0, opacity: 1 }].slice(-40)
              );
              // Update animation using ref (not state/hook)
              if (orbAnimMapRef.current[o.id]) {
                orbAnimMapRef.current[o.id].fade.value = withTiming(0, { duration: 320 });
              }
              return { ...o, collected: true };
            }
            return o;
          });
          return didUpdate ? newOrbs : obs;
        });
        setBursts((bs: Burst[]) =>
          bs
            .map((b) => ({ ...b, radius: b.radius + 4, opacity: b.opacity - 0.07 }))
            .filter((b) => b.opacity > 0)
            .slice(-40)
        );
        return nextRipples;
      });
      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [width, height, walls, playOrbSound]);

  // Level Up (unchanged)
  useEffect(() => {
    if (
      !levelUpPending &&
      safeArray(orbs).length > 0 &&
      safeArray(orbs).every(o => o.collected)
    ) {
      setLevelUpPending(true);
      setNextLevel(level + 1);
      setTimeout(() => {
        barAnim.setValue(0);
        setLoading(true);
        loadingAnim.setValue(0);
        Animated.timing(loadingAnim, {
          toValue: 1,
          duration: 320,
          useNativeDriver: true,
        }).start(() => {
          Animated.timing(barAnim, {
            toValue: 1,
            duration: 1100,
            easing: require('react-native').Easing.out(require('react-native').Easing.exp),
            useNativeDriver: false,
          }).start(() => {
            setRipples([]);
            setBursts([]);
            setWallSparks([]);
            setTimeout(() => {
              const next = level + 1;
              const newWalls = safeArray(generateWalls(width, height, next));
              setLevel(next);
              setWalls(newWalls);
              setOrbs(generateOrbs(width, height, newWalls, next));
              setTapsUsed(0);
              setLevelUpPending(false);
              Animated.timing(loadingAnim, {
                toValue: 0,
                duration: 280,
                useNativeDriver: true,
              }).start(() => setLoading(false));
            }, 0);
          });
        });
      }, 500);
    }
  }, [orbs, levelUpPending, level, width, height]);

  // 7-Second Delay for Game Over (unchanged)
  useEffect(() => {
    let timeout: NodeJS.Timeout;
    if (tapsUsed >= MAX_TAPS && safeArray(orbs).some(o => !o.collected)) {
      timeout = setTimeout(() => {
        if (navigation && typeof navigation.navigate === 'function') {
          navigation.navigate('GameOver');
        } else {
          setLevel(1);
          setScore(0);
          const newWalls = safeArray(generateWalls(width, height, 1));
          setWalls(newWalls);
          setOrbs(generateOrbs(width, height, newWalls, 1));
          setTapsUsed(0);
          setRipples([]);
          setBursts([]);
          setWallSparks([]);
        }
      }, 7000);
    }
    return () => { if (timeout) clearTimeout(timeout); };
  }, [tapsUsed, orbs, navigation, width, height, walls]);

  // Game tap handler (unchanged)
  const handlePress = useCallback((event: GestureResponderEvent) => {
    const { nativeEvent } = event;
    if (tapsUsed >= MAX_TAPS || loading || colorPanelOpen) return;
    setTapsUsed(u => u + 1);
    const { locationX: x, locationY: y } = nativeEvent;
    const initSegments = SEGMENT_THRESHOLDS[0].segments;
    const limits = generateLimits(x, y, initSegments, width, height, wallsRef.current);
    setRipples(r => [...r, { x, y, radius: 0, limits, segments: initSegments }]);
  }, [tapsUsed, loading, width, height, colorPanelOpen]);

  // Ripple path (unchanged)
  const buildPath = useCallback((r: Ripple) => {
    const cutoff = 0.5;
    let path = '';
    let drawing = false;
    for (let i = 0; i <= r.segments; i++) {
      const j = i % r.segments;
      const limit = r.limits[j];
      const angle = (j / r.segments) * 2 * Math.PI;
      const dist = Math.min(r.radius, limit);
      const x2 = r.x + Math.cos(angle) * dist;
      const y2 = r.y + Math.sin(angle) * dist;
      if (r.radius + cutoff < limit) {
        if (!drawing) {
          path += `M${x2},${y2}`;
          drawing = true;
        } else {
          path += `L${x2},${y2}`;
        }
      } else {
        drawing = false;
      }
    }
    return path;
  }, []);

  // Menu button handler (unchanged)
  const onMenu = () => {
    if (navigation && typeof navigation.navigate === 'function') {
      navigation.navigate('Menu');
    } else {
      setLevel(1);
      setScore(0);
      const newWalls = safeArray(generateWalls(width, height, 1));
      setWalls(newWalls);
      setOrbs(generateOrbs(width, height, newWalls, 1));
      setTapsUsed(0);
      setRipples([]);
      setBursts([]);
      setWallSparks([]);
    }
  };

  // Background Gradient (unchanged)
  const GradientBG = useMemo(() => (
    <Svg style={StyleSheet.absoluteFillObject} width={width} height={height}>
      <Defs>
        <LinearGradient id="bgGradient" x1="0" y1="0" x2="0" y2={height}>
          <Stop offset="0" stopColor={BG_GRADIENT_START} />
          <Stop offset="1" stopColor={BG_GRADIENT_END} />
        </LinearGradient>
      </Defs>
      <Rect x="0" y="0" width={width} height={height} fill="url(#bgGradient)" />
    </Svg>
  ), [width, height]);

  // ---- RENDER ----
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="black" />
      {GradientBG}

      {/* Top HUD */}
      <SafeAreaView edges={['top']} style={{ zIndex: 10 }}>
        <View style={styles.topRowPanel}>
          <View style={styles.panelBlur}>
            <Text style={styles.scoreText}>
              Lvl {level}  |  Score {score}  |  Taps {MAX_TAPS - tapsUsed}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            {/* Color Picker */}
            <TouchableOpacity
              style={{
                padding: 7, marginRight: 5, borderRadius: 8,
                backgroundColor: '#2b2d43cc'
              }}
              onPress={() => setColorPanelOpen(b => !b)}
            >
              <Text style={{ color: '#7bffde', fontSize: 23, fontWeight: 'bold' }}>🎨</Text>
            </TouchableOpacity>
            {/* Menu button */}
            <TouchableOpacity
              style={{
                padding: 7, borderRadius: 8,
                backgroundColor: '#2b2d43cc'
              }}
              onPress={onMenu}
            >
              <Text style={{ color: '#fff', fontSize: 28, fontWeight: 'bold', lineHeight: 28 }}>≡</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>

      <InlineColorPickerPanel
        visible={colorPanelOpen}
        onClose={() => setColorPanelOpen(false)}
        selectedWallColor={selectedWallColor}
        setSelectedWallColor={setSelectedWallColor}
        selectedOrbColor={selectedOrbColor}
        setSelectedOrbColor={setSelectedOrbColor}
        selectedRippleColor={selectedRippleColor}
        setSelectedRippleColor={setSelectedRippleColor}
        wallColors={safeArray(WALL_COLORS)}
        orbColors={safeArray(ORB_COLORS)}
        rippleColors={safeArray(RIPPLE_COLORS)}
      />

      <TouchableWithoutFeedback onPress={handlePress}>
        <View style={StyleSheet.absoluteFillObject}>
          <Svg width={width} height={height}>
            {/* Default Orb Skin */}
            {equippedSkin === 'default' && (
              <MemoOrbs orbs={orbs} orbAnimMap={orbAnimMapRef.current} color={selectedOrbColor} />
            )}
            {/* Custom Skins */}
            {equippedSkin !== 'default' && (
              safeArray(orbs).map((o) => {
                if (o.collected) return null;
                const equippedSkinObj = ORB_SKINS.find(s => s.key === equippedSkin);
                if (!equippedSkinObj || !equippedSkinObj.file) return null;
                const opacity = orbAnimMapRef.current[o.id]?.fade?.value ?? 1;
                const pngSize = 18;
                return (
                  <Image
                    key={o.id}
                    source={equippedSkinObj.file}
                    style={{
                      position: 'absolute',
                      left: o.x - pngSize / 2,
                      top: o.y - pngSize / 2,
                      width: pngSize,
                      height: pngSize,
                      opacity: opacity,
                      zIndex: 2,
                    }}
                    resizeMode="contain"
                  />
                );
              })
            )}
            {safeArray(bursts).map((b, i) => (
              <Circle key={i} cx={b.x} cy={b.y} r={b.radius} fill={selectedOrbColor} fillOpacity={b.opacity * 0.5} />
            ))}
            {safeArray(ripples).map((r, idx) => (
              <Path
                key={idx}
                d={buildPath(r)}
                stroke={selectedRippleColor}
                strokeWidth={4}
                strokeOpacity={0.33}
                fill="none"
              />
            ))}
            {safeArray(wallSparks).map((s, i) => (
              <Circle key={i} cx={s.x} cy={s.y} r={s.radius} stroke="#fff" strokeWidth={.6} strokeOpacity={s.opacity * 0.5} fill="none" />
            ))}
            {safeArray(walls).map((w, i) => (
              <React.Fragment key={i}>
                <Rect x={w.x - 6} y={w.y - 6} width={w.width + 16} height={w.height + 16} rx={20} fill={selectedWallColor} fillOpacity={0.01} />
                <Rect x={w.x - 2} y={w.y - 2} width={w.width + 4} height={w.height + 4} rx={14} fill={selectedWallColor} fillOpacity={0.23} />
                <Rect x={w.x} y={w.y} width={w.width} height={w.height} rx={7} fill={selectedWallColor} fillOpacity={0.93} />
              </React.Fragment>
            ))}
          </Svg>
        </View>
      </TouchableWithoutFeedback>

      {loading && (
        <Animated.View style={[
          styles.loadingOverlay,
          { opacity: loadingAnim }
        ]}>
          <Text style={styles.loadingText}>loading level {nextLevel}...</Text>
          <View style={styles.barContainer}>
            <View style={styles.barBg}>
              <Animated.View style={[
                styles.barFill,
                {
                  width: barAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, 240]
                  })
                }
              ]} />
            </View>
          </View>
        </Animated.View>
      )}
    </View>
  );
};

export default GameScreen;
