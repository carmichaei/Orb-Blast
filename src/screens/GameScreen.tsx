import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  Dimensions,
  TouchableWithoutFeedback,
  TouchableOpacity,
  StatusBar,
  Animated,
  Image,
  StyleSheet,
} from 'react-native';
import Svg, { Rect, Circle, Defs, LinearGradient, Stop, Path } from 'react-native-svg';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { GestureResponderEvent } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';

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
} from '../types'; // <- Orb type must include id: string | number and _pendingFlyToScore?: boolean
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
import { useGame } from '../context/GameContext';
import FloatingMenu from '../components/FloatingMenu';
import AnimatedOrbFlyToScore from '../components/AnimatedOrbFlyToScore';

const { width, height } = Dimensions.get('window');
function safeArray<T>(arr: T[] | undefined | null): T[] {
  return Array.isArray(arr) ? arr : [];
}

function buildPath(ripple: Ripple) {
  const cutoff = 0.5;
  let path = '';
  let drawing = false;
  for (let i = 0; i <= ripple.segments; i++) {
    const j = i % ripple.segments;
    const limit = ripple.limits[j];
    const angle = (j / ripple.segments) * 2 * Math.PI;
    const dist = Math.min(ripple.radius, limit);
    const x2 = ripple.x + Math.cos(angle) * dist;
    const y2 = ripple.y + Math.sin(angle) * dist;
    if (ripple.radius + cutoff < limit) {
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
}

const AnimatedImage = Animated.createAnimatedComponent(Image);

const FADE_DURATION = 350;
const LOADING_MIN_TIME = 1200;
const SCORE_POS = { x: width / 2, y: 34 };

type FlyingOrb = {
  id: string | number;
  start: { x: number, y: number };
  end: { x: number, y: number };
  color: string;
  imageSrc?: any;
  size?: number;
};

const GameScreen: React.FC = () => {
  const navigation = useNavigation();

  // --- State
  const [level, setLevel] = useState(1);
  const [tapsUsed, setTapsUsed] = useState(0);
  const [score, setScore] = useState(0);
  const [walls, setWalls] = useState(() => safeArray(generateWalls(width, height, 1)));
  const [orbs, setOrbs] = useState<Orb[]>(() => generateOrbs(width, height, walls, 1));
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const [bursts, setBursts] = useState<Burst[]>([]);
  const [wallSparks, setWallSparks] = useState<WallSpark[]>([]);
  const [loading, setLoading] = useState(false);
  const [nextLevel, setNextLevel] = useState(2);
  const [colorPanelOpen, setColorPanelOpen] = useState(false);

  const [selectedWallColor, setSelectedWallColor] = useState(safeArray(WALL_COLORS)[0] || '#ccc');
  const [selectedOrbColor, setSelectedOrbColor] = useState(safeArray(ORB_COLORS)[0] || '#ccc');
  const [selectedRippleColor, setSelectedRippleColor] = useState(safeArray(RIPPLE_COLORS)[0] || '#ccc');
  const [equippedSkin, setEquippedSkinState] = useState('default');

  // For flying orbs
  const [flyingOrbs, setFlyingOrbs] = useState<FlyingOrb[]>([]);

  // For safe clean load
  const [loadingTrigger, setLoadingTrigger] = useState(false);
  const [cleaningUp, setCleaningUp] = useState(false);

  const { playOrbSound, startNewGame, setCanContinue, soundVolume } = useGame();

  // Animation refs
  const uiFadeAnim = useRef(new Animated.Value(1)).current;
  const loadingOverlayAnim = useRef(new Animated.Value(0)).current;
  const barAnim = useRef(new Animated.Value(0)).current;
  const [fadeOutVisible, setFadeOutVisible] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Floating Menu & Pause
  const [menuOpen, setMenuOpen] = useState(false);
  const [paused, setPaused] = useState(false);

  function fadeToScreen(target: 'Menu' | 'Game') {
    setFadeOutVisible(true);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 350,
      useNativeDriver: true,
    }).start(() => {
      if (target === 'Game') {
        startNewGame?.();
        navigation.reset({ index: 0, routes: [{ name: 'Game' }] });
      } else {
        setCanContinue?.(false);
        navigation.reset({ index: 0, routes: [{ name: 'Menu' }] });
      }
      fadeAnim.setValue(1);
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 350,
        useNativeDriver: true,
      }).start(() => {
        setFadeOutVisible(false);
      });
    });
  }

  // Latest refs for game loop
  const orbsRef = useRef(orbs);
  useEffect(() => { orbsRef.current = orbs; }, [orbs]);
  const ripplesRef = useRef(ripples);
  useEffect(() => { ripplesRef.current = ripples; }, [ripples]);
  const wallsRef = useRef(walls);
  useEffect(() => { wallsRef.current = walls; }, [walls]);

  useEffect(() => {
    (async () => {
      const skinKey = await getEquippedSkin();
      setEquippedSkinState(skinKey);
    })();
  }, []);

  // --- Animation/game loop (now paused-aware)
  useEffect(() => {
    if (paused) return;
    let frameId: number;
    const animate = () => {
      setRipples((prevRipples) => {
        const nextRipples: Ripple[] = [];
        const newSparks: WallSpark[] = [];
        let wallHitThisFrame = false;

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
                wallHitThisFrame = true;
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

        setWallSparks((ws) =>
          ws
            .map(w => ({ ...w, radius: w.radius + .5, opacity: w.opacity - 0.1 }))
            .filter(w => w.opacity > 0)
            .concat(newSparks)
            .slice(-50)
        );
        setBursts((bs) =>
          bs
            .map(b => ({ ...b, radius: b.radius + 4, opacity: b.opacity - 0.07 }))
            .filter(b => b.opacity > 0)
            .slice(-40)
        );
        setOrbs((prevOrbs) => {
          let didUpdate = false;
          const newOrbs = prevOrbs.map((o) => {
            if (o.collected) return o;
            let hit = false;
            for (const r of ripplesRef.current) {
              const dist = Math.hypot(o.x - r.x, o.y - r.y);
              const angle = Math.atan2(o.y - r.y, o.x - r.x);
              const segIdx = Math.floor((((angle + 2 * Math.PI) % (2 * Math.PI)) / (2 * Math.PI)) * r.segments);
              if (dist <= r.radius && dist <= r.limits[segIdx]) {
                hit = true;
                break;
              }
            }
            if (hit) {
              didUpdate = true;
              playOrbSound(soundVolume);
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              setFlyingOrbs(arr => [
                ...arr,
                {
                  id: o.id,
                  start: { x: o.x, y: o.y },
                  end: SCORE_POS,
                  color: selectedOrbColor,
                  imageSrc:
                    equippedSkin !== 'default'
                      ? (ORB_SKINS.find(s => s.key === equippedSkin)?.file)
                      : undefined,
                  size: 18,
                }
              ]);
              return { ...o, collected: true, _pendingFlyToScore: true };
            }
            return o;
          });
          return didUpdate ? newOrbs : prevOrbs;
        });
        return nextRipples;
      });
      frameId = requestAnimationFrame(animate);
    };
    frameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameId);
  }, [width, height, walls, playOrbSound, paused, equippedSkin, selectedOrbColor]);

  // --- LEVEL TRANSITION TRIGGER ---
  useEffect(() => {
    if (safeArray(orbs).length > 0 && safeArray(orbs).every(o => o.collected)) {
      setNextLevel(level + 1);
      setLoadingTrigger(true);
    }
  }, [orbs]);

  // --- LEVEL TRANSITION PHASE 1: Clean up all FX first ---
  useEffect(() => {
    if (!loadingTrigger) return;

    Animated.timing(uiFadeAnim, {
      toValue: 0,
      duration: FADE_DURATION,
      useNativeDriver: true,
    }).start(() => {
      setLoading(true);
      barAnim.setValue(0);
      loadingOverlayAnim.setValue(0);
      Animated.parallel([
        Animated.timing(loadingOverlayAnim, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.timing(barAnim, {
          toValue: 1,
          duration: LOADING_MIN_TIME,
          useNativeDriver: false,
        }),
      ]).start();
      setCleaningUp(true);
      setRipples([]);
      setBursts([]);
      setWallSparks([]);
    });
  }, [loadingTrigger]);

  // --- LEVEL TRANSITION PHASE 2: Wait until ALL cleared, then swap to next level ---
  useEffect(() => {
    if (
      cleaningUp &&
      ripples.length === 0 &&
      bursts.length === 0 &&
      wallSparks.length === 0
    ) {
      setTimeout(() => {
        const nextLvl = level + 1;
        const newWalls = safeArray(generateWalls(width, height, nextLvl));
        setLevel(nextLvl);
        setWalls(newWalls);
        setOrbs(generateOrbs(width, height, newWalls, nextLvl));
        setTapsUsed(0);
        setCleaningUp(false);

        Animated.timing(loadingOverlayAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }).start(() => {
          setLoading(false);
          uiFadeAnim.setValue(1);
          setLoadingTrigger(false);
        });
      }, LOADING_MIN_TIME);
    }
  }, [cleaningUp, ripples.length, bursts.length, wallSparks.length]);

  // --- Game Over logic ---
  useEffect(() => {
    let timeout: NodeJS.Timeout;
    if (tapsUsed >= MAX_TAPS && safeArray(orbs).some(o => !o.collected)) {
      timeout = setTimeout(() => {
        navigation.navigate('GameOver', { score, level });
      }, 7000);
    }
    return () => clearTimeout(timeout);
  }, [tapsUsed, orbs, navigation]);

  // --- Handle Screen Taps ---
  const handlePress = useCallback((e: GestureResponderEvent) => {
    if (loading || colorPanelOpen || paused) return;
    if (tapsUsed >= MAX_TAPS) return;
    setTapsUsed(t => Math.min(t + 1, MAX_TAPS));
    const { locationX: x, locationY: y } = e.nativeEvent;
    const initSegments = SEGMENT_THRESHOLDS[0].segments;
    setRipples(rs => [...rs, {
      x, y,
      radius: 0,
      segments: initSegments,
      limits: generateLimits(x, y, initSegments, width, height, wallsRef.current)
    }]);
  }, [loading, colorPanelOpen, walls, tapsUsed, paused]);

  // --- When a flying orb animation completes ---
  const handleFlyArrive = useCallback((id: string | number) => {
    setScore(s => s + 1);
    setOrbs(currentOrbs => currentOrbs.filter(orb => orb.id != id));
    setFlyingOrbs(current => current.filter(f => f.id != id));
  }, []);

  // --- Render ---
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="black" />

      {/* --- UI (Header/menu/buttons above game) --- */}
      <Animated.View
        style={{
          position: 'absolute', top: 0, left: 0, right: 0, opacity: uiFadeAnim, zIndex: 10
        }}
        pointerEvents="box-none"
      >
        <SafeAreaView edges={['top']} style={{ zIndex: 10 }}>
          <View style={styles.topRowPanel}>
            <View style={styles.panelBlur}>
              <Text style={styles.scoreText}>
                Lvl {level}  |  Score {score}  |  Taps {Math.max(0, MAX_TAPS - tapsUsed)}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <TouchableOpacity
                style={{ padding: 7, marginRight: 5, borderRadius: 8, backgroundColor: '#2b2d43cc' }}
                onPress={() => setColorPanelOpen(open => !open)}>
                <Text style={{ color: '#7bffde', fontSize: 23, fontWeight: 'bold' }}>🎨</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{ padding: 7, borderRadius: 8, backgroundColor: '#2b2d43cc', marginLeft: 5 }}
                onPress={() => { setMenuOpen(true); setPaused(true); }}
              >
                <Text style={{ color: '#fff', fontSize: 26, fontWeight: 'bold' }}>≡</Text>
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </Animated.View>

      {/* Color Picker Overlay */}
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

      {/* --- Canvas: always running --- */}
      <Svg style={StyleSheet.absoluteFill} width={width} height={height}>
        <Defs>
          <LinearGradient id="bgGradient" x1="0" y1="0" x2="0" y2={height}>
            <Stop offset="0%" stopColor={BG_GRADIENT_START} />
            <Stop offset="100%" stopColor={BG_GRADIENT_END} />
          </LinearGradient>
        </Defs>
        <Rect x={0} y={0} width={width} height={height} fill="url(#bgGradient)" />
        {!loading && safeArray(walls).map((w, i) => (
          <React.Fragment key={i}>
            <Rect
              x={w.x - 6}
              y={w.y - 6}
              width={w.width + 16}
              height={w.height + 16}
              rx={20}
              fill={selectedWallColor}
              fillOpacity={0.01}
            />
            <Rect
              x={w.x - 2}
              y={w.y - 2}
              width={w.width + 4}
              height={w.height + 4}
              rx={14}
              fill={selectedWallColor}
              fillOpacity={0.23}
            />
            <Rect
              x={w.x}
              y={w.y}
              width={w.width}
              height={w.height}
              rx={7}
              fill={selectedWallColor}
              fillOpacity={0.93}
            />
          </React.Fragment>
        ))}
      </Svg>

      {/* --- Orbs, Ripples, Bursts, WallSparks, tap area --- */}
      <TouchableWithoutFeedback onPress={handlePress}>
        <View style={StyleSheet.absoluteFillObject} pointerEvents={loading ? "none" : "auto"}>
          <Svg width={width} height={height}>
            {!loading && (
              <>
                {/* Orbs (don't render orbs that are being animated as flying!) */}
                {equippedSkin === 'default' && (
                  <MemoOrbs
                    orbs={orbs.filter(o => !o.collected || o._pendingFlyToScore)}
                    color={selectedOrbColor}
                  />
                )}
                {equippedSkin !== 'default' && (
                  safeArray(orbs)
                    .filter(o => !o.collected || o._pendingFlyToScore)
                    .map(o => {
                      if (o.collected) return null;
                      const equippedSkinObj = ORB_SKINS.find(s => s.key === equippedSkin);
                      if (!equippedSkinObj || !equippedSkinObj.file) return null;
                      const pngSize = 18;
                      return (
                        <AnimatedImage
                          key={o.id}
                          source={equippedSkinObj.file}
                          style={{
                            position: 'absolute',
                            left: o.x - pngSize / 2,
                            top: o.y - pngSize / 2,
                            width: pngSize,
                            height: pngSize,
                            opacity: 1,
                            zIndex: 2,
                          }}
                          resizeMode="contain"
                        />
                      );
                    })
                )}
                {safeArray(bursts).map((b, i) => (
                  <Circle
                    key={i}
                    cx={b.x} cy={b.y}
                    r={b.radius}
                    fill={selectedOrbColor}
                    fillOpacity={b.opacity * 0.5}
                  />
                ))}
                {safeArray(ripples).map((r, i) => (
                  <Path
                    key={i}
                    d={buildPath(r)}
                    stroke={selectedRippleColor}
                    strokeWidth={4}
                    strokeOpacity={0.33}
                    fill="none"
                  />
                ))}
                {safeArray(wallSparks).map((w, i) => (
                  <Circle
                    key={i}
                    cx={w.x} cy={w.y}
                    r={w.radius}
                    fill="#fff"
                    fillOpacity={w.opacity}
                  />
                ))}
              </>
            )}
          </Svg>

          {/* --- Flying Orbs Animation Overlay --- */}
          {flyingOrbs.map(flying =>
            <AnimatedOrbFlyToScore
              key={flying.id}
              start={flying.start}
              end={flying.end}
              color={flying.color}
              onArrive={() => handleFlyArrive(flying.id)}
              imageSrc={flying.imageSrc}
              size={flying.size}
            />
          )}
        </View>
      </TouchableWithoutFeedback>

      {/* --- Loading Overlay & Bar --- */}
      {loading && (
        <Animated.View
          pointerEvents="auto"
          style={[
            styles.loadingOverlay,
            {
              opacity: loadingOverlayAnim,
              backgroundColor: 'rgba(14,18,31,0.96)',
              position: 'absolute',
              top: 0, left: 0, right: 0, bottom: 0,
              alignItems: 'center', justifyContent: 'center',
            }
          ]}
        >
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

      <FloatingMenu
        visible={menuOpen}
        onContinue={() => { setMenuOpen(false); setPaused(false); }}
        onRestart={() => { setMenuOpen(false); setPaused(false); fadeToScreen('Game'); }}
        onMainMenu={() => { setMenuOpen(false); setPaused(false); fadeToScreen('Menu'); }}
      />

      <Animated.View
        pointerEvents={fadeOutVisible ? 'auto' : 'none'}
        style={{
          ...StyleSheet.absoluteFillObject,
          backgroundColor: '#000',
          opacity: fadeAnim,
          zIndex: 9999,
        }}
      />
    </View>
  );
};

export default GameScreen;
