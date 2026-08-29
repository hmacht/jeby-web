// The page load, shared by every route that renders the report. Each route's
// +page.server.ts delegates here so they can't drift apart.

import { createJebyClient } from '$lib/jeby/client.server';

// Marthas Vineyard Sound, MA — the backend is Vineyard-only, so the buoy/zone
// live server-side; the frontend only chooses which vessel to score.
const LOCATION = 'Marthas Vineyard Sound, MA';

// Jeby (the Freedom 215) is the default vessel when none is selected.
const DEFAULT_VESSEL = 'F215';

type Fetch = typeof globalThis.fetch;

// The slice of the load event this needs. Taking the event rather than loose
// arguments means a route can't forget to pass one along.
interface ReportEvent {
	fetch: Fetch;
	url: URL;
	setHeaders: (headers: Record<string, string>) => void;
}

// The report is the same for every visitor at a given URL — the vessel is a
// query param and there's nothing per-user in it — so a shared cache can serve
// one render to everyone. s-maxage only binds CDNs, not browsers, so switching
// vessels still re-renders for the person doing it. stale-while-revalidate lets
// the edge answer instantly from a slightly old copy while it refreshes behind
// the request, which is the same bargain the backend's upstream cache makes.
const CACHE_CONTROL = 'public, s-maxage=60, stale-while-revalidate=600';

export async function loadReport({ fetch, url, setHeaders }: ReportEvent) {
	const jeby = createJebyClient(fetch);

	setHeaders({ 'cache-control': CACHE_CONTROL });

	// Started before the vessel is known, because none of them take one. Only
	// conditions() does, and awaiting the registry in front of all seven put a
	// whole round trip on the critical path for nothing. Calling without `await`
	// starts the request now and collects it below; getJSON never rejects, so
	// these can't become unhandled rejections while they're in flight.
	const forecastPending = jeby.forecastSummary();
	const alertsPending = jeby.activeAlerts();
	const imagesPending = jeby.images();
	const stationsPending = jeby.stations();
	const weatherPending = jeby.currentWeather();
	const stormsPending = jeby.storms();
	const tidesPending = jeby.tides();

	const vessels = (await jeby.vessels()) ?? [];

	// Pick the vessel from the URL, falling back to the default (and to the first
	// available vessel if the requested code isn't in the registry).
	const requested = url.searchParams.get('vessel')?.toUpperCase() ?? DEFAULT_VESSEL;
	const selected =
		vessels.find((v) => v.code === requested) ??
		vessels.find((v) => v.code === DEFAULT_VESSEL) ??
		vessels[0];
	const vesselCode = selected?.code ?? DEFAULT_VESSEL;

	const [conditions, forecast, alerts, images, stations, weather, storms, tides] =
		await Promise.all([
			jeby.conditions(vesselCode),
			forecastPending,
			alertsPending,
			imagesPending,
			stationsPending,
			weatherPending,
			stormsPending,
			tidesPending
		]);

	return {
		location: LOCATION,
		generatedAt: new Date().toISOString(),
		vessels,
		selectedVessel: vesselCode,
		conditions,
		forecast,
		alerts: alerts ?? [],
		buoy360: images?.buoy360 ?? null,
		asitcam2: images?.asitcam2 ?? null,
		stations: stations ?? [],
		weather,
		storms,
		tides
	};
}
