/* ─────────────────────────────────────────────────────────────────
   circles.js
   Circle geometry, colour, and sonic identity.
   alpha  → controls semi-transparency and physics mass.
   magic  → the unique visual effect triggered on click:
            'well'    pull nearby circles in for ~2.5 s
            'overlay' canvas-wide colour-blend wash
            'ripple'  expanding shockwave ring
            'burst'   radial particle explosion
   ───────────────────────────────────────────────────────────────── */

const NOTE_FREQ = {
  C3: 130.81, D3: 146.83, E3: 164.81, F3: 174.61,
  G3: 196.00, A3: 220.00, B3: 246.94,
  C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23,
  G4: 392.00, A4: 440.00, B4: 493.88, C5: 523.25,
};

const KANDINSKY_CIRCLES = [
  {
    id: 0,
    name: 'Solar Flare',
    x: 278, y: 248, r: 112,
    color: '#FFB300', strokeColor: null,
    note: 'C4', freq: NOTE_FREQ.C4, wave: 'sine',
    overlay: 'color-dodge', alpha: 0.82, magic: 'well',
    description: 'Vivid amber — tonic centre, a gravitational sun',
  },
  {
    id: 1,
    name: 'Electric Deep',
    x: 528, y: 308, r: 92,
    color: '#1565C0', strokeColor: null,
    note: 'G3', freq: NOTE_FREQ.G3, wave: 'triangle',
    overlay: 'multiply', alpha: 0.78, magic: 'well',
    description: 'Electric blue — low fifth, an anchor in the deep',
  },
  {
    id: 2,
    name: 'Neon Core',
    x: 348, y: 428, r: 66,
    color: '#E53935', strokeColor: null,
    note: 'E4', freq: NOTE_FREQ.E4, wave: 'sawtooth',
    overlay: 'overlay', alpha: 0.72, magic: 'ripple',
    description: 'Digital red — sharp third, sends shockwaves out',
  },
  {
    id: 3,
    name: 'Vivid Verde',
    x: 492, y: 512, r: 48,
    color: '#00C853', strokeColor: null,
    note: 'A4', freq: NOTE_FREQ.A4, wave: 'sine',
    overlay: 'screen', alpha: 0.68, magic: 'burst',
    description: 'Vivid green — sixth, explodes with energy',
  },
  {
    id: 4,
    name: 'Ghost Light',
    x: 232, y: 472, r: 56,
    color: '#F5F5DC', strokeColor: '#CCCCCC',
    note: 'D4', freq: NOTE_FREQ.D4, wave: 'triangle',
    overlay: 'screen', alpha: 0.70, magic: 'overlay',
    description: 'Ivory — second, casts a luminous wash',
  },
  {
    id: 5,
    name: 'Ultra Violet',
    x: 592, y: 192, r: 40,
    color: '#AA00FF', strokeColor: null,
    note: 'B4', freq: NOTE_FREQ.B4, wave: 'sine',
    overlay: 'color-dodge', alpha: 0.65, magic: 'overlay',
    description: 'Electric purple — leading tone, mystery unfolds',
  },
  {
    id: 6,
    name: 'Citrus Arc',
    x: 418, y: 182, r: 36,
    color: '#FF6D00', strokeColor: null,
    note: 'F4', freq: NOTE_FREQ.F4, wave: 'sawtooth',
    overlay: 'overlay', alpha: 0.63, magic: 'burst',
    description: 'Vivid orange — fourth, bursts with tension',
  },
  {
    id: 7,
    name: 'Hot Magenta',
    x: 294, y: 352, r: 30,
    color: '#F50057', strokeColor: null,
    note: 'G4', freq: NOTE_FREQ.G4, wave: 'triangle',
    overlay: 'screen', alpha: 0.60, magic: 'ripple',
    description: 'Digital pink — fifth above, rings outward',
  },
  {
    id: 8,
    name: 'Cerulean Pulse',
    x: 568, y: 438, r: 50,
    color: '#0288D1', strokeColor: null,
    note: 'A3', freq: NOTE_FREQ.A3, wave: 'sine',
    overlay: 'overlay', alpha: 0.70, magic: 'well',
    description: 'Sky blue — low sixth, pulls space around it',
  },
  {
    id: 9,
    name: 'Magenta Soul',
    x: 152, y: 318, r: 40,
    color: '#D81B60', strokeColor: null,
    note: 'C3', freq: NOTE_FREQ.C3, wave: 'sawtooth',
    overlay: 'multiply', alpha: 0.65, magic: 'ripple',
    description: 'Deep magenta — low tonic, radiates from the base',
  },
  {
    id: 10,
    name: 'Scarlet Orbit',
    x: 452, y: 578, r: 56,
    color: '#D32F2F', strokeColor: '#B71C1C',
    note: 'F3', freq: NOTE_FREQ.F3, wave: 'triangle',
    overlay: 'overlay', alpha: 0.72, magic: 'overlay',
    description: 'Vivid scarlet — low fourth, floods the canvas',
  },
  {
    id: 11,
    name: 'Indigo Rift',
    x: 322, y: 558, r: 34,
    color: '#4527A0', strokeColor: null,
    note: 'E3', freq: NOTE_FREQ.E3, wave: 'sine',
    overlay: 'multiply', alpha: 0.62, magic: 'burst',
    description: 'Deep indigo — low third, fractures into sparks',
  },
  {
    id: 12,
    name: 'Lemon Voltage',
    x: 196, y: 158, r: 46,
    color: '#FDD835', strokeColor: null,
    note: 'B3', freq: NOTE_FREQ.B3, wave: 'triangle',
    overlay: 'screen', alpha: 0.67, magic: 'burst',
    description: 'Lemon yellow — leading tone, sparks scatter wide',
  },
  {
    id: 13,
    name: 'Cyan Needle',
    x: 592, y: 528, r: 26,
    color: '#00BCD4', strokeColor: null,
    note: 'D3', freq: NOTE_FREQ.D3, wave: 'sine',
    overlay: 'overlay', alpha: 0.58, magic: 'ripple',
    description: 'Vivid cyan — low second, precise rippling point',
  },
  {
    id: 14,
    name: 'Vermilion Flash',
    x: 626, y: 294, r: 24,
    color: '#FF3D00', strokeColor: null,
    note: 'C5', freq: NOTE_FREQ.C5, wave: 'sawtooth',
    overlay: 'color-dodge', alpha: 0.56, magic: 'burst',
    description: 'Vermilion — high octave, a brilliant final burst',
  },
];

/* Non-interactive decorative circles */
const DECORATIVE_CIRCLES = [
  { x: 382, y: 282, r: 16, color: '#304FFE', alpha: 0.60 },
  { x: 472, y: 378, r: 12, color: '#FF1744', alpha: 0.55 },
  { x: 208, y: 392, r: 18, color: '#D500F9', alpha: 0.55 },
  { x: 542, y: 168, r: 14, color: '#FFAB00', alpha: 0.60 },
  { x: 622, y: 432, r: 11, color: '#00E5FF', alpha: 0.55 },
  { x: 388, y: 492, r:  9, color: '#00E676', alpha: 0.50 },
  { x: 168, y: 468, r: 13, color: '#FF6D00', alpha: 0.50 },
  { x: 508, y: 248, r: 10, color: '#E040FB', alpha: 0.45 },
];
