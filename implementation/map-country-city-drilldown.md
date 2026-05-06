# Map country/city drilldown implementation

## Objective

Make the shared TravelYourMap map UI behave like a location drilldown workspace instead of a flat country list, while keeping the official YouTube embed flow intact.

## Scope

- Shared map shell state and layout
- Country and city drilldown in the overview rail
- Desktop video card and mobile sheet counts/statuses
- Suggested destinations rail layout
- Creator/demo top bar actions
- Globe rotation play/pause behavior
- Sponsor rail demo affordances

## Non-goals

- No backend schema migration.
- No new public admin route for sponsors.
- No change to YouTube embed compliance rules.

## Contract

- Countries are shown first.
- Clicking a country shows the country context and the available city buttons for that country only.
- Clicking a city filters the active videos to that city.
- Back returns one level at a time.
- The active video count in the player UI is always the count for the active location scope.
- Demo/creator top bar shows:
  - `Vista del Viewer`
  - share/copy
  - `Register`
- The globe rotation control must pause and resume from the last rotation state instead of snapping back to a fixed view.

## Risks

- The biggest risk is over-scoping the active video list and accidentally changing unrelated tabs or mobile flows. Keep the drilldown state derived from the shared map shell and pass it into the player surfaces explicitly.

## Acceptance criteria

- Country/city drilldown works in `/map`, `/u/[username]`, demo maps and onboarding/landing surfaces that reuse `MapExperience`.
- The desktop card and sheet show scope-specific counts.
- Suggested videos do not overlap the desktop player card.
- Rotation resumes from the last view state.

