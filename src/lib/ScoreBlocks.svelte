<script lang="ts">
	// The BumpyScore as a run of monospace blocks, shaded in up to the score. Each
	// filled block takes the scale's color at its own position, so the run reads as
	// the gradient. Sized in characters so it lines up with monospace text around it.
	import { scoreColor } from '$lib/jeby/score';

	let { score, cells = 40 }: { score: number | null; cells?: number } = $props();

	// Built as one HTML string rather than a run of elements: any whitespace
	// between the characters would open gaps in the bar. Every part of it is
	// generated here from numbers and two fixed glyphs, so there's nothing to
	// escape.
	const barHtml = $derived.by(() => {
		const filled =
			score == null ? 0 : Math.round((Math.min(100, Math.max(0, score)) / 100) * cells);
		let html = '';
		for (let i = 0; i < cells; i++) {
			const isFilled = i < filled;
			const color = isFilled ? scoreColor(((i + 0.5) / cells) * 100) : 'rgb(255 255 255 / 0.12)';
			html += `<span style="color:${color}">${isFilled ? '▍' : '░'}</span>`;
		}
		return html;
	});
</script>

<!-- eslint-disable-next-line svelte/no-at-html-tags -- built above from numbers and two fixed glyphs; nothing user-supplied -->
{@html barHtml}
