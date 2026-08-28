<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		open = $bindable(false),
		title,
		actions,
		children
	}: {
		open?: boolean;
		title?: string;
		// Rendered in the header beside the title, e.g. a copy button.
		actions?: Snippet;
		children: Snippet;
	} = $props();

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
		<!-- Panel. `text-left` because the modal sits wherever its owner does in the
			DOM, and would otherwise inherit that spot's text alignment. -->
		<div
			class="relative flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-neutral-800 bg-background text-left shadow-2xl"
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

			{#if title || actions}
				<div
					class="flex shrink-0 items-center gap-3 border-b border-neutral-800 px-6 py-4 pr-14 text-white"
				>
					{#if title}
						<h2 class="min-w-0 truncate text-lg font-semibold">{title}</h2>
					{/if}
					{#if actions}
						<div class="ml-auto shrink-0">{@render actions()}</div>
					{/if}
				</div>
			{/if}

			<div class="min-h-0 flex-1 overflow-y-auto px-6 py-5">
				{@render children()}
			</div>
		</div>
	</div>
{/if}
