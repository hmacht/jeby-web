<script lang="ts">
	// The persistent live-status bar pinned to the bottom of the viewport: who the
	// data comes from on the left, how fresh it is on the right.
	import noaaLogo from '$lib/assets/NOAA-color-logo.png';
	import whoiLogo from '$lib/assets/WHOI-color-logo.png';
	import mericaFlag from '$lib/assets/merica.png';

	let { lastUpdated, loading }: { lastUpdated: string; loading: boolean } = $props();
</script>

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
