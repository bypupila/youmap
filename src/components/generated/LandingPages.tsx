import { type CSSProperties, type ComponentPropsWithoutRef, useState } from 'react';
import {
  Activity,
  ArrowRight,
  CalendarDays,
  ChevronRight,
  Compass,
  Clock3,
  MapPinned,
  Plane,
  ShieldCheck,
  Sparkles,
  SunMedium,
  Waves,
} from 'lucide-react';

type ClassValue = string | false | null | undefined;

function cn(...classes: ClassValue[]) {
  return classes.filter(Boolean).join(' ');
}

function Badge({
  className,
  variant = 'default',
  ...props
}: ComponentPropsWithoutRef<'span'> & { variant?: 'default' | 'secondary' | 'outline' }) {
  return (
    <span
      className={cn(
        'inline-flex w-fit items-center justify-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-medium uppercase tracking-[0.14em]',
        variant === 'default' && 'bg-[#171615] text-white',
        variant === 'secondary' && 'bg-white/70 text-[#2d2720]',
        variant === 'outline' && 'border border-black/10 bg-white/60 text-[#2d2720]',
        className
      )}
      {...props}
    />
  );
}

function Button({
  className,
  variant = 'default',
  ...props
}: ComponentPropsWithoutRef<'button'> & { variant?: 'default' | 'outline' | 'secondary' | 'ghost' }) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-medium transition active:scale-[0.99] disabled:pointer-events-none disabled:opacity-50',
        variant === 'default' && 'bg-[#171615] text-white hover:bg-[#262421]',
        variant === 'outline' && 'border border-black/10 bg-white/60 text-[#171615] hover:bg-white',
        variant === 'secondary' && 'bg-[#f5efe7] text-[#171615] hover:bg-[#eee6da]',
        variant === 'ghost' && 'bg-transparent text-current hover:bg-white/10',
        className
      )}
      {...props}
    />
  );
}

const tripVibes = {
  coastal: {
    label: 'Coastal hush',
    badge: 'Sea air / easy mornings',
    accent: '#c76d44',
    glow: 'rgba(199, 109, 68, 0.22)',
    route: 'Arrive at sunrise, stay near the harbor, leave the afternoons open.',
    summary:
      'Slow mornings, long lunches, and one perfect boat ride between the cliffs.',
    color: 'text-[#9f4f2e]',
    highlight: 'Beach clubs, boat decks, linen dinners',
    stat: '18 km',
  },
  alpine: {
    label: 'Alpine reset',
    badge: 'Cool air / long views',
    accent: '#4e6957',
    glow: 'rgba(78, 105, 87, 0.25)',
    route: 'Stay high, move light, and keep the schedule loose after noon.',
    summary:
      'Sharp mornings, quiet trails, and cabins that disappear into the tree line.',
    color: 'text-[#355243]',
    highlight: 'Cabins, ridgelines, firelit tasting menus',
    stat: '1,280 m',
  },
  city: {
    label: 'City pulse',
    badge: 'Night trains / late check-ins',
    accent: '#6c577d',
    glow: 'rgba(108, 87, 125, 0.24)',
    route: 'Pick a central base, then move by foot and late train hops.',
    summary:
      'Dense streets, after-dark reservations, and a hotel that feels more like a stage set.',
    color: 'text-[#5d4769]',
    highlight: 'Design hotels, night markets, gallery bars',
    stat: '24h',
  },
} as const;

const tripLengthOptions = [3, 5, 7, 10];

const transitModes = {
  launch: {
    label: 'Launch mode',
    eyebrow: 'Fastest route to market',
    headline: 'A landing page for teams that need a polished first impression now.',
    body:
      'Compact sections, sharp hierarchy, and a CTA path that stays obvious on every screen size.',
    statA: '42% faster launch',
    statB: '3 screens, 1 decision',
    statC: 'No cluttered scroll traps',
    accent: '#7fd3ff',
    pulse: 'rgba(127, 211, 255, 0.18)',
  },
  sync: {
    label: 'Sync mode',
    eyebrow: 'Shared decision making',
    headline: 'Built for reviews where the copy, layout, and proof all need to travel together.',
    body:
      'Side-by-side evidence blocks, clear comparison signals, and a layout that stays legible in meetings.',
    statA: '6 review-ready modules',
    statB: 'Inline proof at every step',
    statC: 'Less back-and-forth',
    accent: '#a6ff8f',
    pulse: 'rgba(166, 255, 143, 0.17)',
  },
  explore: {
    label: 'Explore mode',
    eyebrow: 'Higher contrast storytelling',
    headline: 'An experimental direction with harder edges and a stronger visual rhythm.',
    body:
      'Useful when the page needs to feel more editorial, more direct, and less like a standard SaaS template.',
    statA: '3 modular textures',
    statB: 'Big type, tight control',
    statC: 'Designed to hold attention',
    accent: '#ff8d6b',
    pulse: 'rgba(255, 141, 107, 0.16)',
  },
} as const;

export const LandingPages = () => {
  const [tripLength, setTripLength] = useState(7);
  const [vibe, setVibe] = useState<keyof typeof tripVibes>('coastal');
  const [mode, setMode] = useState<keyof typeof transitModes>('launch');

  const selectedTrip = tripVibes[vibe];
  const selectedMode = transitModes[mode];
  const estimatedCost = Math.round(tripLength * (vibe === 'city' ? 320 : vibe === 'alpine' ? 290 : 260));

  return (
    <main className="w-full overflow-x-hidden bg-[#f4efe7] text-[#181714]">
      <header className="sticky top-0 z-50 border-b border-black/5 bg-[rgba(244,239,231,0.84)] backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-full bg-[#171615] text-white shadow-[0_18px_30px_-16px_rgba(23,22,21,0.5)]">
              <Compass className="size-4" />
            </div>
            <div>
              <p className="text-sm font-semibold tracking-tight">MagicPath file</p>
              <p className="text-xs text-[#6e665c]">Two landing page directions in one canvas</p>
            </div>
          </div>

          <nav className="flex flex-wrap items-center gap-2">
            <a
              href="#aurora"
              className="rounded-full border border-black/10 bg-white/70 px-4 py-2 text-xs font-medium text-[#2c261f] transition hover:bg-white"
            >
              Aurora Coast
            </a>
            <a
              href="#transit"
              className="rounded-full border border-black/10 bg-white/70 px-4 py-2 text-xs font-medium text-[#2c261f] transition hover:bg-white"
            >
              Transit Grid
            </a>
          </nav>
        </div>
      </header>

      <section
        id="aurora"
        className="relative overflow-hidden border-b border-black/5 bg-[#f4efe7]"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.95),_transparent_42%),radial-gradient(circle_at_78%_14%,_rgba(199,109,68,0.18),_transparent_24%),linear-gradient(180deg,rgba(255,255,255,0.42),transparent_18%,transparent_82%,rgba(244,239,231,0.96))]" />
        <div className="absolute inset-0 opacity-[0.08] bg-[linear-gradient(rgba(24,23,20,0.18)_1px,transparent_1px),linear-gradient(90deg,rgba(24,23,20,0.18)_1px,transparent_1px)] bg-[size:38px_38px]" />

        <div className="relative mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Badge variant="outline" className="border-black/10 bg-white/65 text-[#43382d]">
              Landing page A
            </Badge>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="border-black/10 bg-white/70 text-[#4c4338]">
                Editorial travel
              </Badge>
              <Badge variant="secondary" className="border-black/10 bg-white/70 text-[#4c4338]">
                Responsive booking flow
              </Badge>
            </div>
          </div>

          <div className="mt-10 grid items-start gap-10 lg:grid-cols-[1.02fr_0.98fr]">
            <div className="max-w-3xl">
              <Badge className="border-black/10 bg-[#171615] text-white shadow-[0_14px_30px_-16px_rgba(23,22,21,0.45)]">
                <Sparkles className="mr-1.5 size-3.5" />
                Aurora Coast
              </Badge>

              <h1 className="mt-5 max-w-3xl text-4xl font-semibold tracking-tight text-[#171615] sm:text-5xl lg:text-7xl">
                Trips that feel handwritten, not assembled.
              </h1>

              <p className="mt-5 max-w-2xl text-base leading-7 text-[#534a40] sm:text-lg">
                A premium coastal landing page with a softer editorial rhythm, tactile cards, and
                a travel planner that adapts to the trip length you pick.
              </p>

              <div className="mt-7 flex flex-wrap gap-3">
                <Button className="gap-2 bg-[#171615] text-white hover:bg-[#2a2724]">
                  Reserve a route
                  <ArrowRight className="size-4" />
                </Button>
                <Button variant="outline" className="border-black/10 bg-white/70 text-[#171615] hover:bg-white">
                  View itinerary
                </Button>
              </div>

              <div className="mt-8 grid gap-3 sm:grid-cols-3">
                {[
                  ['4.9/5', 'Guest rating'],
                  ['23 islands', 'Curated access'],
                  ['48h', 'Turnaround for custom plans'],
                ].map(([value, label]) => (
                  <div
                    key={label}
                    className="rounded-[1.5rem] border border-black/8 bg-white/70 p-4 shadow-[0_20px_55px_-40px_rgba(23,22,21,0.35)]"
                  >
                    <p className="text-2xl font-semibold tracking-tight text-[#171615]">{value}</p>
                    <p className="mt-1 text-sm text-[#665d52]">{label}</p>
                  </div>
                ))}
              </div>

              <div className="mt-8 grid gap-4 rounded-[2rem] border border-black/8 bg-white/72 p-5 shadow-[0_26px_70px_-52px_rgba(23,22,21,0.38)] sm:grid-cols-[1fr_auto]">
                <div>
                  <div className="flex items-center gap-2 text-sm font-medium text-[#4f463d]">
                    <CalendarDays className="size-4" />
                    Trip length
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {tripLengthOptions.map((days) => (
                      <button
                        key={days}
                        type="button"
                        onClick={() => setTripLength(days)}
                        className={cn(
                          'rounded-full border px-4 py-2 text-sm font-medium transition',
                          days === tripLength
                            ? 'border-[#171615] bg-[#171615] text-white shadow-[0_12px_28px_-18px_rgba(23,22,21,0.8)]'
                            : 'border-black/10 bg-white text-[#4a4136] hover:bg-[#f5f1ea]'
                        )}
                      >
                        {days} days
                      </button>
                    ))}
                  </div>
                </div>

                <div className="rounded-[1.4rem] bg-[#f5f0e8] p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-[#7e7063]">Estimate</p>
                  <p className="mt-2 text-3xl font-semibold tracking-tight text-[#171615]">
                    ${estimatedCost}
                  </p>
                  <p className="mt-1 text-sm text-[#665d52]">for {tripLength} days, all essentials included</p>
                </div>
              </div>

              <div className="mt-6 rounded-[2rem] border border-black/8 bg-white/68 p-5 shadow-[0_26px_70px_-52px_rgba(23,22,21,0.38)]">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-[#4f463d]">Travel mood</p>
                    <p className="mt-1 text-sm text-[#756a60]">Switch the vibe to reshape the route, copy, and pacing.</p>
                  </div>
                  <span
                    className="rounded-full px-3 py-1 text-xs font-medium text-white"
                    style={{ backgroundColor: selectedTrip.accent }}
                  >
                    {selectedTrip.label}
                  </span>
                </div>

                <div className="mt-4 grid gap-2 sm:grid-cols-3">
                  {(Object.keys(tripVibes) as Array<keyof typeof tripVibes>).map((key) => {
                    const item = tripVibes[key];
                    const active = key === vibe;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setVibe(key)}
                        className={cn(
                          'rounded-[1.35rem] border p-4 text-left transition',
                          active
                          ? 'border-transparent text-white'
                            : 'border-black/10 bg-white text-[#43392f] hover:bg-[#fbf8f2]'
                        )}
                        style={
                          active
                            ? ({
                                background: `linear-gradient(180deg, ${item.accent}, rgba(23,22,21,0.95))`,
                                boxShadow: `0 24px 40px -26px ${item.glow}`,
                              } as CSSProperties)
                            : undefined
                        }
                        aria-pressed={active}
                      >
                        <p className="text-sm font-semibold">{item.label}</p>
                        <p className={cn('mt-1 text-xs leading-5', active ? 'text-white/82' : 'text-[#70645a]')}>
                          {item.badge}
                        </p>
                      </button>
                    );
                  })}
                </div>

                <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_auto]">
                  <div>
                    <div className="flex items-center justify-between text-sm text-[#554c42]">
                      <span>Route pacing</span>
                      <span>{tripLength} days</span>
                    </div>
                    <input
                      type="range"
                      min={3}
                      max={10}
                      step={1}
                      value={tripLength}
                      onChange={(event) => setTripLength(Number(event.target.value))}
                      className="mt-3 h-2 w-full cursor-pointer accent-[#171615]"
                    />
                    <p className="mt-3 max-w-xl text-sm leading-6 text-[#5a5248]">{selectedTrip.summary}</p>
                  </div>

                  <div className="rounded-[1.4rem] bg-[#171615] p-4 text-white">
                    <p className="text-xs uppercase tracking-[0.2em] text-white/55">Focus</p>
                    <p className="mt-2 text-lg font-medium">{selectedTrip.highlight}</p>
                    <p className="mt-3 flex items-start gap-2 text-sm text-white/74">
                      <MapPinned className="mt-0.5 size-4 shrink-0" />
                      {selectedTrip.route}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="relative">
              <div
                className="absolute -left-6 top-12 hidden size-20 rounded-full blur-3xl lg:block"
                style={{ backgroundColor: selectedTrip.glow }}
              />

              <div className="overflow-hidden rounded-[2.4rem] border border-black/8 bg-[#f8f4ee] p-4 shadow-[0_32px_90px_-44px_rgba(23,22,21,0.45)]">
                <div className="relative aspect-[4/5] overflow-hidden rounded-[2rem] bg-[linear-gradient(180deg,#f9f2e8_0%,#f1e1cf_46%,#ecd0b9_100%)]">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_18%,rgba(255,255,255,0.95),transparent_18%),radial-gradient(circle_at_16%_16%,rgba(255,255,255,0.78),transparent_12%),linear-gradient(160deg,rgba(255,255,255,0.55),transparent_28%,transparent_72%,rgba(23,22,21,0.08))]" />
                  <div
                    className="absolute inset-x-8 top-10 h-px"
                    style={{ backgroundColor: selectedTrip.accent }}
                  />
                  <div className="absolute inset-x-10 top-[22%] h-[2px] rounded-full bg-black/18" />
                  <div className="absolute left-[14%] top-[42%] h-[2px] w-[60%] rounded-full bg-black/12" />
                  <div
                    className="absolute left-[22%] top-[56%] h-[2px] w-[44%] rounded-full bg-black/10"
                    style={{ transform: 'rotate(-8deg)' }}
                  />
                  <div className="absolute right-[18%] top-[30%] size-24 rounded-full bg-white/65 blur-[2px]" />
                  <div className="absolute left-[15%] top-[21%] flex items-center gap-2 rounded-full border border-black/8 bg-white/80 px-3 py-2 text-xs font-medium text-[#332d27] shadow-[0_18px_28px_-22px_rgba(23,22,21,0.45)]">
                    <Waves className="size-3.5" />
                    Coastal route
                  </div>
                  <div className="absolute right-[12%] top-[18%] rounded-[1.35rem] border border-black/8 bg-white/86 p-3 shadow-[0_18px_34px_-22px_rgba(23,22,21,0.5)]">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-[#7a6d60]">Check-in</p>
                    <p className="mt-1 text-lg font-semibold text-[#171615]">06:40</p>
                  </div>
                  <div className="absolute inset-x-5 bottom-5 rounded-[1.75rem] border border-black/8 bg-white/92 p-4 shadow-[0_18px_34px_-22px_rgba(23,22,21,0.48)]">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-xs uppercase tracking-[0.2em] text-[#7a6d60]">Spotlight stay</p>
                        <p className="mt-1 text-lg font-semibold text-[#171615]">Harbor House, room 12</p>
                      </div>
                      <div className="rounded-full bg-[#171615] px-3 py-1.5 text-xs font-medium text-white">
                        {selectedTrip.stat}
                      </div>
                    </div>
                    <div className="mt-4 grid gap-3 sm:grid-cols-3">
                      {[
                        ['Morning swim', '7:10'],
                        ['Boat transfer', '11:30'],
                        ['Cliff dinner', '19:45'],
                      ].map(([label, time], index) => (
                        <div
                          key={label}
                          className={cn(
                            'rounded-[1.15rem] border p-3',
                            index === 1 ? 'border-[#171615] bg-[#171615] text-white' : 'border-black/8 bg-[#f7f2eb] text-[#41382f]'
                          )}
                        >
                          <p className="text-xs uppercase tracking-[0.16em] opacity-70">{label}</p>
                          <p className="mt-1 text-sm font-medium">{time}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div className="rounded-[1.7rem] border border-black/8 bg-white/70 p-4 shadow-[0_20px_48px_-36px_rgba(23,22,21,0.4)]">
                  <div className="flex items-center gap-2 text-sm font-medium text-[#4f463d]">
                    <ShieldCheck className="size-4" />
                    Built-in assurance
                  </div>
                  <p className="mt-2 text-sm leading-6 text-[#61574d]">
                    Smooth handoff, dependable response times, and no dead-end buttons in the booking flow.
                  </p>
                </div>
                <div className="rounded-[1.7rem] border border-black/8 bg-white/70 p-4 shadow-[0_20px_48px_-36px_rgba(23,22,21,0.4)]">
                  <div className="flex items-center gap-2 text-sm font-medium text-[#4f463d]">
                    <Activity className="size-4" />
                    Adaptive itinerary
                  </div>
                  <p className="mt-2 text-sm leading-6 text-[#61574d]">
                    The card stack, pricing block, and trip mood all respond immediately to your selections.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {[
              {
                icon: SunMedium,
                title: 'Daylight-first composition',
                body: 'Large type, generous spacing, and a calmer hierarchy that reads cleanly on mobile.',
              },
              {
                icon: Plane,
                title: 'Booking path that stays direct',
                body: 'A tight call to action with enough surrounding context to feel convincing, not crowded.',
              },
              {
                icon: Clock3,
                title: 'Real pacing controls',
                body: 'The trip length, mood, and route details all update so the page behaves like a live product.',
              },
            ].map(({ icon: Icon, title, body }) => (
              <div
                key={title}
                className="rounded-[1.75rem] border border-black/8 bg-white/68 p-5 shadow-[0_24px_58px_-42px_rgba(23,22,21,0.35)]"
              >
                <div className="flex size-11 items-center justify-center rounded-2xl bg-[#171615] text-white">
                  <Icon className="size-5" />
                </div>
                <h2 className="mt-4 text-lg font-semibold tracking-tight text-[#171615]">{title}</h2>
                <p className="mt-2 text-sm leading-6 text-[#63594f]">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section
        id="transit"
        className="relative overflow-hidden bg-[#0b1118] text-white"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_12%,rgba(127,211,255,0.18),transparent_22%),radial-gradient(circle_at_78%_24%,rgba(166,255,143,0.14),transparent_20%),radial-gradient(circle_at_bottom_right,rgba(255,141,107,0.16),transparent_20%)]" />
        <div className="absolute inset-0 opacity-[0.12] bg-[linear-gradient(rgba(255,255,255,0.15)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.15)_1px,transparent_1px)] bg-[size:44px_44px]" />

        <div className="relative mx-auto w-full max-w-7xl px-4 py-14 sm:px-6 lg:px-8 lg:py-16">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Badge variant="outline" className="border-white/15 bg-white/5 text-white">
              Landing page B
            </Badge>
            <div className="flex flex-wrap items-center gap-2">
              {(['launch', 'sync', 'explore'] as const).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setMode(item)}
                  className={cn(
                    'rounded-full border px-4 py-2 text-xs font-medium capitalize transition',
                    item === mode
                      ? 'border-transparent text-[#081018] shadow-[0_16px_30px_-20px_rgba(0,0,0,0.85)]'
                      : 'border-white/12 bg-white/5 text-white/75 hover:bg-white/10'
                  )}
                  style={
                    item === mode
                      ? { backgroundColor: selectedMode.accent, boxShadow: `0 20px 38px -24px ${selectedMode.pulse}` }
                      : undefined
                  }
                  aria-pressed={item === mode}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-10 grid items-start gap-10 lg:grid-cols-[0.98fr_1.02fr]">
            <div className="max-w-3xl">
              <Badge
                className="border-white/12 bg-white/8 text-white"
                style={{ boxShadow: `0 18px 36px -26px ${selectedMode.pulse}` }}
              >
                <Activity className="mr-1.5 size-3.5" />
                {selectedMode.eyebrow}
              </Badge>

              <h2 className="mt-5 max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl lg:text-7xl">
                {selectedMode.headline}
              </h2>

              <p className="mt-5 max-w-2xl text-base leading-7 text-white/72 sm:text-lg">
                {selectedMode.body}
              </p>

              <div className="mt-7 flex flex-wrap gap-3">
                <Button
                  className="gap-2 text-[#081018]"
                  style={{ backgroundColor: selectedMode.accent }}
                >
                  Start a build
                  <ArrowRight className="size-4" />
                </Button>
                <Button variant="outline" className="border-white/14 bg-white/5 text-white hover:bg-white/10">
                  Compare layouts
                </Button>
              </div>

              <div className="mt-8 grid gap-3 sm:grid-cols-3">
                {[
                  [selectedMode.statA, 'Immediate payoff'],
                  [selectedMode.statB, 'Clear structure'],
                  [selectedMode.statC, 'Less maintenance'],
                ].map(([value, label]) => (
                  <div
                    key={label}
                    className="rounded-[1.45rem] border border-white/12 bg-white/5 p-4 shadow-[0_24px_60px_-44px_rgba(0,0,0,0.8)]"
                  >
                    <p className="text-lg font-semibold tracking-tight text-white">{value}</p>
                    <p className="mt-1 text-sm text-white/60">{label}</p>
                  </div>
                ))}
              </div>

              <div className="mt-8 rounded-[2rem] border border-white/12 bg-white/6 p-5 shadow-[0_28px_70px_-48px_rgba(0,0,0,0.8)]">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-white">Visual direction</p>
                    <p className="mt-1 text-sm text-white/60">
                      The mode changes the emphasis, rhythm, and card treatment immediately.
                    </p>
                  </div>
                  <Badge className="border-white/12 bg-white/10 text-white">{selectedMode.label}</Badge>
                </div>

                <div className="mt-4 grid gap-2 sm:grid-cols-3">
                  {(
                    [
                      ['launch', 'Dense, direct, conversion-first'],
                      ['sync', 'Balanced for reviews and approvals'],
                      ['explore', 'Sharper contrast and a riskier edge'],
                    ] as const
                  ).map(([key, text]) => {
                    const active = key === mode;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setMode(key)}
                        className={cn(
                          'rounded-[1.3rem] border p-4 text-left transition',
                          active
                            ? 'border-transparent text-[#081018]'
                            : 'border-white/10 bg-white/5 text-white/78 hover:bg-white/10'
                        )}
                        style={
                          active
                            ? {
                                background: `linear-gradient(180deg, ${selectedMode.accent}, rgba(255,255,255,0.95))`,
                                boxShadow: `0 20px 44px -28px ${selectedMode.pulse}`,
                              }
                            : undefined
                        }
                        aria-pressed={active}
                      >
                        <p className="text-sm font-semibold capitalize">{key}</p>
                        <p className={cn('mt-1 text-xs leading-5', active ? 'text-[#081018]/78' : 'text-white/62')}>
                          {text}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="relative">
              <div
                className="absolute -right-8 top-10 hidden size-24 rounded-full blur-3xl lg:block"
                style={{ backgroundColor: selectedMode.pulse }}
              />

              <div className="overflow-hidden rounded-[2.4rem] border border-white/12 bg-[#0f1720] p-4 shadow-[0_32px_90px_-44px_rgba(0,0,0,0.92)]">
                <div className="relative aspect-[4/5] overflow-hidden rounded-[2rem] bg-[linear-gradient(180deg,#111c27_0%,#0b1118_58%,#070c12_100%)]">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_24%_18%,rgba(127,211,255,0.16),transparent_20%),radial-gradient(circle_at_84%_18%,rgba(166,255,143,0.12),transparent_18%),linear-gradient(180deg,rgba(255,255,255,0.08),transparent_18%,transparent_78%,rgba(255,255,255,0.04))]" />
                  <div className="absolute inset-x-8 top-9 h-px bg-white/12" />
                  <div className="absolute inset-x-8 top-9 h-px bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.5),transparent)] animate-[pulse_4s_ease-in-out_infinite]" />

                  <div className="absolute left-6 top-6 rounded-full border border-white/12 bg-white/6 px-3 py-1 text-xs font-medium text-white/68">
                    Live route map
                  </div>
                  <div className="absolute right-6 top-6 rounded-full border border-white/12 bg-white/6 px-3 py-1 text-xs font-medium text-white/68">
                    08:45 UTC
                  </div>

                  <div className="absolute inset-x-6 top-[18%] grid gap-3 sm:grid-cols-3">
                    {[
                      ['Reach', '84%'],
                      ['Clarity', '91%'],
                      ['Conversion', '68%'],
                    ].map(([label, value]) => (
                      <div
                        key={label}
                        className="rounded-[1.35rem] border border-white/10 bg-white/6 p-4 backdrop-blur-sm"
                      >
                        <p className="text-xs uppercase tracking-[0.18em] text-white/48">{label}</p>
                        <p className="mt-2 text-2xl font-semibold tracking-tight text-white">{value}</p>
                      </div>
                    ))}
                  </div>

                  <div className="absolute inset-x-6 top-[43%] h-[1px] bg-white/10" />
                  <div className="absolute left-6 top-[39%] flex items-center gap-2 rounded-full border border-white/12 bg-white/6 px-3 py-2 text-xs font-medium text-white/75">
                    <ChevronRight className="size-3.5" />
                    Short path
                  </div>
                  <div className="absolute right-6 top-[39%] flex items-center gap-2 rounded-full border border-white/12 bg-white/6 px-3 py-2 text-xs font-medium text-white/75">
                    <ShieldCheck className="size-3.5" />
                    Error-safe layout
                  </div>

                  <div className="absolute inset-x-6 top-[49%] rounded-[1.75rem] border border-white/12 bg-white/6 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs uppercase tracking-[0.18em] text-white/48">Decision path</p>
                        <p className="mt-1 text-lg font-semibold text-white">Pick a route, then stay consistent.</p>
                      </div>
                      <div
                        className="flex size-12 items-center justify-center rounded-2xl text-[#081018]"
                        style={{ backgroundColor: selectedMode.accent }}
                      >
                        <Plane className="size-5" />
                      </div>
                    </div>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      {[
                        ['Layout', 'Two-column hierarchy with a tight CTA path'],
                        ['Motion', 'Soft pulses, no noisy animation'],
                        ['Proof', 'Metrics that still read on a phone'],
                        ['Flow', 'Accessible buttons and obvious anchors'],
                      ].map(([label, value]) => (
                        <div key={label} className="rounded-[1.15rem] border border-white/10 bg-[#121c27] p-3">
                          <p className="text-[11px] uppercase tracking-[0.16em] text-white/48">{label}</p>
                          <p className="mt-1 text-sm font-medium text-white/88">{value}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="absolute inset-x-6 bottom-6 rounded-[1.8rem] border border-white/12 bg-[rgba(255,255,255,0.06)] p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs uppercase tracking-[0.18em] text-white/48">Preview result</p>
                        <p className="mt-1 text-base font-medium text-white/88">A landing page that holds attention without losing structure.</p>
                      </div>
                      <div className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-[#081018]">
                        <Sparkles className="size-3.5" />
                        Ready
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {[
              {
                title: 'Strict visual difference',
                body: 'The first page uses an ivory editorial surface; the second goes high-contrast and technical.',
              },
              {
                title: 'Interactive by default',
                body: 'Trip length, travel vibe, and presentation mode all change the content in the component.',
              },
              {
                title: 'Responsive without special cases',
                body: 'Both layouts collapse cleanly on mobile while keeping the hierarchy readable.',
              },
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-[1.75rem] border border-white/10 bg-white/[0.06] p-5 shadow-[0_24px_60px_-44px_rgba(0,0,0,0.8)]"
              >
                <p className="text-lg font-semibold tracking-tight text-white">{item.title}</p>
                <p className="mt-2 text-sm leading-6 text-white/65">{item.body}</p>
              </div>
            ))}
          </div>

          <div className="mt-10 flex flex-wrap items-center justify-between gap-4 rounded-[2rem] border border-white/10 bg-white/[0.05] p-5">
            <div>
              <p className="text-sm font-medium text-white">Selected mode</p>
              <p className="mt-1 text-sm text-white/62">
                {selectedMode.label} is active. Use the buttons above to switch the rhythm and emphasis.
              </p>
            </div>
            <Button className="gap-2" style={{ backgroundColor: selectedMode.accent, color: '#081018' }}>
              Compare live variants
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      </section>
    </main>
  );
};
