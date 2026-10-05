# D3 WebGL Degradation & Fallback Strategy

## 1. 3-Tier Degradation Ladder

The Living HQ projection engine adapts dynamically to hardware constraints and context loss:

1. **`FULL_3D`**:
   - WebGL2 hardware acceleration active.
   - 3D spatial models, interactive lighting, real-time animation pulses, raycast picking.
2. **`REDUCED_3D`**:
   - Low-tier or battery-saving mode.
   - Simplified geometries, zero pulse animations, reduced draw distance.
3. **`SEMANTIC_ONLY`**:
   - WebGL disabled, unsupported, or context lost.
   - Canvas removed from DOM.
   - 100% accessible HTML outline and Command Center remain fully operational.

## 2. Context Loss Handling

- On `webglcontextlost`, the system:
  1. Prevents default browser crash behavior.
  2. Transitions degradation state immediately to `SEMANTIC_ONLY`.
  3. Displays an accessible warning banner: `"3D unavailable (WebGL context lost). Semantic outline and Command Center remain fully usable."`
  4. Keeps all operator inspection and approval flows intact.
