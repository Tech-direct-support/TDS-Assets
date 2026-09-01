import type { GeofenceShape } from "@/lib/types/database";

const EARTH_RADIUS_M = 6371000;

function toRad(deg: number) {
  return (deg * Math.PI) / 180;
}

/** Great-circle distance between two lat/lng points, in metres. */
export function haversineDistanceM(
  a: [number, number],
  b: [number, number]
): number {
  const [lat1, lon1] = a;
  const [lat2, lon2] = b;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(s));
}

/** Ray-casting point-in-polygon test. Points are [lat, lng] pairs. */
export function pointInPolygon(point: [number, number], polygon: [number, number][]): boolean {
  const [py, px] = point;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [yi, xi] = polygon[i];
    const [yj, xj] = polygon[j];
    const intersects =
      yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
}

/** Whether a point lies within a geofence's shape. */
export function isPointInsideGeofence(point: [number, number], shape: GeofenceShape): boolean {
  if ("radius_m" in shape) {
    return haversineDistanceM(point, shape.center) <= shape.radius_m;
  }
  return pointInPolygon(point, shape.points);
}

export function geofenceCenter(shape: GeofenceShape): [number, number] {
  if ("center" in shape) return shape.center;
  const [sumLat, sumLng] = shape.points.reduce(
    ([lat, lng], [pLat, pLng]) => [lat + pLat, lng + pLng],
    [0, 0]
  );
  return [sumLat / shape.points.length, sumLng / shape.points.length];
}
