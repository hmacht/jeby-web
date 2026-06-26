// Types and helpers for talking to the jeby-go API.

export interface MarineConditions {
	waveHeight: number | null; // meters
	wavePeriod: number | null; // seconds
	waveLength: number | null; // meters
	windSpeed: number | null; // m/s
	windDirectionDegrees: number | null;
	windDirectionCardinal: string | null;
	waterTemp: number | null; // degC
	bumpyScore: number | null; // 0 - 100
}

export interface ForecastSummary {
	today: string;
	full: string;
}

export interface Alert {
	event: string;
	description: string;
	severity: string;
}

export interface BuoyImages {
	image360: string | null;
}

// --- unit conversions -------------------------------------------------------

export const metersToFeet = (m: number) => m * 3.28084;
export const mpsToMph = (ms: number) => ms * 2.23694;
export const cToF = (c: number) => (c * 9) / 5 + 32;

// Turn an average wave height (meters) into a friendly feet range, e.g. "2-3".
export function seasRange(waveHeightMeters: number | null): string | null {
	if (waveHeightMeters == null) return null;
	const feet = metersToFeet(waveHeightMeters);
	const lo = Math.max(0, Math.floor(feet));
	const hi = Math.ceil(feet);
	return lo === hi ? `${hi}` : `${lo}-${hi}`;
}
