<script lang="ts">
	// Live readings section: a map of the source stations on the left, their
	// gradient cards on the right.
	//
	// The station-details modal lives here rather than in the map, so a marker tap
	// and a card's "Station details" button raise the same one.
	import ExternalLink from '@lucide/svelte/icons/external-link';
	import Modal from '$lib/Modal.svelte';
	import StationCard from '$lib/StationCard.svelte';
	import StationMap from '$lib/StationMap.svelte';
	import { stationConditions, type Conditions, type Station } from '$lib/jeby/models';
	import { formatCoords, metersToFeet } from '$lib/jeby/utils';

	let {
		stations,
		conditions,
		stationImages = {}
	}: {
		stations: Station[];
		conditions: Conditions | null;
		stationImages?: Record<string, string | null>;
	} = $props();

	// Per-station wave height in feet (one decimal) for the map badges.
	const readings = $derived.by(() => {
		const map: Record<string, string | null> = {};
		for (const station of stations) {
			const meters = stationConditions(conditions, station.code)?.waveHeight.value ?? null;
			map[station.code] = meters == null ? null : metersToFeet(meters).toFixed(1);
		}
		return map;
	});

	let selected = $state<Station | null>(null);
	let modalOpen = $state(false);

	// The station's live camera image (if any) for the modal.
	const liveImage = $derived(selected ? (stationImages[selected.code] ?? null) : null);

	function openDetails(station: Station) {
		selected = station;
		modalOpen = true;
	}
</script>

<section>
	<h2 class="text-lg font-medium text-white">Live readings</h2>
	<p class="mt-0.5 max-w-md text-sm leading-relaxed text-neutral-400">
		Stations reporting data from around the vineyard.
	</p>

	<div class="mt-6 grid gap-6 lg:grid-cols-2">
		<!-- Map (left) -->
		<div class="min-h-80">
			{#if stations.length}
				<StationMap {stations} {readings} onSelect={openDetails} />
			{:else}
				<div
					class="flex h-full min-h-80 items-center justify-center rounded-xl border border-border bg-surface text-sm text-neutral-500"
				>
					Station map unavailable.
				</div>
			{/if}
		</div>

		<!-- Cards (right) -->
		<div class="space-y-6">
			{#each stations as station (station.code)}
				<StationCard
					{station}
					readings={stationConditions(conditions, station.code)}
					onDetails={openDetails}
				/>
			{:else}
				<p class="text-sm text-neutral-500">No stations reporting right now.</p>
			{/each}
		</div>
	</div>
</section>

<Modal bind:open={modalOpen} title="Station Details">
	{#if selected}
		<div class="flex gap-4">
			<img
				src={selected.profileUrl}
				alt={selected.name}
				class="h-28 w-28 shrink-0 rounded-lg border border-border object-cover"
			/>
			<div class="min-w-0">
				<h3 class="text-base font-semibold text-white">{selected.name}</h3>
				<p class="mt-1 text-sm text-neutral-400">{formatCoords(selected.lat, selected.long)}</p>
				<a
					href={selected.detailsUrl}
					target="_blank"
					rel="external noopener noreferrer"
					class="mt-3 inline-flex items-center gap-1.5 text-sm text-white underline underline-offset-2 transition hover:text-neutral-300"
				>
					Station details
					<ExternalLink size={14} />
				</a>
			</div>
		</div>
		{#if liveImage}
			<img
				src={liveImage}
				alt="Latest view from {selected.name}"
				class="mt-4 w-full rounded-lg border border-border"
			/>
		{/if}
	{/if}
</Modal>
