// Sun position at latitude 45 N, and the air temperature on a hot day of the year. Simplified: no equation of time, no atmosphere.
export const LAT = 45;
const rad = (d: number) => (d * Math.PI) / 180;
export const declinationDeg = (day: number) => 23.44 * Math.sin((2 * Math.PI * (284 + day)) / 365);
/** Elevation and azimuth (degrees, azimuth clockwise from north) at a day of the year and solar hour (12 = noon). */
export function sunAt(day: number, hour: number) {
  const dec = rad(declinationDeg(day)), lat = rad(LAT), H = rad(15 * (hour - 12)), sinEl = Math.sin(lat) * Math.sin(dec) + Math.cos(lat) * Math.cos(dec) * Math.cos(H), el = Math.asin(Math.max(-1, Math.min(1, sinEl)));
  const cosAz = (Math.sin(dec) - Math.sin(el) * Math.sin(lat)) / (Math.cos(el) * Math.cos(lat) || 1e-9), az = Math.acos(Math.max(-1, Math.min(1, cosAz))) * (hour > 12 ? -1 : 1);   // the sun is east of the meridian in the morning
  return { elevationDeg: (el * 180) / Math.PI, azimuthDeg: ((az * 180) / Math.PI + 360) % 360 };
}
/** Air temperature (C): a seasonal mean peaking in mid July with a daily swing peaking at 15:00; a hot summer afternoon reaches about 32. */
export const airTemp = (day: number, hour: number) => 12 + 14 * Math.sin((2 * Math.PI * (day - 110)) / 365) + 6 * Math.sin((2 * Math.PI * (hour - 9)) / 24);
export const DAY = { jan: 15, apr: 105, jul: 196, oct: 288 };
export const MONTH_DAY = (m: number) => Math.round((m - 0.5) * 30.4);
