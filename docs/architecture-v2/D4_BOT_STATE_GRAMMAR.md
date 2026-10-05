# D4 Bot State Grammar & Animation Semantics

## 1. Visual State Grammar

The Living HQ projects task execution into 6 primary operational states:

1. **IDLE**: Role assigned to pending or dormant task. Static positioning, baseline opacity.
2. **ACTIVE**: Task is RUNNING with an active `ExecutionItem`. Bot displays `liveActivity: true` with gentle orientation tracking or functional pulse.
3. **BLOCKED**: Task is waiting on unsatisfied upstream dependencies. Rendered with reduced saturation and static anchor position.
4. **WORKER_SUCCEEDED**: Worker has generated candidate output and completed its lease. **Crucial Rule**: Rendered cleanly without celebration, jumping, confetti, or fireworks.
5. **VERIFIED_PASS**: Independent reviewer or verifier confirmed output correctness. Marked with solid verification indicator.
6. **AWAITING_HUMAN_APPROVAL**: Task requires sovereign human decision. Marked with distinct pulsing amber attention indicator.

## 2. Animation Semantics & Invariants

```
ANIMATION != EXECUTION
BOT_MOVEMENT != TASK_PROGRESS
BOT_SUCCESS_ANIMATION != VERIFIED_SUCCESS
BOT_CELEBRATION != HUMAN_APPROVAL
```

### Invariants:
- **Single Render Loop**: All role-bot visual updates occur inside `WorldRenderer.tick()`. No `setInterval` or secondary `requestAnimationFrame` loops exist.
- **Demand-Driven / Clamped Motion**: Ticks only advance visual interpolation. No unbounded physics simulations.
- **Reduced-Motion Policy**: When system or user requests reduced motion (`reducedMotion: true`), all continuous bot rotations and pulsing effects are clamped to 0. Silhouettes and color tints remain fully distinct.
