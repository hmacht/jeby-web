<script lang="ts">
	// One station's live readings. A normal surface card with a border and just a
	// touch of the station's tint washing in from the top-left; the details button
	// is a circle in the top-right. Formatting lives in stationReadingRows.
	import ArrowUpRight from '@lucide/svelte/icons/arrow-up-right';
	import LifeBuoy from '@lucide/svelte/icons/life-buoy';
	import RadioTower from '@lucide/svelte/icons/radio-tower';
	import {
		isMvco,
		stationReadingRows,
		type Station,
		type StationConditions
	} from '$lib/jeby/models';

	let {
		station,
		readings,
		onDetails
	}: {
		station: Station;
		readings: StationConditions | null;
		onDetails: (station: Station) => void;
	} = $props();

	const rows = $derived(stationReadingRows(readings));
	const mvco = $derived(isMvco(station.code));
	// Match the map badge: MVCO is a tower, everything else is a buoy.
	const Icon = $derived(mvco ? RadioTower : LifeBuoy);
	const tint = $derived(mvco ? 'var(--color-mvco)' : 'var(--color-buoy)');
</script>

<div
	class="flex flex-col rounded-2xl border border-border bg-surface p-5"
	class:station-tint--mvco={mvco}
	class:station-tint--buoy={!mvco}
>
	<div class="flex items-start justify-between gap-3">
		<div class="min-w-0">
			<h3 class="text-[17px] font-bold uppercase leading-tight text-white">{station.name}</h3>
			<p class="mt-1 flex items-center gap-1.5 text-xs font-semibold uppercase text-neutral-400">
				<Icon size={14} color={tint} class="shrink-0" />
				{mvco ? 'MVCO Sensor' : 'NOAA Buoy'} &bull; {Math.round(station.depthMeters)} m deep
			</p>
		</div>

		<button
			type="button"
			onclick={() => onDetails(station)}
			aria-label="Station details"
			title="Station details"
			class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border bg-white/5 text-neutral-300 transition hover:bg-white/10 hover:text-white"
		>
			<ArrowUpRight size={16} />
		</button>
	</div>

	{#if readings}
		<dl class="mt-4 grid grid-cols-2 gap-4">
			{#each rows as row (row.label)}
				<div>
					<dt class="text-xs font-semibold uppercase text-neutral-400">{row.label}</dt>
					<dd class="mt-0.5 text-xl font-bold tabular-nums text-white">{row.value}</dd>
				</div>
			{/each}
		</dl>
	{:else}
		<p class="mt-4 text-sm text-neutral-400">No readings available.</p>
	{/if}
</div>

<style>
	/* A touch of the station's tint washing in from the top-left over the surface. */
	.station-tint--mvco {
		background-image: linear-gradient(
			135deg,
			color-mix(in srgb, var(--color-mvco) 14%, transparent),
			transparent 55%
		);
	}
	.station-tint--buoy {
		background-image: linear-gradient(
			135deg,
			color-mix(in srgb, var(--color-buoy) 14%, transparent),
			transparent 55%
		);
	}
</style>
