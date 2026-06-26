<script lang="ts">
	import type { Snippet } from 'svelte';

	type Level = 'info' | 'warning' | 'danger';

	let {
		level = 'info',
		title,
		children
	}: { level?: Level; title?: string; children: Snippet } = $props();

	const iconColor: Record<Level, string> = {
		info: 'text-sky-400',
		warning: 'text-amber-400',
		danger: 'text-red-500'
	};

	const icon = $derived(iconColor[level]);
</script>

<div class="flex items-start gap-3 rounded-2xl border border-border bg-surface p-4">
	<svg
		class="mt-0.5 shrink-0 {icon}"
		width="22"
		height="22"
		viewBox="0 0 24 24"
		fill="none"
		aria-hidden="true"
	>
		{#if level === 'info'}
			<circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.8" />
			<path d="M12 11v5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
			<circle cx="12" cy="7.5" r="0.6" fill="currentColor" stroke="currentColor" />
		{:else}
			<path
				d="M12 3 2 20h20L12 3Z"
				stroke="currentColor"
				stroke-width="1.8"
				stroke-linejoin="round"
			/>
			<path d="M12 10v4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
			<circle cx="12" cy="17" r="0.6" fill="currentColor" stroke="currentColor" />
		{/if}
	</svg>
	<div class="text-sm leading-relaxed text-neutral-300">
		{#if title}<span class="font-medium text-neutral-100">{title}.</span>{' '}{/if}{@render children()}
	</div>
</div>
