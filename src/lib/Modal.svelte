<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		open = $bindable(false),
		title,
		children
	}: { open?: boolean; title?: string; children: Snippet } = $props();

	function close() {
		open = false;
	}

	function onKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') close();
	}
</script>

<svelte:window onkeydown={onKeydown} />

{#if open}
	<!-- Backdrop -->
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
		role="presentation"
		onclick={(e) => {
			if (e.target === e.currentTarget) close();
		}}
	>
		<!-- Panel -->
		<div
			class="relative max-h-[85vh] w-full max-w-2xl overflow-hidden rounded-2xl border border-neutral-800 bg-background shadow-2xl"
			role="dialog"
			aria-modal="true"
			aria-label={title}
		>
			<button
				type="button"
				class="absolute right-4 top-4 z-10 grid h-8 w-8 place-items-center rounded-full text-neutral-400 transition hover:bg-neutral-800 hover:text-white"
				aria-label="Close"
				onclick={close}
			>
				<svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
					<path
						d="M6 6 18 18M18 6 6 18"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
					/>
				</svg>
			</button>

			{#if title}
				<h2 class="border-b border-neutral-800 px-6 py-4 pr-14 text-lg font-semibold text-white">
					{title}
				</h2>
			{/if}

			<div class="max-h-[85vh] overflow-y-auto px-6 py-5">
				{@render children()}
			</div>
		</div>
	</div>
{/if}
