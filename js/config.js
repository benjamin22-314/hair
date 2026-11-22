export const APP_VERSION = '0.1.10';

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
    isDog: true,
    skin: '#d99b66',
    skinShade: '#b87a46',
    patchColor: '#8c532c',
    earColor: '#8c532c',
    muzzleColor: '#fff1db',
    cheeks: '#f08a94',
    eyeColor: '#3b2216',
    shirt: '#29c7b8',
    shirtAccent: '#ffd43b',
    defaultHair: '#7a4522',
    defaultLength: 0.62,
    defaultCurl: 0.45,
    defaultGlasses: { shape: 'heart', color: '#8f5bff' },
    freckles: false
  },
  {
    id: 'pip',
    name: 'Pip',
    isMonster: false,
    isCat: true,
    skin: '#f7b978',
    skinShade: '#df954e',
    stripeColor: '#c96f2d',
    muzzleColor: '#fff2df',
    cheeks: '#ff96a8',
    eyeColor: '#2fa866',
    shirt: '#9b6bff',
    shirtAccent: '#ffd43b',
    defaultHair: '#e88b3c',
    defaultLength: 0.56,
    defaultCurl: 0.25,
    defaultGlasses: null,
    freckles: false
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
  { id: 'bow-pink', emoji: '🎀', label: 'Bow', defaultY: 0.33, defaultX: 0.59, scale: 0.95 },
  { id: 'crown', emoji: '👑', label: 'Crown', defaultY: 0.27, defaultX: 0.50, scale: 1.15 },
  { id: 'star', emoji: '⭐', label: 'Star', defaultY: 0.35, defaultX: 0.41, scale: 0.85 },
  { id: 'flower', emoji: '🌸', label: 'Flower', defaultY: 0.37, defaultX: 0.60, scale: 0.90 },
  { id: 'butterfly', emoji: '🦋', label: 'Butterfly', defaultY: 0.34, defaultX: 0.40, scale: 0.90 },
  { id: 'heart', emoji: '💖', label: 'Heart', defaultY: 0.39, defaultX: 0.59, scale: 0.85 },
  { id: 'unicorn', emoji: '🦄', label: 'Unicorn', defaultY: 0.27, defaultX: 0.50, scale: 1.05 },
  { id: 'hat', emoji: '👒', label: 'Hat', defaultY: 0.27, defaultX: 0.50, scale: 1.20 },
  { id: 'rainbow', emoji: '🌈', label: 'Rainbow', defaultY: 0.26, defaultX: 0.50, scale: 1.15 },
  { id: 'sparkle', emoji: '✨', label: 'Sparkle', defaultY: 0.32, defaultX: 0.42, scale: 0.90 }
];

export const BACKDROPS = [
  { id: 'salon', label: 'Salon', icon: '🪞', image: './assets/backdrop-salon.jpg', fallback: ['#ffe8f4', '#f2e6ff'] },
  { id: 'rainbow', label: 'Rainbow', icon: '🌈', image: './assets/backdrop-rainbow.jpg', fallback: ['#d9f2ff', '#ffe6f5'] },
  { id: 'vet', label: 'Vet', icon: '🐾', image: './assets/backdrop-vet.jpg', fallback: ['#dff7ee', '#fff7e8'] },
  { id: 'doctor', label: 'Doctor', icon: '🩺', image: './assets/backdrop-doctor.jpg', fallback: ['#dff0ff', '#fff9eb'] },
  { id: 'unicorns', label: 'Unicorns', icon: '🦄', image: './assets/backdrop-unicorns.jpg', fallback: ['#ffe6f7', '#e6f2ff'] },
  { id: 'moon', label: 'Moon', icon: '🌕', image: './assets/backdrop-moon.jpg', fallback: ['#2b235a', '#5a4491'] },
  { id: 'car', label: 'Car', icon: '🚗', image: './assets/backdrop-car.jpg', fallback: ['#cceeff', '#e6f7df'] },
  { id: 'ocean', label: 'Ocean', icon: '🐢', image: './assets/backdrop-ocean.jpg', fallback: ['#b5f2f5', '#7fd4e6'] },
  { id: 'stars', label: 'Stars', icon: '🌙', image: null, fallback: ['#2b235a', '#64449c'], pattern: 'stars' },
  { id: 'hearts', label: 'Hearts', icon: '💕', image: null, fallback: ['#ffd4e8', '#fff1c9'], pattern: 'hearts' }
];
