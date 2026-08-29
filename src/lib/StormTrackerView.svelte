<script lang="ts">
	// The Storm Tracker tab: a dashboard rather than a row of cards. A status band
	// up top answers "is it storming?", radial gauges carry the chances, a timeline
	// runs the rest of today, and the NOAA marine forecast sits underneath as a
	// teletype readout.
	import CloudLightning from '@lucide/svelte/icons/cloud-lightning';
	import Droplets from '@lucide/svelte/icons/droplets';
	import List from '@lucide/svelte/icons/list';
	import TriangleAlert from '@lucide/svelte/icons/triangle-alert';
	import Modal from '$lib/Modal.svelte';
	import {
		stormLevel,
		stormsMissing,
		type ForecastSummary,
		type Storms,
		type Weather
	} from '$lib/jeby/models';
	import { cToF, mpsToMph } from '$lib/jeby/utils';

	let {
		storms,
		weather,
		forecast
	}: {
		storms: Storms | null;
		weather: Weather | null;
		forecast: ForecastSummary | null;
	} = $props();

	let showForecast = $state(false);

	const periods = $derived(forecast?.periods ?? []);

	const level = $derived(stormLevel(storms));

	// Named on any state: a storm can be found with a source still down. The
	// unknown band folds it into its own subtitle, so the standalone note below
	// is for the states that don't.
	const missing = $derived(stormsMissing(storms));

	// Storming now beats expected, which beats an unknown, which beats all clear.
	// Each state carries its own palette for the band. Unknown deliberately does
	// not get the green one: an all-clear is a claim we can't make when a source
	// we needed never answered.
	const status = $derived.by(() => {
		switch (level) {
			case 'unavailable':
				return {
					text: 'Storm data unavailable',
					sub: 'Could not reach the forecast right now.',
					accent: '#a3a3a3',
					ring: 'border-neutral-700',
					glow: 'bg-neutral-500/10'
				};
			case 'now':
				return {
					text: 'Storming now',
					sub: 'Active storm conditions reported at the station.',
					accent: '#ef4444',
					ring: 'border-red-500/40',
					glow: 'bg-red-500/20'
				};
			case 'today':
				return {
					text: 'Storms expected today',
					sub: 'Conditions are lining up for storms before the day is out.',
					accent: '#fbbf24',
					ring: 'border-amber-400/40',
					glow: 'bg-amber-400/20'
				};
			case 'unknown':
				return {
					text: 'Storm data incomplete',
					sub: missing
						? `Could not reach ${missing}, so this is not a full picture.`
						: 'Part of the storm picture is missing, so this is not an all clear.',
					accent: '#a3a3a3',
					ring: 'border-neutral-700',
					glow: 'bg-neutral-500/10'
				};
			case 'clear':
				return {
					text: 'All clear',
					sub: 'No storms in the picture for the rest of today.',
					accent: '#34d399',
					ring: 'border-emerald-400/30',
					glow: 'bg-emerald-400/15'
				};
		}
	});

	// Radial gauge geometry.
	const R = 38;
	const CIRC = 2 * Math.PI * R;
	const dash = (pct: number | null) =>
		`${(CIRC * Math.min(100, Math.max(0, pct ?? 0))) / 100} ${CIRC}`;
	const pct = (v: number | null) => (v == null ? '—' : `${Math.round(v)}%`);

	const gauges = $derived([
		{
			label: 'Thunder',
			value: storms?.thunderChance.value ?? null,
			color: '#fbbf24',
			Icon: CloudLightning
		},
		{
			label: 'Precipitation',
			value: storms?.precipitationChance.value ?? null,
			color: '#38bdf8',
			Icon: Droplets
		}
	]);

	const temp = $derived(
		weather?.airTemp.value == null ? '—' : `${Math.round(cToF(weather.airTemp.value))}°`
	);
	const wind = $derived(
		weather?.windSpeed.value == null
			? '—'
			: `${Math.round(mpsToMph(weather.windSpeed.value))} mph${
					weather.windDirectionCardinal ? ` ${weather.windDirectionCardinal}` : ''
				}`
	);
	const gust = $derived(
		weather?.windGust.value == null ? '—' : `${Math.round(mpsToMph(weather.windGust.value))} mph`
	);
	const humidity = $derived(
		weather?.humidity.value == null ? '—' : `${Math.round(weather.humidity.value)}%`
	);
	const pressure = $derived(
		weather?.pressure.value == null ? '—' : `${Math.round(weather.pressure.value)} hPa`
	);
</script>

<!-- Status band -->
<div class="relative overflow-hidden rounded-2xl border {status.ring} bg-surface p-6 sm:p-8">
	<div
		aria-hidden="true"
		class="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full {status.glow} blur-3xl"
	></div>

	<div class="relative flex items-center gap-5">
		<!-- Radar pulse -->
		<span class="relative flex h-14 w-14 shrink-0 items-center justify-center">
			<span
				class="absolute inset-0 rounded-full opacity-60"
				style="border: 2px solid {status.accent}; animation: storm-ping 2.4s cubic-bezier(0, 0, 0.2, 1) infinite"
				aria-hidden="true"
			></span>
			<span
				class="absolute inset-0 rounded-full"
				style="border: 1px solid {status.accent}; opacity: 0.35"
				aria-hidden="true"
			></span>
			<CloudLightning size={26} style="color: {status.accent}" />
		</span>

		<div class="min-w-0">
			<h2 class="text-2xl font-semibold tracking-tight sm:text-3xl" style="color: {status.accent}">
				{status.text}
			</h2>
			<p class="mt-1 text-sm leading-relaxed text-neutral-400">{status.sub}</p>
		</div>
	</div>

	{#if missing && level !== 'unknown'}
		<p class="relative mt-4 text-sm text-neutral-500">
			Could not reach {missing}, so the picture below is partial.
		</p>
	{/if}

	{#if storms?.observed.length}
		<p class="relative mt-5 border-t border-border pt-4 text-sm text-neutral-300">
			<span class="font-medium text-white">Reported now:</span>
			{storms.observed.map((o) => o.text).join(', ')}
		</p>
	{/if}

	{#if storms?.alerts.length}
		<ul class="relative mt-4 space-y-2">
			{#each storms.alerts as alert (alert.event + alert.description)}
				<li class="flex items-start gap-2.5 text-sm">
					<TriangleAlert size={16} class="mt-0.5 shrink-0 text-amber-400" />
					<span class="text-neutral-300">
						<span class="font-medium text-white">{alert.event}.</span>
						{alert.description}
					</span>
				</li>
			{/each}
		</ul>
	{/if}
</div>

<!-- Chances + the air ashore -->
<div class="mt-4 grid gap-4 lg:grid-cols-3">
	<!-- Gauges -->
	<div
		class="flex items-center justify-around gap-4 rounded-2xl border border-border bg-surface p-6 lg:col-span-2"
	>
		{#each gauges as gauge (gauge.label)}
			<div class="flex flex-col items-center">
				<div class="relative">
					<svg width="104" height="104" viewBox="0 0 104 104" class="-rotate-90">
						<circle cx="52" cy="52" r={R} fill="none" stroke="#2c2c2c" stroke-width="9" />
						<circle
							cx="52"
							cy="52"
							r={R}
							fill="none"
							stroke={gauge.color}
							stroke-width="9"
							stroke-linecap="round"
							stroke-dasharray={dash(gauge.value)}
						/>
					</svg>
					<span class="absolute inset-0 flex items-center justify-center">
						<span class="text-xl font-semibold tabular-nums text-white">{pct(gauge.value)}</span>
					</span>
				</div>
				<div class="mt-2 flex items-center gap-1.5 text-sm text-neutral-400">
					<gauge.Icon size={14} class="shrink-0" style="color: {gauge.color}" />
					{gauge.label}
				</div>
			</div>
		{/each}
	</div>

	<!-- The air ashore -->
	<div class="rounded-2xl border border-border bg-surface p-6">
		<div class="flex items-center gap-3">
			{#if weather?.iconUrl}
				<img
					src={weather.iconUrl}
					alt={weather.summary ?? 'Current conditions'}
					class="h-12 w-12 shrink-0 rounded-xl border border-border object-cover"
				/>
			{/if}
			<div class="min-w-0">
				<div class="text-3xl font-semibold leading-none tracking-tight text-white">{temp}</div>
				{#if weather?.summary}
					<p class="mt-1 truncate text-sm text-neutral-400">{weather.summary}</p>
				{/if}
			</div>
		</div>

		<dl class="mt-5 space-y-2 text-sm">
			{#each [{ k: 'Wind', v: wind }, { k: 'Gusts', v: gust }, { k: 'Humidity', v: humidity }, { k: 'Pressure', v: pressure }] as row (row.k)}
				<div class="flex items-center justify-between">
					<dt class="text-neutral-400">{row.k}</dt>
					<dd class="font-semibold tabular-nums text-white">{row.v}</dd>
				</div>
			{/each}
		</dl>
	</div>
</div>

<!-- Today's timeline -->
{#if storms?.outlook.length}
	<h3 class="mt-10 text-lg font-medium text-white">The rest of today</h3>
	<ol class="mt-4 space-y-0">
		{#each storms.outlook as period, i (period.name)}
			<li class="flex gap-4">
				<!-- Rail -->
				<div class="flex w-4 shrink-0 flex-col items-center">
					<span
						class="mt-1.5 h-3 w-3 shrink-0 rounded-full ring-4 ring-background {period.stormy
							? 'bg-amber-400'
							: 'bg-neutral-600'}"
						aria-hidden="true"
					></span>
					{#if i < storms.outlook.length - 1}
						<span class="w-px flex-1 bg-border" aria-hidden="true"></span>
					{/if}
				</div>
				<div class="min-w-0 pb-6">
					<h4 class="text-sm font-semibold text-white">{period.name}</h4>
					<p class="mt-0.5 text-sm leading-relaxed text-neutral-400">{period.forecast}</p>
				</div>
			</li>
		{/each}
	</ol>
{/if}

<!-- NOAA marine forecast, as a teletype readout -->
<div class="mt-6 flex items-center justify-between gap-4">
	<h3 class="text-lg font-medium text-white">NOAA marine forecast</h3>
	{#if periods.length > 0}
		<button
			type="button"
			onclick={() => (showForecast = true)}
			aria-label="View full forecast"
			title="View full forecast"
			class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border bg-white/5 text-neutral-300 transition hover:bg-white/10 hover:text-white"
		>
			<List size={16} />
		</button>
	{/if}
</div>

<div class="mt-3 overflow-hidden rounded-2xl border border-border bg-black/40">
	{#each periods.slice(0, 3) as period (period.header)}
		<div class="border-b border-border px-5 py-4 last:border-b-0">
			<h4 class="font-mono text-xs uppercase tracking-wider text-sky-300">{period.header}</h4>
			<p class="mt-1.5 font-mono text-sm leading-relaxed text-neutral-300">{period.text}</p>
		</div>
	{:else}
		<p class="px-5 py-4 text-sm text-neutral-400">Forecast unavailable right now.</p>
	{/each}
</div>

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

<style>
	@keyframes storm-ping {
		0% {
			transform: scale(1);
			opacity: 0.6;
		}
		75%,
		100% {
			transform: scale(1.9);
			opacity: 0;
		}
	}
</style>
