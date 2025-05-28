import React, { useRef, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Easing,
  Switch,
  Dimensions,
} from 'react-native';
import Slider from '@react-native-community/slider';
import { useGame } from '../context/GameContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { styles as globalStyles, getThemePalette, palettes } from '../styles';
import * as Haptics from 'expo-haptics';

/*
  SETTINGS  ▸  snappy light/dark toggle + dual‑pulse haptics
  ─────────────────────────────────────────────────────────
  • Overlay colour locked via ref (no flicker)
  • Theme flips at ⅔ of wipe
  • Haptics: one pulse at toggle start, another at completion
*/

const GRID_ROWS = 6;
const GRID_COLS = 6;
const TRANSITION_DURATION = 280; // ms
const THEME_SWAP = TRANSITION_DURATION * 0.66; // swap ~⅔ through

const getIndex = (row: number, col: number) => row * GRID_COLS + col;

const SettingsScreen: React.FC = () => {
  const {
    soundVolume,
    setSoundVolume,
    musicVolume,
    setMusicVolume,
    theme,
    setTheme,
  } = useGame();

  const navigation = useNavigation<any>();
  const palette = getThemePalette(theme);

  /* ─── Animation state ─────────────────────────────────────────────────────*/
  const [isTransitioning, setIsTransitioning] = useState(false);
  const switchAnim = useRef(new Animated.Value(0)).current;
  const tileAnims = useRef(
    Array.from({ length: GRID_ROWS * GRID_COLS }, () => new Animated.Value(0)),
  ).current;
  const overlayBgRef = useRef(palette.background); // lock overlay colour

  // geometry
  const { tileWidth, tileHeight } = useMemo(() => {
    const scr = Dimensions.get('window');
    return { tileWidth: scr.width / GRID_COLS, tileHeight: scr.height / GRID_ROWS };
  }, []);

  /* ─── Toggle handler ───────────────────────────────────────────────────────*/
  const handleThemeToggle = () => {
    if (isTransitioning) return;
    setIsTransitioning(true);

    // 🔊 haptic #1 – toggle started
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const newTheme = theme === 'dark' ? 'light' : 'dark';
    overlayBgRef.current = newTheme === 'dark' ? palettes.dark.background : palettes.light.background;

    switchAnim.setValue(0);
    tileAnims.forEach(a => a.setValue(0));

    // Switch jiggle
    Animated.spring(switchAnim, {
      toValue: 1,
      friction: 3,
      tension: 120,
      useNativeDriver: true,
    }).start();

    // Grid peel
    const gridWipe: Animated.CompositeAnimation[] = [];
    for (let row = 0; row < GRID_ROWS; row++) {
      for (let col = 0; col < GRID_COLS; col++) {
        const idx = getIndex(row, col);
        const delay = (col / (GRID_COLS - 1)) * (TRANSITION_DURATION * 0.6);
        gridWipe.push(
          Animated.timing(tileAnims[idx], {
            toValue: 1,
            duration: TRANSITION_DURATION,
            delay,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
        );
      }
    }

    Animated.parallel(gridWipe).start(() => {
      setIsTransitioning(false);
      // 🔊 haptic #2 – animation finished
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    });

    // flip theme mid‑wipe
    setTimeout(() => setTheme(newTheme), THEME_SWAP);
  };

  /* ─── Overlay renderer ────────────────────────────────────────────────────*/
  const renderGridOverlay = () => {
    const bg = overlayBgRef.current;
    const tiles: JSX.Element[] = [];
    for (let row = 0; row < GRID_ROWS; row++) {
      for (let col = 0; col < GRID_COLS; col++) {
        const idx = getIndex(row, col);
        tiles.push(
          <Animated.View
            key={`${row}-${col}`}
            style={{
              position: 'absolute',
              top: row * tileHeight,
              left: col * tileWidth,
              width: tileWidth,
              height: tileHeight,
              backgroundColor: bg,
              opacity: tileAnims[idx],
            }}
          />,
        );
      }
    }
    return tiles;
  };

  /* ─── Switch transform ────────────────────────────────────────────────────*/
  const switchTransform = {
    transform: [
      {
        scale: switchAnim.interpolate({ inputRange: [0, 0.25, 1], outputRange: [1, 1.3, 1] }),
      },
      {
        rotateZ: switchAnim.interpolate({ inputRange: [0, 0.5, 1], outputRange: ['0deg', '-12deg', '0deg'] }),
      },
    ],
  };

  /* ─── UI ───────────────────────────────────────────────────────────────────*/
  return (
    <SafeAreaView style={[s.container, { backgroundColor: palette.background }]}>      
      {isTransitioning && <View pointerEvents="none" style={StyleSheet.absoluteFill}>{renderGridOverlay()}</View>}

      <Text style={[s.header, { color: palette.header }]}>Settings</Text>

      {/* Sound Slider */}
      <View style={[s.block, { backgroundColor: palette.panel }]}>        
        <Text style={[s.label, { color: palette.header }]}>Game Sound</Text>
        <Slider
          style={s.slider}
          minimumValue={0}
          maximumValue={1}
          step={0.01}
          value={soundVolume}
          onValueChange={setSoundVolume}
          minimumTrackTintColor={palette.sliderTrack}
          maximumTrackTintColor={palette.sliderTrackBg}
        />
        <Text style={[s.value, { color: palette.text }]}>{Math.round(soundVolume * 100)}%</Text>
      </View>

      {/* Music Slider */}
      <View style={[s.block, { backgroundColor: palette.panel }]}>        
        <Text style={[s.label, { color: palette.header }]}>Music</Text>
        <Slider
          style={s.slider}
          minimumValue={0}
          maximumValue={1}
          step={0.01}
          value={musicVolume}
          onValueChange={setMusicVolume}
          minimumTrackTintColor={palette.sliderTrack}
          maximumTrackTintColor={palette.sliderTrackBg}
        />
        <Text style={[s.value, { color: palette.text }]}>{Math.round(musicVolume * 100)}%</Text>
      </View>

      {/* Light / Dark Switch */}
      <View style={[s.block, { backgroundColor: palette.panel, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }]}>        
        <Text style={[s.label, { color: palette.header, marginRight: 12 }]}>Light Mode</Text>
        <Animated.View style={switchTransform}>          
          <Switch
            value={theme === 'light'}
            onValueChange={handleThemeToggle}
            trackColor={{ false: '#555', true: palette.sliderTrack }}
            thumbColor={theme === 'light' ? palette.header : palette.button}
            disabled={isTransitioning}
          />
        </Animated.View>
      </View>

      {/* Back */}
      <TouchableOpacity style={[globalStyles.button, { backgroundColor: palette.button }]} onPress={() => navigation.navigate('Menu')}>
        <Text style={[globalStyles.buttonText, { color: palette.buttonText }]}>Back</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

/* ─── Styles ───────────────────────────────────────────────────────────────*/
const s = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 16 },
  header: { fontSize: 32, fontWeight: 'bold', marginBottom: 24 },
  block: {
    width: '90%',
    marginBottom: 32,
    alignItems: 'center',
    borderRadius: 18,
    padding: 14,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
  },
  label: { fontSize: 22, fontWeight: '700', marginBottom: 6 },
  slider: { width: '100%', height: 40 },
  value: { fontSize: 16, marginTop: 4 },
});

export default SettingsScreen;
