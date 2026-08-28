<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { navigating, page } from '$app/state';
	import AlertBanner from '$lib/AlertBanner.svelte';
	import BumpyScoreCard from '$lib/BumpyScoreCard.svelte';
	import BumpyScoreDetails from '$lib/BumpyScoreDetails.svelte';
	import CaptainSuggestions from '$lib/CaptainSuggestions.svelte';
	import LiveReadings from '$lib/LiveReadings.svelte';
	import MarineForecast from '$lib/MarineForecast.svelte';
	import TextReport from '$lib/TextReport.svelte';
	import WaveVisualizer from '$lib/WaveVisualizer.svelte';
	import Modal from '$lib/Modal.svelte';
	import SiteFooter from '$lib/SiteFooter.svelte';
	import StatusBar from '$lib/StatusBar.svelte';
	import TopNav from '$lib/TopNav.svelte';
	import TunedFor from '$lib/TunedFor.svelte';
	import VesselSelect from '$lib/VesselSelect.svelte';
	import WaveDiagram from '$lib/WaveDiagram.svelte';
	import squiggle from '$lib/assets/squiggle.png';
	import ogImage from '$lib/assets/jeyb-open-web.png';
	import ZoomableImage from '$lib/ZoomableImage.svelte';
	import LifeBuoy from '@lucide/svelte/icons/life-buoy';
	import RadioTower from '@lucide/svelte/icons/radio-tower';
	import { flattenConditions, STATION_CODE } from '$lib/jeby/models';
	import { onMount } from 'svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let showDisclaimers = $state(false);
	let showAdvice = $state(false);

	// The compact top nav slides in once the header scrolls out of view, and
	// highlights whichever section is currently under the top of the viewport.
	let headerEl: HTMLElement;
	let showNav = $state(false);

	// In document order — the scroll spy takes the first of these that's crossing
	// the band near the top of the viewport.
	const SECTIONS = [
		{ id: 'bumpyscore', label: 'BumpyScore' },
		{ id: 'images', label: 'Images' },
		{ id: 'stations', label: 'Stations' },
		{ id: 'vessel', label: 'Vessel' }
	];
	let activeSection = $state(SECTIONS[0].id);

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

		// Scroll spy: a narrow band near the top of the viewport decides which
		// section is current. Track which sections cross it and take the topmost,
		// keeping the last one when the band falls between sections.
		let crossing: string[] = [];
		const spy = new IntersectionObserver(
			(entries) => {
				for (const entry of entries) {
					const sectionId = entry.target.id;
					if (entry.isIntersecting) {
						if (!crossing.includes(sectionId)) crossing.push(sectionId);
					} else {
						crossing = crossing.filter((c) => c !== sectionId);
					}
				}
				const current = SECTIONS.find((s) => crossing.includes(s.id));
				if (current) activeSection = current.id;
			},
			{ rootMargin: '-20% 0px -70% 0px' }
		);
		for (const section of SECTIONS) {
			const el = document.getElementById(section.id);
			if (el) spy.observe(el);
		}

		return () => {
			clearInterval(id);
			observer.disconnect();
			spy.disconnect();
		};
	});

	// Jump to a section from the nav.
	function goToSection(sectionId: string) {
		document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
	}

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
	sections={SECTIONS}
	{activeSection}
	onSectionSelect={goToSection}
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

	<!-- NOAA alerts under the title, with the text report off to the right. -->
	<div class="mt-6 flex items-start justify-between gap-6">
		<div class="max-w-xl space-y-3">
			{#each data.alerts as alert (alert.event + alert.description)}
				<AlertBanner level={alertLevel(alert.severity)} title={alert.event}>
					{alert.description}
				</AlertBanner>
			{:else}
				<AlertBanner level="info" showIcon={false}>
					NOAA has no active alerts for this area.
				</AlertBanner>
			{/each}
		</div>

		<div class="shrink-0">
			<TextReport
				location={data.location}
				{when}
				alerts={data.alerts}
				{score}
				quietHours={inQuietHours}
				{analysis}
				weather={data.weather}
				storms={data.storms}
				{vessel}
				stations={data.stations}
				{conditions}
			/>
		</div>
	</div>

	<!-- Cards: BumpyScore, wave visualizer, storm tracker. -->
	<div id="bumpyscore" class="mt-4 grid scroll-mt-24 gap-4 sm:grid-cols-2 lg:grid-cols-3">
		<BumpyScoreCard
			{score}
			{disclaimers}
			{analysis}
			quietHours={inQuietHours}
			onShowDisclaimers={() => (showDisclaimers = true)}
			onShowAdvice={() => (showAdvice = true)}
		/>
		<WaveVisualizer stations={data.stations} {conditions} />
		<MarineForecast forecast={data.forecast} />
	</div>

	<!-- Live station cameras: butted together in a horizontal scroll on mobile
		(buoy first), stacked full-width from sm up. -->
	<div
		id="images"
		class="mt-10 flex scroll-mt-24 snap-x snap-mandatory gap-0.5 overflow-x-auto sm:block sm:overflow-visible"
	>
		{#if data.buoy360}
			<figure class="shrink-0 snap-start sm:w-auto">
				<ZoomableImage
					src={data.buoy360}
					alt="Latest 360° view from the buoy camera"
					class="h-52 w-auto max-w-none rounded-lg border border-border sm:h-auto sm:w-full sm:max-w-full sm:rounded-2xl"
				/>
				<figcaption class="mt-2 flex items-center gap-1.5 text-sm text-neutral-500">
					<LifeBuoy size={14} class="shrink-0" />
					Latest 360° view from the buoy
				</figcaption>
			</figure>
		{/if}

		{#if data.asitcam2}
			<figure class="shrink-0 snap-start sm:mt-8 sm:w-auto">
				<ZoomableImage
					src={data.asitcam2}
					alt="Latest view from the MVCO ASIT tower webcam"
					class="h-52 w-auto max-w-none rounded-lg border border-border sm:h-auto sm:w-full sm:max-w-full sm:rounded-2xl"
				/>
				<figcaption class="mt-2 flex items-center gap-1.5 text-sm text-neutral-500">
					<RadioTower size={14} class="shrink-0" />
					Latest view from the MVCO ASIT tower
				</figcaption>
			</figure>
		{/if}
	</div>

	<!-- Wave diagram hidden for now -->
	{#if false}
		<!-- Wave-spacing diagram (scrolls horizontally on small screens to stay legible) -->
		<div class="-mx-6 mt-12 overflow-x-auto px-6 sm:mx-0 sm:px-0">
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

	<div id="stations" class="scroll-mt-24">
		<LiveReadings stations={data.stations} {conditions} {stationImages} />
	</div>

	<!-- Decorative wave -->
	<div class="my-12 flex justify-center">
		<img src={squiggle} alt="" aria-hidden="true" class="h-3 w-auto" />
	</div>

	<div id="vessel" class="scroll-mt-24">
		<TunedFor {vessel} />
	</div>
</main>

<SiteFooter />

<StatusBar {lastUpdated} {loading} />

<Modal bind:open={showDisclaimers} title="BumpyScore™ Details">
	<BumpyScoreDetails {score} {disclaimers} {analysis} {vessel} quietHours={inQuietHours} />
</Modal>

<Modal bind:open={showAdvice} title="Captain's advice">
	<CaptainSuggestions {analysis} />
</Modal>
