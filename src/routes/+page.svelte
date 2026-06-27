<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { navigating, page } from '$app/state';
	import AlertBanner from '$lib/AlertBanner.svelte';
	import Modal from '$lib/Modal.svelte';
	import WaveDiagram from '$lib/WaveDiagram.svelte';
	import squiggle from '$lib/assets/squiggle.png';
	import noaaLogo from '$lib/assets/NOAA-color-logo.png';
	import ogImage from '$lib/assets/jeyb-open-web.png';
	import ZoomableImage from '$lib/ZoomableImage.svelte';
	import { cToF, metersToFeet, mpsToMph } from '$lib/jeby';
	import { onMount } from 'svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let showForecast = $state(false);
	let showDisclaimers = $state(false);

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
	const score = $derived(conditions?.bumpyScore?.score ?? null);
	const disclaimers = $derived(conditions?.bumpyScore?.disclaimers ?? []);

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

	// The Bumpy Score is calibrated to this specific boat.
	const BOAT = {
		name: 'Grady-White Freedom 215',
		length: '21.5 ft',
		weight: '3,150 lb',
		draft: '16 in'
	};

	// Number → string helpers that tolerate missing data.
	const num = (v: number | null | undefined, fn: (n: number) => number, digits = 0) =>
		v == null ? '—' : fn(v).toFixed(digits);

	// Social share metadata.
	const TITLE = 'MV Buoy';
	const DESCRIPTION = $derived(`Live marine conditions and a BumpyScore™ for ${data.location}.`);
	const ogImageUrl = $derived(new URL(ogImage, page.url.origin).href);
</script>

<svelte:head>
	<title>{TITLE}</title>
	<meta name="description" content={DESCRIPTION} />

	<!-- Open Graph -->
	<meta property="og:type" content="website" />
	<meta property="og:title" content={TITLE} />
	<meta property="og:description" content={DESCRIPTION} />
	<meta property="og:image" content={ogImageUrl} />
	<meta property="og:image:width" content="1920" />
	<meta property="og:image:height" content="1080" />
	<meta property="og:url" content={page.url.href} />

	<!-- Twitter -->
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content={TITLE} />
	<meta name="twitter:description" content={DESCRIPTION} />
	<meta name="twitter:image" content={ogImageUrl} />
</svelte:head>

<main class="min-h-screen bg-background px-6 pb-24 pt-10 text-white sm:px-12 lg:px-16">
	<!-- Header: greeting + hero on the left, live stats off to the right -->
	<header class="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
		<div>
			<div>
				<h1 class="text-2xl font-medium tracking-tight sm:text-3xl">Captain Macht</h1>
				<div class="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-0.5 text-lg text-neutral-500">
					<span>{data.location}</span>
					<span>{when}</span>
				</div>
			</div>

			<!-- Hero seas number -->
			<div class="mt-6 sm:mt-8">
				<div class="flex items-baseline gap-3">
					<span class="text-7xl font-normal leading-none tracking-tighter sm:text-8xl"
						>{seas ?? '—'}</span
					>
					<span class="text-2xl text-neutral-400 sm:text-3xl">ft seas</span>
				</div>
			</div>
		</div>

		<dl
			class="divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface text-base text-neutral-300 sm:space-y-1 sm:divide-y-0 sm:rounded-none sm:border-0 sm:bg-transparent sm:text-right sm:text-lg"
		>
			<div class="flex items-center justify-between px-4 py-2.5 sm:block sm:p-0">
				Wave length: <span class="font-semibold text-white"
					>{num(conditions?.waveLength, metersToFeet)} ft</span
				>
			</div>
			<div class="flex items-center justify-between px-4 py-2.5 sm:block sm:p-0">
				Wind: <span class="font-semibold text-white"
					>{num(conditions?.windSpeed, mpsToMph)} mph{conditions?.windDirectionCardinal
						? ` ${conditions.windDirectionCardinal}`
						: ''}</span
				>
			</div>
			<div class="flex items-center justify-between px-4 py-2.5 sm:block sm:p-0">
				Water temp: <span class="font-semibold text-white"
					>{num(conditions?.waterTemp, cToF)}°F</span
				>
			</div>
			<div class="flex items-center justify-between px-4 py-2.5 sm:block sm:p-0">
				Wave period: <span class="font-semibold text-white"
					>{conditions?.wavePeriod?.toFixed(0) ?? '—'} s</span
				>
			</div>
		</dl>
	</header>

	<!-- Decorative wave -->
	<div class="my-12 flex justify-center">
		<img src={squiggle} alt="" aria-hidden="true" class="h-3 w-auto" />
	</div>

	<!-- Mobile: Alert → Bumpy Score → Forecast (stacked). Desktop: Score+Forecast | Alert. -->
	<div class="flex flex-col gap-8 lg:flex-row lg:items-start">
		<!-- Alert: first on mobile, moves to the right on desktop -->
		<div class="order-first max-w-md space-y-3 lg:order-last lg:ml-auto">
			{#each data.alerts as alert (alert.event + alert.description)}
				<AlertBanner level={alertLevel(alert.severity)} title={alert.event}>
					{alert.description}
				</AlertBanner>
			{:else}
				<AlertBanner level="info">NOAA has no active alerts for this area.</AlertBanner>
			{/each}
		</div>

		<!-- Bumpy Score + Forecast: stacked on mobile, side by side on desktop -->
		<div class="flex flex-col gap-6 lg:flex-row">
			<div class="w-fit shrink-0">
				{#if disclaimers.length}
					<button
						type="button"
						class="group relative block text-left lg:text-center"
						onclick={() => (showDisclaimers = true)}
					>
						<div class="text-6xl font-normal leading-none">{score ?? '—'}</div>
						<div class="mt-1 text-sm text-neutral-400 transition group-hover:text-neutral-200">
							BumpyScore™
						</div>

						<!-- Hover tooltip -->
						<div
							class="pointer-events-none absolute left-1/2 top-full z-10 mt-2 w-64 -translate-y-1 rounded-lg border border-border bg-surface p-3 text-left text-xs leading-relaxed text-neutral-300 opacity-0 shadow-lg transition-all duration-150 group-hover:translate-y-0 group-hover:opacity-100"
						>
							<ul class="list-disc space-y-1 pl-4">
								{#each disclaimers as d (d)}
									<li>{d}</li>
								{/each}
							</ul>
						</div>
					</button>
				{:else}
					<div class="text-left lg:text-center">
						<div class="text-6xl font-normal leading-none">{score ?? '—'}</div>
						<div class="mt-1 text-sm text-neutral-400">BumpyScore™</div>
					</div>
				{/if}
			</div>
			<div class="hidden w-px self-stretch bg-neutral-700 lg:block"></div>
			<div class="max-w-md">
				<p class="text-sm leading-relaxed text-neutral-300">
					{#if data.forecast?.periods?.[0]}
						<span class="font-bold">{data.forecast.periods[0].header}:</span>
						{data.forecast.periods[0].text}
					{:else}
						Forecast unavailable right now.
					{/if}
				</p>
				{#if (data.forecast?.periods?.length ?? 0) > 1}
					<button
						type="button"
						class="mt-2 text-sm font-medium text-neutral-400 underline-offset-2 transition hover:text-white hover:underline"
						onclick={() => (showForecast = true)}
					>
						Full Forecast
					</button>
				{/if}
			</div>
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
			<ZoomableImage
				src={data.image360}
				alt="Latest 360° view from the buoy camera"
				class="w-full rounded-lg border border-border sm:rounded-2xl"
			/>
			<figcaption class="mt-2 text-sm text-neutral-500">Latest 360° view from the buoy</figcaption>
		</figure>
	{/if}

	<!-- Wave diagram hidden for now -->
	{#if false}
		<!-- Decorative wave -->
		<div class="my-12 flex justify-center">
			<img src={squiggle} alt="" aria-hidden="true" class="h-3 w-auto" />
		</div>

		<!-- Wave-spacing diagram (scrolls horizontally on small screens to stay legible) -->
		<div class="-mx-6 overflow-x-auto px-6 sm:mx-0 sm:px-0">
			<div class="min-w-[44rem]">
				<WaveDiagram
					waveLengthMeters={conditions?.waveLength ?? null}
					wavePeriodSeconds={conditions?.wavePeriod ?? null}
				/>
			</div>
		</div>
	{/if}

	<!-- Decorative wave -->
	<div class="my-12 flex justify-center">
		<img src={squiggle} alt="" aria-hidden="true" class="h-3 w-auto" />
	</div>

	<!-- How the score is tuned -->
	<section class="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-12">
		<div class="max-w-md">
			<h2 class="text-lg font-medium text-white">Tuned for a Freedom 215</h2>
			<p class="mt-2 text-sm leading-relaxed text-neutral-400">
				The BumpyScore™ is calibrated to how a beatiful {BOAT.name} takes on the seas. Its long heavy
				hull slices the swells differntly than lets say a 17' Boston Whaler Montauk, so we account for
				its specs in our calculations
			</p>
		</div>
		<dl
			class="divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface text-sm lg:ml-auto lg:w-80 lg:shrink-0"
		>
			<div class="flex items-center justify-between px-4 py-2.5">
				<dt class="text-neutral-400">Length</dt>
				<dd class="font-semibold text-white">{BOAT.length}</dd>
			</div>
			<div class="flex items-center justify-between px-4 py-2.5">
				<dt class="text-neutral-400">Weight</dt>
				<dd class="font-semibold text-white">{BOAT.weight}</dd>
			</div>
			<div class="flex items-center justify-between px-4 py-2.5">
				<dt class="text-neutral-400">Hull draft</dt>
				<dd class="font-semibold text-white">{BOAT.draft}</dd>
			</div>
		</dl>
	</section>
</main>

<footer
	class="fixed inset-x-0 bottom-0 flex items-center justify-between gap-2 border-t border-border bg-surface px-4 py-2 text-xs text-neutral-500 sm:px-6 sm:text-sm"
>
	<p class="flex items-center gap-2">
		<img src={noaaLogo} alt="" aria-hidden="true" class="h-5 w-5" />
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

	<div class="flex items-center gap-2">
		{#if loading}
			<span class="h-3 w-3 animate-spin rounded-full border-2 border-neutral-600 border-t-white"
			></span>
			Pulling data from NOAA
		{:else}
			<span class="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" aria-hidden="true"></span>
			<span class="italic">Last updated {lastUpdated}</span>
		{/if}
	</div>
</footer>

<Modal bind:open={showForecast} title="Marine forecast">
	<div class="space-y-4 font-mono">
		{#each data.forecast?.periods ?? [] as period (period.header)}
			<div>
				<h3 class="text-sm font-semibold tracking-wide text-white">{period.header}</h3>
				<p class="mt-1 text-sm leading-relaxed text-neutral-300">{period.text}</p>
			</div>
		{/each}
	</div>
</Modal>

<Modal bind:open={showDisclaimers} title="Today's BumpyScore™ Disclaimers">
	<ul class="list-disc space-y-2 pl-5 text-sm leading-relaxed text-neutral-300">
		{#each disclaimers as d (d)}
			<li>{d}</li>
		{/each}
	</ul>
</Modal>
