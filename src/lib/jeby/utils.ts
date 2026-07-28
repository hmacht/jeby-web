// Unit conversions and formatting helpers for marine data.

// --- unit conversions -------------------------------------------------------

export const metersToFeet = (m: number) => m * 3.28084;
export const mpsToMph = (ms: number) => ms * 2.23694;
export const cToF = (c: number) => (c * 9) / 5 + 32;

// --- formatting -------------------------------------------------------------

// Format a lat/long as e.g. "41.3250° N, 70.5667° W".
export function formatCoords(lat: number, long: number): string {
	const ns = `${Math.abs(lat).toFixed(4)}° ${lat >= 0 ? 'N' : 'S'}`;
	const ew = `${Math.abs(long).toFixed(4)}° ${long >= 0 ? 'E' : 'W'}`;
	return `${ns}, ${ew}`;
}
