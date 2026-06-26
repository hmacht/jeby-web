<script lang="ts">
	let {
		src,
		alt,
		class: className = ''
	}: { src: string; alt: string; class?: string } = $props();

	let open = $state(false);
	let zoomed = $state(false);

	function openViewer() {
		open = true;
		zoomed = false;
	}

	function close() {
		open = false;
	}

	function onKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') close();
	}
</script>

<svelte:window onkeydown={onKeydown} />

<button type="button" class="block w-full cursor-zoom-in" aria-label="Expand image" onclick={openViewer}>
	<img {src} {alt} class={className} />
</button>

{#if open}
	<!-- Lightbox -->
	<div
		class="fixed inset-0 z-50 bg-black/90 p-4 {zoomed
			? 'overflow-auto'
			: 'flex items-center justify-center'}"
		role="presentation"
		onclick={(e) => {
			if (e.target === e.currentTarget) close();
		}}
	>
		<button
			type="button"
			class="fixed right-4 top-4 z-10 grid h-9 w-9 place-items-center rounded-full bg-black/50 text-neutral-300 transition hover:bg-neutral-800 hover:text-white"
			aria-label="Close"
			onclick={close}
		>
			<svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
				<path d="M6 6 18 18M18 6 6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
			</svg>
		</button>

		<button
			type="button"
			class="block"
			aria-label={zoomed ? 'Zoom out' : 'Zoom in'}
			onclick={() => (zoomed = !zoomed)}
		>
			<img
				{src}
				{alt}
				class={zoomed
					? 'w-[170vw] max-w-none cursor-zoom-out'
					: 'max-h-[90vh] max-w-full cursor-zoom-in rounded-xl'}
			/>
		</button>
	</div>
{/if}
