<script lang="ts">
	// The BumpyScore as a headline rather than a card: the number and its label on
	// the left, whatever the page hands us off to the right, and the 0–100 scale
	// running across underneath. The reasoning behind the number lives in the
	// details modal, opened from the info icon by the label.
	import Info from '@lucide/svelte/icons/info';
	import Moon from '@lucide/svelte/icons/moon';
	import type { Snippet } from 'svelte';
	import { scoreColor } from '$lib/jeby/score';

	let {
		score,
		quietHours = false,
		onShowDetails,
		aside
	}: {
		score: number | null;
		quietHours?: boolean;
		onShowDetails: () => void;
		// Rendered to the right of the score — the page puts the alerts here.
		aside?: Snippet;
	} = $props();

	// The scale is drawn the way the text report draws it: solid blocks up to the
	// score, light-shade blocks for the rest. How many characters fit is measured
	// from a hidden ruler glyph in the same font, so the bar always spans the row.
	let barWidth = $state(0);
	let rulerWidth = $state(0);

	// The ruler is a long run of the glyph rather than a single one: measured
	// widths are whole pixels, so dividing a long run gets the per-character width
	// accurate enough that the bar reaches the end of the row.
	const RULER_LENGTH = 100;
	const RULER = '█'.repeat(RULER_LENGTH);
	const charWidth = $derived(rulerWidth / RULER_LENGTH);
	const cells = $derived(
		charWidth > 0 && barWidth > 0 ? Math.max(12, Math.floor(barWidth / charWidth)) : 48
	);

	// Filled cells use a three-quarter block, which draws short of its own cell and
	// so leaves a small gap between blocks; the ░ track fills its cell edge to edge
	// and stays solid. Doing it with the glyphs rather than letter-spacing keeps
	// every cell the same width, so the bar's length doesn't shift with the score.
	//
	// Built as one HTML string rather than a run of elements: any whitespace
	// between the characters would open gaps in the track. Every part of it is
	// generated here from numbers and two fixed glyphs, so there's nothing to
	// escape.
	const barHtml = $derived.by(() => {
		const filled =
			score == null ? 0 : Math.round((Math.min(100, Math.max(0, score)) / 100) * cells);
		let html = '';
		for (let i = 0; i < cells; i++) {
			const isFilled = i < filled;
			const color = isFilled ? scoreColor(((i + 0.5) / cells) * 100) : 'rgb(255 255 255 / 0.12)';
			html += `<span style="color:${color}">${isFilled ? '▊' : '░'}</span>`;
		}
		return html;
	});
</script>

<div class="flex items-end justify-between gap-4 sm:gap-6">
	<div class="min-w-0">
		<div class="flex items-baseline gap-1.5">
			{#if quietHours}
				<Moon size={64} class="text-neutral-400" />
			{:else if score == null}
				<!-- No score yet: a muted dash, and no "/100" to dangle beside it. -->
				<span
					class="text-7xl font-normal leading-none tracking-tighter text-neutral-600 sm:text-8xl"
					>&mdash;</span
				>
			{:else}
				<span class="text-7xl font-normal leading-none tracking-tighter sm:text-8xl">{score}</span>
				<span class="text-lg font-medium text-neutral-500">/100</span>
			{/if}
		</div>

		<div class="mt-2 flex items-center gap-2 text-base text-neutral-400">
			<span>BumpyScore&trade;</span>
			<button
				type="button"
				onclick={onShowDetails}
				aria-label="BumpyScore details"
				title="BumpyScore details"
				class="text-sky-400 transition hover:text-sky-300"
			>
				<Info size={18} />
			</button>
		</div>
	</div>

	{#if aside}
		<div class="ml-auto min-w-0 max-w-md">{@render aside()}</div>
	{/if}
</div>

<!-- The scale the score above sits on. -->
<div class="mt-8">
	<!-- A run of the glyph in the bar's own font, measured to work out how many fit. -->
	<span
		bind:clientWidth={rulerWidth}
		class="invisible absolute whitespace-nowrap font-mono text-3xl sm:text-4xl"
		aria-hidden="true">{RULER}</span
	>

	<!-- leading is roomy on purpose: the block glyphs overshoot a tight line box
		and get shaved off at the top and bottom. -->
	<div
		bind:clientWidth={barWidth}
		class="overflow-hidden whitespace-nowrap font-mono text-3xl leading-[1.4] sm:text-4xl"
		aria-hidden="true"
	>
		<!-- eslint-disable-next-line svelte/no-at-html-tags -- built above from numbers and two fixed glyphs; nothing user-supplied -->
		{@html barHtml}
	</div>

	<div class="mt-3 flex justify-between font-mono text-sm text-neutral-500">
		<span>0</span>
		<span>25</span>
		<span>50</span>
		<span>75</span>
		<span>100</span>
	</div>
</div>
