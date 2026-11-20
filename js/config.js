export const APP_VERSION = '0.1.0';

export const CUSTOMERS = [
  {
    id: 'maya',
    name: 'Maya',
    isMonster: false,
    skin: '#f6c7a5',
    skinShade: '#e3a780',
    cheeks: '#ff96ad',
    eyeColor: '#4e3126',
    shirt: '#ff6ba9',
    shirtAccent: '#ffd166',
    defaultHair: '#5a3222',
    defaultLength: 0.78,
    defaultCurl: 0.2,
    defaultGlasses: { shape: 'round', color: '#e84c8a' },
    freckles: true
  },
  {
    id: 'momo',
    name: 'Momo',
    isMonster: true,
    skin: '#7be0d6',
    skinShade: '#4ec4ba',
    cheeks: '#ff90c2',
    eyeColor: '#3a225d',
    hornColor: '#ffd166',
    hornStripe: '#ff9f43',
    shirt: '#9b6bff',
    shirtAccent: '#ffde59',
    defaultHair: '#b36bff',
    defaultLength: 0.72,
    defaultCurl: 0.55,
    defaultGlasses: null,
    freckles: false
  },
  {
    id: 'leo',
    name: 'Leo',
    isMonster: false,
    skin: '#8d5838',
    skinShade: '#6f4024',
    cheeks: '#d96b6b',
    eyeColor: '#2a1a12',
    shirt: '#45b7ff',
    shirtAccent: '#ffe066',
    defaultHair: '#261b18',
    defaultLength: 0.52,
    defaultCurl: 0.8,
    defaultGlasses: null,
    freckles: false
  },
  {
    id: 'chloe',
    name: 'Chloe',
    isMonster: false,
    skin: '#fde0c8',
    skinShade: '#ebbfa0',
    cheeks: '#ff9eb5',
    eyeColor: '#3c8dad',
    shirt: '#5cd68d',
    shirtAccent: '#ffffff',
    defaultHair: '#e8a846',
    defaultLength: 0.85,
    defaultCurl: 0.08,
    defaultGlasses: null,
    freckles: true
  },
  {
    id: 'zara',
    name: 'Zara',
    isMonster: false,
    skin: '#c98a5b',
    skinShade: '#aa6f44',
    cheeks: '#e87c86',
    eyeColor: '#36231a',
    shirt: '#ff8a5b',
    shirtAccent: '#fff0a6',
    defaultHair: '#2f1e2e',
    defaultLength: 0.74,
    defaultCurl: 0.4,
    defaultGlasses: { shape: 'heart', color: '#8f5bff' },
    freckles: false
  },
  {
    id: 'pip',
    name: 'Pip',
    isMonster: false,
    skin: '#f3cfb3',
    skinShade: '#d9ae8e',
    cheeks: '#ff96a8',
    eyeColor: '#4c7a48',
    shirt: '#a882ff',
    shirtAccent: '#7ef0d1',
    defaultHair: '#d95b2b',
    defaultLength: 0.65,
    defaultCurl: 0.35,
    defaultGlasses: null,
    freckles: true
  }
];

export const HAIR_COLORS = [
  { id: 'pink', hex: '#ff5ca8', name: 'Pink' },
  { id: 'purple', hex: '#9b5cff', name: 'Purple' },
  { id: 'blue', hex: '#38b6ff', name: 'Blue' },
  { id: 'teal', hex: '#2fd6b8', name: 'Teal' },
  { id: 'green', hex: '#52d669', name: 'Green' },
  { id: 'yellow', hex: '#ffd43b', name: 'Yellow' },
  { id: 'orange', hex: '#ff7f3f', name: 'Orange' },
  { id: 'red', hex: '#ef4456', name: 'Red' },
  { id: 'blonde', hex: '#f2c76e', name: 'Blonde' },
  { id: 'ginger', hex: '#d9602b', name: 'Ginger' },
  { id: 'brown', hex: '#6e4128', name: 'Brown' },
  { id: 'black', hex: '#28212b', name: 'Black' },
  { id: 'silver', hex: '#dce5f2', name: 'Silver' },
  { id: 'rainbow', hex: 'rainbow', name: 'Rainbow' }
];

export const GLASSES_SHAPES = [
  { id: 'none', icon: '🚫', label: 'Off' },
  { id: 'round', icon: '👓', label: 'Round' },
  { id: 'heart', icon: '💗', label: 'Heart' },
  { id: 'star', icon: '⭐', label: 'Star' },
  { id: 'cat', icon: '🐱', label: 'Cat' },
  { id: 'square', icon: '🟦', label: 'Square' },
  { id: 'shades', icon: '🕶️', label: 'Shades' }
];

export const GLASSES_COLORS = [
  { id: 'pink', hex: '#e84c8a' },
  { id: 'purple', hex: '#8f5bff' },
  { id: 'blue', hex: '#2ea8ff' },
  { id: 'teal', hex: '#1cc8a8' },
  { id: 'yellow', hex: '#f7b924' },
  { id: 'orange', hex: '#ff7838' },
  { id: 'red', hex: '#e5394d' },
  { id: 'mint', hex: '#56cf78' },
  { id: 'gold', hex: '#d4a33a' },
  { id: 'black', hex: '#2b2430' },
  { id: 'white', hex: '#ffffff' },
  { id: 'rainbow', hex: 'rainbow' }
];

export const STYLE_PRESETS = [
  { id: 'loose', icon: '💁‍♀️', label: 'Down' },
  { id: 'pigtails', icon: '🎀', label: 'Pigtails' },
  { id: 'buns', icon: '🍡', label: 'Buns' },
  { id: 'ponytail', icon: '💫', label: 'High' },
  { id: 'mohawk', icon: '⚡', label: 'Spiky' }
];

export const ACCESSORIES = [
  { id: 'bow-pink', emoji: '🎀', label: 'Bow', defaultY: 0.24, defaultX: 0.62, scale: 1.0 },
  { id: 'crown', emoji: '👑', label: 'Crown', defaultY: 0.17, defaultX: 0.50, scale: 1.15 },
  { id: 'star', emoji: '⭐', label: 'Star', defaultY: 0.28, defaultX: 0.36, scale: 0.9 },
  { id: 'flower', emoji: '🌸', label: 'Flower', defaultY: 0.27, defaultX: 0.64, scale: 0.95 },
  { id: 'butterfly', emoji: '🦋', label: 'Butterfly', defaultY: 0.25, defaultX: 0.35, scale: 0.95 },
  { id: 'heart', emoji: '💖', label: 'Heart', defaultY: 0.30, defaultX: 0.63, scale: 0.9 },
  { id: 'unicorn', emoji: '🦄', label: 'Unicorn', defaultY: 0.16, defaultX: 0.50, scale: 1.1 },
  { id: 'party', emoji: '🥳', label: 'Hat', defaultY: 0.16, defaultX: 0.50, scale: 1.1 },
  { id: 'rainbow', emoji: '🌈', label: 'Rainbow', defaultY: 0.19, defaultX: 0.50, scale: 1.15 },
  { id: 'sparkle', emoji: '✨', label: 'Sparkle', defaultY: 0.24, defaultX: 0.38, scale: 0.95 }
];

export const BACKDROPS = [
  { id: 'salon', label: 'Salon', icon: '🪞', image: './assets/backdrop-salon.jpg', fallback: ['#ffe8f4', '#f2e6ff'] },
  { id: 'rainbow', label: 'Rainbow', icon: '🌈', image: './assets/backdrop-rainbow.jpg', fallback: ['#d9f2ff', '#ffe6f5'] },
  { id: 'stars', label: 'Stars', icon: '🌙', image: null, fallback: ['#2b235a', '#64449c'], pattern: 'stars' },
  { id: 'hearts', label: 'Hearts', icon: '💕', image: null, fallback: ['#ffd4e8', '#fff1c9'], pattern: 'hearts' }
];
