<script lang="ts">
	// The page's section switcher: an icon+label segmented control. On mobile it
	// floats as a dock centered above the status bar; from sm up it sits inline
	// under the header.
	import type { Component } from 'svelte';

	let {
		tabs,
		active,
		onSelect
	}: {
		tabs: { id: string; label: string; Icon: Component }[];
		active: string;
		onSelect: (id: string) => void;
	} = $props();
</script>

<div
	class="fixed bottom-14 left-1/2 z-40 max-w-[calc(100vw-1.5rem)] -translate-x-1/2 overflow-x-auto sm:static sm:max-w-none sm:translate-x-0 sm:overflow-visible"
>
	<div
		class="inline-flex gap-0.5 rounded-full border border-border bg-surface/90 p-1 shadow-2xl backdrop-blur sm:gap-1 sm:bg-surface sm:shadow-none sm:backdrop-blur-none"
		role="tablist"
	>
		{#each tabs as tab (tab.id)}
			<button
				type="button"
				role="tab"
				aria-selected={active === tab.id}
				onclick={() => onSelect(tab.id)}
				class="flex shrink-0 flex-col items-center gap-0.5 whitespace-nowrap rounded-full px-5 py-1 text-[10px] font-medium leading-tight transition sm:flex-row sm:gap-2 sm:px-4 sm:py-2 sm:text-sm {active ===
				tab.id
					? 'bg-white/10 text-white'
					: 'text-neutral-400 hover:text-neutral-200'}"
			>
				<!-- Stacked icon on mobile; inline at the header size from sm up. -->
				<tab.Icon size={16} class="h-5 w-5 shrink-0 sm:h-4 sm:w-4" />
				{tab.label}
			</button>
		{/each}
	</div>
</div>
