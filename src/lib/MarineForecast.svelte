<script lang="ts">
	// NOAA marine forecast card: a preview of the next couple of periods. The
	// circle button in the header opens the full multi-period forecast in a modal.
	// Owns its own modal state.
	import Binoculars from '@lucide/svelte/icons/binoculars';
	import CloudSun from '@lucide/svelte/icons/cloud-sun';
	import Modal from '$lib/Modal.svelte';
	import type { ForecastSummary } from '$lib/jeby/models';

	let { forecast }: { forecast: ForecastSummary | null } = $props();

	let showForecast = $state(false);

	const periods = $derived(forecast?.periods ?? []);
</script>

<section class="flex flex-col rounded-2xl border border-border bg-surface p-5">
	<div class="flex items-center gap-2">
		<CloudSun size={18} class="shrink-0 text-neutral-300" />
		<h3 class="text-base font-medium text-white">Marine Forecast</h3>
		{#if periods.length > 0}
			<button
				type="button"
				onclick={() => (showForecast = true)}
				aria-label="View full forecast"
				title="View full forecast"
				class="ml-auto flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border bg-white/5 text-neutral-300 transition hover:bg-white/10 hover:text-white"
			>
				<Binoculars size={16} />
			</button>
		{/if}
	</div>

	<div class="mt-4 flex-1 space-y-3">
		{#each periods.slice(0, 2) as period (period.header)}
			<div>
				<h4 class="text-sm font-semibold text-white">{period.header}</h4>
				<p class="mt-1 line-clamp-4 text-sm leading-relaxed text-neutral-300">{period.text}</p>
			</div>
		{:else}
			<p class="text-sm text-neutral-400">Forecast unavailable right now.</p>
		{/each}
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
