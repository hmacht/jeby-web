<script lang="ts">
	// One station's live readings as a labeled table. Formatting lives in
	// stationReadingRows so this component stays presentational.
	import { stationReadingRows, type StationConditions } from '$lib/jeby/models';

	let { name, readings }: { name: string; readings: StationConditions | null } = $props();

	const rows = $derived(stationReadingRows(readings));
</script>

<div class="overflow-hidden rounded-xl border border-border bg-surface">
	<h3 class="border-b border-border px-4 py-2.5 text-sm font-semibold text-white">{name}</h3>
	<dl class="divide-y divide-border text-sm">
		{#each rows as row (row.label)}
			<div class="flex items-center justify-between px-4 py-2.5">
				<dt class="text-neutral-400">{row.label}</dt>
				<dd class="font-semibold text-white">{row.value}</dd>
			</div>
		{/each}
	</dl>
</div>
