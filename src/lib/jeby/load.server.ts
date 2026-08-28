// The page load, shared by every route that renders the report. Each route's
// +page.server.ts delegates here so they can't drift apart.

import { createJebyClient } from '$lib/jeby/client.server';

// Marthas Vineyard Sound, MA — the backend is Vineyard-only, so the buoy/zone
// live server-side; the frontend only chooses which vessel to score.
const LOCATION = 'Marthas Vineyard Sound, MA';

// Jeby (the Freedom 215) is the default vessel when none is selected.
const DEFAULT_VESSEL = 'F215';

type Fetch = typeof globalThis.fetch;

export async function loadReport(fetch: Fetch, url: URL) {
	const jeby = createJebyClient(fetch);

	const vessels = (await jeby.vessels()) ?? [];

	// Pick the vessel from the URL, falling back to the default (and to the first
	// available vessel if the requested code isn't in the registry).
	const requested = url.searchParams.get('vessel')?.toUpperCase() ?? DEFAULT_VESSEL;
	const selected =
		vessels.find((v) => v.code === requested) ??
		vessels.find((v) => v.code === DEFAULT_VESSEL) ??
		vessels[0];
	const vesselCode = selected?.code ?? DEFAULT_VESSEL;

	const [conditions, forecast, alerts, images, stations, weather, storms] = await Promise.all([
		jeby.conditions(vesselCode),
		jeby.forecastSummary(),
		jeby.activeAlerts(),
		jeby.images(),
		jeby.stations(),
		jeby.currentWeather(),
		jeby.storms()
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
		storms
	};
}
