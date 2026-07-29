<script lang="ts">
	// One station's live readings as a labeled table. Formatting lives in
	// stationReadingRows so this component stays presentational.
	import LifeBuoy from '@lucide/svelte/icons/life-buoy';
	import RadioTower from '@lucide/svelte/icons/radio-tower';
	import { isMvco, stationReadingRows, type StationConditions } from '$lib/jeby/models';

	let {
		name,
		code,
		readings
	}: {
		name: string;
		code: string;
		readings: StationConditions | null;
	} = $props();

	const rows = $derived(stationReadingRows(readings));
	// Match the map marker: MVCO is a tower, everything else is a buoy.
	const Icon = $derived(isMvco(code) ? RadioTower : LifeBuoy);
</script>

<div class="overflow-hidden rounded-xl border border-border bg-surface">
	<h3
		class="flex items-center gap-2.5 border-b border-border py-2.5 pl-3 pr-4 text-sm font-semibold text-white"
	>
		<Icon size={16} class="shrink-0 text-red-500" />
		{name}
	</h3>
	<dl class="divide-y divide-border text-sm">
		{#each rows as row (row.label)}
			<div class="flex items-center justify-between px-4 py-2.5">
				<dt class="text-neutral-400">{row.label}</dt>
				<dd class="font-semibold text-white">{row.value}</dd>
			</div>
		{/each}
	</dl>
</div>
