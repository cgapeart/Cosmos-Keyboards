/**
 * Various intersection-finding algorithms.
 *
 * The general naming convertion is intersect<A><B>, where A and B are two shapes.
 */

import { Vector2 } from 'three/src/math/Vector2.js'
import Trsf, { Vector } from './modeling/transformation'

/** Determine whether two 2D polygons intersect each other. */
export function intersectPolyPoly(a: Vector2[], b: Vector2[]) {
  for (let i = 0; i < a.length; i++) {
    const side = new Vector2().copy(a[i]).sub(a[(i + 1) % a.length]).normalize()
    const normal = new Vector2(-side.y, side.x)

    const projA = a.map(p => p.dot(normal))
    const projB = b.map(p => p.dot(normal))
    if (Math.max(...projA) < Math.min(...projB) || Math.min(...projA) > Math.max(...projB)) {
      return false
    }
  }
  for (let i = 0; i < b.length; i++) {
    const side = new Vector2().copy(b[i]).sub(b[(i + 1) % b.length]).normalize()
    const normal = new Vector2(-side.y, side.x)

    const projA = a.map(p => p.dot(normal))
    const projB = b.map(p => p.dot(normal))
    if (Math.max(...projA) < Math.min(...projB) || Math.min(...projA) > Math.max(...projB)) {
      return false
    }
  }
  return true
}

// https://stackoverflow.com/a/29915728
export function intersectPtPoly(point: number[], vs: number[][]) {
  if (vs.includes(point)) return true
  // ray-casting algorithm based on
  // https://wrf.ecse.rpi.edu/Research/Short_Notes/pnpoly.html

  var x = point[0], y = point[1]

  var inside = false
  for (var i = 0, j = vs.length - 1; i < vs.length; j = i++) {
    var xi = vs[i][0], yi = vs[i][1]
    var xj = vs[j][0], yj = vs[j][1]

    var intersect = ((yi > y) != (yj > y))
      && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)
    if (intersect) inside = !inside
  }

  return inside
}

export function* intersectLineCircle(pa: Vector, pb: Vector, porigin: Vector, radius: number) {
  const origin = porigin.clone().sub(pb)
  const a = pa.clone().sub(pb)

  const qa = a.x * origin.x + a.y * origin.y
  const qb = Math.sqrt((a.x * radius) ** 2 + (a.y * radius) ** 2 - (a.x * origin.y - a.y * origin.x) ** 2)
  const qc = a.x ** 2 + a.y ** 2

  for (const solution of [(qa + qb) / qc, (qa - qb) / qc]) {
    if (solution >= 0 && solution <= 1) {
      yield pb.clone().addScaledVector(a, solution)
    }
  }
}

export function* intersectTriCircle(a: Vector, b: Vector, c: Vector, origin: Vector, radius: number) {
  yield* intersectLineCircle(a, b, origin, radius)
  yield* intersectLineCircle(b, c, origin, radius)
  yield* intersectLineCircle(c, a, origin, radius)
}

/**
 * Returns the intersection point between a bezier curve
 * and a plane containing both its endpoints, in approximate
 * direction xDir.
 *
 * To simplify the math, I first perform a rotation that fixes
 * the first point at (0, 0, 0) and the second point at (0, 0, 1).
 * The intersection point is when the line crosses the x axis.
 */
export function intersectBezierSamePlane(curve: [Vector, Vector, Vector, Vector], xDir: Vector) {
  const axZ = curve[3].clone().sub(curve[0]).normalize()
  const axX = xDir.clone().addScaledVector(axZ, -xDir.dot(axZ)).normalize()
  if (axX.x == 0 && axX.y == 0 && axX.z == 0) return // If the line is exactly straight

  const rotationMat = new Trsf().coordSystemChange(curve[0], axX, axZ)
  const rotMatInv = rotationMat.inverted()

  const p1 = rotMatInv.apply(curve[1])
  const p2 = rotMatInv.apply(curve[2])
  const p3 = rotMatInv.apply(curve[3])

  let tsol = p1.x / (p1.x - p2.x)
  if (tsol <= 0 || tsol >= 1) return

  const pt = new Vector()
    .addScaledVector(p1, (1 - tsol) ** 2 * tsol)
    .addScaledVector(p2, (1 - tsol) * tsol * tsol)
    .addScaledVector(p3, tsol * tsol * tsol)
  return pt.applyMatrix4(rotationMat.Matrix4())
}

export function intersectBezierTSamePlane(curve: [Trsf, Trsf, Trsf, Trsf], xDir: Vector) {
  return intersectBezierSamePlane([curve[0].origin(), curve[1].origin(), curve[2].origin(), curve[3].origin()], xDir)
}
