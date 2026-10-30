---
name: Nusantara Talent Portal
colors:
  surface: '#f8f9ff'
  surface-dim: '#ccdbf3'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e6eeff'
  surface-container-high: '#dce9ff'
  surface-container-highest: '#d5e3fc'
  on-surface: '#0d1c2e'
  on-surface-variant: '#434655'
  inverse-surface: '#233144'
  inverse-on-surface: '#eaf1ff'
  outline: '#747686'
  outline-variant: '#c4c5d7'
  surface-tint: '#2151da'
  primary: '#0037b0'
  on-primary: '#ffffff'
  primary-container: '#1d4ed8'
  on-primary-container: '#cad3ff'
  inverse-primary: '#b7c4ff'
  secondary: '#006a61'
  on-secondary: '#ffffff'
  secondary-container: '#86f2e4'
  on-secondary-container: '#006f66'
  tertiary: '#6b3700'
  on-tertiary: '#ffffff'
  tertiary-container: '#8d4b00'
  on-tertiary-container: '#ffcba3'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dce1ff'
  primary-fixed-dim: '#b7c4ff'
  on-primary-fixed: '#001551'
  on-primary-fixed-variant: '#0039b5'
  secondary-fixed: '#89f5e7'
  secondary-fixed-dim: '#6bd8cb'
  on-secondary-fixed: '#00201d'
  on-secondary-fixed-variant: '#005049'
  tertiary-fixed: '#ffdcc3'
  tertiary-fixed-dim: '#ffb77d'
  on-tertiary-fixed: '#2f1500'
  on-tertiary-fixed-variant: '#6e3900'
  background: '#f8f9ff'
  on-background: '#0d1c2e'
  surface-variant: '#d5e3fc'
typography:
  display-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
  display-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
  headline-xl:
    fontFamily: Plus Jakarta Sans
    fontSize: 36px
    fontWeight: '700'
    lineHeight: 44px
  headline-xl-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 36px
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  headline-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 26px
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 22px
  body-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 18px
  label-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
  label-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
  label-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 11px
    fontWeight: '500'
    lineHeight: 14px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  gutter: 1.5rem
  margin: 1.5rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2.5rem
---

## Brand & Style
The design system embodies modern civic clarity and institutional trust tailored for Indonesian university students, fresh graduates, and enterprise or public-sector employers. It strips away artificial clutter, hyper-futuristic styling, and speculative micro-interactions in favor of a human, accessible, and grounded experience.

Drawing inspiration from GovTech simplicity, Stripe's structural precision, and modern career platforms, the interface balances high institutional authority with youth-oriented warmth. Visual clarity and effortless navigation take precedence: information architecture is direct, readable in bilingual contexts (Bahasa Indonesia and English), and comfortable across low-bandwidth connections or varied mobile viewports.

## Colors
The color foundation relies on clean, high-contrast values anchored on slate-tinted canvas surfaces.

- **Primary (`#1D4ED8`)**: A deep, dependable civic royal blue used for critical interactive paths, primary actions, and prominent brand elements.
- **Secondary (`#0D9488`)**: A refined, optimistic teal-emerald representing opportunity, accepted applications, verified employer credentials, and growth milestones.
- **Tertiary (`#D97706`)**: An amber tone reserved for application deadlines, pending reviews, and urgent requirements without evoking alarm.
- **Neutral (`#475569`)**: A balanced slate scale ranging from pure canvas white (`#FFFFFF`) and off-white background (`#F8FAFC`) to deep text slate (`#0F172A`). Pure pitch black is avoided to reduce visual fatigue during long job search sessions.

Color accessibility strictly maintains a minimum contrast ratio of 4.5:1 for body copy and 3:1 for large display elements across all viewports.

## Typography
Plus Jakarta Sans is utilized uniformly across all display, body, and UI label roles. Originally designed for Indonesian public communications and digital interfaces, its geometric forms, generous x-height, and open apertures ensure effortless readability in dense tabular job boards, search filter drawers, and multi-paragraph role descriptions.

Typographic hierarchy enforces strict vertical cadence:
- Headlines emphasize structural clarity with deliberate semi-bold and bold weights.
- Long-form internship requirements and career guides utilize `body-lg` or `body-md` with relaxed line-heights to support focused scanning.
- Metadata (salary stipends, location tags, educational tier criteria, verification status) relies on crisp `label-md` and `label-sm` tokens with neutral slate coloring to prevent visual conflict with job titles.

## Layout & Spacing
The layout system follows a responsive 12-column fluid grid on desktop (max container width: `1280px`), adapting to an 8-column format on tablets and a 4-column layout on mobile viewports.

- **Breakpoints**: Mobile (< 640px), Tablet (640px – 1023px), Desktop (1024px – 1280px), Wide (> 1280px).
- **Margins**: Edge canvas spacing maintains `1rem` on mobile, scaling to `1.5rem` on tablet, and `2rem` to `2.5rem` on desktop.
- **Search & Filter Paradigm**: Desktop views utilize a persistent 280px left sidebar for multi-attribute filtering paired with an expansive card/detail split view. Mobile viewports collapse filters into a bottom sheet drawer accessible via a sticky bottom toolbar.
- **Spacing Rhythm**: All component padding, stack gaps, and inline spacings adhere strictly to an 8px base rhythm (`space-xs` through `space-xl`).

## Elevation & Depth
Depth is created through clean structural surface layers and crisp, low-contrast outlines rather than heavy skeuomorphism or artificial glow effects.

- **Surface Layers**: The background uses an ultra-subtle cool slate tone (`#F8FAFC`). Interactive cards, panels, and filter modules sit on solid pure white surfaces (`#FFFFFF`).
- **Outlines**: Structural definition relies primarily on 1px borders in neutral slate (`#E2E8F0`), creating high visual order without visual heaviness.
- **Shadow Profile**: Hover states and floating elements (such as application modals, popovers, and sticky action footers) employ soft, diffuse ambient shadows tinted slightly with navy slate (`rgba(15, 23, 42, 0.06)` with a 12px to 24px blur radius). Sharp dark drop shadows are forbidden.

## Shapes
The design system utilizes soft, calculated corner radiuses (`roundedness: 1`). 

- Default inputs, buttons, and alert badges use `0.375rem` (6px) to `0.5rem` (8px).
- Job listing cards, modal overlays, and application flow containers use `0.5rem` to `0.75rem` (12px).
- Badges and status pills use fully rounded circular ends (`9999px`) to create distinction between actionable cards and non-interactive status tags.

## Components

### Buttons
- **Primary**: Solid deep blue (`#1D4ED8`) background, white text, 8px radius, medium weight. Hover elevates to `#1E40AF` with a subtle translate transition.
- **Secondary**: Crisp white background with a 1px `#CBD5E1` border and `#1E293B` text. Hover shifts to `#F8FAFC`.
- **Tertiary / Ghost**: Transparent background, `#1D4ED8` text, used for secondary inline actions like "Lihat Detail" or "Simpan Lowongan".

### Job Cards
- Built on a solid white surface with a 1px `#E2E8F0` border.
- Includes company logo avatar (rounded 8px), role title in `headline-sm`, verified organization badge, location pill (e.g., "Jakarta Selatan • WFH/Hybrid"), stipend range indicator, and posting timestamp.
- Hover changes border color to `#93C5FD` accompanied by a soft 4px ambient shadow.

### Chips & Badges
- **Status Badges**: Semi-transparent tinted pills (`secondary` light teal `#CCFBF1` with `#0F766E` text for "Aktif Menerima Magang"; `#FEF3C7` with `#92400E` for "Segera Berakhir").
- **Filter Chips**: Neutral gray pills with quick dismiss icons (`×`) allowing applicants to clear education requirements, university affiliations, or location filters rapidly.

### Form Inputs & Selects
- Inputs feature high-legibility `#0F172A` values with `#64748B` placeholder text.
- Outlines use a baseline 1px `#CBD5E1` border, transitioning on focus to an intentional 2px `#1D4ED8` ring with no intrusive glow.
- Error states utilize `#DC2626` text paired with a soft `#FEF2F2` background tint.

### Checkboxes & Radios
- Square 18px boxes with 4px radius (or round 18px for radio buttons). Checked state fills with `#1D4ED8` featuring a sharp white SVG checkmark. Touch targets are padded to a minimum of 44x44px for accessible tap targets on mobile.

### Additional Civic Components
- **Verification Shield**: An inline badge indicating accredited institutions, certified Kampus Merdeka partners, or verified state/private enterprises.
- **Application Progress Stepper**: A structured linear progress tracker showing submission stages: "Terkirim" (Submitted), "Ditinjau" (Under Review), "Wawancara" (Interview), and "Hasil Seleksi" (Decision).