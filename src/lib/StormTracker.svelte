<script lang="ts">
	// Storm tracker: whether it's storming now, whether one is expected today, and
	// the evidence behind both — observed phenomena, thunder/precip chances, and
	// the rest of today's outlook.
	import CloudLightning from '@lucide/svelte/icons/cloud-lightning';
	import WeatherSummary from '$lib/WeatherSummary.svelte';
	import { stormLevel, stormsMissing, type Storms, type Weather } from '$lib/jeby/models';

	let { storms, weather }: { storms: Storms | null; weather: Weather | null } = $props();

	// The headline: storming now beats expected, which beats an unknown, which
	// beats all clear. Unknown is painted neutral rather than green — we can't
	// promise a clear day on evidence we never got.
	const status = $derived.by(() => {
		switch (stormLevel(storms)) {
			case 'unavailable':
				return { text: 'Unavailable', tone: 'text-neutral-400', dot: 'bg-neutral-600' };
			case 'now':
				return { text: 'Storming now', tone: 'text-red-400', dot: 'bg-red-500' };
			case 'today':
				return { text: 'Storms expected today', tone: 'text-amber-400', dot: 'bg-amber-400' };
			case 'unknown':
				return { text: 'Storm data incomplete', tone: 'text-neutral-300', dot: 'bg-neutral-400' };
			case 'clear':
				return { text: 'No storms expected', tone: 'text-emerald-400', dot: 'bg-emerald-400' };
		}
	});

	// Shown under any state: a storm can be found with a source still down.
	const missing = $derived(stormsMissing(storms));

	const pct = (v: number | null) => (v == null ? '—' : `${Math.round(v)}%`);
</script>

<section class="flex min-h-80 flex-col rounded-2xl border border-border bg-surface p-5">
	<div class="flex items-center gap-2">
		<CloudLightning size={18} class="shrink-0 text-neutral-300" />
		<h3 class="text-base font-medium text-white">Storm Tracker</h3>
	</div>

	<!-- The air ashore right now -->
	{#if weather}
		<div class="mt-4">
			<WeatherSummary {weather} />
		</div>
	{/if}

	<!-- Headline -->
	<div class="mt-4 flex items-center gap-2">
		<span class="h-2 w-2 shrink-0 rounded-full {status.dot}" aria-hidden="true"></span>
		<span class="text-base font-semibold {status.tone}">{status.text}</span>
	</div>

	{#if missing}
		<p class="mt-1.5 text-xs leading-relaxed text-neutral-500">Could not reach {missing}.</p>
	{/if}

	{#if storms}
		<!-- What the station is reporting right now -->
		{#if storms.observed.length}
			<p class="mt-2 text-sm leading-relaxed text-neutral-300">
				{storms.observed.map((o) => o.text).join(', ')}
			</p>
		{/if}

		<!-- Chances across the rest of today -->
		<dl class="mt-5 grid grid-cols-2 gap-4">
			<div>
				<dt class="text-xs text-neutral-400">Thunder</dt>
				<dd class="mt-0.5 text-base font-semibold tabular-nums text-white">
					{pct(storms.thunderChance.value)}
				</dd>
			</div>
			<div>
				<dt class="text-xs text-neutral-400">Precipitation</dt>
				<dd class="mt-0.5 text-base font-semibold tabular-nums text-white">
					{pct(storms.precipitationChance.value)}
				</dd>
			</div>
		</dl>

		<!-- The rest of today -->
		<div class="mt-5 flex-1 space-y-2">
			{#each storms.outlook.slice(0, 3) as period (period.name)}
				<div class="flex items-start gap-2 text-sm">
					<span
						class="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full {period.stormy
							? 'bg-amber-400'
							: 'bg-neutral-600'}"
						aria-hidden="true"
					></span>
					<p class="leading-relaxed text-neutral-300">
						<span class="font-medium text-white">{period.name}:</span>
						{period.forecast}
					</p>
				</div>
			{/each}
		</div>
	{:else}
		<p class="mt-4 flex-1 text-sm text-neutral-400">Storm data unavailable right now.</p>
	{/if}
</section>
