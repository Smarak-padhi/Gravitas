# GRAVITAS 3D HEADQUARTERS — VISUAL DIRECTION & AESTHETIC SPECIFICATION
## "The Modern Architectural Miniature"

> **CORE AESTHETIC MOTTO**: An inhabited precision atelier, not a video game simulation.  
> **KEYWORDS**: Architectural · Tactile · Modern · Precise · Quietly Futuristic · Miniature · Inhabited · Operational · Serious · Restrained Technology.  
> **RESTRAINT PRINCIPLE**: Modern architectural precision — NOT steampunk. Eliminate Victorian mechanical spectacles, brass pneumatic tubes, twin-pan balance scales, and floor-hatch theatrics.

---

## 1. Aesthetic Anti-Patterns (Explicitly Forbidden)

To guarantee that Gravitas maintains developer authority and serious operational credibility, the visual direction eliminates both sci-fi clutter and steampunk tropes:

```
[❌ FORBIDDEN CLICHÉS]
- Steampunk tropes: Brass pneumatic tubes, Victorian gears, steam pipes, mechanical levers
- Fake theatrics: Twin-pan balance scales, medieval wax stamps, trap-door hatches
- Cyberpunk clichés: Neon wireframe grids, pink/cyan scanlines, holographic runes
- Cartoon mascots: Big heads, goofy walk cycles, bobblehead proportions
- Generic corporate office: Gray cubicles, beige watercoolers, generic potted plants
- Heavy photorealism: Uncanny human faces, dirty photoreal grime
- Videogame HUD clutter: Circular health rings, floating floating numbers, arcade badges
```

---

## 2. The Modern Architectural Miniature Metaphor

The 3D Headquarters is rendered as a **bespoke physical architectural miniature crafted from authentic, modern materials**:
- Imagine a high-end architectural studio model crafted for an advanced technology pavilion: solid natural American walnut, brushed architectural brass inlays, honed limestone pavers, frameless acoustic glass, and clean matte vellum work tablets.
- **Modern Spatial Conduits**: Instead of noisy pneumatic tubes, task folios transit along clean, recessed optical guide channels flush with the floor and desk surfaces.
- **Precision Digital Inspection**: In the Verification Lab, the Verifier audits candidate mutations using a high-density digital comparison console and optical diff scanner, rather than a theatrical twin-pan balance scale.
- **Integrated Repository Dock**: Approved candidate commits route into a sleek, recessed repository transit slot with a clean emerald confirmation bezel, rather than an opening floor trapdoor.

---

## 3. Physical Material & PBR Palette

All 3D materials utilize standard Physically Based Rendering (PBR - `MeshStandardMaterial`):

| Material Identifier | Physical Reference | Diffuse / Albedo Hex | Roughness | Metalness | Application in HQ |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`MAT_WALNUT_SOLID`** | Hand-rubbed American Walnut | `#3D2E24` | 0.65 | 0.00 | Worker workstations, architectural partitions, plinth bases. |
| **`MAT_BRASS_ACCENT`**  | Brushed Architectural Brass | `#C29B38` | 0.35 | 0.75 | Recessed conduit bezels, lift carriage frame, subtle accents. |
| **`MAT_STONE_LIMESTONE`**| Honed Warm Limestone | `#E8E4DA` | 0.85 | 0.00 | Ground operations floor, central corridor pavers. |
| **`MAT_STEEL_GUNMETAL`**| Powder-coated Tool Steel | `#242831` | 0.45 | 0.70 | Server rack cabinets, device matrix wall stanchions. |
| **`MAT_GLASS_CLEANROOM`**| Low-Iron Architectural Glass | `#F0FDF8` (Opacity: 0.18) | 0.10 | 0.10 | Verification Lab acoustic partitions, cleanroom bench. |
| **`MAT_VELLUM_FOLIO`**   | Heavy Matte Digital Tablet | `#FAF7EE` | 0.70 | 0.00 | Task work packets, execution contract blueprints. |
| **`MAT_INDIGO_WORKWEAR`**| Minimalist Indigo Poplin | `#202B3E` | 0.80 | 0.00 | Codex worker utility jacket. |
| **`MAT_OCHRE_WORKWEAR`** | Structured Ochre Poplin | `#4A3B2C` | 0.85 | 0.00 | FCC / Claude worker smock. |
| **`MAT_SAGE_CLEANROOM`** | Tailored Cleanroom Poplin | `#DCE7E1` | 0.75 | 0.00 | Independent Verifier laboratory coat. |

---

## 4. Modern Architectural Lighting Strategy

1. **Key Directional Light (Studio Key)**:
   - Color: Warm Sunlight (`#FFF5E6`, 3400K), Intensity: `1.2`.
   - Vector: \([-16.0\text{m}, 28.0\text{m}, -12.0\text{m}]\), angled at \(55^{\circ}\).
   - Shadows: Soft contact shadow map (\(2048 \times 2048\), PCFSoftShadowMap, bias \(-0.0005\)).
2. **Fill Ambient Light (Diffuse Sky Dome)**:
   - Color: Cool Skylight (`#DCE6F5`, 6000K), Intensity: `0.45`.
   - Ensures shadow-side geometry and unselected stations remain crisp and legible.
3. **Dedicated Functional Spotlights**:
   - **Mission Planning Spotlight**: Neutral spot (\(4000\text{K}\), cone \(40^{\circ}\)) illuminating active DAG folios.
   - **Verification Cleanroom Spot**: Focused cool white spot (\(5000\text{K}\), cone \(35^{\circ}\)) illuminating the audit bench.
   - **Approval Mezzanine Spotlight**: Warm amber spotlight (\(3000\text{K}\), cone \(25^{\circ}\)) highlighting candidate packets awaiting human approval.

---

## 5. Authoritative Status Color Palette

All status emissions in 3D (LED indicators, conduit guide lines, packet status bezels) strictly align with the existing CSS tokens in `apps/web/src/styles/theme.css`:

```css
/* Authoritative State Colors */
--state-ready:      #94a3b8; /* Slate / Standby Crisp Neutral */
--state-running:    #38bdf8; /* Precision Cyan / Sapphire Pulse */
--state-verifying:  #fbbf24; /* Amber / Clinical Gold Strobe */
--state-waiting:    #fde047; /* High-Visibility Canary Yellow Beacon */
--state-success:    #4ade80; /* Verified Solid Emerald */
--state-failure:    #f87171; /* Unrecoverable Crimson Error */
```

### Modern Visual Treatment of Task Packets by State:
- **`PLANNED`**: Matte vellum tablet with muted slate border, resting in the Planning Table queue tray.
- **`READY`**: Tablet elevates \(3\text{mm}\) with crisp white rim lighting; ready slot bezel illuminates.
- **`RUNNING`**: Tablet docks on worker desk with subtle sapphire ambient light radiating on the desk blotter.
- **`VERIFYING`**: Tablet docks on cleanroom bench; dual amber optical scan lines sweep across the diff surface.
- **`WAITING_APPROVAL`**: Tablet rests under the Mezzanine spotlight with an active amber status beacon.
- **`APPROVED`**: Solid gold embossed verification mark appears on tablet; conduit indicator glows emerald.
- **`FAILED`**: Crimson status bezel with error code badge; red hazard line on station.
