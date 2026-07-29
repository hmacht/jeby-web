<script lang="ts">
	// Compact nav that slides in from the top once the page header scrolls out of
	// view. Keeps the brand and vessel picker reachable without scrolling up.
	import VesselSelect from '$lib/VesselSelect.svelte';
	import type { Vessel } from '$lib/jeby/models';

	let {
		visible,
		title,
		vessels,
		selected,
		disabled = false,
		onSelect
	}: {
		visible: boolean;
		title: string;
		vessels: Vessel[];
		selected: string;
		disabled?: boolean;
		onSelect: (code: string) => void;
	} = $props();
</script>

<div
	class="fixed inset-x-0 top-0 z-40 border-b border-border bg-background/85 backdrop-blur transition-all duration-300 {visible
		? 'translate-y-0 opacity-100'
		: 'pointer-events-none -translate-y-full opacity-0'}"
>
	<div class="flex items-center justify-between gap-4 px-6 py-3 sm:px-12 lg:px-16">
		<span class="min-w-0 truncate text-base font-medium text-white">{title}</span>
		<VesselSelect {vessels} {selected} {disabled} {onSelect} class="w-40 shrink-0 sm:w-56" />
	</div>
</div>
