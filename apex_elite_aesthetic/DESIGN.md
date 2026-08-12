---
name: Apex Elite Aesthetic
colors:
  surface: '#131313'
  surface-dim: '#131313'
  surface-bright: '#3a3939'
  surface-container-lowest: '#0e0e0e'
  surface-container-low: '#1c1b1b'
  surface-container: '#201f1f'
  surface-container-high: '#2a2a2a'
  surface-container-highest: '#353534'
  on-surface: '#e5e2e1'
  on-surface-variant: '#e4beb4'
  inverse-surface: '#e5e2e1'
  inverse-on-surface: '#313030'
  outline: '#ab8980'
  outline-variant: '#5b4039'
  surface-tint: '#ffb5a0'
  primary: '#ffb5a0'
  on-primary: '#5f1500'
  primary-container: '#ff5722'
  on-primary-container: '#541200'
  inverse-primary: '#b02f00'
  secondary: '#e9c349'
  on-secondary: '#3c2f00'
  secondary-container: '#af8d11'
  on-secondary-container: '#342800'
  tertiary: '#c8c6c5'
  on-tertiary: '#313030'
  tertiary-container: '#929090'
  on-tertiary-container: '#2a2a2a'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#ffdbd1'
  primary-fixed-dim: '#ffb5a0'
  on-primary-fixed: '#3b0900'
  on-primary-fixed-variant: '#862200'
  secondary-fixed: '#ffe088'
  secondary-fixed-dim: '#e9c349'
  on-secondary-fixed: '#241a00'
  on-secondary-fixed-variant: '#574500'
  tertiary-fixed: '#e5e2e1'
  tertiary-fixed-dim: '#c8c6c5'
  on-tertiary-fixed: '#1c1b1b'
  on-tertiary-fixed-variant: '#474746'
  background: '#131313'
  on-background: '#e5e2e1'
  surface-variant: '#353534'
typography:
  display-lg:
    fontFamily: Montserrat
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  display-lg-mobile:
    fontFamily: Montserrat
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Montserrat
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: 0.01em
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-caps:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '700'
    lineHeight: 16px
    letterSpacing: 0.1em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  base: 8px
  container-margin-desktop: 64px
  container-margin-mobile: 20px
  gutter: 24px
  section-gap: 80px
---

## Brand & Style

This design system is engineered for an elite demographic that demands high performance wrapped in uncompromising luxury. The brand personality is prestigious, intense, and exclusive—evoking the feeling of a private members' club for world-class athletes.

The visual style is a fusion of **Modern Minimalism** and **Glassmorphism**. It utilizes a sophisticated "Dark Mode First" philosophy to emphasize exclusivity. Surfaces are treated with subtle tactile depth, using frosted textures and precise golden accents to signify premium status. The emotional response is one of focus, power, and high-stakes achievement.

## Colors

The palette is anchored by **Obsidian (#0A0A0A)** and **Charcoal (#1A1A1A)**, creating a deep, infinite canvas that feels expensive and focused. 

- **Action Orange (#FF5722):** Used exclusively for high-energy interaction points, progress indicators, and primary CTAs. It represents the "burn" of high-performance activity.
- **Champagne Gold (#D4AF37):** Reserved for achievement states, premium tier indicators, and subtle decorative accents. It should be used sparingly to maintain its sense of value.
- **Glass Overlays:** Backgrounds should utilize 60-80% opacity versions of the neutral tones with a 20px backdrop blur to create a sense of multi-layered depth.

## Typography

The typography system balances the aggressive, geometric strength of **Montserrat** for headlines with the clinical precision of **Inter** for data and body text.

Headlines should utilize tight letter-spacing to appear more impactful and "machined." All-caps styling is preferred for labels and secondary headers to reinforce the authoritative tone. For body text, maintain generous line heights to ensure readability against dark, high-contrast backgrounds.

## Layout & Spacing

The layout follows a **Fluid Grid** model with significant negative space to allow the "premium" elements to breathe.

- **Desktop:** 12-column grid with 64px outer margins.
- **Mobile:** 4-column grid with 20px outer margins.
- **Rhythm:** Use an 8px base unit. Component internal padding should favor larger vertical breathing room (e.g., 16px top/bottom vs 24px left/right) to create an elongated, elegant feel.

Content should be grouped in high-contrast "tiles" that use the grid to create a structured, dashboard-like interface typical of high-performance telemetry.

## Elevation & Depth

Hierarchy is established through **Glassmorphism** and **Ambient Shadows**.

1.  **Base Layer:** Solid Obsidian (#0A0A0A).
2.  **Mid Layer (Cards/Tiles):** Charcoal (#1A1A1A) with a 1px inner border (linear gradient: white at 10% opacity to white at 0% opacity) to simulate a "bezel" edge.
3.  **Top Layer (Modals/Popovers):** Translucent Charcoal with a 24px backdrop blur.

Shadows are "Long and Soft"—using a 15% opacity black with a 30px-40px blur radius to make elements feel like they are floating in deep space.

## Shapes

The shape language is **Soft** but disciplined. We avoid fully organic "pill" shapes for primary containers to maintain a serious, architectural tone.

- **Buttons & Inputs:** Use the standard 0.25rem (4px) radius for a "precision-cut" look.
- **Cards & Sections:** Use 0.75rem (12px) for a slightly softer, more approachable internal container feel.
- **Icons:** Must be stroke-based (2px weight), sharp-edged, and never filled unless active.

## Components

### Buttons
- **Primary:** Solid Action Orange with white or black text (depending on contrast). No gradient.
- **Secondary:** Transparent with a 1px Champagne Gold border and gold text.
- **Tertiary:** Text-only in gold with a chevron icon.

### Cards & Tiles
Cards use a "glass-well" effect: a subtle dark gradient from top-left to bottom-right, finished with a 1px semi-transparent border to catch the light.

### Inputs
Fields are dark-filled (slightly lighter than the background) with a 1px bottom-border only. On focus, the border transitions to Action Orange.

### Chips & Badges
Small, high-contrast pills. Use Action Orange for "Live" or "Active" states and Champagne Gold for "Elite" or "Pro" statuses.

### Interactive Elements
All hover states should include a subtle "glow" effect (box-shadow with primary color at very low opacity) to simulate high-tech backlit hardware.