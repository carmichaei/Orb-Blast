import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  Dimensions,
  TouchableWithoutFeedback,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Animated,
  Easing
} from 'react-native';
import Svg, { Path, Rect, Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Audio } from 'expo-av';
import * as Linking from 'expo-linking';


// --- Constants & Types ---
const COLORS = ['#7bffde', '#cdbaff', '#ffcda8', '#ffb8d1', '#ffd36e'];
const RIPPLE_COLOR = '#ffffffcc';
const WALL_COLOR = '#23243a';
const WALL_GLOW_COLOR = '#7bffde';
const BG_GRADIENT_START = '#151724';
const BG_GRADIENT_END = '#343551';
const SEGMENT_THRESHOLDS = [
  { radius: 0, segments: 30 },
  { radius: 40, segments: 60 },
  { radius: 80, segments: 120 },
  { radius: 160, segments: 300 },
  { radius: 260, segments: 600 },
];
const MIN_WALLS = 2;
const MIN_ORBS = 3;
const ORB_RADIUS = 3;
const MAX_TAPS = 3;
const TOP_INFOBAR_HEIGHT = 80;
const HIGHSCORES_KEY = 'HIGHSCORES_KEY';

type Ripple = { x: number; y: number; radius: number; limits: number[]; segments: number };
type Wall = { x: number; y: number; width: number; height: number };
type Orb = {
  id: number;
  x: number;
  y: number;
  radius: number;
  collected: boolean;
  fade?: Animated.Value;
  scale?: Animated.Value;
};
type Burst = { x: number; y: number; radius: number; opacity: number };
type Screen = 'menu' | 'game' | 'scores' | 'gameover';
type HighScoreEntry = { score: number; level: number };

function getSegmentsForRadius(radius: number, currentSegments: number) {
  let nextSegments = currentSegments;
  for (let i = SEGMENT_THRESHOLDS.length - 1; i >= 0; i--) {
    if (radius > SEGMENT_THRESHOLDS[i].radius) {
      nextSegments = Math.max(currentSegments, SEGMENT_THRESHOLDS[i].segments);
      break;
    }
  }
  return nextSegments;
}

function generateLimits(x: number, y: number, segments: number, width: number, height: number, walls: Wall[]) {
  const limits = new Array(segments);
  for (let i = 0; i < segments; i++) {
    const angle = (i / segments) * 2 * Math.PI;
    const dx = Math.cos(angle);
    const dy = Math.sin(angle);
    let minDist = Math.hypot(width, height);
    for (let w = 0; w < walls.length; w++) {
      const wall = walls[w];
      if (dx) {
        const edgeXs = [wall.x, wall.x + wall.width];
        for (let e = 0; e < 2; e++) {
          const t = (edgeXs[e] - x) / dx;
          if (t > 0 && t < minDist) {
            const yi = y + dy * t;
            if (yi >= wall.y && yi <= wall.y + wall.height) minDist = t;
          }
        }
      }
      if (dy) {
        const edgeYs = [wall.y, wall.y + wall.height];
        for (let e = 0; e < 2; e++) {
          const t = (edgeYs[e] - y) / dy;
          if (t > 0 && t < minDist) {
            const xi = x + dx * t;
            if (xi >= wall.x && xi <= wall.x + wall.width) minDist = t;
          }
        }
      }
    }
    limits[i] = minDist;
  }
  return limits;
}

// --- Highscore helpers ---
async function saveHighScore(newScore: number, newLevel: number) {
  try {
    const raw = await AsyncStorage.getItem(HIGHSCORES_KEY);
    let scores: HighScoreEntry[] = raw ? JSON.parse(raw) : [];
    scores.push({ score: newScore, level: newLevel });
    scores = scores
      .sort((a, b) => b.score - a.score || b.level - a.level)
      .slice(0, 5);
    await AsyncStorage.setItem(HIGHSCORES_KEY, JSON.stringify(scores));
    return scores;
  } catch (e) {
    return [];
  }
}
async function getHighScores(): Promise<HighScoreEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(HIGHSCORES_KEY);
    if (!raw) return [];
    try {
      return JSON.parse(raw);
    } catch (e) {
      await AsyncStorage.removeItem(HIGHSCORES_KEY);
      return [];
    }
  } catch (e) {
    return [];
  }
}
async function clearHighScores() {
  try {
    await AsyncStorage.removeItem(HIGHSCORES_KEY);
  } catch (e) {}
}

// Wall and Orb generation:
function generateWalls(width: number, height: number, level: number): Wall[] {
  const count = MIN_WALLS + level;
  const out: Wall[] = [];
  for (let i = 0; i < count; i++) {
    const horizontal = Math.random() < 0.5;
    if (horizontal) {
      const w = 50 + Math.random() * width * 0.4;
      const x = Math.random() * (width - w);
      const y = Math.random() * height;
      out.push({ x, y, width: w, height: 12 });
    } else {
      const h = 50 + Math.random() * height * 0.4;
      const x = Math.random() * width;
      const y = Math.random() * (height - h);
      out.push({ x, y, width: 12, height: h });
    }
  }
  return out;
}
let globalOrbId = 1;
function generateOrbs(width: number, height: number, walls: Wall[], level: number): Orb[] {
  const count = MIN_ORBS + level;
  const out: Orb[] = [];
  let attempts = 0;
  const topOffset = TOP_INFOBAR_HEIGHT;
  while (out.length < count && attempts < count * 10) {
    attempts++;
    const x = ORB_RADIUS + Math.random() * (width - 2 * ORB_RADIUS);
    const y = ORB_RADIUS + topOffset + Math.random() * (height - 2 * ORB_RADIUS - topOffset);
    const safe = !walls.some(w =>
      x > w.x - ORB_RADIUS && x < w.x + w.width + ORB_RADIUS &&
      y > w.y - ORB_RADIUS && y < w.y + w.height + ORB_RADIUS
    );
    if (safe) out.push({
      id: globalOrbId++,
      x, y, radius: ORB_RADIUS, collected: false,
      fade: new Animated.Value(1),
      scale: new Animated.Value(1)
    });
  }
  return out;
}

// --- Memoized Orbs Drawing ---
const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const MemoOrbs = React.memo(
  function MemoOrbs({ orbs, color }: { orbs: Orb[], color: string }) {
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
              style={getOrbAnimStyle(o)}
            />
            <AnimatedCircle
              cx={o.x}
              cy={o.y}
              r={o.radius + 2}
              fill={color}
              fillOpacity={0.45}
              style={getOrbAnimStyle(o)}
            />
            <AnimatedCircle
              cx={o.x}
              cy={o.y}
              r={o.radius}
              fill="#fff"
              fillOpacity={0.82}
              style={{
                opacity: o.fade as any,
                ...getOrbAnimStyle(o).transform && { transform: getOrbAnimStyle(o).transform }
              }}
            />
          </React.Fragment>
        ))}
      </>
    );
  },
  (prev, next) => prev.color === next.color && prev.orbs === next.orbs
);

export function AnimatedOrbBlastTitle() {
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
              styles.title, // Use your global .title but override below
              {
                fontSize: 64, // MAKE IT BIG!
                color: COLORS[i % COLORS.length],
                transform: [{ translateY: y }],
                marginLeft: 0, // Remove extra margin/spacing if any
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

function getOrbAnimStyle(o: Orb) {
  return {
    transform: [
      { translateX: o.x },
      { translateY: o.y },
      { scale: Animated.multiply(
          o.scale ?? 1,
          (o.fade as Animated.Value).interpolate({
            inputRange: [0, 1],
            outputRange: [0.1, 1]
          })
        )
      },
      { translateX: -o.x },
      { translateY: -o.y },
    ]
  };
}

// ---- Main App ----
export default function App() {
  const { width, height } = Dimensions.get('window');
  const [screen, setScreen] = useState<Screen>('menu');
  const [level, setLevel] = useState(1);
  const [tapsUsed, setTapsUsed] = useState(0);
  const [score, setScore] = useState(0);

  const [walls, setWalls] = useState<Wall[]>(() => generateWalls(width, height, 1));
  const [orbs, setOrbs] = useState<Orb[]>(() => generateOrbs(width, height, walls, 1));
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const [bursts, setBursts] = useState<Burst[]>([]);
  const [wallSparks, setWallSparks] = useState<Burst[]>([]);
  const [color, setColor] = useState(COLORS[0]);
  const [highScores, setHighScores] = useState<HighScoreEntry[]>([]);
  const [canContinue, setCanContinue] = useState(false);
  const [muteOrbSound, setMuteOrbSound] = useState(false);
  const [muteMenuMusic, setMuteMenuMusic] = useState(false);
  const [loading, setLoading] = useState(false);
  const [nextLevel, setNextLevel] = useState(2);
  const [levelUpPending, setLevelUpPending] = useState(false);

  const loadingAnim = useRef(new Animated.Value(1)).current;
  const barAnim = useRef(new Animated.Value(0)).current;
  const gameOverAnim = useRef(new Animated.Value(0)).current;

  // --- Audio ---
  const orbSoundRef = useRef<Audio.Sound | null>(null);
  const wallSoundRef = useRef<Audio.Sound | null>(null);
  const wallButtonSoundPlaying = useRef(false);

  // --- Menu Music: Fade In/Out ---
  const menuMusicRef = useRef<Audio.Sound | null>(null);

  useEffect(() => {
  let isMounted = true;
  let fadeInterval: any = null;

  async function playMenuMusic() {
    if (muteMenuMusic) return;
    if (menuMusicRef.current) {
      let target = 1;
      let vol = 0.25;
      try { vol = await menuMusicRef.current.getStatusAsync().then(s => s.volume ?? 0.25); } catch {}
      clearInterval(fadeInterval);
      fadeInterval = setInterval(async () => {
        vol += 0.06;
        if (menuMusicRef.current && vol <= target) {
          await menuMusicRef.current.setVolumeAsync(Math.min(vol, target));
        }
        if (vol >= target) clearInterval(fadeInterval);
      }, 60);
      return;
    }
    const sound = new Audio.Sound();
    try {
      await sound.loadAsync(require('./assets/sounds/menu-music.mp3'));
      await sound.setIsLoopingAsync(true);
      await sound.setVolumeAsync(0); // Start silent
      await sound.playAsync();
      if (isMounted) {
        menuMusicRef.current = sound;
        let vol = 0;
        fadeInterval = setInterval(async () => {
          vol += 0.06;
          if (menuMusicRef.current && vol <= 1) {
            await menuMusicRef.current.setVolumeAsync(Math.min(vol, 1));
          }
          if (vol >= 1) clearInterval(fadeInterval);
        }, 60);
      }
    } catch (e) {}
  }

  async function fadeMenuMusicToLow() {
    if (menuMusicRef.current) {
      let target = 0.25;
      let vol = 1;
      try { vol = await menuMusicRef.current.getStatusAsync().then(s => s.volume ?? 1); } catch {}
      clearInterval(fadeInterval);
      fadeInterval = setInterval(async () => {
        vol -= 0.06;
        if (menuMusicRef.current && vol >= target) {
          await menuMusicRef.current.setVolumeAsync(Math.max(vol, target));
        }
        if (vol <= target) clearInterval(fadeInterval);
      }, 50);
    }
  }

  async function muteMusicNow() {
    if (menuMusicRef.current) {
      await menuMusicRef.current.setVolumeAsync(0);
    }
  }

  if (muteMenuMusic) {
    muteMusicNow();
    return;
  }

  if (screen === "menu") {
    playMenuMusic();
  } else {
    fadeMenuMusicToLow();
  }

  return () => {
    isMounted = false;
    clearInterval(fadeInterval);
  };
}, [screen, muteMenuMusic]);



  const playOrbSound = useCallback(async () => {
  if (muteOrbSound) return;
  try {
    const sound = new Audio.Sound();
    await sound.loadAsync(require('./assets/sounds/orb.mp3'));
    await sound.setVolumeAsync(0.7 + Math.random() * 0.2);
    await sound.setRateAsync(0.95 + Math.random() * 0.10, false);
    await sound.playAsync();
    sound.setOnPlaybackStatusUpdate((status) => {
      if (status.isLoaded && status.didJustFinish) {
        sound.unloadAsync();
      }
    });
  } catch (e) {}
}, [muteOrbSound]);

const playWallSound = useCallback(async () => {
  if (muteOrbSound) return;
  if (wallButtonSoundPlaying.current) return;
  wallButtonSoundPlaying.current = true;
  try {
    if (wallSoundRef.current) {
      await wallSoundRef.current.setPositionAsync(0);
      await wallSoundRef.current.playAsync();
      wallSoundRef.current.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          wallButtonSoundPlaying.current = false;
        }
      });
    }
  } catch (e) {
    wallButtonSoundPlaying.current = false;
  }
}, [muteOrbSound]);


  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const orb = new Audio.Sound();
        const wall = new Audio.Sound();
        await orb.loadAsync(require('./assets/sounds/orb.mp3'));
        await wall.loadAsync(require('./assets/sounds/wall.mp3'));
        if (isMounted) {
          orbSoundRef.current = orb;
          wallSoundRef.current = wall;
        }
      } catch (e) { }
    })();
    return () => {
      isMounted = false;
      orbSoundRef.current?.unloadAsync();
      wallSoundRef.current?.unloadAsync();
    };
  }, []);



  // --- Animate Game Over screen ---
  useEffect(() => {
    if (screen === 'gameover') {
      Animated.timing(gameOverAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
        easing: Easing.out(Easing.exp),
      }).start();
    } else {
      gameOverAnim.setValue(0);
    }
  }, [screen]);

  // --- Stable Refs for Mutable State ---
  const orbsRef = useRef<Orb[]>(orbs);
  useEffect(() => { orbsRef.current = orbs; }, [orbs]);
  const ripplesRef = useRef<Ripple[]>(ripples);
  useEffect(() => { ripplesRef.current = ripples; }, [ripples]);
  const wallsRef = useRef<Wall[]>(walls);
  useEffect(() => { wallsRef.current = walls; }, [walls]);

  useEffect(() => {
    (async () => {
      const scores = await getHighScores();
      setHighScores(scores);
    })();
  }, []);
  useEffect(() => {
    if (screen === 'scores') {
      (async () => {
        const scores = await getHighScores();
        setHighScores(scores);
      })();
    }
  }, [screen]);

  // --- Main Game Loop: Animate ripples ---
  useEffect(() => {
    let frame: number;
    const animate = () => {
      setRipples(prevRipples => {
        let changed = false;
        const nextRipples: Ripple[] = [];
        const newSparks: Burst[] = [];
        let wallHitThisFrame = false;
        for (const ripple of ripplesRef.current) {
          const targetSegments = getSegmentsForRadius(ripple.radius, ripple.segments);
          let updatedLimits = ripple.limits;
          if (targetSegments > ripple.segments) {
            updatedLimits = generateLimits(ripple.x, ripple.y, targetSegments, width, height, wallsRef.current);
            changed = true;
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
            nextRipples.push({ ...ripple, radius: newRadius, segments: targetSegments, limits: updatedLimits });
          }
        }
        setWallSparks(ws =>
          ws
            .map(w => ({ ...w, radius: w.radius + 3, opacity: w.opacity - 0.08 }))
            .filter(w => w.opacity > 0)
            .concat(newSparks)
            .slice(-50)
        );
        setOrbs(obs => {
          let didUpdate = false;
          const newOrbs = obs.map((o) => {
            if (o.collected) return o;
            let hit = false;
            for (let k = 0; k < ripplesRef.current.length; k++) {
              const r = ripplesRef.current[k];
              const angle = Math.atan2(o.y - r.y, o.x - r.x);
              const dist = Math.hypot(o.x - r.x, o.y - r.y);
              const segIdx = Math.floor(((angle + 2 * Math.PI) % (2 * Math.PI)) / (2 * Math.PI) * r.segments);
              if (dist <= r.radius && dist <= r.limits[segIdx]) hit = true;
            }
            if (hit) {
              didUpdate = true;
              playOrbSound();
              setScore(s => s + 1);
              setBursts(bs =>
                [...bs, { x: o.x, y: o.y, radius: 0, opacity: 1 }].slice(-40)
              );
              Animated.timing(o.fade!, {
                toValue: 0,
                duration: 320,
                useNativeDriver: true
              }).start();
              o.collected = true;
              return o;
            }
            return o;
          });
          return didUpdate ? newOrbs : obs;
        });
        setBursts(bs =>
          bs
            .map(b => ({ ...b, radius: b.radius + 4, opacity: b.opacity - 0.07 }))
            .filter(b => b.opacity > 0)
            .slice(-40)
        );
        return nextRipples;
      });
      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [width, height, JSON.stringify(walls)]);

  // --- Last orb pulse effect ---
  const lastOrbIdRef = useRef<number | null>(null);
  const lastOrbPulseAnimRef = useRef<Animated.CompositeAnimation | null>(null);
  useEffect(() => {
    const uncollectedOrbs = orbs.filter(o => !o.collected);
    if (uncollectedOrbs.length === 1) {
      const lastOrb = uncollectedOrbs[0];
      if (lastOrbIdRef.current !== lastOrb.id) {
        lastOrbPulseAnimRef.current?.stop();
        lastOrb.scale?.setValue?.(1);
        lastOrbPulseAnimRef.current = Animated.loop(
          Animated.sequence([
            Animated.timing(lastOrb.scale!, {
              toValue: 2.0,
              duration: 250,
              useNativeDriver: true,
              easing: Easing.linear,
            }),
            Animated.timing(lastOrb.scale!, {
              toValue: 1.0,
              duration: 250,
              useNativeDriver: true,
              easing: Easing.linear,
            }),
          ])
        );
        lastOrbPulseAnimRef.current.start();
        lastOrbIdRef.current = lastOrb.id;
      }
      orbs.forEach((o) => {
        if (o.id !== lastOrb.id) {
          o.scale?.stopAnimation?.();
          o.scale?.setValue?.(1);
        }
      });
    } else {
      lastOrbPulseAnimRef.current?.stop();
      lastOrbPulseAnimRef.current = null;
      lastOrbIdRef.current = null;
      orbs.forEach(o => {
        o.scale?.stopAnimation?.();
        o.scale?.setValue?.(1);
      });
    }
    return () => {
      lastOrbPulseAnimRef.current?.stop();
      lastOrbPulseAnimRef.current = null;
      lastOrbIdRef.current = null;
    };
  }, [orbs]);

  useEffect(() => {
    if (
      !levelUpPending &&
      orbs.length > 0 &&
      orbs.every(o => o.collected)
    ) {
      setLevelUpPending(true);
      setMuteOrbSound(true);
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
            easing: Easing.out(Easing.exp),
            useNativeDriver: false,
          }).start(() => {
            setRipples([]);
            setBursts([]);
            setWallSparks([]);
            setTimeout(() => {
              const next = level + 1;
              const newWalls = generateWalls(width, height, next);
              setLevel(next);
              setWalls(newWalls);
              setOrbs(generateOrbs(width, height, newWalls, next));
              setTapsUsed(0);
              setColor(COLORS[Math.floor(Math.random() * COLORS.length)]);
              setMuteOrbSound(false);
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

  useEffect(() => {
    let timeout: NodeJS.Timeout;
    if (tapsUsed >= MAX_TAPS) {
      timeout = setTimeout(async () => {
        const orbsAtTimeout = orbsRef.current;
        if (orbsAtTimeout.some(o => !o.collected)) {
          setCanContinue(false);
          const scores = await saveHighScore(score, level);
          setHighScores(scores);
          setScreen('gameover');
        }
      }, 9000);
    }
    return () => { if (timeout) clearTimeout(timeout); };
  }, [tapsUsed]);

  const handlePress = useCallback(({ nativeEvent }: any) => {
    if (screen !== 'game' || tapsUsed >= MAX_TAPS || loading) return;
    setTapsUsed(u => u + 1);
    const { locationX: x, locationY: y } = nativeEvent;
    const initSegments = SEGMENT_THRESHOLDS[0].segments;
    const limits = generateLimits(x, y, initSegments, width, height, wallsRef.current);
    setRipples(r => [...r, { x, y, radius: 0, limits, segments: initSegments }]);
  }, [screen, tapsUsed, loading, width, height]);

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

  const GradientBG = useMemo(() => (
    <Svg style={StyleSheet.absoluteFill} width={width} height={height}>
      <Defs>
        <LinearGradient id="bgGradient" x1="0" y1="0" x2="0" y2={height}>
          <Stop offset="0" stopColor={BG_GRADIENT_START} />
          <Stop offset="1" stopColor={BG_GRADIENT_END} />
        </LinearGradient>
      </Defs>
      <Rect x="0" y="0" width={width} height={height} fill="url(#bgGradient)" />
    </Svg>
  ), [width, height]);

  // ---- SCREENS ----

  if (screen === 'menu') {
    return (
      <View style={styles.menuScreen}>
        {GradientBG}
        <AnimatedOrbBlastTitle />
        {canContinue && (
          <TouchableOpacity
            style={styles.button}
            onPress={() => {
  playWallSound();
  // Reset fade/scale of all uncollected orbs!
  setOrbs(currentOrbs => currentOrbs.map(o => {
    if (!o.collected) {
      o.fade?.setValue?.(1);
      o.scale?.setValue?.(1);
    }
    return o;
  }));
  setScreen('game');
}}

          >
            <Text style={styles.buttonText}>Continue</Text>
          </TouchableOpacity>
          
        )}
        <TouchableOpacity
          style={styles.button}
          onPress={() => {
            playWallSound();
            const w1 = generateWalls(width, height, 1);
            setCanContinue(false);
            setWalls(w1);
            setOrbs(generateOrbs(width, height, w1, 1));
            setLevel(1);
            setScore(0);
            setTapsUsed(0);
            setRipples([]);
            setBursts([]);
            setWallSparks([]);
            setColor(COLORS[Math.floor(Math.random() * COLORS.length)]);
            setLevelUpPending(false);
            setScreen('game');
          }}
        >
          <Text style={styles.buttonText}>New Game</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.button}
          onPress={async () => {
            playWallSound();
            const scores = await getHighScores();
            setHighScores(scores);
            setScreen('scores');
          }}
        >
          <Text style={styles.buttonText}>High Scores</Text>
          
        </TouchableOpacity>
        <TouchableOpacity onPress={() => Linking.openURL('http://dig.ccmixter.org/files/Kirkoid/68981')}>
  <Text style={[styles.credits, { textDecorationLine: 'underline', color: '#7bffde' }]}>
    ♫ "Slow Down" by Kirkoid
  </Text>
</TouchableOpacity>


        {/* Tip button (bottom left) */}
        <View style={{
  position: 'absolute',
  left: 18,
  bottom: 36,
  flexDirection: 'row',
  zIndex: 10,
  alignItems: 'center'
}}>
  {/* Coffee Tip Button */}
  <TouchableOpacity
    style={{
      backgroundColor: "#23243acc",
      borderRadius: 16,
      paddingHorizontal: 16,
      paddingVertical: 9,
      alignItems: 'center',
      marginRight: 16
    }}
    onPress={() => Linking.openURL('https://venmo.com/u/connorcarmichael')}
  >
    <Text style={{ color: '#7bffde', fontSize: 17, fontWeight: 'bold' }}>
      ☕ Coffee Tip
    </Text>
  </TouchableOpacity>
  {/* Music Mute */}
  <TouchableOpacity
    style={{
      backgroundColor: muteMenuMusic ? "#555a" : "#22284cbb",
      borderRadius: 16,
      paddingHorizontal: 15,
      paddingVertical: 9,
      alignItems: 'center',
      marginRight: 10
    }}
    onPress={() => setMuteMenuMusic(m => !m)}
  >
    <Text style={{ color: '#fff', fontSize: 17 }}>
      {muteMenuMusic ? "Unmute Music" : "Mute Music"}
    </Text>
  </TouchableOpacity>
  {/* Effects Mute */}
  
</View>

      </View>
    );
  }

  if (screen === 'scores') {
    return (
      <SafeAreaView style={styles.container}>
        {GradientBG}
        <View style={styles.topRow}>
          <TouchableOpacity onPress={() => {
            playWallSound();
            setScreen('menu');
          }}>
            <Text style={styles.menuText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.scoreText}>High Scores</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.scoresList}>
          {highScores.length === 0 ? (
            <Text style={styles.text}>No high scores yet</Text>
          ) : (
            highScores.map((entry, i) => (
              <Text key={i} style={[styles.text, { fontWeight: i === 0 ? 'bold' : 'normal', fontSize: i === 0 ? 28 : 18 }]}>
                {i + 1}. {entry.score} pts &nbsp;–&nbsp; Level {entry.level}
              </Text>
            ))
          )}
        </View>
        <TouchableOpacity
          style={styles.button}
          onPress={async () => {
            playWallSound();
            await clearHighScores();
            const scores = await getHighScores();
            setHighScores(scores);
          }}
        >
          <Text style={styles.buttonText}>Clear High Scores</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  if (screen === 'gameover') {
    return (
      <View style={styles.gameOverScreen}>
        {GradientBG}
        <Animated.View
          style={{
            alignItems: 'center',
            opacity: gameOverAnim,
            transform: [{
              scale: gameOverAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0.92, 1]
              })
            }]
          }}>
          <Text style={styles.gameOverTitle}>Game Over</Text>
          <Text style={styles.gameOverText}>Score: {score}   |   Level: {level}</Text>
          <View style={styles.gameOverButtons}>
            <TouchableOpacity
              style={styles.button}
              onPress={() => {
                playWallSound();
                setScreen('menu');
              }}
            >
              <Text style={styles.buttonText}>Main Menu</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.button}
              onPress={() => {
                playWallSound();
                const w1 = generateWalls(width, height, 1);
                setCanContinue(false);
                setWalls(w1);
                setOrbs(generateOrbs(width, height, w1, 1));
                setLevel(1);
                setScore(0);
                setTapsUsed(0);
                setRipples([]);
                setBursts([]);
                setWallSparks([]);
                setColor(COLORS[Math.floor(Math.random() * COLORS.length)]);
                setLevelUpPending(false);
                setScreen('game');
              }}
            >
              <Text style={styles.buttonText}>Restart</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="black" />
      {GradientBG}
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.topRowPanel}>
          <View style={styles.panelBlur}>
            <Text style={styles.scoreText}>Lvl {level}  |  Score {score}  |  Taps {MAX_TAPS - tapsUsed}</Text>
          </View>
          <TouchableOpacity style={styles.menuButton} onPress={() => {
            playWallSound();
            setCanContinue(true);
            setScreen('menu');
          }}>
            <Text style={styles.menuText}>≡</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
      <TouchableWithoutFeedback onPress={handlePress}>
        <View style={StyleSheet.absoluteFill}>
          <Svg width={width} height={height}>
            <MemoOrbs orbs={orbs} color={color} />
            {bursts.map((b, i) => (
              <Circle key={i} cx={b.x} cy={b.y} r={b.radius} fill={color} fillOpacity={b.opacity * 0.5} />
            ))}
            {ripples.map((r, idx) => (
              <Path
                key={idx}
                d={buildPath(r)}
                stroke={RIPPLE_COLOR}
                strokeWidth={4}
                strokeOpacity={0.33}
                fill="none"
              />
            ))}
            {wallSparks.map((s, i) => (
              <Circle key={i} cx={s.x} cy={s.y} r={s.radius} stroke="#fff" strokeWidth={.6} strokeOpacity={s.opacity * 0.5} fill="none" />
            ))}
            {walls.map((w, i) => (
              <React.Fragment key={i}>
                <Rect
                  x={w.x - 6}
                  y={w.y - 6}
                  width={w.width + 16}
                  height={w.height + 16}
                  rx={20}
                  fill={WALL_GLOW_COLOR}
                  fillOpacity={0.01}
                />
                <Rect
                  x={w.x - 2}
                  y={w.y - 2}
                  width={w.width + 4}
                  height={w.height + 4}
                  rx={14}
                  fill={WALL_GLOW_COLOR}
                  fillOpacity={0.23}
                />
                <Rect
                  x={w.x}
                  y={w.y}
                  width={w.width}
                  height={w.height}
                  rx={7}
                  fill={WALL_COLOR}
                  fillOpacity={0.93}
                />
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
}

// ---- Styles ----
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG_GRADIENT_END },
  safeArea: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 1 },
  topRowPanel: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 10, marginTop: 8
  },
  panelBlur: {
    paddingHorizontal: 20,
    paddingVertical: 7,
    backgroundColor: '#22284cbb',
    borderRadius: 16,
    marginRight: 10
  },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 10 },
  menuButton: { padding: 7, marginLeft: 3, borderRadius: 8 },
  menuText: { color: '#fff', fontSize: 32, opacity: 0.7 },
  scoreText: { color: '#fff', fontSize: 18, fontWeight: '600', letterSpacing: 1, fontFamily: 'System' },
  title: {
    fontSize: 46, color: '#fff', letterSpacing: 4, fontWeight: '800',
    textShadowColor: '#7bffde99', textShadowRadius: 24, marginBottom: 30, fontFamily: 'System'
  },
  menuScreen: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: BG_GRADIENT_END },
  button: {
    backgroundColor: '#22284cbb',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 22,
    marginVertical: 8,
    shadowColor: '#fff',
    shadowOpacity: 0.13,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 9,
  },
  buttonText: {
    color: '#fff', fontSize: 22, letterSpacing: 2, fontWeight: 'bold', fontFamily: 'System'
  },
  credits: { color: '#fff', opacity: 0.2, marginTop: 38, fontSize: 15, fontFamily: 'System' },
  scoresList: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  text: { color: '#fff', fontSize: 18, fontFamily: 'System' },
  gameOverScreen: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'transparent' },
  gameOverTitle: {
    color: '#fff', fontSize: 46, fontWeight: 'bold', marginBottom: 14, letterSpacing: 2, fontFamily: 'System',
    textShadowColor: '#7bffde', textShadowRadius: 25,
  },
  gameOverText: { color: '#fff', fontSize: 22, marginBottom: 28, fontWeight: '600', fontFamily: 'System' },
  gameOverButtons: { flexDirection: 'row', justifyContent: 'space-around', width: '80%' },
  muteBtnWrapper: {
    position: 'absolute',
    right: 22,
    bottom: 36,
    zIndex: 10,
  },
  muteButton: {
    borderRadius: 18,
    paddingHorizontal: 22,
    paddingVertical: 10,
    alignItems: 'center',
    shadowColor: '#222',
    shadowOpacity: 0.13,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 7,
  },
  // Loading Bar Styles
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(20,22,38,0.99)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  loadingText: {
    color: '#7bffde',
    fontSize: 22,
    letterSpacing: 2,
    marginBottom: 32,
    fontWeight: '700',
    fontFamily: 'System'
  },
  barContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 28,
  },
  barBg: {
    width: 240,
    height: 14,
    backgroundColor: '#23243a',
    borderRadius: 12,
    overflow: 'hidden',
    borderColor: '#7bffde',
    borderWidth: 1.2,
    shadowColor: '#7bffde99',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.13,
    shadowRadius: 7,
  },
  barFill: {
    height: 14,
    backgroundColor: '#7bffde',
    borderRadius: 12,
  },
});
