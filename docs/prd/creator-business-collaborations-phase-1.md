# PRD: Creator Business Collaborations Phase 1

## Problem Statement
Los creadores de viajes aceptan colaboraciones de marcas, hoteles, productos, experiencias y afiliados sin una herramienta clara para decidir si convienen antes de aceptar ni para registrar despues que se entrego, que se recibio y que costo tuvo. El panel de `Negocio` ya cubre leads, campanas, entregables y pagos, pero no modela canjes, valor en especie, esfuerzo, minimos privados, decision manual ni balance real de colaboraciones.

## Solution
Agregar una primera fase de `Colaboraciones` dentro de `Negocio`, reutilizando las campanas comerciales existentes. Una colaboracion sera una campana con tipo de acuerdo, evaluacion manual, minimos privados, destino opcional, contacto principal, items de balance y cierre operativo. El creador podra crearla desde un lead o manualmente, evaluarla con un wizard, aceptarla sin bloqueo duro, operar pendientes desde agenda y consultar balance privado agrupado por moneda.

## User Stories
1. As a creator, I want to create a collaboration manually, so that I can register opportunities that arrive by email, DM, WhatsApp, or meetings.
2. As a creator, I want to convert a lead into a collaboration opportunity, so that I can evaluate brand requests before accepting them.
3. As a creator, I want to keep the existing quick campaign flow, so that simple commercial work does not require a full evaluation.
4. As a creator, I want to choose an agreement type, so that paid sponsors, barter, hotels, experiences, products, affiliates, and other deals are classified consistently.
5. As a creator, I want to add secondary flags, so that mixed deals can include payment, barter, affiliate, discount code, map presence, report, exclusivity, preapproval, or travel.
6. As a creator, I want to enter a destination country and label, so that destination-based collaborations can be filtered and reviewed.
7. As a creator, I want a campaign-level currency, so that all budget, payments, balance items, and minimums use the same currency.
8. As a creator, I want a manual evaluation result, so that I decide whether the collaboration is good, needs review, or should be rejected.
9. As a creator, I want minimum acceptance terms, so that I can compare opportunities against my private line for accepting work.
10. As a creator, I want a manual minimum fit field, so that the system can warn me when I accept an opportunity that does not meet my own terms.
11. As a creator, I want to accept anyway with an override note, so that strategic exceptions are recorded without blocking me.
12. As a creator, I want predefined balance item presets, so that I only activate the values and costs relevant to each collaboration.
13. As a creator, I want estimated and actual amounts for each active balance item, so that I can compare promise versus reality.
14. As a creator, I want in-kind value separated from cash, so that I do not confuse received value with real money.
15. As a creator, I want to track own costs, so that transport, production, editing, equipment, ads, taxes, or extras affect my private balance.
16. As a creator, I want to track effort by hourly rate or project price, so that I can account for time when deciding if a collaboration is worth it.
17. As a creator, I want values in kind to have operational statuses, so that promised, confirmed, received, partial, not received, and not applicable states are visible.
18. As a creator, I want costs to have simple statuses, so that estimated, confirmed, paid, and not applicable costs are clear.
19. As a creator, I want balance items with expected dates to appear in agenda only when tracked, so that the agenda remains actionable.
20. As a creator, I want the agenda to mix deliverables, payments, in-kind values, and costs, so that all pending commercial work is in one prioritized list.
21. As a creator, I want quick agenda actions for balance items, so that I can mark received, partial, not received, confirmed, or paid without opening the full campaign.
22. As a creator, I want rejected collaborations to remain private history, so that I can learn from declined opportunities without affecting balance.
23. As a creator, I want balance totals to include only active, delivered, and paid collaborations, so that real results do not mix with pipeline.
24. As a creator, I want pipeline and real balance separated, so that estimated opportunities and real operations are not confused.
25. As a creator, I want balances grouped by currency, so that USD, EUR, MXN, ARS, COP, CLP, and PEN are not summed incorrectly.
26. As a creator, I want a checklist when closing a collaboration, so that deliverables, payments, in-kind values, costs, notes, and follow-up are reviewed.
27. As a creator, I want closing warnings rather than hard blocks, so that incomplete data does not prevent me from operating.
28. As a creator, I want a final learning note, so that I can remember what worked and what did not.
29. As a creator, I want a "would collaborate again" field, so that future renewals can use previous experience.
30. As a creator, I want repeated collaborations to create a new record, so that past deliverables, costs, and balances are not mixed with new work.
31. As a creator, I want previous brand history shown while evaluating, so that prior balance and lessons help me decide.
32. As a creator, I want manual collaborations to store one primary contact, so that follow-up is possible even without an originating lead.
33. As a creator, I want the UI to avoid document uploads or sensitive evidence fields, so that contracts, invoices, emails, and proofs stay outside TravelYourMap.
34. As a creator, I want `Colaboraciones` inside `Negocio`, so that the main sidebar remains focused.
35. As a creator, I want internal navigation in `Negocio`, so that Resumen, Leads, Campanas, Colaboraciones, Balance, and Agenda are easy to scan.
36. As a creator, I want `Resumen` as the default `Negocio` view, so that urgent commercial status is visible first.
37. As a creator, I want collaboration cards to show agreement type, state, evaluation, destination, estimated/actual value, costs, balance, pending tasks, and primary action, so that I can prioritize work quickly.

## Implementation Decisions
- Reuse `sponsor_campaigns` as the source of truth for collaborations. A collaboration is a campaign with `agreement_type` set.
- Reuse existing campaign statuses. Do not add a new `closed` state; represent closure with `delivered`, `paid`, and checklist completeness.
- Add campaign columns for contact, currency, agreement classification, secondary flags, evaluation, minimums, destination, final learning, and repeat intent.
- Add `sponsor_campaign_balance_items` for in-kind values, own costs, and effort.
- Reuse `sponsor_campaign_payments` for cash received.
- Reuse `sponsor_campaign_deliverables` for creator services and content obligations.
- Use campaign-level `currency_code`, default `USD`.
- Support currency options: `USD`, `EUR`, `MXN`, `ARS`, `COP`, `CLP`, `PEN`.
- Use technical agreement values: `paid_sponsor`, `barter`, `hotel_stay`, `experience`, `product`, `affiliate`, `other`.
- Use technical evaluation values: `good_fit`, `review`, `poor_fit`, `not_evaluated`.
- Use technical minimum fit values: `meets`, `partial`, `does_not_meet`, `unknown`.
- Store secondary agreement flags as boolean columns for filtering and query simplicity.
- Store minimum checklist as boolean columns plus `minimum_conditions_notes`.
- Store balance item statuses in a constrained text column shared across kinds.
- Balance item statuses are `estimated`, `promised`, `confirmed`, `received`, `partial`, `not_received`, `paid`, `not_applicable`.
- Store effort in the same balance item table with extra fields for `hourly` and `project` modes.
- Only save activated balance items. Preserve disabled items with history by setting `enabled=false`.
- Add `expected_date` and `track_in_agenda` to balance items.
- Update CRM APIs to create collaboration opportunities, update collaboration evaluation fields, create/update/delete-or-disable balance items, and return balance summaries.
- Update `Negocio` UI with secondary navigation and focused views.
- Keep Sponsor Kit private, token links, export/print, rate card work, and link analytics out of phase 1.

## Testing Decisions
- Test external behavior through the highest available seams: API route behavior, CRM payload shape, and browser-visible `Negocio` flows.
- Validate that rejected collaborations do not affect balance totals.
- Validate accepting with `minimum_fit=partial` or `does_not_meet` records an override note.
- Validate agenda includes tracked balance items with expected dates and excludes untracked or complete items.
- Validate balances are grouped by currency.
- Validate manual contact fields work without a lead.
- Validate the UI does not introduce upload/document fields for sensitive material.
- Run lint and TypeScript checks after implementation.
- Because this touches UI, verify responsive behavior in browser if the local app can run.

## Out of Scope
- Sponsor Kit private.
- New tokenized Sponsor Kit links.
- Sponsor Kit personalization by brand or industry.
- Sponsor Kit PDF/export.
- Campaign-video relationship.
- Private Brand entity.
- Automatic currency conversion.
- Attachments, contracts, invoices, screenshots, emails, or sensitive document storage.
- Benchmarks against other creators.
- Configurable packages/bundles.
- Automatic score using map or YouTube data.
- Bulk classification of legacy campaigns.
- Full accounting, tax, payable management, or document evidence flows.

## Further Notes
The next grill should focus on Sponsor Kit phase 2. Phase 1 intentionally creates the structured collaboration data that Sponsor Kit can later use as configurable proof of commercial history.

## Phase 1 Implementation Status
Implemented in:
- `neon/migrations/0026_sponsor_campaign_collaborations.sql`
- `src/lib/sponsor-crm.ts`
- `src/app/api/creator/sponsor-crm/route.ts`
- `src/lib/creator-admin-data.ts`
- `src/components/map/map-admin-proposal-v2.tsx`
- `CONTEXT.md`

Verification:
- Targeted ESLint passed for the phase 1 TypeScript files.
- Global TypeScript check is blocked by unrelated existing syntax errors in `src/components/admin/admin-analytics-overview.tsx` and `src/components/creator/creator-admin-panel.tsx`.
