<script lang="ts">
	// The AI's steering advice for the selected vessel — how to drive this boat
	// through the current seas — with the standing disclaimer beneath it. Rendered
	// bare, for the modal the BumpyScore card opens.
	import Sparkles from '@lucide/svelte/icons/sparkles';
	import type { BumpyAnalysis } from '$lib/jeby/models';

	let { analysis }: { analysis: BumpyAnalysis | null } = $props();
</script>

<!-- Gradient (light → dark blue) for the sparkle. -->
<svg aria-hidden="true" width="0" height="0" class="absolute">
	<defs>
		<linearGradient id="sparkle-gradient" x1="0" y1="0" x2="1" y2="1">
			<stop offset="0%" stop-color="#7dd3fc" />
			<stop offset="100%" stop-color="#1d4ed8" />
		</linearGradient>
	</defs>
</svg>

<div>
	<div class="flex items-center gap-1.5 text-xs font-medium text-neutral-400">
		<Sparkles size={14} color="url(#sparkle-gradient)" class="shrink-0" />
		AI Captain Suggestions
	</div>

	<p class="mt-2 text-sm leading-relaxed text-neutral-300">
		{analysis?.steering ?? 'Captain suggestions unavailable right now.'}
	</p>

	<p class="mt-5 border-t border-border pt-4 text-xs leading-relaxed text-neutral-500">
		AI can make mistakes. The captain of the vessel is solely responsible for its safe operation and
		for all decisions made aboard.
	</p>
</div>
