<script lang="ts">
	// The AI's read on the score, as a short labeled note rather than a card — used
	// beside the score in the page hero.
	import Sparkles from '@lucide/svelte/icons/sparkles';

	let { text }: { text: string | null } = $props();
</script>

<!-- Gradient (light → dark blue) for the sparkle. Its own id, so it doesn't
	collide with the one the captain-suggestions card defines. -->
<svg aria-hidden="true" width="0" height="0" class="absolute">
	<defs>
		<linearGradient id="ai-note-gradient" x1="0" y1="0" x2="1" y2="1">
			<stop offset="0%" stop-color="#7dd3fc" />
			<stop offset="100%" stop-color="#1d4ed8" />
		</linearGradient>
	</defs>
</svg>

<div class="max-w-md">
	<div class="flex items-center gap-1.5 text-xs font-medium text-neutral-400">
		<Sparkles size={14} color="url(#ai-note-gradient)" class="shrink-0" />
		AI Analysis
	</div>
	<p class="mt-1.5 text-sm leading-relaxed text-neutral-300">
		{text ?? 'BumpyScore™ analysis unavailable right now.'}
	</p>
</div>
