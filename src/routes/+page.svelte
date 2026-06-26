<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { navigating } from '$app/state';
	import AlertBanner from '$lib/AlertBanner.svelte';
	import Modal from '$lib/Modal.svelte';
	import { cToF, metersToFeet, mpsToMph } from '$lib/jeby';
	import { onMount } from 'svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let showForecast = $state(false);

	// Re-pull fresh NOAA data on an interval. invalidateAll() alone doesn't set
	// `navigating`, so track our own flag for the loading indicator.
	let refreshing = $state(false);
	const loading = $derived(refreshing || navigating.to != null);

	async function refresh() {
		if (refreshing) return;
		refreshing = true;
		try {
			await invalidateAll();
		} finally {
			refreshing = false;
		}
	}

	onMount(() => {
		const id = setInterval(refresh, 10 * 60_000);
		return () => clearInterval(id);
	});

	const lastUpdated = $derived(
		new Date(data.generatedAt).toLocaleTimeString('en-US', {
			hour: 'numeric',
			minute: '2-digit'
		})
	);

	const conditions = $derived(data.conditions);

	// Map NOAA severity strings onto our banner levels.
	function alertLevel(severity: string): 'info' | 'warning' | 'danger' {
		switch (severity) {
			case 'Extreme':
			case 'Severe':
				return 'danger';
			case 'Moderate':
				return 'warning';
			default:
				return 'info';
		}
	}

	const when = $derived(
		new Date(data.generatedAt).toLocaleString('en-US', {
			weekday: 'long',
			hour: 'numeric',
			minute: '2-digit'
		})
	);

	// Buoys report a single live wave-height reading, so show one rounded value.
	const seas = $derived(
		conditions?.waveHeight == null ? null : Math.round(metersToFeet(conditions.waveHeight))
	);
	const score = $derived(conditions?.bumpyScore ?? null);

	// Gradient stops used by the bumpy-score bar (evenly spaced 0 → 100).
	const SCORE_STOPS = ['#4ade80', '#a3e635', '#facc15', '#fb923c', '#ef4444', '#a855f7'];

	// Sample the gradient color at a given 0-100 position so the dot border
	// matches the bar underneath it.
	function colorAt(pct: number): string {
		const p = Math.min(100, Math.max(0, pct)) / 100;
		const span = 1 / (SCORE_STOPS.length - 1);
		const i = Math.min(SCORE_STOPS.length - 2, Math.floor(p / span));
		const t = (p - i * span) / span;
		const lerp = (a: number, b: number) => Math.round(a + (b - a) * t);
		const hex = (c: string) => [1, 3, 5].map((s) => parseInt(c.slice(s, s + 2), 16));
		const [r1, g1, b1] = hex(SCORE_STOPS[i]);
		const [r2, g2, b2] = hex(SCORE_STOPS[i + 1]);
		return `rgb(${lerp(r1, r2)}, ${lerp(g1, g2)}, ${lerp(b1, b2)})`;
	}

	const dotColor = $derived(score == null ? '#ffffff' : colorAt(score));

	// Number → string helpers that tolerate missing data.
	const num = (v: number | null | undefined, fn: (n: number) => number, digits = 0) =>
		v == null ? '—' : fn(v).toFixed(digits);
</script>

<svelte:head>
	<title>Jeby — {data.location}</title>
</svelte:head>

<main class="min-h-screen bg-background px-6 pb-24 pt-10 text-white sm:px-12 lg:px-16">
	<!-- Header: location + hero on the left, live stats off to the right -->
	<header class="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
		<div>
			<div class="flex items-baseline gap-4">
				<h1 class="text-2xl font-medium tracking-tight">{data.location}</h1>
				<span class="text-lg text-neutral-500">{when}</span>
			</div>

			<!-- Hero seas number -->
			<div class="mt-8">
				<div class="flex items-baseline gap-3">
					<span class="text-8xl font-normal leading-none tracking-tighter">{seas ?? '—'}</span>
					<span class="text-3xl text-neutral-400">ft seas</span>
				</div>
			</div>
		</div>

		<dl class="space-y-1 text-right text-lg text-neutral-300">
			<div>
				Wave height: <span class="font-semibold text-white">{seas ?? '—'} ft</span>
			</div>
			<div>
				Wind: <span class="font-semibold text-white"
					>{num(conditions?.windSpeed, mpsToMph)} mph{conditions?.windDirectionCardinal
						? ` ${conditions.windDirectionCardinal}`
						: ''}</span
				>
			</div>
			<div>
				Water temp: <span class="font-semibold text-white"
					>{num(conditions?.waterTemp, cToF)}°F</span
				>
			</div>
			<div>
				Wave period: <span class="font-semibold text-white"
					>{conditions?.wavePeriod?.toFixed(0) ?? '—'} s</span
				>
			</div>
		</dl>
	</header>

	<!-- Decorative wave -->
	<div class="my-12 flex justify-center text-neutral-700">
		<svg width="200" height="24" viewBox="0 0 200 24" fill="none" aria-hidden="true">
			<path
				d="M0 12 Q12.5 0 25 12 T50 12 T75 12 T100 12 T125 12 T150 12 T175 12 T200 12"
				stroke="currentColor"
				stroke-width="2"
				fill="none"
			/>
		</svg>
	</div>

	<!-- Score + forecast + alert -->
	<div class="grid gap-8 lg:grid-cols-2 lg:items-stretch">
		<div class="flex gap-6">
			<div class="shrink-0 text-center">
				<div class="text-6xl font-normal leading-none">{score ?? '—'}</div>
				<div class="mt-1 text-sm text-neutral-400">Bumpy Score</div>
			</div>
			<div class="w-px self-stretch bg-neutral-700"></div>
			<div class="max-w-md">
				<p class="text-sm leading-relaxed text-neutral-300">
					<span class="font-bold">Forecast:</span>
					{data.forecast?.today || 'Forecast unavailable right now.'}
				</p>
				{#if data.forecast?.full}
					<button
						type="button"
						class="mt-2 text-sm font-medium text-neutral-400 underline-offset-2 transition hover:text-white hover:underline"
						onclick={() => (showForecast = true)}
					>
						Read more
					</button>
				{/if}
			</div>
		</div>

		<div class="ml-auto max-w-md space-y-3">
			{#each data.alerts as alert (alert.event + alert.description)}
				<AlertBanner level={alertLevel(alert.severity)} title={alert.event}>
					{alert.description}
				</AlertBanner>
			{:else}
				<AlertBanner level="info">NOAA has no active alerts for this area.</AlertBanner>
			{/each}
		</div>
	</div>

	<!-- Bumpy score gradient bar -->
	<div class="mt-12">
		<div
			class="relative h-2 w-full rounded-full bg-[linear-gradient(to_right,#4ade80,#a3e635,#facc15,#fb923c,#ef4444,#a855f7)]"
		>
			{#if score != null}
				<div
					class="absolute top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-4 bg-white shadow"
					style="left: {Math.min(100, Math.max(0, score))}%; border-color: {dotColor}"
				></div>
			{/if}
		</div>
		<div class="mt-3 flex justify-between text-sm text-neutral-500">
			<span>0</span>
			<span>25</span>
			<span>50</span>
			<span>75</span>
			<span>100</span>
		</div>
	</div>

	<!-- Live buoy camera -->
	{#if data.image360}
		<figure class="mt-12">
			<img
				src={data.image360}
				alt="Latest 360° view from the buoy camera"
				class="w-full rounded-2xl border border-border"
			/>
			<figcaption class="mt-2 text-sm text-neutral-500">Latest 360° view from the buoy</figcaption>
		</figure>
	{/if}
</main>

<div
	class="fixed bottom-0 right-0 flex items-center gap-2 pb-2 pr-4 text-sm text-neutral-500 sm:pr-6"
>
	{#if loading}
		<span class="h-3 w-3 animate-spin rounded-full border-2 border-neutral-600 border-t-white"
		></span>
		Pulling data from NOAA
	{:else}
		<span class="italic">Last updated {lastUpdated}</span>
	{/if}
</div>

<p class="fixed bottom-0 left-0 pb-2 pl-4 text-sm text-neutral-500 sm:pl-6">
	Data from
	<a
		href="https://www.ndbc.noaa.gov/station_page.php?station=44020"
		target="_blank"
		rel="noopener noreferrer"
		class="text-white underline underline-offset-2 transition hover:text-neutral-300"
	>
		NOAA
	</a>
</p>

<Modal bind:open={showForecast} title="Full marine forecast">
	<pre class="whitespace-pre-wrap font-mono text-sm leading-relaxed text-neutral-300">{data.forecast
			?.full ?? ''}</pre>
</Modal>
