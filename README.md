# 💇‍♀️ Hair Salon Party

A playful, offline-first hairdressing PWA game built for an **Android tablet** (landscape-first, with portrait support too).

## Features
- **6 Expressive Customers** — including **Momo the Monster 👾** — with blinking eyes and live facial reactions.
- **✂️ Cut & Grow** — Scissors (with falling hair clippings), Clippers, and **Magic Grow Potion 🧪** (+ *Grow All*).
- **🎨 Colour & Glitter** — Freehand rainbow/colour dye brush, Glitter Spray ✨, and one-tap *Colour All*.
- **💇‍♀️ Style** — Comb, Curling Wand, Crimper, plus quick hairstyle presets (Down, Pigtails, Buns, High Ponytail, Spiky).
- **🚿 Wash & Dry** — Bubbly Shampoo, Showerhead rinse, and Hairdryer 💨 with live wind physics.
- **👓 Glasses Studio** — Pick from 6 shapes (Round, Heart, Star, Cat, Square, Shades) in 12 colours including Rainbow!
- **🎀 Extras & Scenes** — Draggable bows, crowns, stars, flowers, butterflies, plus illustrated Salon & Rainbow photo scenes.
- **📸 Salon Photos** — Save creations locally on the tablet (IndexedDB) with download & two-tap delete.
- **📲 Download App & One-Tap Update** — Installable PWA with a live version badge and Update button.

## Publishing & Updating Versions

1. Push this repo to GitHub and enable **GitHub Pages** (Deploy from branch `main`, root `/`).
2. Whenever you make changes and want the tablet to pull the new version cleanly, bump the version in one command before committing:

```powershell
.\bump-version.ps1 -Version 0.1.1
```

This updates `version.json`, `js/config.js`, and `sw.js` together. On the tablet, tap the **Version / Update** button on the Home screen to check and apply the update!
