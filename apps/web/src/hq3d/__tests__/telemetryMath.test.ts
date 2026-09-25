import { describe, it, expect } from 'vitest'

interface TelemetryBaseline {
  drawCalls: number
  triangles: number
  geometries: number
  fps: number
}

interface TelemetryClosure {
  drawCalls: number
  triangles: number
  geometries: number
  fps: number
}

export function computeTelemetryDeltas(baseline: TelemetryBaseline, closure: TelemetryClosure) {
  const drawCallsDelta = closure.drawCalls - baseline.drawCalls
  const drawCallsPercent = Number(((drawCallsDelta / baseline.drawCalls) * 100).toFixed(2))

  const trianglesDelta = closure.triangles - baseline.triangles
  const trianglesPercent = Number(((trianglesDelta / baseline.triangles) * 100).toFixed(2))

  const geometriesDelta = closure.geometries - baseline.geometries
  const geometriesPercent = Number(((geometriesDelta / baseline.geometries) * 100).toFixed(2))

  const fpsDelta = Number((closure.fps - baseline.fps).toFixed(2))

  const regressions: string[] = []
  const improvements: string[] = []

  if (drawCallsDelta < 0) {
    improvements.push(`Draw calls consolidated by ${Math.abs(drawCallsDelta)} (${Math.abs(drawCallsPercent)}% reduction)`)
  } else if (drawCallsDelta > 0) {
    regressions.push(`Draw calls increased by ${drawCallsDelta} (${drawCallsPercent}%)`)
  }

  if (trianglesDelta > 0) {
    improvements.push(`Geometry fidelity enhanced by ${trianglesDelta} triangles (${trianglesPercent}%)`)
  } else if (trianglesDelta < 0) {
    regressions.push(`Triangles reduced by ${Math.abs(trianglesDelta)} (${Math.abs(trianglesPercent)}%)`)
  }

  if (fpsDelta >= 0) {
    improvements.push(`FPS maintained or improved (+${fpsDelta} FPS)`)
  } else {
    regressions.push(`FPS reduced by ${Math.abs(fpsDelta)} FPS`)
  }

  return {
    drawCallsDelta,
    drawCallsPercent,
    trianglesDelta,
    trianglesPercent,
    geometriesDelta,
    geometriesPercent,
    fpsDelta,
    regressions,
    improvements,
  }
}

describe('Telemetry Delta Comparison Math (Wave 12H-R3C)', () => {
  it('correctly calculates draw call reductions and logs them as improvements', () => {
    const baseline = { drawCalls: 653, triangles: 51556, geometries: 605, fps: 57.0 }
    const closure = { drawCalls: 459, triangles: 54752, geometries: 586, fps: 46.0 }

    const result = computeTelemetryDeltas(baseline, closure)

    expect(result.drawCallsDelta).toBe(-194)
    expect(result.drawCallsPercent).toBeCloseTo(-29.71, 1)
    expect(result.trianglesDelta).toBe(3196)
    expect(result.trianglesPercent).toBeCloseTo(6.2, 1)
    expect(result.geometriesDelta).toBe(-19)
    expect(result.fpsDelta).toBe(-11.0)

    expect(result.improvements).toHaveLength(2)
    expect(result.improvements[0]).toContain('Draw calls consolidated by 194')
    expect(result.improvements[1]).toContain('Geometry fidelity enhanced by 3196 triangles')

    expect(result.regressions).toHaveLength(1)
    expect(result.regressions[0]).toContain('FPS reduced by 11 FPS')
  })
})
