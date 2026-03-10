# DIMENSIONAL DUEL - Vertical Slice Prototype

A browser-playable sci-fi dimensional combat prototype implemented with TypeScript and Three.js rendering (loaded via CDN in this environment), structured for expansion toward the full campaign.

## Setup

### Requirements
- Node.js (for npm script execution)
- TypeScript compiler (`tsc`) available
- Browser with WebGL support
- Internet access to load Three.js CDN script at runtime

### Install
This environment blocks npm registry package installs, so no dependency install step is required for this slice.

### Run
1. Build TypeScript:
   ```bash
   npm run build
   ```
2. Serve locally:
   ```bash
   npm run dev
   ```
3. Open:
   ```
   http://127.0.0.1:4173/index.html
   ```

## Project Structure

- `src/main.ts` - Core game implementation and system orchestration.
  - game state manager (screen flow)
  - level manager (5 demo levels)
  - loadout manager (AR / Shotgun)
  - dimensional math utilities (1D..5D vectors)
  - projection utility (4D/5D -> renderable 3D)
  - combat, projectile-hit approximation, and AI behavior
  - HUD and progression persistence
- `src/styles/main.css` - high-contrast sci-fi UI and HUD styling.
- `index.html` - app entry and Three.js CDN load.
- `IMPLEMENTATION_STATUS.md` - current task completion state.
- `WORKLOG.md` - append-only development history.
- `NEXT_STEPS.md` - exact recommended follow-up task.
- `AGENTS.md` - continuity and anti-hallucination constraints for future runs.

## Controls

- `A / D` -> Axis 1 (x) movement
- `W / S` -> Axis 2 (y) movement (2D+)
- `Q / E` -> Axis 3 (z) movement (3D+)
- `R / F` -> Axis 4 (w) movement (4D+)
- `T / G` -> Axis 5 (v) movement (5D)
- `Shift` -> Sprint multiplier
- `Space` -> Fire equipped weapon

## Current Demo Levels (5 total)

1. **1D - Linear Breach**
   - True 1-axis duel corridor behavior (`x` only).
2. **2D - Planar Cut**
   - True planar (`x,y`) movement and combat logic.
3. **3D - Arena Volume**
   - True volumetric (`x,y,z`) movement.
4. **4D - W-Shift Gauntlet**
   - Internal coordinates are (`x,y,z,w`) with explicit W+/W- controls.
5. **5D - V-Phase Singularity**
   - Internal coordinates are (`x,y,z,w,v`) with fifth-axis movement.

Each level includes one rival AI plus wave pressure drones.

## Dimensional Math Representation

- 1D: `[x]`
- 2D: `[x, y]`
- 3D: `[x, y, z]`
- 4D: `[x, y, z, w]`
- 5D: `[x, y, z, w, v]`

Movement, AI chasing axis, distance checks, weapon range checks, and wave interactions all operate in the active dimensional space directly.

## 4D/5D Visualization Compromises

4D and 5D gameplay truth is maintained internally in N-dimensional vectors, while rendering uses deterministic projection into 3D:

- `x' = x + 0.45w - 0.28v`
- `y' = y + 0.25v`
- `z' = z + 0.35w`

This keeps adjacency and combat math N-dimensional while preserving browser-playable visualization.

## Implemented Vertical Slice Features

- Title screen
- Settings screen (sensitivity)
- Level select with progression lock/unlock
- Loadout screen before each level (AR / Shotgun)
- Rival AI weapon assignment (AR / Shotgun)
- HUD (wave, hp, dimension, active position)
- Win / lose / restart flow
- Basic save/progression via localStorage
- One wave-based combat scenario per level
- One rival AI opponent per level
- Distinct visual identities per dimension via palette/backdrop and encounter structure

## Next Steps Toward Full Campaign

See `NEXT_STEPS.md` for the exact recommended Task 2.
