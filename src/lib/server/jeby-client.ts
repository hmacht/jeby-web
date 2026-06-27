// Server-only client for the jeby-go backend API.
// Lives under $lib/server so the private API URL/key never reach the browser.

import { env } from '$env/dynamic/private';
import type { Alert, BuoyImages, ForecastSummary, MarineConditions } from '$lib/jeby';

const API_BASE = env.JEBY_API_URL ?? 'http://localhost:8080';
const API_ROOT = `${API_BASE}/api/v1`;
const API_KEY = env.JEBY_API_KEY ?? '';

type Fetch = typeof globalThis.fetch;

// Fetch + parse JSON, returning null on any network/HTTP/parse failure so a
// single flaky endpoint never takes down the whole page.
async function getJSON<T>(fetch: Fetch, path: string): Promise<T | null> {
	try {
		const res = await fetch(`${API_ROOT}${path}`, {
			headers: { 'X-API-Key': API_KEY }
		});
		if (!res.ok) return null;
		return (await res.json()) as T;
	} catch {
		return null;
	}
}

export interface BoatParams {
	length: number; // meters
	weight: number; // kg
}

// Bind a client to a request's `fetch` so SvelteKit can dedupe/serialize the
// calls into the SSR payload.
export function createJebyClient(fetch: Fetch) {
	return {
		conditions(buoyId: string, boat: BoatParams) {
			return getJSON<MarineConditions>(
				fetch,
				`/marine/buoys/${buoyId}/conditions?boatLength=${boat.length}&boatWeight=${boat.weight}`
			);
		},
		images(buoyId: string) {
			return getJSON<BuoyImages>(fetch, `/marine/buoys/${buoyId}/images`);
		},
		forecastSummary(zoneId: string) {
			return getJSON<ForecastSummary>(fetch, `/marine/zones/${zoneId}/forecast/summary`);
		},
		activeAlerts(zoneId: string) {
			return getJSON<Alert[]>(fetch, `/marine/zones/${zoneId}/alerts/active`);
		}
	};
}

export type JebyClient = ReturnType<typeof createJebyClient>;
