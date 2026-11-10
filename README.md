# GATELIFT — Level one

Stretch. Cardio. Lift. Every day, logged.

A single-file web app (PWA). No build step, no account, data stays on the device.

## What level one does

- **Today**: the day's workout from your split (3 to 6 days a week, gym or home), shown on a grey muscle figure with the worked muscles lit, plus a preview of tomorrow.
- **The day runs in three steps**: a timed stretch warm-up picked for that day's muscles, cardio with a timer and target, then lifting. Each set is logged (weight, reps, tick), rest starts on its own, and the last session's numbers and a "go up" hint sit on every exercise.
- **Body**: a big front/back figure lit by this week's sets. Tap a muscle to see its sets and exercises.
- **Log**: this week, streak, and every past session set by set.
- **You**: name, body, plan, cardio length, units, backup and restore.

## Files

```
index.html             the whole app
figures.js             anatomy figures (man, woman), built by src-figures/build.js
manifest.webmanifest   install info
sw.js                  offline cache
icon-180/192/512.png   app icons
```

Anatomy figures come from [muscle_mapper](https://github.com/suryamolly/muscle_mapper) by Surya Mouly, MIT License (see `src-figures/LICENSE-muscle_mapper.txt`).

## Put it on your iPhone

1. Create a public GitHub repo and upload index.html, figures.js, manifest.webmanifest, sw.js and the icons to its root.
2. Go to Settings → Pages → Deploy from a branch → `main` / root.
3. Open the `https://<user>.github.io/<repo>/` link in **Safari**, tap Share → **Add to Home Screen**.
4. Always open it from the home-screen icon. Back up from the Hunter tab → Export.

## Run locally

```
npx http-server . -p 5173 -c-1
```
