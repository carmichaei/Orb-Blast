import React, {
  createContext, useContext, useState, useRef, useEffect, useCallback
} from 'react';
import { Dimensions, Animated } from 'react-native';
import { Audio } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  WALL_COLORS, ORB_COLORS, RIPPLE_COLORS, MAX_TAPS, ORB_SKINS
} from '../constants';
import {
  generateWalls, generateOrbs,
  getPlayerPoints, getEquippedSkin, getUnlockedSkins,
  getHighScores, saveHighScore       //  ← added getHighScores import
} from '../utils/game';
import { PLAYER_POINTS_KEY } from '../constants';

/* ---------- Theme ---------- */
export type ThemeType = 'dark' | 'light';
const THEME_KEY = 'GAME_THEME';

/* ---------- Volume Keys ---------- */
const SOUND_VOLUME_KEY = 'SOUND_VOLUME';
const MUSIC_VOLUME_KEY = 'MUSIC_VOLUME';

/* ---------- Context Interface ---------- */
interface GameContextValue {
  level: number;
  score: number;
  tapsUsed: number;
  walls: any[];
  orbs: any[];
  ripples: any[];
  bursts: any[];
  wallSparks: any[];
  highScores: { score: number; level: number }[];
  playerPoints: number;
  unlockedSkins: string[];
  equippedSkin: string;
  canContinue: boolean;
  muteOrbSound: boolean;
  muteMenuMusic: boolean;
  soundVolume: number;
  musicVolume: number;
  setSoundVolume(n: number): void;
  setMusicVolume(n: number): void;
  loading: boolean;
  nextLevel: number;
  levelUpPending: boolean;
  selectedWallColor: string;
  selectedOrbColor: string;
  selectedRippleColor: string;
  colorPanelOpen: boolean;
  gameOverAnim: Animated.Value;
  setLevel(n: number): void;
  setScore(n: number): void;
  setTapsUsed(n: number): void;
  setWalls(w: any[]): void;
  setOrbs(o: any[]): void;
  setRipples(r: any[]): void;
  setBursts(b: any[]): void;
  setWallSparks(s: any[]): void;
  setHighScores(h: { score: number; level: number }[]): void;
  setPlayerPoints(p: number): void;
  setUnlockedSkins(u: string[]): void;
  setEquippedSkinState(skin: string): void;
  setCanContinue(c: boolean): void;
  setMuteOrbSound(m: boolean): void;
  setMuteMenuMusic(m: boolean): void;
  setLoading(l: boolean): void;
  setNextLevel(n: number): void;
  setLevelUpPending(p: boolean): void;
  setSelectedWallColor(c: string): void;
  setSelectedOrbColor(c: string): void;
  setSelectedRippleColor(c: string): void;
  setColorPanelOpen(open: boolean): void;
  startNewGame(): void;
  saveHighScoreAndUpdate(newScore?: number, newLevel?: number): Promise<void>;   //  ← updated signature
  playOrbSound(): void;
  playWallSound(): void;
  playWinSound(): void;
  playLoseSound(): void;
  toggleMenuMusic(): void;

  /* Theme */
  theme: ThemeType;
  setTheme: (theme: ThemeType) => void;
}

const GameContext = createContext<GameContextValue | undefined>(undefined);

export const useGame = (): GameContextValue => {
  const context = useContext(GameContext);
  if (!context) throw new Error('useGame must be used within a GameProvider');
  return context;
};

/* ========================================================================== */
/*                               Provider                                     */
/* ========================================================================== */

export const GameProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { width, height } = Dimensions.get('window');
  const initialWalls = generateWalls(width, height, 1);
  const initialOrbs  = generateOrbs(width, height, initialWalls, 1);

  /* ---------- Theme ---------- */
  const [theme, setThemeState] = useState<ThemeType>('dark');
  useEffect(() => {
    AsyncStorage.getItem(THEME_KEY).then(t => {
      if (t === 'light' || t === 'dark') setThemeState(t);
    });
  }, []);
  const setTheme = useCallback((t: ThemeType) => {
    setThemeState(t);
    AsyncStorage.setItem(THEME_KEY, t);
  }, []);

  /* ---------- Volume ---------- */
  const [soundVolume, setSoundVolume] = useState(1);
  const [musicVolume, setMusicVolume] = useState(1);

  /* ---------- Core State ---------- */
  const [level, setLevel]                 = useState(1);
  const [score, setScore]                 = useState(0);
  const [tapsUsed, setTapsUsed]           = useState(0);
  const [walls, setWalls]                 = useState(initialWalls);
  const [orbs, setOrbs]                   = useState(initialOrbs);
  const [ripples, setRipples]             = useState<any[]>([]);
  const [bursts, setBursts]               = useState<any[]>([]);
  const [wallSparks, setWallSparks]       = useState<any[]>([]);
  const [highScores, setHighScores]       = useState<{ score: number; level: number }[]>([]);
  const [playerPoints, setPlayerPointsRaw]= useState(0);
  const [unlockedSkins, setUnlockedSkins] = useState<string[]>([]);
  const [equippedSkin, setEquippedSkinState] = useState('default');
  const [canContinue, setCanContinue]     = useState(false);
  const [muteOrbSound, setMuteOrbSound]   = useState(false);
  const [muteMenuMusic, setMuteMenuMusic] = useState(false);
  const [loading, setLoading]             = useState(false);
  const [nextLevel, setNextLevel]         = useState(2);
  const [levelUpPending, setLevelUpPending] = useState(false);
  const [selectedWallColor, setSelectedWallColor]       = useState(WALL_COLORS[0]);
  const [selectedOrbColor,  setSelectedOrbColor]        = useState(ORB_COLORS[0]);
  const [selectedRippleColor, setSelectedRippleColor]   = useState(RIPPLE_COLORS[0]);
  const [colorPanelOpen, setColorPanelOpen] = useState(false);
  const gameOverAnim = useRef(new Animated.Value(0)).current;

  /* ---------- Audio Refs ---------- */
  const orbSoundRef  = useRef<Audio.Sound | null>(null);
  const wallSoundRef = useRef<Audio.Sound | null>(null);
  const winSoundRef  = useRef<Audio.Sound | null>(null);
  const loseSoundRef = useRef<Audio.Sound | null>(null);
  const menuMusicRef = useRef<Audio.Sound | null>(null);

  /* ---------- Audio Pool for Orbs ---------- */
  const POOL_SIZE = 4;
  const orbPoolRef    = useRef<Audio.Sound[]>([]);
  const orbPoolNextRef= useRef(0);

  /* ---------- Load Sounds ---------- */
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        /* 1. Load saved volume preferences */
        let loadedSoundVol = 1;
        let loadedMusicVol = 1;
        try {
          const storedSound = await AsyncStorage.getItem(SOUND_VOLUME_KEY);
          if (storedSound !== null) loadedSoundVol = Number(storedSound);
          setSoundVolume(loadedSoundVol);

          const storedMusic = await AsyncStorage.getItem(MUSIC_VOLUME_KEY);
          if (storedMusic !== null) loadedMusicVol = Number(storedMusic);
          setMusicVolume(loadedMusicVol);
        } catch {}

        /* 2. Load actual sound files */
        const orb   = new Audio.Sound();
        const wall  = new Audio.Sound();
        const win   = new Audio.Sound();
        const lose  = new Audio.Sound();
        const music = new Audio.Sound();

        await orb.loadAsync(require('../../assets/sounds/orb.mp3'));
        await wall.loadAsync(require('../../assets/sounds/wall.mp3'));
        await win.loadAsync(require('../../assets/sounds/win.mp3'));
        await lose.loadAsync(require('../../assets/sounds/lose.mp3'));
        await music.loadAsync(require('../../assets/sounds/menu-music.mp3'));
        await music.setIsLoopingAsync(true);
        await music.setVolumeAsync(muteMenuMusic ? 0 : loadedMusicVol);

        if (isMounted) {
          orbSoundRef.current  = orb;
          wallSoundRef.current = wall;
          winSoundRef.current  = win;
          loseSoundRef.current = lose;
          menuMusicRef.current = music;
          if (!muteMenuMusic) await music.playAsync();
        }
      } catch {}
    })();
    return () => {
      isMounted = false;
      orbSoundRef.current?.unloadAsync();
      wallSoundRef.current?.unloadAsync();
      winSoundRef.current?.unloadAsync();
      loseSoundRef.current?.unloadAsync();
      menuMusicRef.current?.unloadAsync();
    };
  }, []);

  /* ---------- React to mute / volume ---------- */
  useEffect(() => {
    const music = menuMusicRef.current;
    if (music) {
      music.setVolumeAsync(muteMenuMusic ? 0 : musicVolume);
      if (muteMenuMusic) {
        music.pauseAsync();
      } else {
        music.playAsync();
      }
    }
  }, [muteMenuMusic, musicVolume]);

  async function ensureOrbPool() {
    if (orbPoolRef.current.length < POOL_SIZE) {
      for (let i = orbPoolRef.current.length; i < POOL_SIZE; i++) {
        const sound = new Audio.Sound();
        await sound.loadAsync(require('../../assets/sounds/orb.mp3'));
        orbPoolRef.current.push(sound);
      }
    }
  }

  /* ---------- Play Sound Helpers ---------- */
  const playOrbSound = useCallback(async () => {
    if (muteOrbSound) return;
    await ensureOrbPool();
    const idx = orbPoolNextRef.current;
    orbPoolNextRef.current = (idx + 1) % POOL_SIZE;
    const sound = orbPoolRef.current[idx];
    try {
      await sound.stopAsync();
      await sound.setPositionAsync(0);
      await sound.setVolumeAsync(soundVolume);
      await sound.playAsync();
    } catch {}
  }, [muteOrbSound, soundVolume]);

  const playWallSound = useCallback(() => {
    if (muteOrbSound) return;
    const wall = wallSoundRef.current;
    if (wall) {
      wall.setPositionAsync(0)
        .then(() => wall.setVolumeAsync(soundVolume))
        .then(() => wall.playAsync());
    }
  }, [muteOrbSound, soundVolume]);

  const playWinSound = useCallback(() => {
    if (muteOrbSound) return;
    const win = winSoundRef.current;
    if (win) {
      win.setPositionAsync(0)
        .then(() => win.setVolumeAsync(soundVolume))
        .then(() => win.playAsync());
    }
  }, [muteOrbSound, soundVolume]);

  const playLoseSound = useCallback(() => {
    if (muteOrbSound) return;
    const lose = loseSoundRef.current;
    if (lose) {
      lose.setPositionAsync(0)
        .then(() => lose.setVolumeAsync(soundVolume))
        .then(() => lose.playAsync());
    }
  }, [muteOrbSound, soundVolume]);

  /* ---------- Music Toggle ---------- */
  const toggleMenuMusic = useCallback(() => {
    setMuteMenuMusic(mute => {
      const music = menuMusicRef.current;
      if (music) {
        if (mute) {
          music.setVolumeAsync(musicVolume);
          music.playAsync();
        } else {
          music.setVolumeAsync(0);
          music.pauseAsync();
        }
      }
      return !mute;
    });
  }, [musicVolume]);

  /* ---------- Persistent Loads ---------- */
  useEffect(() => {
    (async () => {
      setPlayerPointsRaw((await getPlayerPoints())   || 0);
      setUnlockedSkins  ((await getUnlockedSkins())  || []);
      setEquippedSkinState((await getEquippedSkin()) || 'default');
      /* volumes already loaded in sound‑effect useEffect */
    })();
  }, []);

  /* ---------- Persistent Setters ---------- */
  const setSoundVolumeAndPersist = useCallback((vol: number) => {
    setSoundVolume(vol);
    AsyncStorage.setItem(SOUND_VOLUME_KEY, vol.toString());
  }, []);

  const setMusicVolumeAndPersist = useCallback((vol: number) => {
    setMusicVolume(vol);
    AsyncStorage.setItem(MUSIC_VOLUME_KEY, vol.toString());
  }, []);

  const setPlayerPoints = useCallback((pts: number) => {
    setPlayerPointsRaw(pts);
    AsyncStorage.setItem('PLAYER_POINTS_KEY', pts.toString());
  }, []);

  /* ---------- New Game ---------- */
  const startNewGame = () => {
    const firstWalls = generateWalls(width, height, 1);
    setWalls(firstWalls);
    setOrbs(generateOrbs(width, height, firstWalls, 1));
    setLevel(1);
    setScore(0);
    setTapsUsed(0);
    setRipples([]);
    setBursts([]);
    setWallSparks([]);
    setLevelUpPending(false);
    setCanContinue(false);
    setLoading(false);
  };

  /* ---------- High‑Score Handling ---------- */

  /* 1. Load saved list once on mount */
  useEffect(() => {
    (async () => {
      const stored = await getHighScores();
      setHighScores(stored);
    })();
  }, []);

  /* 2. Save helper that accepts optional explicit numbers */
  const saveHighScoreAndUpdate = async (newScore?: number, newLevel?: number) => {
    try {
      const s = typeof newScore === 'number' ? newScore : score;
      const l = typeof newLevel === 'number' ? newLevel : level;
      const updated = await saveHighScore(s, l);
      setHighScores(updated);
    } catch (err) {
      console.warn('Failed to save high score', err);
    }
  };

  /* ---------- Update score when orbs collected ---------- */
  useEffect(() => {
    const collected = orbs.filter(o => o.collected).length;
    if (score !== collected) setScore(collected);
  }, [orbs, score]);

  /* ---------- Context Value ---------- */
  const value: GameContextValue = {
    /* state */
    level, score, tapsUsed, walls, orbs, ripples, bursts, wallSparks,
    highScores, playerPoints, unlockedSkins, equippedSkin, canContinue,
    muteOrbSound, muteMenuMusic, soundVolume, musicVolume,
    loading, nextLevel, levelUpPending,
    selectedWallColor, selectedOrbColor, selectedRippleColor, colorPanelOpen,
    gameOverAnim,
    /* setters */
    setSoundVolume: setSoundVolumeAndPersist,
    setMusicVolume: setMusicVolumeAndPersist,
    setLevel, setScore, setTapsUsed, setWalls, setOrbs, setRipples,
    setBursts, setWallSparks, setHighScores, setPlayerPoints,
    setUnlockedSkins, setEquippedSkinState, setCanContinue,
    setMuteOrbSound, setMuteMenuMusic, setLoading, setNextLevel,
    setLevelUpPending, setSelectedWallColor, setSelectedOrbColor,
    setSelectedRippleColor, setColorPanelOpen,
    /* game actions */
    startNewGame,
    saveHighScoreAndUpdate,
    playOrbSound,
    playWallSound,
    playWinSound,
    playLoseSound,
    toggleMenuMusic,
    /* theme */
    theme,
    setTheme,
  };

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
};
