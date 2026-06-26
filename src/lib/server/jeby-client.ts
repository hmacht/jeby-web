// Server-only client for the jeby-go backend API.
// Lives under $lib/server so the private API URL never reaches the browser.

import { env } from '$env/dynamic/private';
import type { Alert, BuoyImages, ForecastSummary, MarineConditions } from '$lib/jeby';

const API_BASE = env.JEBY_API_URL ?? 'http://localhost:8080';

type Fetch = typeof globalThis.fetch;

// Fetch + parse JSON, returning null on any network/HTTP/parse failure so a
// single flaky endpoint never takes down the whole page.
async function getJSON<T>(fetch: Fetch, path: string): Promise<T | null> {
	try {
		const res = await fetch(`${API_BASE}${path}`);
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
				`/marine/${buoyId}/conditions?boatLength=${boat.length}&boatWeight=${boat.weight}`
			);
		},
		images(buoyId: string) {
			return getJSON<BuoyImages>(fetch, `/marine/${buoyId}/images`);
		},
		forecastSummary(zone: string) {
			return getJSON<ForecastSummary>(fetch, `/marine/forecast/summary?zone=${zone}`);
		},
		activeAlerts(zone: string) {
			return getJSON<Alert[]>(fetch, `/alerts/active?zone=${zone}`);
		}
	};
}

export type JebyClient = ReturnType<typeof createJebyClient>;
