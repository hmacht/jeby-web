<script lang="ts">
	// The AI's steering advice for the selected vessel: how to drive this boat
	// through the current seas.
	import Sparkles from '@lucide/svelte/icons/sparkles';
	import type { BumpyAnalysis } from '$lib/jeby/models';

	let { analysis }: { analysis: BumpyAnalysis | null } = $props();
</script>

<!-- Gradient (light → dark blue) referenced by the sparkle icon. -->
<svg aria-hidden="true" width="0" height="0" class="absolute">
	<defs>
		<linearGradient id="sparkle-gradient" x1="0" y1="0" x2="1" y2="1">
			<stop offset="0%" stop-color="#7dd3fc" />
			<stop offset="100%" stop-color="#1d4ed8" />
		</linearGradient>
	</defs>
</svg>

<section class="flex flex-col rounded-2xl border border-border bg-surface p-5">
	<div class="flex items-center gap-2">
		<Sparkles size={18} color="url(#sparkle-gradient)" class="shrink-0" />
		<h3 class="text-base font-medium text-white">AI Captain Suggestions</h3>
	</div>

	<p class="mt-4 flex-1 text-sm leading-relaxed text-neutral-300">
		{analysis?.steering ?? 'BumpyScore™ analysis unavailable right now.'}
	</p>

	<p class="mt-4 text-xs leading-relaxed text-neutral-500">
		AI can make mistakes. The captain of the vessel is solely responsible for its safe operation and
		for all decisions made aboard.
	</p>
</section>
