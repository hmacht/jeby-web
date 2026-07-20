<script lang="ts">
	// Custom vessel dropdown. The named boats (Steamship, Island Queen, Grady-White)
	// show a photo; the generic size classes fall back to a gray tile + ship icon.
	import Check from '@lucide/svelte/icons/check';
	import ChevronDown from '@lucide/svelte/icons/chevron-down';
	import Ship from '@lucide/svelte/icons/ship';
	import type { Vessel } from '$lib/jeby/models';

	let {
		vessels,
		selected,
		disabled = false,
		onSelect
	}: {
		vessels: Vessel[];
		selected: string;
		disabled?: boolean;
		onSelect: (code: string) => void;
	} = $props();

	// Vessel photos live in assets/vessels named by code (e.g. F215.png). Build a
	// code → URL map so the markup can look one up without per-code imports.
	const vesselImages: Record<string, string> = Object.fromEntries(
		Object.entries(
			import.meta.glob('./assets/vessels/*.png', {
				eager: true,
				query: '?url',
				import: 'default'
			})
		).map(([path, url]) => [path.split('/').pop()!.replace('.png', ''), url as string])
	);

	let open = $state(false);
	let root: HTMLDivElement;

	const current = $derived(vessels.find((v) => v.code === selected) ?? null);

	function toggle() {
		if (!disabled) open = !open;
	}

	function choose(code: string) {
		open = false;
		if (code !== selected) onSelect(code);
	}

	function onWindowClick(event: MouseEvent) {
		if (open && root && !root.contains(event.target as Node)) open = false;
	}

	function onWindowKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') open = false;
	}
</script>

<svelte:window onclick={onWindowClick} onkeydown={onWindowKeydown} />

{#snippet thumb(vessel: Vessel)}
	{#if vesselImages[vessel.code]}
		<img src={vesselImages[vessel.code]} alt="" class="h-8 w-8 shrink-0 rounded object-cover" />
	{:else}
		<span
			class="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-neutral-600 text-white"
		>
			<Ship size={16} />
		</span>
	{/if}
{/snippet}

<div class="relative w-full sm:w-64" bind:this={root}>
	<button
		type="button"
		onclick={toggle}
		{disabled}
		aria-haspopup="listbox"
		aria-expanded={open}
		class="flex w-full items-center gap-2.5 rounded-lg border border-border bg-surface py-1.5 pl-1.5 pr-3 text-left text-sm font-medium text-white transition hover:border-neutral-500 focus:border-neutral-400 focus:outline-none disabled:opacity-50"
	>
		{#if current}
			{@render thumb(current)}
			<span class="min-w-0 flex-1 truncate">{current.name}</span>
		{:else}
			<span class="min-w-0 flex-1 truncate text-neutral-400">Select vessel</span>
		{/if}
		<ChevronDown
			size={16}
			class="shrink-0 text-neutral-400 transition-transform {open ? 'rotate-180' : ''}"
		/>
	</button>

	{#if open}
		<ul
			role="listbox"
			class="absolute right-0 z-20 mt-2 max-h-80 w-full overflow-auto rounded-lg border border-border bg-surface p-1 shadow-xl"
		>
			{#each vessels as vessel (vessel.code)}
				<li role="option" aria-selected={vessel.code === selected}>
					<button
						type="button"
						onclick={() => choose(vessel.code)}
						class="flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-left text-sm transition hover:bg-neutral-800 {vessel.code ===
						selected
							? 'bg-neutral-800'
							: ''}"
					>
						{@render thumb(vessel)}
						<span class="min-w-0 flex-1 truncate text-white">{vessel.name}</span>
						{#if vessel.code === selected}
							<Check size={16} class="shrink-0 text-white" />
						{/if}
					</button>
				</li>
			{/each}
		</ul>
	{/if}
</div>
