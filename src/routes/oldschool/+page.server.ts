import { loadReport } from '$lib/jeby/load.server';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ fetch, url }) => loadReport(fetch, url);
