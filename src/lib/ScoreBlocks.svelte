<script lang="ts">
	// The BumpyScore as a run of monospace blocks, shaded in up to the score. Each
	// filled block takes the scale's color at its own position, so the run reads as
	// the gradient. Sized in characters so it lines up with monospace text around it.
	//
	// Drawn as two layers rather than one run of cells: the empty track underneath,
	// the shaded blocks laid over it and revealed a block at a time on load. The
	// overlay's width is a percentage of the track, so one step is exactly one cell
	// whatever the block glyph's advance turns out to be.
	import { scoreColor } from '$lib/jeby/score';

	let { score, cells = 40 }: { score: number | null; cells?: number } = $props();

	const filled = $derived(
		score == null ? 0 : Math.round((Math.min(100, Math.max(0, score)) / 100) * cells)
	);

	// Built as HTML strings rather than runs of elements: any whitespace between
	// the characters would open gaps in the bar. Every part of both strings is
	// generated here from numbers and two fixed glyphs, so there's nothing to
	// escape.
	const trackHtml = $derived(
		`<span style="color:rgb(255 255 255 / 0.12)">${'░'.repeat(cells)}</span>`
	);

	const fillHtml = $derived.by(() => {
		let html = '';
		for (let i = 0; i < filled; i++) {
			html += `<span style="color:${scoreColor(((i + 0.5) / cells) * 100)}">▍</span>`;
		}
		return html;
	});
</script>

<span class="bar">
	<!-- eslint-disable-next-line svelte/no-at-html-tags -- built above from one fixed glyph; nothing user-supplied -->
	{@html trackHtml}
	{#if filled > 0}
		<span class="fill" style="--width:{(filled / cells) * 100}%; --steps:{filled}">
			<!-- eslint-disable-next-line svelte/no-at-html-tags -- built above from numbers and one fixed glyph; nothing user-supplied -->
			{@html fillHtml}
		</span>
	{/if}
</span>

<style>
	.bar {
		position: relative;
		display: inline-block;
		white-space: nowrap;
	}

	/* Lies over the track's first cells and widens into place. Stepping by whole
	   cells is what makes it tick rather than slide.

	   Declared in CSS rather than driven from onMount on purpose: the bar is
	   server-rendered, so a script that reset it to zero after hydration would
	   flash the finished bar first. This way the markup ships complete and the
	   animation simply plays on first paint. */
	.fill {
		position: absolute;
		top: 0;
		left: 0;
		overflow: hidden;
		white-space: nowrap;
		width: var(--width);
		animation: tick-up 900ms steps(var(--steps)) both;
	}

	/* Only a `from`, so the element's own width is the implicit end state. */
	@keyframes tick-up {
		from {
			width: 0;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.fill {
			animation: none;
		}
	}
</style>
