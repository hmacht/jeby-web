<script lang="ts">
	// Marine forecast section: a preview of the next NOAA period plus a button that
	// opens the full multi-period forecast in a modal. Owns its own modal state.
	import Modal from '$lib/Modal.svelte';
	import type { ForecastSummary } from '$lib/jeby/models';

	let { forecast, location }: { forecast: ForecastSummary | null; location: string } = $props();

	let showForecast = $state(false);

	const periods = $derived(forecast?.periods ?? []);
</script>

<section class="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-12">
	<div class="max-w-md">
		<h2 class="text-lg font-medium text-white">Marine forecast</h2>
		<p class="mt-2 text-sm leading-relaxed text-neutral-400">
			The latest NOAA marine forecast for {location}.
		</p>
		{#if periods.length > 0}
			<button
				type="button"
				class="mt-3 inline-block rounded-lg border border-border bg-surface px-3 py-2 text-sm font-medium text-white transition hover:border-neutral-500"
				onclick={() => (showForecast = true)}
			>
				View NOAA Marine forecast
			</button>
		{/if}
	</div>
	<div
		class="rounded-xl border border-border bg-surface p-4 text-sm lg:ml-auto lg:w-80 lg:shrink-0"
	>
		{#if periods[0]}
			<h3 class="font-semibold text-white">{periods[0].header}</h3>
			<p class="mt-1 leading-relaxed text-neutral-300">{periods[0].text}</p>
		{:else}
			<p class="text-neutral-400">Forecast unavailable right now.</p>
		{/if}
	</div>
</section>

<Modal bind:open={showForecast} title="Marine forecast">
	<div class="space-y-4 font-mono">
		{#each periods as period (period.header)}
			<div>
				<h3 class="text-sm font-semibold tracking-wide text-white">{period.header}</h3>
				<p class="mt-1 text-sm leading-relaxed text-neutral-300">{period.text}</p>
			</div>
		{/each}
	</div>
</Modal>
