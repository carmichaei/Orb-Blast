// src/context/GameContext.tsx
import React, { createContext, useContext, useState, useRef, useEffect, useCallback } from 'react';
import { Dimensions, Animated } from 'react-native';
import { Audio } from 'expo-av';
import {
  WALL_COLORS, ORB_COLORS, RIPPLE_COLORS, MAX_TAPS, ORB_SKINS
} from '../constants';
import {
  generateWalls, generateOrbs,
  getPlayerPoints, getEquippedSkin, getUnlockedSkins,
  saveHighScore
} from '../utils/game';

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
  saveHighScoreAndUpdate(): Promise<void>;
  playOrbSound(): void;
  playWallSound(): void;
  playWinSound(): void;
  playLoseSound(): void;
  toggleMenuMusic(): void;
}

const GameContext = createContext<GameContextValue | undefined>(undefined);

export const useGame = (): GameContextValue => {
  const context = useContext(GameContext);
  if (!context) throw new Error("useGame must be used within a GameProvider");
  return context;
};

export const GameProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { width, height } = Dimensions.get('window');
  const initialWalls = generateWalls(width, height, 1);
  const initialOrbs = generateOrbs(width, height, initialWalls, 1);

  // Volume state
  const [soundVolume, setSoundVolume] = useState(1);   // For orb, wall, win, lose
  const [musicVolume, setMusicVolume] = useState(1);   // For menu music

  // Core state
  const [level, setLevel] = useState(1);
  const [score, setScore] = useState(0);
  const [tapsUsed, setTapsUsed] = useState(0);
  const [walls, setWalls] = useState(initialWalls);
  const [orbs, setOrbs] = useState(initialOrbs);
  const [ripples, setRipples] = useState<any[]>([]);
  const [bursts, setBursts] = useState<any[]>([]);
  const [wallSparks, setWallSparks] = useState<any[]>([]);
  const [highScores, setHighScores] = useState<{ score: number; level: number }[]>([]);
  const [playerPoints, setPlayerPoints] = useState(0);
  const [unlockedSkins, setUnlockedSkins] = useState<string[]>([]);
  const [equippedSkin, setEquippedSkinState] = useState('default');
  const [canContinue, setCanContinue] = useState(false);
  const [muteOrbSound, setMuteOrbSound] = useState(false);
  const [muteMenuMusic, setMuteMenuMusic] = useState(false);
  const [loading, setLoading] = useState(false);
  const [nextLevel, setNextLevel] = useState(2);
  const [levelUpPending, setLevelUpPending] = useState(false);
  const [selectedWallColor, setSelectedWallColor] = useState(WALL_COLORS[0]);
  const [selectedOrbColor, setSelectedOrbColor] = useState(ORB_COLORS[0]);
  const [selectedRippleColor, setSelectedRippleColor] = useState(RIPPLE_COLORS[0]);
  const [colorPanelOpen, setColorPanelOpen] = useState(false);
  const gameOverAnim = useRef(new Animated.Value(0)).current;

  // --- AUDIO refs ---
  const orbSoundRef = useRef<Audio.Sound | null>(null);
  const wallSoundRef = useRef<Audio.Sound | null>(null);
  const winSoundRef = useRef<Audio.Sound | null>(null);
  const loseSoundRef = useRef<Audio.Sound | null>(null);
  const menuMusicRef = useRef<Audio.Sound | null>(null);

  // --- Load all sounds on mount and unload on unmount ---
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const orb = new Audio.Sound();
        const wall = new Audio.Sound();
        const win = new Audio.Sound();
        const lose = new Audio.Sound();
        const music = new Audio.Sound();

        await orb.loadAsync(require('../../assets/sounds/orb.mp3'));
        await wall.loadAsync(require('../../assets/sounds/wall.mp3'));
        await win.loadAsync(require('../../assets/sounds/win.mp3'));
        await lose.loadAsync(require('../../assets/sounds/lose.mp3'));
        await music.loadAsync(require('../../assets/sounds/menu-music.mp3'));
        await music.setIsLoopingAsync(true);
        await music.setVolumeAsync(muteMenuMusic ? 0 : musicVolume);

        if (isMounted) {
          orbSoundRef.current = orb;
          wallSoundRef.current = wall;
          winSoundRef.current = win;
          loseSoundRef.current = lose;
          menuMusicRef.current = music;
          if (!muteMenuMusic) await music.playAsync();
        }
      } catch (e) {}
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

  // --- React to menu music volume or mute changes ---
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

  // --- Play sound utilities with volume ---
  const playOrbSound = useCallback(() => {
    if (muteOrbSound) return;
    const orb = orbSoundRef.current;
    if (orb) {
      orb.setPositionAsync(0)
        .then(() => orb.setVolumeAsync(soundVolume))
        .then(() => orb.playAsync());
    }
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

  // --- Toggle menu music on/off ---
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

  // --- Persistent load ---
  useEffect(() => {
    (async () => {
      setPlayerPoints((await getPlayerPoints()) || 0);
      setUnlockedSkins((await getUnlockedSkins()) || []);
      setEquippedSkinState((await getEquippedSkin()) || 'default');
    })();
  }, []);

  const startNewGame = () => {
    const w1 = generateWalls(width, height, 1);
    setWalls(w1);
    setOrbs(generateOrbs(width, height, w1, 1));
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

  const saveHighScoreAndUpdate = async () => {
    try {
      const newScores = await saveHighScore(score, level);
      setHighScores(newScores);
    } catch (e) {
      console.warn("Failed to save high score", e);
    }
  };

  useEffect(() => {
    const collected = orbs.filter(o => o.collected).length;
    if (score !== collected) setScore(collected);
  }, [orbs, score]);

  const value: GameContextValue = {
    level, score, tapsUsed, walls, orbs, ripples, bursts, wallSparks,
    highScores, playerPoints, unlockedSkins, equippedSkin, canContinue,
    muteOrbSound, muteMenuMusic, soundVolume, musicVolume, setSoundVolume, setMusicVolume,
    loading, nextLevel, levelUpPending,
    selectedWallColor, selectedOrbColor, selectedRippleColor, colorPanelOpen,
    gameOverAnim,
    setLevel, setScore, setTapsUsed, setWalls, setOrbs, setRipples, setBursts,
    setWallSparks, setHighScores, setPlayerPoints, setUnlockedSkins, setEquippedSkinState,
    setCanContinue, setMuteOrbSound, setMuteMenuMusic, setLoading, setNextLevel,
    setLevelUpPending, setSelectedWallColor, setSelectedOrbColor, setSelectedRippleColor,
    setColorPanelOpen,
    startNewGame,
    saveHighScoreAndUpdate,
    playOrbSound,
    playWallSound,
    playWinSound,
    playLoseSound,
    toggleMenuMusic,
  };

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
};
