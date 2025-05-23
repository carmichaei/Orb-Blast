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
  Easing,
  Share,
  Image,
} from 'react-native';
import Svg, { Path, Rect, Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Audio } from 'expo-av';
import * as Linking from 'expo-linking';

// --- Constants & Types ---
import {
  WALL_COLORS, ORB_COLORS, RIPPLE_COLORS,
  BG_GRADIENT_START, BG_GRADIENT_END,
  ORB_SKINS, SEGMENT_THRESHOLDS, MAX_TAPS
} from './src/constants';

import {
  Orb,
  Ripple,
  WallSpark,
  Burst,
} from './src/types';

import {
  getSegmentsForRadius,
  generateLimits,
  getEquippedSkin,
  setEquippedSkin,
  getPlayerPoints,
  storePlayerPoints,
  unlockSkin,
  getUnlockedSkins,
  saveHighScore,
  getHighScores,
  generateWalls,
  generateOrbs,
} from './src/utils/game';

import AnimatedOrbBlastTitle from './src/components/AnimatedOrbBlastTitle';
import MemoOrbs from './src/components/MemoOrbs';
import InlineColorPickerPanel from './src/components/InlineColorPickerPanel';
import { styles } from './src/styles';

export default function App() {
  const { width, height } = Dimensions.get('window');
  const [screen, setScreen] = useState('menu');
  const [level, setLevel] = useState(1);
  const [tapsUsed, setTapsUsed] = useState(0);
  const [score, setScore] = useState(0);

  const [walls, setWalls] = useState(() => generateWalls(width, height, 1));
  const [orbs, setOrbs] = useState(() => generateOrbs(width, height, walls, 1));
  const [ripples, setRipples] = useState([]);
  const [bursts, setBursts] = useState([]);
  const [wallSparks, setWallSparks] = useState([]);
  const [highScores, setHighScores] = useState([]);
  const [canContinue, setCanContinue] = useState(false);
  const [muteOrbSound, setMuteOrbSound] = useState(false);
  const [muteMenuMusic, setMuteMenuMusic] = useState(false);
  const [loading, setLoading] = useState(false);
  const [nextLevel, setNextLevel] = useState(2);
  const [levelUpPending, setLevelUpPending] = useState(false);

  const loadingAnim = useRef(new Animated.Value(1)).current;
  const barAnim = useRef(new Animated.Value(0)).current;
  const gameOverAnim = useRef(new Animated.Value(0)).current;

  const [selectedWallColor, setSelectedWallColor] = useState(WALL_COLORS[0]);
  const [selectedOrbColor, setSelectedOrbColor] = useState(ORB_COLORS[0]);
  const [selectedRippleColor, setSelectedRippleColor] = useState(RIPPLE_COLORS[0]);
  const [colorPanelOpen, setColorPanelOpen] = useState(false);

  // --- Audio ---
  const orbSoundRef = useRef<Audio.Sound | null>(null);
  const wallSoundRef = useRef<Audio.Sound | null>(null);
  const wallButtonSoundPlaying = useRef(false);
  const menuMusicRef = useRef<Audio.Sound | null>(null);
  const winSoundRef = useRef<Audio.Sound | null>(null);
  const loseSoundRef = useRef<Audio.Sound | null>(null);
  
  // points and pngs
  const [playerPoints, setPlayerPoints] = useState(0);
  const [unlockedSkins, setUnlockedSkins] = useState([]);
  const [equippedSkin, setEquippedSkinState] = useState('default');

  // --- Win/Lose Sounds (FIXED: define here and use below)
  const playWinSound = useCallback(async () => {
    try {
      if (winSoundRef.current) {
        await winSoundRef.current.setPositionAsync(0);
        await winSoundRef.current.playAsync();
      }
    } catch (e) {}
  }, []);
  const playLoseSound = useCallback(async () => {
    try {
      if (loseSoundRef.current) {
        await loseSoundRef.current.setPositionAsync(0);
        await loseSoundRef.current.playAsync();
      }
    } catch (e) {}
  }, []);

useEffect(() => {
  if (screen === 'shop') {
    (async () => {
      setUnlockedSkins(await getUnlockedSkins());
      setPlayerPoints(await getPlayerPoints());
      setEquippedSkinState(await getEquippedSkin());
    })();
  }
}, [screen]);

  //Tutorial shown
  useEffect(() => {
  (async () => {
    const tutorialShown = await AsyncStorage.getItem('TUTORIAL_SHOWN');
    if (!tutorialShown) {
      setScreen('tutorial');
    }
  })();
}, []);

  // points logic
  useEffect(() => {
  (async () => {
    const pts = await getPlayerPoints();
    setPlayerPoints(pts);
  })();
}, [screen]); // refreshes whenever screen changes
  
  // --- Menu Music: Fade In/Out ---
  useEffect(() => {
  let isMounted = true;
  let fadeInterval: ReturnType<typeof setInterval> | null = null;

  async function playMenuMusic() {
    if (muteMenuMusic) return;
    if (menuMusicRef.current) {
      let target = 1;
      let vol = 0.25;
      try {
        const status = await menuMusicRef.current.getStatusAsync();
        vol = status.volume ?? 0.25;
      } catch {}
      if (fadeInterval) clearInterval(fadeInterval);
      fadeInterval = setInterval(async () => {
        vol += 0.06;
        if (menuMusicRef.current && vol <= target) {
          await menuMusicRef.current.setVolumeAsync(Math.min(vol, target));
        }
        if (vol >= target && fadeInterval) {
          clearInterval(fadeInterval);
        }
      }, 60);
      return;
    }
    const sound = new Audio.Sound();
    try {
      await sound.loadAsync(require('./assets/sounds/menu-music.mp3'));
      await sound.setIsLoopingAsync(true);
      await sound.setVolumeAsync(0);
      await sound.playAsync();
      if (isMounted) {
        menuMusicRef.current = sound;
        let vol = 0;
        if (fadeInterval) clearInterval(fadeInterval);
        fadeInterval = setInterval(async () => {
          vol += 0.06;
          if (menuMusicRef.current && vol <= 1) {
            await menuMusicRef.current.setVolumeAsync(Math.min(vol, 1));
          }
          if (vol >= 1 && fadeInterval) {
            clearInterval(fadeInterval);
          }
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
        const win = new Audio.Sound();
        const lose = new Audio.Sound();
        await orb.loadAsync(require('./assets/sounds/orb.mp3'));
        await wall.loadAsync(require('./assets/sounds/wall.mp3'));
        await win.loadAsync(require('./assets/sounds/win.mp3'));
        await lose.loadAsync(require('./assets/sounds/lose.mp3'));
        if (isMounted) {
          orbSoundRef.current = orb;
          wallSoundRef.current = wall;
          winSoundRef.current = win;
          loseSoundRef.current = lose;
        }
      } catch (e) { }
    })();
    return () => {
      isMounted = false;
      orbSoundRef.current?.unloadAsync();
      wallSoundRef.current?.unloadAsync();
      winSoundRef.current?.unloadAsync();
      loseSoundRef.current?.unloadAsync();
    };
  }, []);

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

  useEffect(() => {
  (async () => {
    setEquippedSkinState(await getEquippedSkin());
    setUnlockedSkins(await getUnlockedSkins());
    setPlayerPoints(await getPlayerPoints());
  })();
}, []); // runs only on first mount

  useEffect(() => {
  if (screen === 'gameover') {
    (async () => {
      // 1. Save high score
      const scores = await saveHighScore(score, level);
      setHighScores(scores);

      // 2. Add score to player's points (storage and state!)
      const currentPts = await getPlayerPoints();
      const newPts = currentPts + score;
      await storePlayerPoints(newPts);   // store in AsyncStorage
      setPlayerPoints(newPts);           // update React state
    })();
  }
}, [screen]);

  // --- Stable Refs for Mutable State ---
  const orbsRef = useRef(orbs);
  useEffect(() => { orbsRef.current = orbs; }, [orbs]);
  const ripplesRef = useRef(ripples);
  useEffect(() => { ripplesRef.current = ripples; }, [ripples]);
  const wallsRef = useRef(walls);
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
    setRipples((prevRipples: Ripple[]) => {
      let changed = false;
      const nextRipples: Ripple[] = [];
      const newSparks: WallSpark[] = [];
      let wallHitThisFrame = false;
      // Type assertion for ripplesRef (optional but safe)
      for (const ripple of ripplesRef.current as Ripple[]) {
        const targetSegments = getSegmentsForRadius(ripple.radius, ripple.segments);
        let updatedLimits = ripple.limits;
        if (targetSegments > ripple.segments) {
          updatedLimits = generateLimits(
            ripple.x,
            ripple.y,
            targetSegments,
            width,
            height,
            wallsRef.current
          );
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
        const newOrbs = obs.map((o) => {
          if (o.collected) return o;
          let hit = false;
          for (let k = 0; k < (ripplesRef.current as Ripple[]).length; k++) {
            const r = (ripplesRef.current as Ripple[])[k];
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
            Animated.timing(o.fade, {
              toValue: 0,
              duration: 320,
              useNativeDriver: true,
            }).start();
            o.collected = true;
            return o;
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
}, [width, height, JSON.stringify(walls)]);

  // --- Last orb pulse effect ---
  const lastOrbIdRef = useRef(null);
  const lastOrbPulseAnimRef = useRef(null);
  useEffect(() => {
    const uncollectedOrbs = orbs.filter(o => !o.collected);
    if (uncollectedOrbs.length === 1) {
      const lastOrb = uncollectedOrbs[0];
      if (lastOrbIdRef.current !== lastOrb.id) {
        lastOrbPulseAnimRef.current?.stop();
        lastOrb.scale?.setValue?.(1);
        lastOrbPulseAnimRef.current = Animated.loop(
          Animated.sequence([
            Animated.timing(lastOrb.scale, {
              toValue: 2.0,
              duration: 250,
              useNativeDriver: true,
              easing: Easing.linear,
            }),
            Animated.timing(lastOrb.scale, {
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
      playWinSound(); // ---- PLACED CORRECTLY
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
  let timeout: number;
  if (tapsUsed >= MAX_TAPS) {
    timeout = setTimeout(() => {
      const orbsAtTimeout = orbsRef.current;
      if (orbsAtTimeout.some(o => !o.collected)) {
        setCanContinue(false);
        playLoseSound();
        setScreen('gameover');
      }
    }, 7000);
  }
  return () => { if (timeout) clearTimeout(timeout); };
}, [tapsUsed]);


  const handleShare = async () => {
  try {
    await Share.share({
      message: `I just scored ${score} points on level ${level} in Orb Blast! Can you beat me?`,
      // If you have a website, add the URL property:
      // url: 'https://yourgame.com'
    });
  } catch (error) {
    // Optionally handle errors (user cancellation is not an error)
    // alert('Share failed');
  }
};

  const handlePress = useCallback(({ nativeEvent }) => {
    if (screen !== 'game' || tapsUsed >= MAX_TAPS || loading || colorPanelOpen) return;
    setTapsUsed(u => u + 1);
    const { locationX: x, locationY: y } = nativeEvent;
    const initSegments = SEGMENT_THRESHOLDS[0].segments;
    const limits = generateLimits(x, y, initSegments, width, height, wallsRef.current);
    setRipples(r => [...r, { x, y, radius: 0, limits, segments: initSegments }]);
  }, [screen, tapsUsed, loading, width, height, colorPanelOpen]);

  const buildPath = useCallback((r) => {
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

  const finishTutorial = async () => {
  await AsyncStorage.setItem('TUTORIAL_SHOWN', 'yes');
  setScreen('menu');
};

  // tutorial screen
  if (screen === 'tutorial') {
  return (
    <View style={styles.tutorialScreen}>
      <Text style={styles.tutorialTitle}>Welcome to Orb Blast!</Text>
      <Text style={styles.tutorialText}>
        - Tap anywhere to launch a blast{'\n'}
        - The blast collects orbs, but stops at walls{'\n'}
        - You only get 3 taps per level{'\n'}
        - Collect all orbs to win!
      </Text>
      <TouchableOpacity style={styles.button} onPress={finishTutorial}>
        <Text style={styles.buttonText}>Got it!</Text>
      </TouchableOpacity>
    </View>
  );
}

// ---- GAME SCREEN ----
if (screen === 'game') {
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="black" />
      {GradientBG}
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.topRowPanel}>
          <View style={styles.panelBlur}>
            <Text style={styles.scoreText}>Lvl {level}  |  Score {score}  |  Taps {MAX_TAPS - tapsUsed}</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            {/* Palette Button for Color Picker */}
            <TouchableOpacity
              style={{
                padding: 7, marginRight: 5, borderRadius: 8,
                backgroundColor: '#2b2d43cc'
              }}
              onPress={() => setColorPanelOpen((b) => !b)}
            >
              <Text style={{ color: '#7bffde', fontSize: 23, fontWeight: 'bold' }}>🎨</Text>
            </TouchableOpacity>
            {/* Menu Button */}
            <TouchableOpacity style={styles.menuButton} onPress={() => {
              playWallSound();
              setCanContinue(true);
              setScreen('menu');
            }}>
              <Text style={styles.menuText}>≡</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
      {/* Inline floating color picker panel */}
      <InlineColorPickerPanel
        visible={colorPanelOpen}
        onClose={() => setColorPanelOpen(false)}
        selectedWallColor={selectedWallColor}
        setSelectedWallColor={setSelectedWallColor}
        selectedOrbColor={selectedOrbColor}
        setSelectedOrbColor={setSelectedOrbColor}
        selectedRippleColor={selectedRippleColor}
        setSelectedRippleColor={setSelectedRippleColor}
      />
      <TouchableWithoutFeedback onPress={handlePress}>
        <View style={StyleSheet.absoluteFill}>
          {/* ---- SVG Game Canvas ---- */}
          <Svg width={width} height={height}>
            {/* Orbs - SVG (default skin) */}
            {equippedSkin === ORB_SKINS[0].key && (
              <MemoOrbs orbs={orbs} color={selectedOrbColor} />
            )}

            {/* Orbs - PNG images for other skins */}
            {equippedSkin !== ORB_SKINS[0].key && (
              orbs.map((o) => {
                if (o.collected) return null;
                const equippedSkinObj = ORB_SKINS.find(s => s.key === equippedSkin) || ORB_SKINS[0];
                let opacity = 1;
                try {
                  opacity = o.fade?.__getValue?.() ?? 1;
                } catch (e) {}
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
                    pointerEvents="none"
                  />
                );
              })
            )}

            {/* Bursts, ripples, sparks */}
            {bursts.map((b, i) => (
              <Circle key={i} cx={b.x} cy={b.y} r={b.radius} fill={selectedOrbColor} fillOpacity={b.opacity * 0.5} />
            ))}
            {ripples.map((r, idx) => (
              <Path
                key={idx}
                d={buildPath(r)}
                stroke={selectedRippleColor}
                strokeWidth={4}
                strokeOpacity={0.33}
                fill="none"
              />
            ))}
            {wallSparks.map((s, i) => (
              <Circle key={i} cx={s.x} cy={s.y} r={s.radius} stroke="#fff" strokeWidth={.6} strokeOpacity={s.opacity * 0.5} fill="none" />
            ))}
            {/* Static Walls: no animation, no pulse */}
            {walls.map((w, i) => (
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


  // ---- MENU SCREEN ----
  if (screen === 'menu') {
    return (
      <View style={styles.menuScreen}>
        {GradientBG}
        <AnimatedOrbBlastTitle />
        <Text style={{
  color: '#ffd36e',
  fontSize: 22,
  fontWeight: '700',
  marginBottom: 8,
  textAlign: 'center'
}}>
  Points: {playerPoints}
</Text>

        {canContinue && (
          <TouchableOpacity
            style={styles.button}
            onPress={() => {
              playWallSound();
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
        <TouchableOpacity
  style={styles.button}
  onPress={() => {
    playWallSound();
    setScreen('shop');
  }}
>
  <Text style={styles.buttonText}>Shop</Text>
</TouchableOpacity>

        <TouchableOpacity onPress={() => Linking.openURL('http://dig.ccmixter.org/files/Kirkoid/68981')}>
          <Text style={[styles.credits, { textDecorationLine: 'underline', color: '#7bffde' }]}>
            ♫ "Slow Down" by Kirkoid
          </Text>
        </TouchableOpacity>
        <View style={{
          position: 'absolute',
          left: 18,
          bottom: 36,
          flexDirection: 'row',
          zIndex: 10,
          alignItems: 'center'
        }}>
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
          <TouchableOpacity
            style={{
              backgroundColor: muteMenuMusic ? "#555a" : "#22284cbb",
              borderRadius: 16,
              paddingHorizontal: 15,
              paddingVertical: 9,
              alignItems: 'center',
              marginRight: 10,
              left: 145,
            }}
            onPress={() => setMuteMenuMusic(m => !m)}
          >
            <Text style={{ color: '#fff', fontSize: 17 }}>
              {muteMenuMusic ? "Unmute Music" : "Mute Music"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ---- SCORES SCREEN ----
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
      </SafeAreaView>
    );
  }

  // ---- SHOP SCREEN ----

if (screen === 'shop') {
  const handleBuy = async (skinKey, price) => {
  if (playerPoints < price) return;

  const newPoints = playerPoints - price;
  await storePlayerPoints(newPoints); // This saves the new value to AsyncStorage
  setPlayerPoints(newPoints);         // This updates your React state

  await unlockSkin(skinKey);
  setUnlockedSkins(await getUnlockedSkins());
  };
  const handleEquip = async (skinKey) => {
  await setEquippedSkin(skinKey);
  setEquippedSkinState(skinKey); // update local state for UI
  };


  return (
    <SafeAreaView style={styles.container}>
      {GradientBG}
      <Text style={{
        color: '#ffd36e', fontSize: 22, fontWeight: 'bold',
        textAlign: 'center', marginBottom: 10, marginTop: 8,
      }}>
        Points: {playerPoints}
      </Text>
      <View style={{
        flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'flex-start',
        marginTop: 10,
      }}>
        {ORB_SKINS.filter(skin => skin.key !== 'default').map(skin => {
  const owned = unlockedSkins.includes(skin.key);
  const isEquipped = equippedSkin === skin.key;
  return (
    <View key={skin.key} style={{
      width: 82, margin: 10, alignItems: 'center', opacity: owned ? 1 : 0.65,
    }}>
      <View style={{
        borderWidth: owned ? 2 : 0, borderColor: '#7bffde', borderRadius: 44,
        padding: 4, backgroundColor: '#20223b', marginBottom: 2,
      }}>
        <Image
          source={skin.file}
          style={{ width: 54, height: 54, borderRadius: 27 }}
          resizeMode="contain"
        />
      </View>
      <Text style={{ color: '#fff', fontSize: 18, fontWeight: '700', textAlign: 'center', marginBottom: 2 }}>
        {skin.price}
      </Text>
      {!owned && (
        <TouchableOpacity
          style={{
            backgroundColor: playerPoints >= skin.price ? '#7bffde' : '#444a',
            borderRadius: 14, paddingHorizontal: 14, paddingVertical: 6, marginTop: 2,
          }}
          disabled={playerPoints < skin.price}
          onPress={() => handleBuy(skin.key, skin.price)}
        >
          <Text style={{ color: '#000', fontWeight: 'bold', fontSize: 16 }}>Buy</Text>
        </TouchableOpacity>
      )}
      {owned && !isEquipped && (
        <TouchableOpacity
          style={{
            backgroundColor: '#7bffde',
            borderRadius: 14, paddingHorizontal: 14, paddingVertical: 6, marginTop: 2,
          }}
          onPress={() => handleEquip(skin.key)}
        >
          <Text style={{ color: '#000', fontWeight: 'bold', fontSize: 16 }}>Equip</Text>
        </TouchableOpacity>
      )}
      {owned && isEquipped && (
        <Text style={{ color: '#7bffde', fontSize: 13, marginTop: 4, fontWeight: 'bold' }}>Equipped</Text>
      )}
      {owned && isEquipped && equippedSkin !== "default" && (
  <TouchableOpacity
    style={{
      backgroundColor: '#ffd36e',
      borderRadius: 14,
      paddingHorizontal: 14,
      paddingVertical: 6,
      marginTop: 2,
    }}
    onPress={async () => {
      await setEquippedSkin("default");
      setEquippedSkinState("default");
    }}
  >
    <Text style={{ color: '#000', fontWeight: 'bold', fontSize: 14 }}>
      Unequip
    </Text>
  </TouchableOpacity>
)}


    </View>
  );
})}


      </View>
      <TouchableOpacity style={styles.button} onPress={() => setScreen('menu')}>
        <Text style={styles.buttonText}>Back</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}


  
  // ---- GAME OVER SCREEN ----
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
                setLevelUpPending(false);
                setScreen('game');
              }}
            >
              <Text style={styles.buttonText}>Restart</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.button} onPress={handleShare}>
            <Text style={styles.buttonText}>Share</Text>
          </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    );
  }

  // fallback, never actually hit
  return null;
}
