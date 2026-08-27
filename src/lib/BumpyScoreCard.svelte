<script lang="ts">
	// The BumpyScore card. The whole card is a dark→bright diagonal wash of the
	// score's own color on the 0–100 scale (grey when there's no score), so the
	// card itself reads the severity. A moon replaces the number during the
	// backend's overnight quiet hours.
	import Gauge from '@lucide/svelte/icons/gauge';
	import Info from '@lucide/svelte/icons/info';
	import Moon from '@lucide/svelte/icons/moon';
	import Sparkles from '@lucide/svelte/icons/sparkles';
	import type { BumpyAnalysis } from '$lib/jeby/models';

	let {
		score,
		disclaimers,
		analysis,
		quietHours = false,
		onShowDisclaimers
	}: {
		score: number | null;
		disclaimers: string[];
		analysis: BumpyAnalysis | null;
		quietHours?: boolean;
		onShowDisclaimers: () => void;
	} = $props();

	// Evenly spaced gradient stops (0 → 100).
	const SCORE_STOPS = ['#4ade80', '#a3e635', '#facc15', '#fb923c', '#ef4444', '#a855f7'];

	// The RGB color at a 0–100 score position, interpolated across the stops.
	function scoreRgb(pct: number): [number, number, number] {
		const p = Math.min(100, Math.max(0, pct)) / 100;
		const span = 1 / (SCORE_STOPS.length - 1);
		const i = Math.min(SCORE_STOPS.length - 2, Math.floor(p / span));
		const t = (p - i * span) / span;
		const lerp = (a: number, b: number) => Math.round(a + (b - a) * t);
		const hex = (c: string) =>
			[1, 3, 5].map((s) => parseInt(c.slice(s, s + 2), 16)) as [number, number, number];
		const [r1, g1, b1] = hex(SCORE_STOPS[i]);
		const [r2, g2, b2] = hex(SCORE_STOPS[i + 1]);
		return [lerp(r1, r2), lerp(g1, g2), lerp(b1, b2)];
	}

	// Deep (top-left) mixes the score color 74% toward black; bright (bottom-right)
	// 30% — the same dark→bright diagonal the station cards use. With no score
	// (quiet hours, or analysis not computed yet) fall back to the Nantucket Sound
	// buoy's blue instead of a color on the severity scale.
	const gradient = $derived.by(() => {
		if (score == null) {
			return 'linear-gradient(135deg, var(--color-buoy-deep), var(--color-buoy-bright))';
		}
		const base = scoreRgb(score);
		const mix = (by: number) => base.map((c) => Math.round(c * (1 - by))).join(', ');
		return `linear-gradient(135deg, rgb(${mix(0.74)}), rgb(${mix(0.3)}))`;
	});
</script>

<section class="flex flex-col rounded-2xl p-5 text-white" style="background-image: {gradient}">
	<div class="flex items-center gap-2">
		<Gauge size={17} class="shrink-0 text-white/90" />
		<h3 class="text-xs font-semibold uppercase tracking-wide text-white/90">BumpyScore&trade;</h3>
		{#if disclaimers.length}
			<button
				type="button"
				onclick={onShowDisclaimers}
				aria-label="Today's disclaimers"
				title="Today's disclaimers"
				class="ml-auto flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white/90 transition hover:bg-white/20 hover:text-white"
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
</section>
