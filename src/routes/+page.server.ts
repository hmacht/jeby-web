import { createJebyClient, type BoatParams } from '$lib/server/jeby-client';
import type { PageServerLoad } from './$types';

// Marthas Vineyard Sound, MA
const LOCATION = 'Marthas Vineyard Sound, MA';
const BUOY_ID = '44020'; // Nantucket Sound
const ZONE = 'ANZ233'; // Vineyard Sound forecast zone

// Reasonable default boat so the BumpyScore has something to chew on.
const BOAT: BoatParams = { length: 8, weight: 3000 };

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
