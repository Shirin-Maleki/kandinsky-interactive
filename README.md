# Kandinsky — Circles in a Circle · Interactive

> An interactive reconstruction of Wassily Kandinsky's *Circles in a Circle* (1923),  
> built with **HTML5 Canvas** and the **Web Audio API**.

---

## Concept

Every circle in the painting is a living instrument. The composition — originally  
oil and oil-washed ink on canvas, now encoded as geometric primitives — responds  
to your cursor. Each circle carries a harmonic identity derived from its colour  
temperature and spatial position within the frame.

| Interaction | Effect |
|---|---|
| **Click** | Plays the circle's assigned musical note via a synthesised oscillator + reverb tail |
| **Hover** | Illuminates the circle with a radial glow and plays a soft harmonic overtone |
| **Drag** | Displaces the circle; releases it into a gravity + spring simulation that settles it home |
| **Mode: Sound** | Click triggers the synthesised tone (default) |
| **Mode: Gravity** | Click launches a physics impulse — the circle bounces inside the frame then springs back |
| **Mode: Overlay** | Click applies a colour-blend wash across the entire composition using the circle's blend mode |

---

## Circle Map

| # | Name | Note | Colour | Blend Mode |
|---|------|------|--------|------------|
| 0 | Golden Sun | C4 | `#E8B030` | color-dodge |
| 1 | Deep Night | G3 | `#1A2E7C` | multiply |
| 2 | Crimson Core | E4 | `#C0392B` | overlay |
| 3 | Forest Breath | A4 | `#27884A` | screen |
| 4 | Ivory Dream | D4 | `#F0EAD2` | screen |
| 5 | Royal Violet | B4 | `#6B2387` | color-dodge |
| 6 | Amber Spark | F4 | `#E07800` | overlay |
| 7 | Rose Whisper | G4 | `#E87898` | screen |
| 8 | Arctic Sky | A3 | `#7BB8D4` | overlay |
| 9 | Earth Umber | C3 | `#7B4018` | multiply |
| 10 | Scarlet Ring | F3 | `#BE2222` | overlay |
| 11 | Midnight Indigo | E3 | `#3D1469` | multiply |
| 12 | Lemon Gleam | B3 | `#F5E020` | screen |
| 13 | Emerald Point | D3 | `#1E8C40` | overlay |
| 14 | Vermilion Dot | C5 | `#FF4500` | color-dodge |

---

## Audio Design

Each circle uses a different oscillator waveform chosen to reflect its visual character:

- `sine` — smooth, pure tones (yellow, green, sky-blue circles)
- `triangle` — soft harmonics with a hollow quality (ivory, lemon, deep-night circles)
- `sawtooth` — bright, buzzy tones with rich overtones (crimson, amber, umber circles)

Sounds pass through a bandpass filter tuned to the second harmonic, then into a  
shared master gain and a convolution reverb with a synthetic 2.5-second impulse response.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Rendering | HTML5 Canvas 2D API |
| Sound | Web Audio API — OscillatorNode, BiquadFilterNode, ConvolverNode |
| Physics | Custom Euler-integration gravity + elastic boundary bounce |
| No dependencies | Pure vanilla JavaScript, zero build step |

---

## Running Locally

Because Web Audio requires a secure context for some browsers and `file://` origins  
can block audio, the recommended way to run the demo is via a local HTTP server.

### Option A — Python (no install needed)

```bash
# Python 3
python3 -m http.server 8080 --directory /path/to/kandinsky-interactive

# Then open:
# http://localhost:8080
```

### Option B — Node.js `npx serve`

```bash
npx serve /path/to/kandinsky-interactive
```

### Option C — VS Code Live Server

Open the project folder in VS Code and click **Go Live** in the status bar  
(requires the *Live Server* extension).

### Option D — Direct file open

For most desktop browsers (Chrome 66+, Firefox 60+, Safari 14+) simply  
double-clicking `index.html` will work. If audio fails to play, use Option A instead.

---

## Keyboard & Accessibility

- **Tab** — cycles through circles (browser default focus)
- Screen-reader announcements are emitted via the `aria-live` info panel on interaction

---

## Project Structure

```
kandinsky-interactive/
├── index.html          # HTML shell and script wiring
├── css/
│   └── style.css       # Dark-mode layout and control styles
└── js/
    ├── circles.js      # Circle geometry, colour, note, and blend-mode data
    ├── audio.js        # KandinskyAudio — Web Audio synthesis engine
    ├── physics.js      # PhysicsEngine — gravity, bounce, spring, drag
    ├── canvas.js       # KandinskyRenderer — stateless 2D drawing functions
    ├── interactions.js # InteractionManager — mouse + touch event dispatch
    └── main.js         # Entry point — wires subsystems, drives rAF loop
```

---

## Reference

- Kandinsky, W. (1923). *Circles in a Circle*. Philadelphia Museum of Art.
- Kandinsky, W. (1926). *Point and Line to Plane*. Bauhaus-Bücher 9.

---

*Built as a study in the correspondence between colour, form, and sound —  
a theme Kandinsky explored throughout his Bauhaus period.*
