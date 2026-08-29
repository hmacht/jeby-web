// Server-only client for the jeby-go backend API.
// The `.server` suffix keeps the private API URL/key from ever reaching the browser.

import { env } from '$env/dynamic/private';
import type {
	Alert,
	Conditions,
	ForecastSummary,
	Images,
	Station,
	Storms,
	Tides,
	Vessel,
	Weather
} from '$lib/jeby/models';

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

// Bind a client to a request's `fetch` so SvelteKit can dedupe/serialize the
// calls into the SSR payload. The backend is Vineyard-only, so buoy/zone are
// fixed server-side and no location params are needed.
export function createJebyClient(fetch: Fetch) {
	return {
		vessels() {
			return getJSON<Vessel[]>(fetch, '/vessels');
		},
		stations() {
			return getJSON<Station[]>(fetch, '/marine/stations');
		},
		conditions(vesselCode: string) {
			return getJSON<Conditions>(
				fetch,
				`/marine/conditions?vessel=${encodeURIComponent(vesselCode)}`
			);
		},
		images() {
			return getJSON<Images>(fetch, '/marine/images');
		},
		forecastSummary() {
			return getJSON<ForecastSummary>(fetch, '/marine/forecast');
		},
		activeAlerts() {
			return getJSON<Alert[]>(fetch, '/marine/alerts');
		},
		tides() {
			return getJSON<Tides>(fetch, '/marine/tides');
		},
		currentWeather() {
			return getJSON<Weather>(fetch, '/weather/current');
		},
		storms() {
			return getJSON<Storms>(fetch, '/weather/storms');
		}
	};
}

export type JebyClient = ReturnType<typeof createJebyClient>;
