# Sponsor Management Creator QA PRD

## Problem Statement

El creador puede crear sponsors, asignarlos en masa y pausarlos, pero el flujo no es suficientemente claro para operar sponsors de forma diaria. La edición no está disponible en la UI aunque existe contrato backend, la lista de sponsors queda visualmente enterrada por la asignación masiva y algunas respuestas de bulk assign dejan estados contradictorios o desactualizados. Esto hace que agregar, editar o pausar sponsors se sienta frágil y difícil de aprender.

## Solution

Convertir la pestaña Sponsors en una superficie operativa centrada primero en los sponsors existentes: lista escaneable, acciones visibles de editar, pausar y ordenar, y creación/edición usando el mismo wizard con preview. La asignación masiva debe quedar como herramienta secundaria colapsable o posterior, manteniendo mensajes consistentes y refrescando estado local cuando se asigna o se deshace.

## User Stories

1. As a creator, I want to see my active sponsors before bulk tools, so that I can understand what already exists.
2. As a creator, I want to add a sponsor from the same sponsor management surface, so that I do not leave my current context.
3. As a creator, I want the sponsor preview to update while I fill fields, so that I can trust what will be published.
4. As a creator, I want to edit an existing sponsor, so that I can correct copy, URL, style, colors, coupon, category, and scope without recreating it.
5. As a creator, I want the edit form to reuse the create form, so that the interaction stays familiar.
6. As a creator, I want to pause a sponsor with clear copy, so that I understand the sponsor is deactivated, not physically deleted.
7. As a creator, I want a confirmation before pausing, so that I do not deactivate sponsors accidentally.
8. As a creator, I want sponsor ordering controls to remain visible on each sponsor row/card, so that I can quickly adjust priority.
9. As a creator, I want global, country, and video scope to be visible on each sponsor, so that I know where it appears.
10. As a creator, I want coupon sponsors to keep the Coupon style constraint during edit, so that saved sponsors stay visually coherent.
11. As a creator, I want CTA rojo to show the CTA message in preview during edit, so that I can validate the actual visible message.
12. As a creator, I want Multi sponsor guidance near sponsor management, so that I know what happens when two or more sponsors share a card.
13. As a creator, I want bulk assign to remain available but secondary, so that it does not hide normal sponsor management.
14. As a creator, I want bulk preview and assign counts to be consistent, so that I can trust the operation.
15. As a creator, I want the UI to update after undoing bulk assign, so that I do not need to guess whether the undo worked.
16. As a creator, I want mobile sponsor management to avoid horizontal overflow, so that I can operate from a phone.
17. As a creator, I want errors to appear near the action that caused them, so that I know how to recover.
18. As a QA user, I want the real creator flow to be testable with a QA account, so that persistence, auth, and permissions are validated.

## Implementation Decisions

- Reuse the existing sponsor wizard for create and edit modes.
- Keep `Pausar sponsor` as the product term for the existing reversible deactivation behavior.
- Add visible `Editar` and `Pausar` actions to sponsor cards.
- Put the sponsor list before the bulk assignment tool.
- Keep bulk assignment in the same tab, but make it visually secondary.
- Use existing sponsor create, patch, delete, order, bulk assign, job status, and undo APIs.
- Do not add schema changes.
- Preserve metrics and history by keeping pause/deactivation behavior.
- Refresh or reconcile local state after bulk assign and undo so table content reflects current assignments.

## Testing Decisions

- Test external behavior through the browser using the QA creator account: login, sponsors tab, create, edit, pause, bulk preview, assign, undo, and mobile layout.
- Use TypeScript and lint as baseline regression checks.
- Verify API-backed persistence through the UI and, where useful, DB read checks without exposing credentials.
- Good tests assert visible outcomes and persisted state, not implementation internals.

## Out of Scope

- Hard-delete of sponsors.
- Reactivating paused sponsors from an archive.
- New database schema or migration.
- Redesigning analytics, public sponsor rails, billing, or sponsor inquiry flows.
- Publishing PRD to an external issue tracker.

## Further Notes

QA found that creation persists correctly, pause works with confirmation, and mobile currently avoids horizontal overflow. Key bugs to resolve are missing edit UI, list placement, bulk preview count mismatch, and stale bulk undo state.
