<script lang="ts">
	// Compact nav that slides in from the top once the page header scrolls out of
	// view. The section links sit dead center and highlight as you scroll; on
	// mobile there's no room for them, so the left-hand title becomes the current
	// section's name instead.
	import VesselSelect from '$lib/VesselSelect.svelte';
	import type { Vessel } from '$lib/jeby/models';

	let {
		visible,
		title,
		sections,
		activeSection,
		onSectionSelect,
		vessels,
		selected,
		disabled = false,
		onSelect
	}: {
		visible: boolean;
		title: string;
		sections: { id: string; label: string }[];
		activeSection: string;
		onSectionSelect: (id: string) => void;
		vessels: Vessel[];
		selected: string;
		disabled?: boolean;
		onSelect: (code: string) => void;
	} = $props();

	const activeLabel = $derived(sections.find((s) => s.id === activeSection)?.label ?? title);
</script>

<div
	class="fixed inset-x-0 top-0 z-40 border-b border-border bg-background/85 backdrop-blur transition-all duration-300 {visible
		? 'translate-y-0 opacity-100'
		: 'pointer-events-none -translate-y-full opacity-0'}"
>
	<div class="relative flex items-center justify-between gap-4 px-6 py-3 sm:px-12 lg:px-16">
		<!-- The brand on desktop; the current section on mobile, where the links don't fit. -->
		<span class="min-w-0 truncate text-base font-medium text-white">
			<span class="sm:hidden">{activeLabel}</span>
			<span class="hidden sm:inline">{title}</span>
		</span>

		<!-- Section links, centered on the bar itself rather than in the leftover space. -->
		<nav
			class="absolute left-1/2 hidden -translate-x-1/2 items-center gap-1 sm:flex"
			aria-label="Page sections"
		>
			{#each sections as section (section.id)}
				<button
					type="button"
					onclick={() => onSectionSelect(section.id)}
					aria-current={activeSection === section.id ? 'true' : undefined}
					class="rounded-full px-3 py-1.5 text-sm font-medium transition {activeSection ===
					section.id
						? 'bg-white/10 text-white'
						: 'text-neutral-400 hover:text-neutral-200'}"
				>
					{section.label}
				</button>
			{/each}
		</nav>

		<VesselSelect {vessels} {selected} {disabled} {onSelect} class="w-40 shrink-0 sm:w-56" />
	</div>
</div>
