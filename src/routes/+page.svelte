<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { navigating, page } from '$app/state';
	import AlertBanner from '$lib/AlertBanner.svelte';
	import BumpyScoreCard from '$lib/BumpyScoreCard.svelte';
	import CaptainSuggestions from '$lib/CaptainSuggestions.svelte';
	import LiveReadings from '$lib/LiveReadings.svelte';
	import MarineForecast from '$lib/MarineForecast.svelte';
	import WaveVisualizer from '$lib/WaveVisualizer.svelte';
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
	import RadioTower from '@lucide/svelte/icons/radio-tower';
	import { flattenConditions, STATION_CODE } from '$lib/jeby/models';
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

	// Map NOAA severity strings onto the alert-banner levels.
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

	const score = $derived(conditions?.bumpyScore?.score ?? null);
	const disclaimers = $derived(conditions?.bumpyScore?.disclaimers ?? []);
	const analysis = $derived(conditions?.bumpyScore?.analysis ?? null);

	// Overnight the backend pauses AI scoring and serves a quiet-hours message with
	// a null score. Detect it so we can show a moon instead of a dash.
	const inQuietHours = $derived((analysis?.bumpy ?? '').toLowerCase().includes('quiet hours'));

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
			<h1 class="text-2xl font-medium tracking-tight sm:text-3xl">The Jeby Report</h1>
			<div class="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-0.5 text-lg text-neutral-500">
				<span>{data.location}</span>
				·
				<span>{when}</span>
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

	<!-- NOAA alerts -->
	<div class="mt-8 max-w-xl space-y-3">
		{#each data.alerts as alert (alert.event + alert.description)}
			<AlertBanner level={alertLevel(alert.severity)} title={alert.event}>
				{alert.description}
			</AlertBanner>
		{:else}
			<AlertBanner level="info">NOAA has no active alerts for this area.</AlertBanner>
		{/each}
	</div>

	<!-- Cards: BumpyScore, AI captain suggestions, wave visualizer. -->
	<div class="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
		<BumpyScoreCard
			{score}
			{disclaimers}
			{analysis}
			quietHours={inQuietHours}
			onShowDisclaimers={() => (showDisclaimers = true)}
		/>
		<CaptainSuggestions {analysis} />
		<WaveVisualizer waveHeight={readings.waveHeight} waveLength={readings.waveLength} {vessel} />
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

	<MarineForecast forecast={data.forecast} />

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
