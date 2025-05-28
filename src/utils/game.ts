import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  SEGMENT_THRESHOLDS, MIN_WALLS, MIN_ORBS, ORB_RADIUS, TOP_INFOBAR_HEIGHT,
  HIGHSCORES_KEY, PLAYER_POINTS_KEY, EQUIPPED_SKIN_KEY, UNLOCKED_SKINS_KEY
} from '../constants';
import { Wall, Orb, HighScoreEntry } from '../types';

// Calculate segments for ripple radius
export function getSegmentsForRadius(radius: number, currentSegments: number) {
  let nextSegments = currentSegments;
  for (let i = SEGMENT_THRESHOLDS.length - 1; i >= 0; i--) {
    if (radius > SEGMENT_THRESHOLDS[i].radius) {
      nextSegments = Math.max(currentSegments, SEGMENT_THRESHOLDS[i].segments);
      break;
    }
  }
  return nextSegments;
}

// Rectangle collision
export function rectsOverlap(a: Wall, b: Wall): boolean {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

// Ripple limit calculation
export function generateLimits(x: number, y: number, segments: number, width: number, height: number, walls: Wall[]) {
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

// Storage and game data functions
export async function getEquippedSkin() {
  return await AsyncStorage.getItem(EQUIPPED_SKIN_KEY) || "default";
}
export async function setEquippedSkin(skinKey: string) {
  await AsyncStorage.setItem(EQUIPPED_SKIN_KEY, skinKey);
}
export async function getPlayerPoints() {
  const pts = await AsyncStorage.getItem(PLAYER_POINTS_KEY);
  return pts ? parseInt(pts) : 0;
}
export async function storePlayerPoints(pts: number) {
  await AsyncStorage.setItem(PLAYER_POINTS_KEY, pts.toString());
}
export async function unlockSkin(skinKey: string) {
  const prev = JSON.parse(await AsyncStorage.getItem(UNLOCKED_SKINS_KEY) || '[]');
  if (!prev.includes(skinKey)) {
    prev.push(skinKey);
    await AsyncStorage.setItem(UNLOCKED_SKINS_KEY, JSON.stringify(prev));
  }
}
export async function getUnlockedSkins() {
  return JSON.parse(await AsyncStorage.getItem(UNLOCKED_SKINS_KEY) || '[]');
}
export async function saveHighScore(newScore: number, newLevel: number) {
  try {
    const raw = await AsyncStorage.getItem(HIGHSCORES_KEY);
    let scores: HighScoreEntry[] = raw ? JSON.parse(raw) as HighScoreEntry[] : [];
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
export async function getHighScores() {
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
export async function clearHighScores() {
  try {
    await AsyncStorage.removeItem(HIGHSCORES_KEY);
  } catch (e) { }
}

export function generateWalls(width: number, height: number, level: number): Wall[] {
  const count = MIN_WALLS + Math.floor(level / 2);
  const out: Wall[] = [];
  let tries = 0;
  while (out.length < count && tries < count * 20) {
    tries++;
    const horizontal = Math.random() < 0.5;
    let wall: Wall;
    if (horizontal) {
      const w = 50 + Math.random() * width * 0.4;
      const x = Math.random() * (width - w);
      const y = Math.random() * height;
      wall = { x, y, width: w, height: 12 };
    } else {
      const h = 50 + Math.random() * height * 0.4;
      const x = Math.random() * width;
      const y = Math.random() * (height - h);
      wall = { x, y, width: 12, height: h };
    }
    const overlaps = out.some(existing => rectsOverlap(wall, existing));
    if (!overlaps) {
      out.push(wall);
    }
  }
  return out;
}

let globalOrbId = 1;

// Returns **plain** orb data. Animation state added by React component.
export function generateOrbs(width: number, height: number, walls: any[], level: number): Omit<Orb, 'fade' | 'scale'>[] {
  const count = MIN_ORBS + Math.floor(level / 2);
  const out: Omit<Orb, 'fade' | 'scale'>[] = [];
  let attempts = 0;
  const topOffset = 100; // Orbs won't spawn within 100px of the top
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
    });
  }
  return out;
}

