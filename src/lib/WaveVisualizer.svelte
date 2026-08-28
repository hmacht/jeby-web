<script lang="ts">
	// The wave card: what each station is reading, and the live sea underneath —
	// a drifting line per station, on those same readings.
	import WavesHorizontal from '@lucide/svelte/icons/waves-horizontal';
	import WaveAnimation, { WAVE_LINE_COLORS } from '$lib/WaveAnimation.svelte';
	import { isMvco, stationConditions, type Conditions, type Station } from '$lib/jeby/models';
	import { metersToFeet } from '$lib/jeby/utils';

	let {
		stations,
		conditions
	}: {
		stations: Station[];
		conditions: Conditions | null;
	} = $props();

	const feet = (meters: number | null | undefined, digits = 0) =>
		meters == null ? '—' : `${metersToFeet(meters).toFixed(digits)} ft`;

	// One row per station rather than a single merged set, so a disagreement
	// between them is visible in the numbers as well as in the lines below.
	const rows = $derived(
		stations.map((station, i) => {
			const reading = stationConditions(conditions, station.code);
			return {
				code: station.code,
				label: isMvco(station.code) ? 'MVCO' : 'Buoy',
				// Same order the animation draws them in, so a station's label and
				// its line are the one color.
				color: WAVE_LINE_COLORS[i],
				height: feet(reading?.waveHeight.value, 1),
				length: feet(reading?.waveLength.value),
				period: reading?.wavePeriod.value == null ? '—' : `${reading.wavePeriod.value.toFixed(0)} s`
			};
		})
	);
</script>

<section class="flex min-h-80 flex-col rounded-2xl border border-border bg-surface p-5">
	<div class="flex items-center gap-2">
		<WavesHorizontal size={18} class="shrink-0 text-sky-400" />
		<h3 class="text-base font-medium text-white">Wave Visualizer</h3>
	</div>

	<!-- Station readings, condensed to a row each. One grid for the whole table,
		headings included — separate grids per row would each size their own columns
		and the values wouldn't line up under the headings. -->
	<div class="mt-4 grid grid-cols-[auto_1fr_1fr_1fr] items-baseline gap-x-4 gap-y-1">
		<span></span>
		<span class="text-xs text-neutral-500">Height</span>
		<span class="text-xs text-neutral-500">Length</span>
		<span class="text-xs text-neutral-500">Period</span>

		{#each rows as row (row.code)}
			<span class="text-xs font-medium" style="color: {row.color}">{row.label}</span>
			<span class="text-lg font-semibold tabular-nums text-white">{row.height}</span>
			<span class="text-lg font-semibold tabular-nums text-white">{row.length}</span>
			<span class="text-lg font-semibold tabular-nums text-white">{row.period}</span>
		{/each}
	</div>

	<!-- Centered vertically in whatever room is left once the card matches its
		neighbours; flush left across it. -->
	<div class="flex flex-1 items-center justify-start pt-5">
		<div class="w-full">
			<WaveAnimation {stations} {conditions} />
		</div>
	</div>
</section>
