<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { navigating, page } from '$app/state';
	import AlertBanner from '$lib/AlertBanner.svelte';
	import LiveReadings from '$lib/LiveReadings.svelte';
	import MarineForecast from '$lib/MarineForecast.svelte';
	import Modal from '$lib/Modal.svelte';
	import SiteFooter from '$lib/SiteFooter.svelte';
	import TopNav from '$lib/TopNav.svelte';
	import TunedFor from '$lib/TunedFor.svelte';
	import VesselSelect from '$lib/VesselSelect.svelte';
	import WaveDiagram from '$lib/WaveDiagram.svelte';
	import squiggle from '$lib/assets/squiggle.png';
	import noaaLogo from '$lib/assets/NOAA-color-logo.png';
	import whoiLogo from '$lib/assets/WHOI-color-logo.png';
	import mericaFlag from '$lib/assets/merica.png';
	import ogImage from '$lib/assets/jeyb-open-web.png';
	import ZoomableImage from '$lib/ZoomableImage.svelte';
	import LifeBuoy from '@lucide/svelte/icons/life-buoy';
	import Moon from '@lucide/svelte/icons/moon';
	import RadioTower from '@lucide/svelte/icons/radio-tower';
	import Sparkles from '@lucide/svelte/icons/sparkles';
	import { flattenConditions, STATION_CODE } from '$lib/jeby/models';
	import { metersToFeet } from '$lib/jeby/utils';
	import { onMount } from 'svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let showDisclaimers = $state(false);

	// The compact top nav slides in once the header scrolls out of view.
	let headerEl: HTMLElement;
	let showNav = $state(false);

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

		// Reveal the top nav once the header is fully scrolled past.
		const observer = new IntersectionObserver(([entry]) => {
			showNav = !entry.isIntersecting;
		});
		observer.observe(headerEl);

		return () => {
			clearInterval(id);
			observer.disconnect();
		};
	});

	const lastUpdated = $derived(
		new Date(data.generatedAt).toLocaleTimeString('en-US', {
			hour: 'numeric',
			minute: '2-digit'
		})
	);

	const conditions = $derived(data.conditions);

	// Station-merged readings for display (prefers the NOAA buoy, falls back to MVCO).
	const readings = $derived(flattenConditions(conditions));

	// Live camera image for each station, keyed by code (MVCO tower / NOAA buoy).
	const stationImages: Record<string, string | null> = $derived({
		[STATION_CODE.mvco]: data.asitcam2,
		[STATION_CODE.buoy]: data.buoy360
	});

	// The vessel the BumpyScore is currently computed for. Prefer the one echoed
	// back in the conditions payload; fall back to the registry entry if the
	// conditions call failed.
	const vessel = $derived(
		conditions?.vessel ?? data.vessels.find((v) => v.code === data.selectedVessel) ?? null
	);

	// Switching vessels re-runs the load via a URL query param, so the change is
	// SSR-friendly and shareable.
	function selectVessel(code: string) {
		goto(resolve(`/?vessel=${encodeURIComponent(code)}`), { keepFocus: true, noScroll: true });
	}

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

	// Hero seas number: the live wave height in feet, to one decimal (not rounded
	// to a whole number).
	const seas = $derived(
		readings.waveHeight == null ? null : metersToFeet(readings.waveHeight).toFixed(1)
	);
	const score = $derived(conditions?.bumpyScore?.score ?? null);
	const disclaimers = $derived(conditions?.bumpyScore?.disclaimers ?? []);
	const analysis = $derived(conditions?.bumpyScore?.analysis ?? null);

	// Overnight the backend pauses AI scoring and serves a quiet-hours message with
	// a null score. Detect it so we can show a closed eye instead of a dash.
	const inQuietHours = $derived((analysis ?? '').toLowerCase().includes('quiet hours'));

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

	// Social share metadata.
	const TITLE = 'Jeby';
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

<TopNav
	visible={showNav}
	title="The Jeby Report"
	vessels={data.vessels}
	selected={data.selectedVessel}
	disabled={loading || data.vessels.length === 0}
	onSelect={selectVessel}
/>

<main class="relative min-h-screen overflow-hidden px-6 pb-16 pt-10 text-white sm:px-12 lg:px-16">
	<!-- Faint blue glow bleeding in from the top of the page. -->
	<div
		aria-hidden="true"
		class="pointer-events-none absolute left-1/2 top-0 -z-10 h-96 w-[52rem] max-w-full -translate-x-1/2 -translate-y-1/3 rounded-[50%] bg-blue-500/50 blur-3xl"
	></div>

	<!-- Header: greeting + hero on the left, vessel picker off to the right -->
	<header
		bind:this={headerEl}
		class="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between"
	>
		<div>
			<div>
				<h1 class="text-2xl font-medium tracking-tight sm:text-3xl">The Jeby Report</h1>
				<div class="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-0.5 text-lg text-neutral-500">
					<span>{data.location}</span>
					·
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

		<!-- Vessel picker: choose which boat the BumpyScore is computed for. -->
		<VesselSelect
			vessels={data.vessels}
			selected={data.selectedVessel}
			disabled={loading || data.vessels.length === 0}
			onSelect={selectVessel}
		/>
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
				{#snippet scoreValue()}
					{#if inQuietHours}
						<Moon size={48} class="mx-auto block text-neutral-400" />
					{:else}
						{score ?? '—'}
					{/if}
				{/snippet}
				{#if disclaimers.length}
					<button
						type="button"
						class="group relative block text-left lg:text-center"
						onclick={() => (showDisclaimers = true)}
					>
						<div class="text-6xl font-normal leading-none">{@render scoreValue()}</div>
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
						<div class="text-6xl font-normal leading-none">{@render scoreValue()}</div>
						<div class="mt-1 text-sm text-neutral-400">BumpyScore™</div>
					</div>
				{/if}
			</div>
			<div class="hidden w-px self-stretch bg-neutral-700 lg:block"></div>
			<div class="max-w-md">
				<!-- Gradient (light → dark blue) referenced by the sparkle icon below. -->
				<svg aria-hidden="true" width="0" height="0" class="absolute">
					<defs>
						<linearGradient id="sparkle-gradient" x1="0" y1="0" x2="1" y2="1">
							<stop offset="0%" stop-color="#7dd3fc" />
							<stop offset="100%" stop-color="#1d4ed8" />
						</linearGradient>
					</defs>
				</svg>

				<div class="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-white">
					{#if inQuietHours}
						Quiet Hours
					{:else}
						<Sparkles size={16} color="url(#sparkle-gradient)" />
						AI Analysis
					{/if}
				</div>
				<p class="text-sm leading-relaxed text-neutral-300">
					{#if analysis}
						{analysis}
					{:else}
						BumpyScore™ analysis unavailable right now.
					{/if}
				</p>
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
	{#if data.buoy360}
		<figure class="mt-12">
			<ZoomableImage
				src={data.buoy360}
				alt="Latest 360° view from the buoy camera"
				class="w-full rounded-lg border border-border sm:rounded-2xl"
			/>
			<figcaption class="mt-2 flex items-center gap-1.5 text-sm text-neutral-500">
				<LifeBuoy size={14} class="shrink-0" />
				Latest 360° view from the buoy
			</figcaption>
		</figure>
	{/if}

	<!-- Live MVCO ASIT webcam -->
	{#if data.asitcam2}
		<figure class="mt-8">
			<ZoomableImage
				src={data.asitcam2}
				alt="Latest view from the MVCO ASIT tower webcam"
				class="w-full rounded-lg border border-border sm:rounded-2xl"
			/>
			<figcaption class="mt-2 flex items-center gap-1.5 text-sm text-neutral-500">
				<RadioTower size={14} class="shrink-0" />
				Latest view from the MVCO ASIT tower
			</figcaption>
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
					waveLengthMeters={readings.waveLength}
					wavePeriodSeconds={readings.wavePeriod}
				/>
			</div>
		</div>
	{/if}

	<!-- Decorative wave -->
	<div class="my-12 flex justify-center">
		<img src={squiggle} alt="" aria-hidden="true" class="h-3 w-auto" />
	</div>

	<LiveReadings stations={data.stations} {conditions} {stationImages} />

	<!-- Decorative wave -->
	<div class="my-12 flex justify-center">
		<img src={squiggle} alt="" aria-hidden="true" class="h-3 w-auto" />
	</div>

	<MarineForecast forecast={data.forecast} location={data.location} />

	{#if vessel}
		<!-- Decorative wave -->
		<div class="my-12 flex justify-center">
			<img src={squiggle} alt="" aria-hidden="true" class="h-3 w-auto" />
		</div>

		<TunedFor {vessel} />
	{/if}
</main>

<SiteFooter />

<!-- Persistent live-status bar. -->
<footer
	class="fixed inset-x-0 bottom-0 z-30 flex items-center justify-between gap-2 border-t border-border bg-surface px-4 py-2 text-xs text-neutral-500 sm:px-6 sm:text-sm"
>
	<p class="flex items-center gap-2">
		<img src={noaaLogo} alt="" aria-hidden="true" class="h-5 w-5" />
		<a
			href="https://www.ndbc.noaa.gov/station_page.php?station=44020"
			target="_blank"
			rel="noopener noreferrer"
			class="text-white underline underline-offset-2 transition hover:text-neutral-300"
		>
			NOAA
		</a>
		&amp;
		<img src={whoiLogo} alt="" aria-hidden="true" class="h-5 w-5" />
		<a
			href="https://mvco.whoi.edu/"
			target="_blank"
			rel="noopener noreferrer"
			class="text-white underline underline-offset-2 transition hover:text-neutral-300"
		>
			WHOI
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
		<img src={mericaFlag} alt="American flag" class="h-2 w-auto self-center" />
	</div>
</footer>

<Modal bind:open={showDisclaimers} title="Today's BumpyScore™ Disclaimers">
	<ul class="list-disc space-y-2 pl-5 text-sm leading-relaxed text-neutral-300">
		{#each disclaimers as d (d)}
			<li>{d}</li>
		{/each}
	</ul>
</Modal>
