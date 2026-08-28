<script lang="ts">
	// The vessel section: who the BumpyScore is tuned to. Name and description on
	// the left, the spec table on the right. Renders nothing when no vessel is
	// available.
	import ChessQueen from '@lucide/svelte/icons/chess-queen';
	import Ship from '@lucide/svelte/icons/ship';
	import { isIslandQueen, type Vessel } from '$lib/jeby/models';

	let { vessel }: { vessel: Vessel | null } = $props();

	const specs = $derived(
		vessel
			? [
					{ label: 'Length', value: vessel.length },
					{ label: 'Weight', value: vessel.weight },
					{ label: 'Horsepower', value: vessel.horsepower },
					{ label: 'Max passengers', value: vessel.maxPassengers }
				]
			: []
	);
</script>

{#if vessel}
	<section class="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-12">
		<div class="max-w-md">
			<h2 class="flex items-center gap-2 text-lg font-medium text-white">
				{#if isIslandQueen(vessel)}
					<ChessQueen size={20} class="shrink-0 text-yellow-400" />
				{:else}
					<Ship size={18} class="shrink-0 text-neutral-300" />
				{/if}
				Tuned for the {vessel.name}
			</h2>
			<p class="mt-2 text-sm leading-relaxed text-neutral-400">{vessel.description}</p>
		</div>

		<dl
			class="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface text-sm lg:ml-auto lg:w-80 lg:shrink-0"
		>
			{#each specs as spec (spec.label)}
				<div class="flex items-center justify-between px-4 py-3">
					<dt class="text-neutral-400">{spec.label}</dt>
					<dd class="font-semibold text-white">{spec.value}</dd>
				</div>
			{/each}
		</dl>
	</section>
{/if}
