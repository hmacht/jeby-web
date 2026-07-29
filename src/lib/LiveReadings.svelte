<script lang="ts">
	// Live readings section: a map of the source stations on the left, their
	// reading tables on the right.
	import ReadingsTable from '$lib/ReadingsTable.svelte';
	import StationMap from '$lib/StationMap.svelte';
	import { stationConditions, type Conditions, type Station } from '$lib/jeby/models';

	let {
		stations,
		conditions,
		stationImages = {}
	}: {
		stations: Station[];
		conditions: Conditions | null;
		stationImages?: Record<string, string | null>;
	} = $props();
</script>

<section>
	<h2 class="text-lg font-medium text-white">Live readings</h2>
	<p class="mt-2 max-w-md text-sm leading-relaxed text-neutral-400">
		Stations reporting data from around the vineyard.
	</p>

	<div class="mt-6 grid gap-6 lg:grid-cols-2">
		<!-- Map (left) -->
		<div class="min-h-80">
			{#if stations.length}
				<StationMap {stations} {stationImages} />
			{:else}
				<div
					class="flex h-full min-h-80 items-center justify-center rounded-xl border border-border bg-surface text-sm text-neutral-500"
				>
					Station map unavailable.
				</div>
			{/if}
		</div>

		<!-- Tables (right) -->
		<div class="space-y-6">
			{#each stations as station (station.code)}
				<ReadingsTable
					name={station.name}
					code={station.code}
					readings={stationConditions(conditions, station.code)}
				/>
			{:else}
				<p class="text-sm text-neutral-500">No stations reporting right now.</p>
			{/each}
		</div>
	</div>
</section>
