<script lang="ts">
	// The report as a printout — teletype layout throughout, with a few modern
	// things blended in: the score bar shaded by its own color and ticking up on
	// load, the AI's read behind a gradient sparkle, the station cameras and the
	// map. Composed section by section here.
	//
	// The share button hands over the headline numbers and a link (see shareText),
	// short enough to read in a message preview.
	import { goto, invalidateAll } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { navigating, page } from '$app/state';
	import ArrowDown from '@lucide/svelte/icons/arrow-down';
	import ArrowUp from '@lucide/svelte/icons/arrow-up';
	import Check from '@lucide/svelte/icons/check';
	import CloudLightning from '@lucide/svelte/icons/cloud-lightning';
	import Info from '@lucide/svelte/icons/info';
	import ChessQueen from '@lucide/svelte/icons/chess-queen';
	import Share from '@lucide/svelte/icons/share';
	import Sparkles from '@lucide/svelte/icons/sparkles';
	import ScoreBlocks from '$lib/ScoreBlocks.svelte';
	import SiteFooter from '$lib/SiteFooter.svelte';
	import StationMap from '$lib/StationMap.svelte';
	import StatusBar from '$lib/StatusBar.svelte';
	import TideChart from '$lib/TideChart.svelte';
	import VesselSelect from '$lib/VesselSelect.svelte';
	import WaveAnimation from '$lib/WaveAnimation.svelte';
	import ZoomableImage from '$lib/ZoomableImage.svelte';
	import {
		isIslandQueen,
		isMvco,
		stationConditions,
		stationReadingRows,
		stormsMissing,
		STATION_CODE,
		type Station,
		type TideEvent,
		type TimedValue
	} from '$lib/jeby/models';
	import { shimmer } from '$lib/shimmer';
	import { cToF, metersToFeet, mpsToMph } from '$lib/jeby/utils';
	import { onMount } from 'svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let copied = $state(false);

	// The chart datum needs explaining — "heights above MLLW" is jargon anywhere
	// outside a chart table.
	let datumDialog: HTMLDialogElement | null = $state(null);

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
	const vessel = $derived(
		conditions?.vessel ?? data.vessels.find((v) => v.code === data.selectedVessel) ?? null
	);
	const score = $derived(conditions?.bumpyScore?.score ?? null);
	const analysis = $derived(conditions?.bumpyScore?.analysis ?? null);
	const inQuietHours = $derived((analysis?.bumpy ?? '').toLowerCase().includes('quiet hours'));

	const scoreText = $derived(
		inQuietHours ? 'quiet hours' : score == null ? 'not computed yet' : `${score} /100`
	);
	// The headline splits the number from its denominator so the two can be sized
	// apart. scoreText stays whole above, since the share sheet wants one string.
	const scoreValue = $derived(
		inQuietHours ? 'quiet hours' : score == null ? 'not computed yet' : `${score}`
	);
	const scoreOutOf = $derived(inQuietHours || score == null ? null : '/100');
	const temp = $derived(
		data.weather?.airTemp.value == null ? '—' : `${Math.round(cToF(data.weather.airTemp.value))}°`
	);
	const pct = (v: number | null) => (v == null ? '—' : `${Math.round(v)}%`);

	const degF = (celsius: number | null | undefined) =>
		celsius == null ? '—' : `${Math.round(cToF(celsius))}°`;

	// The NWS heat index scale, read off what it feels like rather than the air
	// temperature — humidity carries most of the difference on a still afternoon.
	// Note this is a heat scale, not a burn one: the weather endpoint carries no
	// UV index, so nothing here speaks to how fast you'd burn.
	const heatRisk = $derived.by(() => {
		const feels = data.weather?.feelsLike.value;
		if (feels == null) return { label: 'Unknown', tone: 'text-neutral-400' };
		const deg = cToF(feels);
		if (deg >= 125) return { label: 'Extreme Danger', tone: 'text-red-400' };
		if (deg >= 103) return { label: 'Danger', tone: 'text-red-400' };
		if (deg >= 90) return { label: 'Extreme Caution', tone: 'text-amber-400' };
		if (deg >= 80) return { label: 'Caution', tone: 'text-amber-400' };
		return { label: 'Low', tone: 'text-emerald-400' };
	});

	// Seas and wind out in the Sound, from the NOAA buoy rather than the MVCO
	// tower — the buoy is the one moored in open water, so it's the reading that
	// describes the crossing.
	const buoy = $derived(stationConditions(conditions, STATION_CODE.buoy));
	const soundWaveHeight = $derived(
		buoy?.waveHeight.value == null ? '—' : `${metersToFeet(buoy.waveHeight.value).toFixed(1)} ft`
	);
	const soundWind = $derived(
		buoy?.windSpeed.value == null
			? '—'
			: `${mpsToMph(buoy.windSpeed.value).toFixed(0)} mph${
					buoy.windDirectionCardinal ? ` ${buoy.windDirectionCardinal}` : ''
				}`
	);

	// A tide time, in the island's timezone so the server and the browser agree.
	// Minutes are kept: these are predicted instants, not the hour-long windows
	// the storm series deals in.
	function tideAt(event: TideEvent): string {
		return new Date(event.at)
			.toLocaleTimeString('en-US', {
				hour: 'numeric',
				minute: '2-digit',
				timeZone: 'America/New_York'
			})
			.replace(' ', '')
			.toLowerCase();
	}

	// What the water is doing, and when it next turns. Both halves come straight
	// from the backend ready to print. Near a turn `state` is 'High'/'Low' and
	// names the very event `next` points at, so saying it twice would be noise.
	const tideLine = $derived.by(() => {
		const tides = data.tides;
		if (!tides) return '—';
		const { state, next } = tides;
		if (!next) return state ?? '—';
		const at = tideAt(next);
		if (state && state !== next.type) return `${state} · ${next.type} ${at}`;
		return `${state ?? next.type} ${at}`;
	});

	// Green is reserved for a genuine all clear. A null verdict means a source
	// didn't answer, and stays neutral rather than reading as good news.
	function stormTone(verdict: string | null): string {
		switch (verdict) {
			case 'Occurring':
				return 'text-red-400';
			case 'Likely':
				return 'text-amber-400';
			case 'Possible':
				return 'text-amber-400';
			case 'None':
				return 'text-emerald-400';
			default:
				return 'text-neutral-400';
		}
	}
	// Null is the one case the backend can't print for us: it means unchecked.
	const verdict = (v: string | null) => v ?? 'Unknown';
	// The icon flags a real storm, so a clear day and an unchecked source both
	// get nothing — an icon on 'Unknown' would assert something we don't know.
	const hasStorm = (v: string | null) => v != null && v !== 'None';
	const stormsUnavailable = $derived(stormsMissing(data.storms));

	// The forecast series run all day; three windows is as far ahead as the
	// question "should I go out now" reaches. Filtering on `until` rather than
	// `from` on purpose — the NWS collapses long stretches of one value into a
	// single interval, so a window that began this morning can still be the one
	// in effect.
	function nextWindows(values: TimedValue[] | undefined, count = 3): TimedValue[] {
		const now = Date.now();
		return (values ?? []).filter((v) => new Date(v.until).getTime() > now).slice(0, count);
	}

	// Pinned to the island's timezone so the server and the browser format these
	// identically — otherwise SSR and hydration disagree and the times flicker.
	function clock(iso: string): string {
		return new Date(iso)
			.toLocaleTimeString('en-US', {
				hour: 'numeric',
				minute: '2-digit',
				timeZone: 'America/New_York'
			})
			.replace(':00', '')
			.replace(' ', '')
			.toLowerCase();
	}

	function vineyardDay(iso: string): string {
		return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York' }).format(new Date(iso));
	}

	// "11am–5pm", with the weekday appended when the window runs into another day
	// — a 37-hour interval is normal here, and a bare end time would misread.
	function windowRange(w: TimedValue): string {
		const end =
			vineyardDay(w.from) === vineyardDay(w.until)
				? clock(w.until)
				: `${clock(w.until)} ${new Date(w.until).toLocaleDateString('en-US', { weekday: 'short', timeZone: 'America/New_York' })}`;
		return `${clock(w.from)}–${end}`;
	}

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
		goto(resolve(`/?vessel=${encodeURIComponent(code)}`), {
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
	// Lighter again than SUBRULE, for splitting subsections inside one section.
	const DOTRULE = '·'.repeat(40);
	// Held as a value so the spacing survives the template's whitespace handling.
	const TICKS = '0        25        50        75       100';
	const TITLE = 'The Jeby Report';
</script>

<svelte:head>
	<title>{TITLE}</title>
	<meta name="description" content="The Jeby Report as a plain-text printout." />
</svelte:head>

<main class="min-h-screen px-4 pt-10 text-white sm:px-12 lg:px-16">
	<div class="mx-auto max-w-4xl font-mono text-sm leading-relaxed text-neutral-300">
		<!-- Controls: vessel picker on the left, share on the right. -->
		<div class="flex flex-wrap items-center justify-between gap-4 pb-8">
			<VesselSelect
				vessels={data.vessels}
				selected={data.selectedVessel}
				disabled={loading || data.vessels.length === 0}
				onSelect={selectVessel}
				class="w-48 sm:w-56"
			/>

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
		</div>

		<!-- The masthead through the score bar on the left, the sea alongside it. -->
		<div class="flex flex-col gap-8 lg:flex-row lg:items-center lg:gap-10">
			<div class="min-w-0 flex-1">
				<!-- Masthead -->
				<h1 class="font-semibold uppercase tracking-wide text-white">The Jeby Report</h1>
				<p class="mt-1 text-neutral-400">{data.location} &middot; {when}</p>
				<p aria-hidden="true" class="mt-2 overflow-hidden whitespace-nowrap text-neutral-700">
					{RULE}
				</p>

				<!-- Alerts -->
				<div class="mt-4">
					{#each data.alerts as alert (alert.event + alert.description)}
						<p class="text-amber-400">! {alert.event}: {alert.description}</p>
					{:else}
						<p>NOAA has no active alerts for this area.</p>
					{/each}
				</div>

				<!-- The score stands on its own at the left margin: it's the headline
					number, and the label column would size it like a footnote. -->
				<div class="mt-5">
					<p class="text-neutral-500">BUMPYSCORE&trade;</p>
					<!-- Flex so the gap is controlled rather than left to whitespace, and
						baseline-aligned so the denominator sits on the number's baseline. -->
					<p
						class="mt-1 flex items-baseline gap-1.5 text-3xl font-semibold leading-none text-white"
					>
						<span>{scoreValue}</span>
						{#if scoreOutOf}
							<span class="text-base font-normal text-neutral-500">{scoreOutOf}</span>
						{/if}
					</p>
				</div>

				<!-- Vessel and weather -->
				<dl class="mt-5">
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
					<div class="flex gap-2">
						<dt class="w-40 shrink-0 whitespace-nowrap text-neutral-500">WAVE HEIGHT</dt>
						<dd>{soundWaveHeight}</dd>
					</div>
					<div class="flex gap-2">
						<dt class="w-40 shrink-0 whitespace-nowrap text-neutral-500">WIND SPEED</dt>
						<dd>{soundWind}</dd>
					</div>
					<div class="flex gap-2">
						<dt class="w-40 shrink-0 whitespace-nowrap text-neutral-500">TIDE</dt>
						<dd>
							<!-- Only the moving states get an arrow. At a stand the water isn't
								going anywhere, so there's no direction to point. -->
							{#if data.tides?.state === 'Rising'}
								<ArrowUp size={14} class="mr-0.5 inline align-middle" />
							{:else if data.tides?.state === 'Falling'}
								<ArrowDown size={14} class="mr-0.5 inline align-middle" />
							{/if}{tideLine}
						</dd>
					</div>
				</dl>

				<!-- The score on its scale, each block shaded by where it sits. -->
				<div class="mt-5 overflow-hidden whitespace-nowrap">
					<ScoreBlocks {score} cells={40} />
				</div>
				<p aria-hidden="true" class="mt-1 overflow-hidden whitespace-pre text-neutral-500">
					{TICKS}
				</p>
			</div>

			<div class="w-full lg:w-[22rem] lg:shrink-0">
				<WaveAnimation stations={data.stations} {conditions} />
			</div>
		</div>

		<!-- The AI's read -->
		<h2 class="mt-8 flex items-center gap-1.5 uppercase tracking-wide text-white">
			<Sparkles size={14} color="url(#report-sparkle)" class="shrink-0" />
			AI Analysis
		</h2>
		<p aria-hidden="true" class="overflow-hidden whitespace-nowrap text-neutral-700">{SUBRULE}</p>
		<div class="mt-3 space-y-4">
			<div>
				<h3 class="text-neutral-500">The ride</h3>
				<p class="mt-1" use:shimmer>{analysis?.bumpy ?? 'not available right now.'}</p>
			</div>
			<div>
				<h3 class="text-neutral-500">Captain</h3>
				<p class="mt-1" use:shimmer>{analysis?.steering ?? 'not available right now.'}</p>
			</div>
		</div>

		<!-- Station cameras -->
		{#if data.buoy360 || data.asitcam2}
			<h2 class="mt-8 uppercase tracking-wide text-white">Images</h2>
			<p aria-hidden="true" class="overflow-hidden whitespace-nowrap text-neutral-700">{SUBRULE}</p>
			<!-- Butted together in a horizontal scroll on mobile, stacked full-width
				from sm up. Sized by height there so neither frame is cropped and the
				buoy's panorama simply runs long. -->
			<div
				class="mt-3 flex snap-x snap-mandatory gap-0.5 overflow-x-auto sm:block sm:space-y-6 sm:overflow-visible"
			>
				{#if data.buoy360}
					<figure class="shrink-0 snap-start sm:w-auto">
						<ZoomableImage
							src={data.buoy360}
							alt="Latest 360° view from the buoy camera"
							class="h-52 w-auto max-w-none rounded-lg border border-border sm:h-auto sm:w-full sm:max-w-full"
						/>
						<figcaption class="mt-2 text-neutral-500">Latest 360° view from the buoy</figcaption>
					</figure>
				{/if}
				{#if data.asitcam2}
					<figure class="shrink-0 snap-start sm:w-auto">
						<ZoomableImage
							src={data.asitcam2}
							alt="Latest view from the MVCO ASIT tower webcam"
							class="h-52 w-auto max-w-none rounded-lg border border-border sm:h-auto sm:w-full sm:max-w-full"
						/>
						<figcaption class="mt-2 text-neutral-500">
							Latest view from the MVCO ASIT tower
						</figcaption>
					</figure>
				{/if}
			</div>
		{/if}

		<!-- Storms: two independent questions, from two different sources. -->
		<h2 class="mt-8 uppercase tracking-wide text-white">Storm Tracker</h2>
		<p aria-hidden="true" class="overflow-hidden whitespace-nowrap text-neutral-700">{SUBRULE}</p>

		{#if stormsUnavailable}
			<p class="mt-2 text-neutral-400">Could not reach {stormsUnavailable}.</p>
		{/if}

		{#if data.storms}
			<!-- Now: what the airport is actually reporting. -->
			<h3 class="mt-4 text-neutral-500">Now</h3>
			<p class="text-neutral-600">Observed live at Martha&rsquo;s Vineyard Airport</p>
			<dl class="mt-2">
				<div class="flex gap-2">
					<dt class="w-40 shrink-0 whitespace-nowrap text-neutral-500">Storm</dt>
					<dd class={stormTone(data.storms.now.storm)}>
						{verdict(data.storms.now.storm)}
						{#if hasStorm(data.storms.now.storm)}
							<CloudLightning size={14} class="ml-1 inline align-middle text-amber-400" />
						{/if}
						{#if data.storms.now.proximity}&middot; {data.storms.now.proximity}{/if}
						{#if data.storms.now.raining != null}
							&middot; {data.storms.now.raining ? 'raining' : 'no rain'}
						{/if}
					</dd>
				</div>
				<!-- Full width from the left margin rather than in the value column:
					these are sentences, and the label column squeezes them. -->
				{#if data.storms.now.because.length}
					<div class="mt-2">
						{#each data.storms.now.because as reason (reason)}
							<dd>{reason}</dd>
						{/each}
					</div>
				{/if}
			</dl>

			<!-- Today: what the forecast grid says is coming. -->
			<p aria-hidden="true" class="mt-5 overflow-hidden whitespace-nowrap text-neutral-800">
				{DOTRULE}
			</p>
			<h3 class="mt-4 text-neutral-500">Today&rsquo;s Forecast</h3>
			<p class="text-neutral-600">From the National Weather Service</p>
			<dl class="mt-2">
				<div class="flex gap-2">
					<dt class="w-40 shrink-0 whitespace-nowrap text-neutral-500">Storm</dt>
					<dd class={stormTone(data.storms.today.storm)}>
						{verdict(data.storms.today.storm)}
						{#if hasStorm(data.storms.today.storm)}
							<CloudLightning size={14} class="ml-1 inline align-middle text-amber-400" />
						{/if}
						{#if data.storms.today.confidence}&middot; {data.storms.today.confidence}{/if}
					</dd>
				</div>
				{#if data.storms.today.because.length}
					<div class="mt-2">
						{#each data.storms.today.because as reason (reason)}
							<dd>{reason}</dd>
						{/each}
					</div>
				{/if}

				<!-- The next few windows of each series, each with the range it covers. -->
				{#each [{ label: 'Thunder', series: data.storms.thunderChance }, { label: 'Precipitation', series: data.storms.precipitationChance }, { label: 'Sky Cover', series: data.storms.skyCover }] as row (row.label)}
					<div class="mt-2 flex gap-2">
						<dt class="w-40 shrink-0 whitespace-nowrap text-neutral-500">{row.label}</dt>
						<dd>
							{#each nextWindows(row.series) as w (w.from)}
								<div class="flex gap-2">
									<!-- Value first: it's what the row is being read for, and a
										fixed width keeps the times lined up beside it. -->
									<span class="w-12 shrink-0 whitespace-nowrap tabular-nums">{pct(w.value)}</span>
									<span class="whitespace-nowrap text-neutral-500">{windowRange(w)}</span>
								</div>
							{:else}
								<div>&mdash;</div>
							{/each}
						</dd>
					</div>
				{/each}

				{#each data.storms.outlook as period (period.name)}
					<div class="flex gap-2">
						<dt class="w-40 shrink-0 whitespace-nowrap text-neutral-500">{period.name}</dt>
						<dd class={period.stormy ? 'text-amber-400' : ''}>{period.forecast}</dd>
					</div>
				{/each}
			</dl>
		{/if}

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

		<!-- Marine forecast, as the NWS words it. The periods are paragraphs, so
			each sits under its own heading rather than in a value column. -->
		<h2 class="mt-8 uppercase tracking-wide text-white">Marine Forecast</h2>
		<p aria-hidden="true" class="overflow-hidden whitespace-nowrap text-neutral-700">{SUBRULE}</p>
		<p class="text-neutral-600">From the National Weather Service</p>
		<dl class="mt-3">
			{#each (data.forecast?.periods ?? []).slice(0, 3) as period (period.header)}
				<div class="mt-3">
					<dt class="text-neutral-500">{period.header}</dt>
					<dd>{period.text}</dd>
				</div>
			{:else}
				<p class="text-neutral-400">Marine forecast unavailable right now.</p>
			{/each}
		</dl>

		<!-- Tides -->
		<h2 class="mt-8 uppercase tracking-wide text-white">Tides</h2>
		<p aria-hidden="true" class="overflow-hidden whitespace-nowrap text-neutral-700">{SUBRULE}</p>
		{#if data.tides}
			<p class="text-neutral-600">
				Predicted for {data.tides.stationName} &middot; heights above {data.tides.datum}
				<button
					type="button"
					onclick={() => datumDialog?.showModal()}
					aria-label="What {data.tides.datum} means"
					class="pb-0.5 align-middle text-sky-400 transition hover:text-sky-300"
				>
					<Info size={13} class="inline align-middle" />
				</button>
			</p>

			<!-- Native <dialog>: the backdrop, Escape to close and focus handling come
				with it, and `method="dialog"` closes without any script. -->
			<dialog
				bind:this={datumDialog}
				aria-labelledby="datum-title"
				class="m-auto max-w-md rounded-2xl border border-border bg-surface p-6 font-mono text-sm leading-relaxed text-neutral-300 backdrop:bg-black/70"
			>
				<h3 id="datum-title" class="uppercase tracking-wide text-white">
					{data.tides.datum} &mdash; mean lower low water
				</h3>
				<p aria-hidden="true" class="overflow-hidden whitespace-nowrap text-neutral-700">
					{SUBRULE}
				</p>
				<p class="mt-3">
					Most days have two low tides, one lower than the other. NOAA averages the lower one across
					a 19-year cycle, and calls that average zero.
				</p>
				<p class="mt-3">
					Every height here is feet above that line. It is the same zero a paper chart's soundings
					are printed against, so a 1.8 ft high tide sits 1.8 ft on top of the depth the chart shows
					for that spot.
				</p>
				<p class="mt-3 text-neutral-500">
					It is not the water under your keel &mdash; add it to the charted depth, and expect the
					odd tide to fall below zero.
				</p>
				<form method="dialog" class="mt-5">
					<button
						class="rounded-lg border border-border bg-neutral-800 px-3 py-1.5 text-white transition hover:border-neutral-500"
					>
						Close
					</button>
				</form>
			</dialog>
			<div class="mt-3">
				<TideChart tides={data.tides} generatedAt={data.generatedAt} />
			</div>
		{:else}
			<p class="mt-2 text-neutral-400">Tide predictions unavailable right now.</p>
		{/if}

		<!-- Sun safety: the heat side of the observation, since a long day on the
			water is where this one bites. -->
		<h2 class="mt-8 uppercase tracking-wide text-white">Sun Safety</h2>
		<p aria-hidden="true" class="overflow-hidden whitespace-nowrap text-neutral-700">{SUBRULE}</p>
		<p class="text-neutral-600">Observed live at Martha&rsquo;s Vineyard Airport</p>
		<dl class="mt-2">
			<div class="flex gap-2">
				<dt class="w-40 shrink-0 whitespace-nowrap text-neutral-500">Heat Risk</dt>
				<dd class={heatRisk.tone}>{heatRisk.label}</dd>
			</div>
			<div class="flex gap-2">
				<dt class="w-40 shrink-0 whitespace-nowrap text-neutral-500">Feels Like</dt>
				<dd>{degF(data.weather?.feelsLike.value)}</dd>
			</div>
			<div class="flex gap-2">
				<dt class="w-40 shrink-0 whitespace-nowrap text-neutral-500">Air Temp</dt>
				<dd>{degF(data.weather?.airTemp.value)}</dd>
			</div>
			<div class="flex gap-2">
				<dt class="w-40 shrink-0 whitespace-nowrap text-neutral-500">Humidity</dt>
				<dd>{pct(data.weather?.humidity.value ?? null)}</dd>
			</div>
			<div class="flex gap-2">
				<dt class="w-40 shrink-0 whitespace-nowrap text-neutral-500">Dewpoint</dt>
				<dd>{degF(data.weather?.dewpoint.value)}</dd>
			</div>
		</dl>

		<!-- The boat the score above was computed for. -->
		<h2 class="mt-8 uppercase tracking-wide text-white">Vessel Details</h2>
		<p aria-hidden="true" class="overflow-hidden whitespace-nowrap text-neutral-700">{SUBRULE}</p>
		{#if vessel}
			<p class="mt-2 text-white">
				{#if isIslandQueen(vessel)}
					<!-- The queen herself. -->
					<ChessQueen size={14} class="mr-2 mb-1 inline align-middle text-amber-400" />
				{/if}{vessel.name}
			</p>
			<!-- Full width from the left margin: it's a paragraph, and the label
				column would squeeze it. -->
			<p class="mt-1 max-w-2xl">{vessel.description}</p>
			<dl class="mt-3">
				<div class="flex gap-2">
					<dt class="w-40 shrink-0 whitespace-nowrap text-neutral-500">Length</dt>
					<dd>{vessel.length}</dd>
				</div>
				<div class="flex gap-2">
					<dt class="w-40 shrink-0 whitespace-nowrap text-neutral-500">Weight</dt>
					<dd>{vessel.weight}</dd>
				</div>
				<div class="flex gap-2">
					<dt class="w-40 shrink-0 whitespace-nowrap text-neutral-500">Horsepower</dt>
					<dd>{vessel.horsepower}</dd>
				</div>
				<div class="flex gap-2">
					<dt class="w-40 shrink-0 whitespace-nowrap text-neutral-500">Max Passengers</dt>
					<dd>{vessel.maxPassengers}</dd>
				</div>
			</dl>
		{:else}
			<p class="mt-2 text-neutral-400">No vessel selected.</p>
		{/if}
	</div>
</main>

<!-- Gradient (light → dark blue) for the sparkle above. -->
<svg aria-hidden="true" width="0" height="0" class="absolute">
	<defs>
		<linearGradient id="report-sparkle" x1="0" y1="0" x2="1" y2="1">
			<stop offset="0%" stop-color="#7dd3fc" />
			<stop offset="100%" stop-color="#1d4ed8" />
		</linearGradient>
	</defs>
</svg>

<SiteFooter />

<StatusBar {lastUpdated} {loading} />
