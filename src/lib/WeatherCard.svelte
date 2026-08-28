<script lang="ts">
	// Current weather ashore, from the NWS station at Martha's Vineyard Airport.
	// The marine cards cover the water; this covers the air over it.
	import Cloud from '@lucide/svelte/icons/cloud';
	import CloudDrizzle from '@lucide/svelte/icons/cloud-drizzle';
	import CloudFog from '@lucide/svelte/icons/cloud-fog';
	import CloudLightning from '@lucide/svelte/icons/cloud-lightning';
	import CloudMoon from '@lucide/svelte/icons/cloud-moon';
	import CloudRain from '@lucide/svelte/icons/cloud-rain';
	import CloudSnow from '@lucide/svelte/icons/cloud-snow';
	import CloudSun from '@lucide/svelte/icons/cloud-sun';
	import Cloudy from '@lucide/svelte/icons/cloudy';
	import Haze from '@lucide/svelte/icons/haze';
	import Moon from '@lucide/svelte/icons/moon';
	import Sun from '@lucide/svelte/icons/sun';
	import Thermometer from '@lucide/svelte/icons/thermometer';
	import Tornado from '@lucide/svelte/icons/tornado';
	import Wind from '@lucide/svelte/icons/wind';
	import type { Weather } from '$lib/jeby/models';
	import { cToF, mpsToMph } from '$lib/jeby/utils';

	let { weather }: { weather: Weather | null } = $props();

	const day = $derived(weather?.isDaytime ?? true);

	// The backend's condition tokens, mapped onto icons. Day/night swaps the
	// clear-sky ones for their moon variants. Only used when NWS sent no image.
	const ConditionIcon = $derived.by(() => {
		switch (weather?.condition) {
			case 'clear':
				return day ? Sun : Moon;
			case 'mostly_clear':
			case 'partly_cloudy':
				return day ? CloudSun : CloudMoon;
			case 'mostly_cloudy':
				return Cloudy;
			case 'overcast':
				return Cloud;
			case 'rain':
				return CloudRain;
			case 'freezing_rain':
			case 'sleet':
				return CloudDrizzle;
			case 'snow':
				return CloudSnow;
			case 'thunderstorm':
				return CloudLightning;
			case 'fog':
				return CloudFog;
			case 'haze':
				return Haze;
			case 'windy':
				return Wind;
			case 'hurricane':
			case 'tropical_storm':
			case 'tornado':
				return Tornado;
			default:
				return day ? Sun : Moon;
		}
	});

	const temp = $derived(
		weather?.airTemp.value == null ? '—' : `${Math.round(cToF(weather.airTemp.value))}°`
	);
	const feelsLike = $derived(
		weather?.feelsLike.value == null ? null : `${Math.round(cToF(weather.feelsLike.value))}°`
	);

	const rows = $derived([
		{
			label: 'Wind',
			value:
				weather?.windSpeed.value == null
					? '—'
					: `${Math.round(mpsToMph(weather.windSpeed.value))} mph${
							weather.windDirectionCardinal ? ` ${weather.windDirectionCardinal}` : ''
						}`
		},
		{
			label: 'Gusts',
			value:
				weather?.windGust.value == null
					? '—'
					: `${Math.round(mpsToMph(weather.windGust.value))} mph`
		},
		{
			label: 'Humidity',
			value: weather?.humidity.value == null ? '—' : `${Math.round(weather.humidity.value)}%`
		},
		{
			label: 'Pressure',
			value: weather?.pressure.value == null ? '—' : `${Math.round(weather.pressure.value)} hPa`
		}
	]);
</script>

<section class="flex flex-col rounded-2xl border border-border bg-surface p-5">
	<div class="flex items-center gap-2">
		<Thermometer size={18} class="shrink-0 text-neutral-300" />
		<h3 class="text-base font-medium text-white">Weather</h3>
	</div>

	{#if weather}
		<div class="mt-4 flex items-center gap-4">
			<!-- The NWS image when it sent one; the mapped icon is the fallback. -->
			{#if weather.iconUrl}
				<img
					src={weather.iconUrl}
					alt={weather.summary ?? 'Current conditions'}
					class="h-16 w-16 shrink-0 rounded-xl border border-border object-cover"
				/>
			{:else}
				<ConditionIcon size={44} class="shrink-0 text-sky-300" />
			{/if}
			<div class="min-w-0">
				<div class="flex items-baseline gap-2">
					<span class="text-4xl font-semibold leading-none tracking-tight text-white">{temp}</span>
					{#if feelsLike}
						<span class="text-sm text-neutral-500">feels {feelsLike}</span>
					{/if}
				</div>
				{#if weather.summary}
					<p class="mt-1 truncate text-sm text-neutral-400">{weather.summary}</p>
				{/if}
			</div>
		</div>

		<dl class="mt-5 grid flex-1 grid-cols-2 gap-4">
			{#each rows as row (row.label)}
				<div>
					<dt class="text-xs text-neutral-400">{row.label}</dt>
					<dd class="mt-0.5 text-base font-semibold tabular-nums text-white">{row.value}</dd>
				</div>
			{/each}
		</dl>

		<p class="mt-4 text-xs text-neutral-500">{weather.stationName}</p>
	{:else}
		<p class="mt-4 flex-1 text-sm text-neutral-400">Weather unavailable right now.</p>
	{/if}
</section>
