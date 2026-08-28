<script lang="ts">
	// A compact weather readout for the top of the page: the NWS icon, the
	// temperature, and the one-line summary.
	import type { Weather } from '$lib/jeby/models';
	import { cToF } from '$lib/jeby/utils';

	let { weather }: { weather: Weather | null } = $props();

	const temp = $derived(
		weather?.airTemp.value == null ? '—' : `${Math.round(cToF(weather.airTemp.value))}°`
	);
</script>

{#if weather}
	<div class="flex items-center gap-2 sm:gap-3">
		{#if weather.iconUrl}
			<img
				src={weather.iconUrl}
				alt={weather.summary ?? 'Current conditions'}
				class="h-10 w-10 shrink-0 rounded-lg border border-border object-cover sm:h-14 sm:w-14 sm:rounded-xl"
			/>
		{/if}
		<div class="min-w-0">
			<div class="text-2xl font-semibold leading-none tracking-tight text-white sm:text-3xl">
				{temp}
			</div>
			{#if weather.summary}
				<p class="mt-1 truncate text-xs text-neutral-400 sm:text-sm">{weather.summary}</p>
			{/if}
		</div>
	</div>
{/if}
