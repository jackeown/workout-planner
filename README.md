# Workout Planner

A simple static GitHub Pages app for planning workout progression over time.

## Features

- Add exercise plans with current sets/reps and future target sets/reps
- View a calendar with a recommended day-by-day progression
- See the recommended plan for the selected day
- Confirm workouts with a checkmark and track streaks per exercise
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
5. GitHub Pages will serve the site at a URL like `https://<username>.github.io/workout-planner/`.

## Local storage

The app stores all plans and workout completions in `localStorage` under a single key. Nothing leaves the browser.
