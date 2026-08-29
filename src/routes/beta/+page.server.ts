import { loadReport } from '$lib/jeby/load.server';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = (event) => loadReport(event);
