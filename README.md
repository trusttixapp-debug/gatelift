# BUILT — Level one

Bring your plan. Log every set. Earn your rank.

A single-file web app (PWA). No build step, no account, data stays on the device.

## What level one does

- **Plans**: paste a plan as text (sets × reps, weights, notes, drop sets, `Rest: 90s / 2 min / …`), pick a starter plan, or build one by hand.
- **Quests**: each session is a quest. You check in (IN time), warm up, then log each exercise set by set (weight · reps · clear), with a rest timer per exercise, drop sets, "where did you feel it", and pain flags. Clearing the quest records the OUT time.
- **Acknowledgement**: XP for every logged set, the quest and any record broken. Hunter rank goes E → D → C → B → A → S → SS → Shadow Monarch. "Next time" advice uses double progression (fill the rep range on every set, then add weight).
- **Record**: calendar, session history, the rank ladder, and a weekly commitment streak.

## Files

```
index.html             the whole app
figures.js             anatomy figures (man, woman; boy and girl derived), built by src-figures/build.js
manifest.webmanifest   install info
sw.js                  offline cache
icon-180/192/512.png   app icons
```

Anatomy figures come from [muscle_mapper](https://github.com/suryamolly/muscle_mapper) by Surya Mouly, MIT License (see `src-figures/LICENSE-muscle_mapper.txt`).

## Put it on your iPhone

1. Create a public GitHub repo and upload the seven files above to its root.
2. Go to Settings → Pages → Deploy from a branch → `main` / root.
3. Open the `https://<user>.github.io/<repo>/` link in **Safari**, tap Share → **Add to Home Screen**.
4. Always open it from the home-screen icon. Back up from the Hunter tab → Export.

## Run locally

```
npx http-server . -p 5173 -c-1
```
