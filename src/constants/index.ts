// src/constants/index.ts

export const COLORS = ['#7bffde', '#cdbaff', '#ffcda8', '#ffb8d1', '#ffd36e'];
export const WALL_COLORS = ['#44d4b4', '#fb70b6', '#3c046c', '#caaacc', '#24544c'];
export const ORB_COLORS = ['#16b1e0', '#304acf', '#da0150', '#f2c50f', '#4cc273'];
export const RIPPLE_COLORS = ['#ffffffcc', '#cdbaffcc', '#ffb8d1cc', '#ffd36ecc', '#7bffdecc'];
export const BG_GRADIENT_START = '#151724';
export const BG_GRADIENT_END = '#343551';

export const ORB_SKINS = [
  { key: 'default', file: null, price: 0 },
  { key: 'basketball',   file: require('../../assets/skins/basketball.png'), price: 100 },
  { key: 'football',     file: require('../../assets/skins/football.png'),   price: 100 },
  { key: 'golf',         file: require('../../assets/skins/golf.png'),       price: 100 },
  { key: 'soccer',       file: require('../../assets/skins/soccer.png'),     price: 100 },
  { key: 'saturn',       file: require('../../assets/skins/saturn.png'),     price: 250 },
  { key: 'mars',         file: require('../../assets/skins/mars.png'),       price: 250 },
  { key: 'earth',        file: require('../../assets/skins/earth.png'),      price: 250 },
  { key: 'crystal',      file: require('../../assets/skins/crystal.png'),    price: 250 },
  { key: 'energy',       file: require('../../assets/skins/energy.png'),     price: 500 },
  { key: 'pokeball',     file: require('../../assets/skins/pokeball.png'),   price: 500 },
  { key: 'evileye',      file: require('../../assets/skins/evileye.png'),    price: 500 },
  { key: 'eye',          file: require('../../assets/skins/eye.png'),        price: 500 },
  { key: 'pizza',        file: require('../../assets/skins/pizza.png'),      price: 1000 },
  { key: 'heart',        file: require('../../assets/skins/heart.png'),      price: 1000 },
  { key: 'snowglobe',    file: require('../../assets/skins/snowglobe.png'),  price: 1000 },
  { key: 'plasma',       file: require('../../assets/skins/plasma.png'),     price: 1000 },
  { key: 'yinyang',      file: require('../../assets/skins/yinyang.png'),    price: 10000 },
  { key: 'gemstone',     file: require('../../assets/skins/gemstone.png'),   price: 10000 },
  { key: 'blackhole',    file: require('../../assets/skins/blackhole.png'),  price: 10000 },
];

export const SEGMENT_THRESHOLDS = [
  { radius: 0, segments: 30 },
  { radius: 40, segments: 60 },
  { radius: 80, segments: 120 },
  { radius: 160, segments: 300 },
  { radius: 260, segments: 600 },
];

export const MIN_WALLS = 2;
export const MIN_ORBS = 3;
export const ORB_RADIUS = 3;
export const MAX_TAPS = 3;
export const TOP_INFOBAR_HEIGHT = 80;
export const HIGHSCORES_KEY = 'HIGHSCORES_KEY';
export const PLAYER_POINTS_KEY = 'PLAYER_POINTS_KEY';
export const EQUIPPED_SKIN_KEY = 'EQUIPPED_SKIN_KEY';
export const UNLOCKED_SKINS_KEY = 'UNLOCKED_SKINS_KEY';
