# Tasks

## 1. Shared drilldown state

- Add country/city drilldown state to `MapExperience`.
- Derive active video scope from the selected country and city.
- Expose back/select helpers to the overview rail and center stage.

## 2. Overview rail

- Replace the flat country list with a country-first drilldown list.
- Show city buttons only when a country has videos in the active scope.
- Add the back button and demo refresh timestamp.

## 3. Player surfaces

- Update `DesktopVideoMapCard` and `VideoSelectionSheet` to use scope counts.
- Remove the duplicated desktop title and duration badge.
- Add watch-state labels for started, completed and opened in YouTube.

## 4. Suggested destinations

- Convert the suggested rail to horizontal scrolling with arrow controls.
- Fix thumbnail aspect ratio so the cards do not show letterboxing.

## 5. Globe and chrome

- Add `Vista del Viewer` and `Register` to the top bar.
- Make rotation pause/resume from the current view state.
- Keep globe pins visually behind the shell chrome.

