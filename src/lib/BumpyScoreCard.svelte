<script lang="ts">
	// The BumpyScore card. The whole card is a dark→bright diagonal wash of the
	// score's own color on the 0–100 scale (grey when there's no score), so the
	// card itself reads the severity. A moon replaces the number during the
	// backend's overnight quiet hours.
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import Gauge from '@lucide/svelte/icons/gauge';
	import Info from '@lucide/svelte/icons/info';
	import Moon from '@lucide/svelte/icons/moon';
	import Sparkles from '@lucide/svelte/icons/sparkles';
	import type { BumpyAnalysis } from '$lib/jeby/models';
	import { scoreGradient } from '$lib/jeby/score';

	let {
		score,
		disclaimers,
		analysis,
		quietHours = false,
		onShowDisclaimers,
		onShowAdvice
	}: {
		score: number | null;
		disclaimers: string[];
		analysis: BumpyAnalysis | null;
		quietHours?: boolean;
		onShowDisclaimers: () => void;
		// Opens the captain's advice for the day, with the AI disclaimer alongside.
		onShowAdvice: () => void;
	} = $props();

	const gradient = $derived(scoreGradient(score));
</script>

<section
	class="flex min-h-80 flex-col rounded-2xl p-5 text-white"
	style="background-image: {gradient}"
>
	<div class="flex items-center gap-2">
		<Gauge size={17} class="shrink-0 text-white/90" />
		<h3 class="text-xs font-semibold uppercase tracking-wide text-white/90">BumpyScore&trade;</h3>
		{#if disclaimers.length}
			<button
				type="button"
				onclick={onShowDisclaimers}
				aria-label="BumpyScore details"
				title="BumpyScore details"
				class="ml-auto flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white/90 transition hover:bg-white/20 hover:text-white"
			>
				<Info size={16} />
			</button>
		{/if}
	</div>

	<div class="mt-3 flex items-baseline gap-1.5">
		{#if quietHours}
			<Moon size={60} class="text-white/70" />
		{:else}
			<span class="text-7xl font-semibold leading-none tracking-tighter">{score ?? '—'}</span>
			<span class="text-lg font-medium text-white/50">/ 100</span>
		{/if}
	</div>

	<div class="mt-4 flex-1">
		<div class="flex items-center gap-1.5 text-xs font-medium text-white/80">
			<Sparkles size={14} class="shrink-0 text-white" />
			AI Analysis
		</div>
		<p class="mt-1.5 text-sm leading-relaxed text-white/90">
			{analysis?.bumpy ?? 'BumpyScore™ analysis unavailable right now.'}
		</p>
	</div>

	<!-- The app's frosted full-width button: white/16 on the wash, white/12 hairline. -->
	<button
		type="button"
		onclick={onShowAdvice}
		class="mt-[18px] flex w-full items-center justify-between rounded-2xl border border-white/12 bg-white/16 px-4 py-3.5 font-semibold text-white transition hover:bg-white/24"
	>
		Captain's advice
		<ChevronRight size={16} strokeWidth={2.5} />
	</button>
</section>
