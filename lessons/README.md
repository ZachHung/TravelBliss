# TravelBliss courses

Published to GitHub Pages by `.github/workflows/lessons.yml` on every push to `main` that touches `lessons/`.

- `index.html`: the course home. List every section and its lessons here.
- `assets/`: components shared by every section (stylesheet, quiz, simulators). Link them with `../assets/`.
- One folder per section (`auth/`, …), each a `/teach` workspace: `MISSION.md`, `NOTES.md`, `RESOURCES.md`,
  `learning-records/`, `reference/` and numbered lessons. Start a new section by running `/teach` in a new folder.
