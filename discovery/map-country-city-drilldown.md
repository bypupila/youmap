# Map country/city drilldown

## Scope

Refactor the shared TravelYourMap map shell so country selection becomes a drilldown flow:

1. Countries
2. Cities within the selected country
3. Videos within the selected city or country scope

## Current state

- `MapExperience` already keeps shared state for country selection, pinned video selection, desktop card, mobile shell and demo/creator/viewer modes.
- `countryBuckets` already exist and can drive the country list.
- The current rail still shows a flat country list with city text inline, and the video card counts against the full ordered list instead of the active location scope.
- `DesktopVideoMapCard`, `VideoSelectionSheet` and the bottom suggested rail are shared across demo, creator and public viewer maps.

## Decisions

- Country selection clears any selected city.
- City selection only exists after a country is selected.
- The back action returns one level at a time:
  - city -> country
  - country -> global
- If a country has no videos in the active filter scope, the UI only marks the country active and does not show city buttons.
- The active video count must be computed from the active location scope, not from the total dataset.
- `Register` should go to onboarding.
- `Vista del Viewer` is a preview toggle for the creator/demo shell, not a new auth mode.
- Demo sponsors should remain inside the existing sponsor manager dialog for `Ver todos`; no new admin route is needed for this pass.

## Open questions

- None blocking for the current pass. The remaining work is implementation and browser validation.

## Validation targets

- Country drilldown works on desktop and mobile shells.
- Video count reflects the selected country or city scope.
- The selected-video card no longer shows the duplicated title or duration badge in the desktop overlay.
- Suggested destinations scroll horizontally and preserve thumbnail aspect ratio.

