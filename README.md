# Workout Planner

A simple static GitHub Pages app for planning workout progression over time.

**Live site:** https://jackeown.github.io/workout-planner/

## Features

- Add exercise plans with current sets/reps and future target sets/reps
- View a calendar with a recommended day-by-day progression
- See the recommended plan for the selected day
- Confirm workouts with a checkmark and track streaks per exercise
- Reps shift automatically (up to 20%, tapering to 0%) whenever your set count changes, to offset the added or removed difficulty
- Light/dark mode toggle that follows your OS preference by default and remembers your choice
- All data persists in browser localStorage with no backend required
- Movement tracker appears first and all sections are collapsible

## Run locally

Open `index.html` directly in a browser, or run a local static server:

```bash
python3 -m http.server 8000
```

Then visit `http://localhost:8000`.

## Publish to GitHub Pages

1. Push this repository to GitHub.
2. Open the repository settings.
3. Go to Pages.
4. Choose the default branch as the source and save.
5. GitHub Pages will serve the site at a URL like `https://<username>.github.io/workout-planner/`. For this repo that is https://jackeown.github.io/workout-planner/.

## Rep adjustments

When a plan's set count changes, the suggested reps adjust to offset the change in
difficulty. Increasing from 3 to 4 sets drops the suggested reps 20% below what you
were doing on 3 sets (30 -> 24), then they climb back toward your goal reps over the
rest of that stage. Decreasing the set count raises reps 20% to keep the effort
comparable. The adjustment starts on the exact day the set count changes and is fully
unwound by the next set count change, or by the goal date — whichever comes first. On
the goal date you always get exactly your target sets x target reps.

## Local storage

The app stores all plans, workout completions, and your theme choice in `localStorage`. Nothing leaves the browser.
