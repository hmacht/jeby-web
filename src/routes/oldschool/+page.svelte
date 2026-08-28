<script lang="ts">
	// The report as a printout, on its own page — teletype layout throughout, with
	// a few modern things blended in: the score bar shaded by its own color, the
	// AI's read behind a gradient sparkle, and the station cameras at the bottom.
	//
	// The screen is composed section by section here; the Copy button hands over
	// the plain-ASCII rendering from jeby/report.ts, in the same order.
	import { goto, invalidateAll } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { navigating, page } from '$app/state';
	import Check from '@lucide/svelte/icons/check';
	import Share from '@lucide/svelte/icons/share';
	import Sparkles from '@lucide/svelte/icons/sparkles';
	import ScoreBlocks from '$lib/ScoreBlocks.svelte';
	import SiteFooter from '$lib/SiteFooter.svelte';
	import StationMap from '$lib/StationMap.svelte';
	import StatusBar from '$lib/StatusBar.svelte';
	import VesselSelect from '$lib/VesselSelect.svelte';
	import WaveAnimation from '$lib/WaveAnimation.svelte';
	import WaveAscii from '$lib/WaveAscii.svelte';
	import ZoomableImage from '$lib/ZoomableImage.svelte';
	import {
		flattenConditions,
		isMvco,
		stationConditions,
		stationReadingRows,
		type Station
	} from '$lib/jeby/models';
	import { stormStatus } from '$lib/jeby/report';
	import { cToF, metersToFeet } from '$lib/jeby/utils';
	import { onMount } from 'svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let copied = $state(false);

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

	const when = $derived(
		new Date(data.generatedAt).toLocaleString('en-US', {
			weekday: 'long',
			hour: 'numeric',
			minute: '2-digit'
		})
	);

	const conditions = $derived(data.conditions);
	// Station-merged readings, for the wave graphic beside the score.
	const readings = $derived(flattenConditions(conditions));
	const vessel = $derived(
		conditions?.vessel ?? data.vessels.find((v) => v.code === data.selectedVessel) ?? null
	);
	const score = $derived(conditions?.bumpyScore?.score ?? null);
	const analysis = $derived(conditions?.bumpyScore?.analysis ?? null);
	const inQuietHours = $derived((analysis?.bumpy ?? '').toLowerCase().includes('quiet hours'));

	const scoreText = $derived(
		inQuietHours ? 'quiet hours' : score == null ? 'not computed yet' : `${score} /100`
	);
	const temp = $derived(
		data.weather?.airTemp.value == null ? '—' : `${Math.round(cToF(data.weather.airTemp.value))}°`
	);
	const pct = (v: number | null) => (v == null ? '—' : `${Math.round(v)}%`);

	// Wave height per station, in feet, for the map's badges.
	const stationWaveHeights = $derived.by(() => {
		const heights: Record<string, string | null> = {};
		for (const station of data.stations) {
			const meters = stationConditions(conditions, station.code)?.waveHeight.value ?? null;
			heights[station.code] = meters == null ? null : metersToFeet(meters).toFixed(1);
		}
		return heights;
	});

	// A marker tap jumps to that station's readings rather than opening a sheet —
	// they're already written out on this page.
	function scrollToStation(station: Station) {
		document
			.getElementById(`station-${station.code}`)
			?.scrollIntoView({ behavior: 'smooth', block: 'center' });
	}

	// Switching vessels re-runs the load via a URL query param, so the change is
	// SSR-friendly and shareable.
	function selectVessel(code: string) {
		goto(resolve(`/oldschool?vessel=${encodeURIComponent(code)}`), {
			keepFocus: true,
			noScroll: true
		});
	}

	// What gets shared: the headline numbers and a link back here, rather than the
	// whole printout. Short enough to read in a message preview.
	const shareText = $derived(
		[
			`BumpyScore ${scoreText}`,
			vessel ? `Tuned for the ${vessel.name}` : null,
			`Weather ${temp}${data.weather?.summary ? ` ${data.weather.summary}` : ''}`
		]
			.filter(Boolean)
			.join('\n')
	);

	// The share sheet where there is one; otherwise the same text on the clipboard.
	async function share() {
		const url = page.url.href;
		if (navigator.share) {
			try {
				await navigator.share({ title: 'The Jeby Report', text: shareText, url });
				return;
			} catch {
				// Dismissed the sheet, or it refused — fall through to the clipboard.
			}
		}
		await navigator.clipboard.writeText(`${shareText}\n${url}`);
		copied = true;
		setTimeout(() => (copied = false), 1500);
	}

	const RULE = '='.repeat(40);
	const SUBRULE = '-'.repeat(40);
	// Held as a value so the spacing survives the template's whitespace handling.
	const TICKS = '0        25        50        75       100';
	const TITLE = 'The Jeby Report — printout';
</script>

<svelte:head>
	<title>{TITLE}</title>
	<meta name="description" content="The Jeby Report as a plain-text printout." />
</svelte:head>

<main class="min-h-screen px-6 pb-24 pt-10 text-white sm:px-12 lg:px-16">
	<div class="mx-auto max-w-4xl font-mono text-xs leading-relaxed text-neutral-300 sm:text-sm">
		<!-- Controls -->
		<div class="flex flex-wrap items-center justify-between gap-4 pb-8">
			<a
				href={resolve('/')}
				class="text-neutral-500 underline underline-offset-4 transition hover:text-neutral-300"
			>
				&larr; Back to the report
			</a>

			<div class="flex items-center gap-3">
				<button
					type="button"
					onclick={share}
					aria-label="Share this report"
					title="Share this report"
					class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border bg-surface text-neutral-300 transition hover:border-neutral-500 hover:text-white"
				>
					{#if copied}
						<Check size={16} class="shrink-0 text-emerald-400" />
					{:else}
						<Share size={16} class="shrink-0" />
					{/if}
				</button>

				<VesselSelect
					vessels={data.vessels}
					selected={data.selectedVessel}
					disabled={loading || data.vessels.length === 0}
					onSelect={selectVessel}
					class="w-48 sm:w-56"
				/>
			</div>
		</div>

		<!-- Masthead -->
		<h1 class="font-semibold uppercase tracking-wide text-white">The Jeby Report</h1>
		<p class="text-neutral-400">{data.location} &middot; {when}</p>
		<p aria-hidden="true" class="overflow-hidden whitespace-nowrap text-neutral-700">{RULE}</p>

		<!-- Alerts -->
		<div class="mt-4">
			{#each data.alerts as alert (alert.event + alert.description)}
				<p class="text-amber-400">! {alert.event}: {alert.description}</p>
			{:else}
				<p>NOAA has no active alerts for this area.</p>
			{/each}
		</div>

		<!-- Score, vessel, weather — with the sea running alongside. -->
		<div class="mt-6 flex flex-col gap-6 sm:flex-row sm:items-start sm:gap-8">
			<div class="min-w-0 flex-1">
				<dl>
					<div class="flex gap-2">
						<dt class="w-40 shrink-0 whitespace-nowrap text-neutral-500">BUMPYSCORE</dt>
						<dd class="font-semibold text-white">{scoreText}</dd>
					</div>
					{#if vessel}
						<div class="flex gap-2">
							<dt class="w-40 shrink-0 whitespace-nowrap text-neutral-500">TUNED FOR</dt>
							<dd>{vessel.name}</dd>
						</div>
					{/if}
					<div class="flex gap-2">
						<dt class="w-40 shrink-0 whitespace-nowrap text-neutral-500">WEATHER</dt>
						<dd class="flex items-center gap-2">
							{#if data.weather?.iconUrl}
								<!-- Decorative: the summary right beside it already says the conditions. -->
								<img
									src={data.weather.iconUrl}
									alt=""
									class="h-5 w-5 shrink-0 rounded-sm border border-border object-cover"
								/>
							{/if}
							<span>{temp}{data.weather?.summary ? `  ${data.weather.summary}` : ''}</span>
						</dd>
					</div>
				</dl>
			</div>

			<div class="w-full overflow-hidden rounded border border-border sm:w-64">
				<WaveAnimation waveHeight={readings.waveHeight} wavePeriod={readings.wavePeriod} />
			</div>
		</div>

		<!-- The score on its scale, each block shaded by where it sits. -->
		<div class="mt-6 overflow-hidden whitespace-nowrap">
			<ScoreBlocks {score} cells={40} />
		</div>
		<p aria-hidden="true" class="whitespace-pre text-neutral-500">{TICKS}</p>

		<!-- The AI's read -->
		<h2 class="mt-8 flex items-center gap-1.5 uppercase tracking-wide text-white">
			<Sparkles size={14} color="url(#oldschool-sparkle)" class="shrink-0" />
			AI Analysis
		</h2>
		<p aria-hidden="true" class="overflow-hidden whitespace-nowrap text-neutral-700">{SUBRULE}</p>
		<div class="mt-3 space-y-4">
			<div>
				<h3 class="text-neutral-500">The ride</h3>
				<p class="mt-1">{analysis?.bumpy ?? 'not available right now.'}</p>
			</div>
			<div>
				<h3 class="text-neutral-500">Captain</h3>
				<p class="mt-1">{analysis?.steering ?? 'not available right now.'}</p>
			</div>
		</div>

		<!-- Storms -->
		<h2 class="mt-8 uppercase tracking-wide text-white">Storms</h2>
		<p aria-hidden="true" class="overflow-hidden whitespace-nowrap text-neutral-700">{SUBRULE}</p>
		<dl class="mt-2">
			<div class="flex gap-2">
				<dt class="w-40 shrink-0 whitespace-nowrap text-neutral-500">Status</dt>
				<dd
					class={data.storms?.stormNow
						? 'text-red-400'
						: data.storms?.stormExpectedToday
							? 'text-amber-400'
							: 'text-emerald-400'}
				>
					{stormStatus(data.storms)}
				</dd>
			</div>
			{#if data.storms}
				<div class="flex gap-2">
					<dt class="w-40 shrink-0 whitespace-nowrap text-neutral-500">Thunder</dt>
					<dd>{pct(data.storms.thunderChance.value)}</dd>
				</div>
				<div class="flex gap-2">
					<dt class="w-40 shrink-0 whitespace-nowrap text-neutral-500">Precipitation</dt>
					<dd>{pct(data.storms.precipitationChance.value)}</dd>
				</div>
				{#each data.storms.outlook as period (period.name)}
					<div class="flex gap-2">
						<dt class="w-40 shrink-0 whitespace-nowrap text-neutral-500">{period.name}</dt>
						<dd class={period.stormy ? 'text-amber-400' : ''}>{period.forecast}</dd>
					</div>
				{/each}
			{/if}
		</dl>

		<!-- Station cameras -->
		{#if data.buoy360 || data.asitcam2}
			<h2 class="mt-8 uppercase tracking-wide text-white">Images</h2>
			<p aria-hidden="true" class="overflow-hidden whitespace-nowrap text-neutral-700">{SUBRULE}</p>
			<div class="mt-3 space-y-6">
				{#if data.buoy360}
					<figure>
						<ZoomableImage
							src={data.buoy360}
							alt="Latest 360° view from the buoy camera"
							class="w-full rounded-lg border border-border"
						/>
						<figcaption class="mt-2 text-neutral-500">Latest 360° view from the buoy</figcaption>
					</figure>
				{/if}
				{#if data.asitcam2}
					<figure>
						<ZoomableImage
							src={data.asitcam2}
							alt="Latest view from the MVCO ASIT tower webcam"
							class="w-full rounded-lg border border-border"
						/>
						<figcaption class="mt-2 text-neutral-500">
							Latest view from the MVCO ASIT tower
						</figcaption>
					</figure>
				{/if}
			</div>
		{/if}

		<!-- The sea, drawn in characters -->
		<h2 class="mt-8 uppercase tracking-wide text-white">Wave visualizer</h2>
		<p aria-hidden="true" class="overflow-hidden whitespace-nowrap text-neutral-700">{SUBRULE}</p>
		<div class="mt-3">
			<WaveAscii
				waveHeight={readings.waveHeight}
				waveLength={readings.waveLength}
				wavePeriod={readings.wavePeriod}
				{vessel}
			/>
		</div>

		<!-- Station data -->
		<h2 class="mt-8 uppercase tracking-wide text-white">Station data</h2>
		<p aria-hidden="true" class="overflow-hidden whitespace-nowrap text-neutral-700">{SUBRULE}</p>
		<div class="mt-3 grid gap-6 lg:grid-cols-2 lg:items-start">
			<div class="space-y-4">
				{#each data.stations as station (station.code)}
					<div id="station-{station.code}" class="scroll-mt-24">
						<p class="text-white">{station.name}</p>
						<p class="text-neutral-500">
							{isMvco(station.code) ? 'MVCO Sensor' : 'NOAA Buoy'} &middot; {Math.round(
								station.depthMeters
							)} m deep
						</p>
						<dl class="mt-1">
							{#each stationReadingRows(stationConditions(conditions, station.code)) as row (row.label)}
								<div class="flex gap-2">
									<dt class="w-40 shrink-0 whitespace-nowrap text-neutral-500">{row.label}</dt>
									<dd class="text-white">{row.value}</dd>
								</div>
							{/each}
						</dl>
					</div>
				{/each}
			</div>

			<!-- Where those readings come from. -->
			{#if data.stations.length}
				<div class="h-72 lg:h-full lg:min-h-80">
					<StationMap
						stations={data.stations}
						readings={stationWaveHeights}
						onSelect={scrollToStation}
						variant="plain"
					/>
				</div>
			{/if}
		</div>
	</div>
</main>

<!-- Gradient (light → dark blue) for the sparkle above. -->
<svg aria-hidden="true" width="0" height="0" class="absolute">
	<defs>
		<linearGradient id="oldschool-sparkle" x1="0" y1="0" x2="1" y2="1">
			<stop offset="0%" stop-color="#7dd3fc" />
			<stop offset="100%" stop-color="#1d4ed8" />
		</linearGradient>
	</defs>
</svg>

<SiteFooter />

<StatusBar {lastUpdated} {loading} />
