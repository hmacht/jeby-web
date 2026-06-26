import { createJebyClient, type BoatParams } from '$lib/server/jeby-client';
import type { PageServerLoad } from './$types';

// Marthas Vineyard Sound, MA
const LOCATION = 'Marthas Vineyard Sound, MA';
const BUOY_ID = '44020'; // Nantucket Sound
const ZONE = 'ANZ233'; // Vineyard Sound forecast zone

// Grady-White Freedom 215 — the boat the BumpyScore is tuned to.
// API expects meters and kg: 21.5 ft ≈ 6.55 m, 3,150 lb ≈ 1429 kg.
const BOAT: BoatParams = { length: 6.55, weight: 1429 };

export const load: PageServerLoad = async ({ fetch }) => {
	const jeby = createJebyClient(fetch);

	const [conditions, forecast, alerts, images] = await Promise.all([
		jeby.conditions(BUOY_ID, BOAT),
		jeby.forecastSummary(ZONE),
		jeby.activeAlerts(ZONE),
		jeby.images(BUOY_ID)
	]);

	return {
		location: LOCATION,
		generatedAt: new Date().toISOString(),
		conditions,
		forecast,
		alerts: alerts ?? [],
		image360: images?.image360 ?? null
	};
};
