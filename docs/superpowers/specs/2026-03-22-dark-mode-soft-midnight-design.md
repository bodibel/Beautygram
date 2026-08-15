# Dark Mode Redesign — Soft Midnight

**Date:** 2026-03-22
**Status:** Approved

## Problem

The existing dark mode palette uses warm brown tones (`#1C1410` background, `#2A1E16` surface) that conflict with the app's beauty/salon aesthetic and are visually unpleasant.

## Solution

Replace the brown dark mode palette with **Soft Midnight** — a cool, deep blue-gray palette inspired by GitHub's dark theme. The primary peach color (`#C87860`) is preserved unchanged, as it creates an appealing warm-on-cool contrast.

## Color Mapping

| Token | Old (Brown) | New (Soft Midnight) |
|---|---|---|
| `--color-background` | `#1C1410` | `#0D1117` |
| `--color-surface` | `#2A1E16` | `#161B22` |
| `--color-surface-glass` | `rgba(42,30,22,0.85)` | `rgba(22,27,34,0.85)` |
| `--color-foreground` | `#F4EDE8` | `#E6EDF3` |
| `--color-primary` | `#D48A72` | `#C87860` (same as light) |
| `--color-primary-hover` | `#E09A82` | `#D4896A` |
| `--color-secondary` | `#2A1E16` | `#161B22` |
| `--color-secondary-foreground` | `#F4EDE8` | `#E6EDF3` |
| `--color-muted` | `#241810` | `#21262D` |
| `--color-muted-foreground` | `#A08070` | `#8B949E` |
| `--color-border` | `rgba(200,128,106,0.2)` | `rgba(48,54,61,0.8)` |
| `--color-input` | `rgba(200,128,106,0.2)` | `rgba(48,54,61,0.8)` |
| `--color-ring` | `#D48A72` | `#C87860` |
| `--color-popover` | `#2A1E16` | `#161B22` |
| `--color-popover-foreground` | `#F4EDE8` | `#E6EDF3` |
| `--color-primary-subtle` | `rgba(200,120,96,0.12)` | `rgba(200,120,96,0.12)` (unchanged) |
| `--color-accent-warm` | `#C07858` | `#C87860` |

## Implementation

Single file change: `app/globals.css` — replace the `.dark {}` block.
