<script lang="ts">
	// The report printout in a modal, with a copy button. The text itself is built
	// in jeby/report.ts, which the /oldschool page renders too.
	import Check from '@lucide/svelte/icons/check';
	import Copy from '@lucide/svelte/icons/copy';
	import ScrollText from '@lucide/svelte/icons/scroll-text';
	import Modal from '$lib/Modal.svelte';
	import { buildReport, type ReportInput } from '$lib/jeby/report';

	let input: ReportInput = $props();

	let open = $state(false);
	let copied = $state(false);

	const report = $derived(buildReport(input));
	const plainReport = $derived(buildReport(input, true));

	async function copy() {
		await navigator.clipboard.writeText(plainReport);
		copied = true;
		setTimeout(() => (copied = false), 1500);
	}
</script>

<button
	type="button"
	onclick={() => (open = true)}
	class="inline-flex items-center gap-1.5 text-sm text-neutral-500 underline underline-offset-4 transition hover:text-neutral-300"
>
	<ScrollText size={14} class="shrink-0" />
	View Text report
</button>

<Modal bind:open title="The Jeby Report">
	{#snippet actions()}
		<button
			type="button"
			onclick={copy}
			class="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-medium text-neutral-300 transition hover:border-neutral-500 hover:text-white"
		>
			{#if copied}
				<Check size={14} class="shrink-0 text-emerald-400" />
				Copied
			{:else}
				<Copy size={14} class="shrink-0" />
				Copy
			{/if}
		</button>
	{/snippet}

	<pre class="overflow-x-auto font-mono text-xs leading-relaxed text-neutral-300">{report}</pre>
</Modal>
