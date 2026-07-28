<script lang="ts">
	// "Tuned for" section: describes the vessel the BumpyScore is calibrated to and
	// lists its specs. Renders nothing when no vessel is available.
	import type { Vessel } from '$lib/jeby/models';

	let { vessel }: { vessel: Vessel | null } = $props();
</script>

{#if vessel}
	<section class="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-12">
		<div class="max-w-md">
			<h2 class="text-lg font-medium text-white">Tuned for the {vessel.name}</h2>
			<p class="mt-2 text-sm leading-relaxed text-neutral-400">{vessel.description}</p>
		</div>
		<dl
			class="divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface text-sm lg:ml-auto lg:w-80 lg:shrink-0"
		>
			<div class="flex items-center justify-between px-4 py-2.5">
				<dt class="text-neutral-400">Length</dt>
				<dd class="font-semibold text-white">{vessel.length}</dd>
			</div>
			<div class="flex items-center justify-between px-4 py-2.5">
				<dt class="text-neutral-400">Weight</dt>
				<dd class="font-semibold text-white">{vessel.weight}</dd>
			</div>
			<div class="flex items-center justify-between px-4 py-2.5">
				<dt class="text-neutral-400">Horsepower</dt>
				<dd class="font-semibold text-white">{vessel.horsepower}</dd>
			</div>
			<div class="flex items-center justify-between px-4 py-2.5">
				<dt class="text-neutral-400">Max passengers</dt>
				<dd class="font-semibold text-white">{vessel.maxPassengers}</dd>
			</div>
		</dl>
	</section>
{/if}
