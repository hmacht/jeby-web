<script lang="ts">
	// Every error the app renders — a 404, a 500, anything thrown out of a load —
	// comes through here. Kept in the report's own monospace so a failure still
	// reads as part of the site rather than as a browser default.
	import { resolve } from '$app/paths';
	import { page } from '$app/state';

	// A 404 is someone mistyping a URL. Anything else is ours, so show what the
	// server actually said rather than a generic line.
	const message = $derived(
		page.status === 404 ? 'Page not found.' : (page.error?.message ?? 'Something went wrong.')
	);

	const TITLE = 'The Jeby Report';
	const RULE = '='.repeat(24);
</script>

<svelte:head>
	<title>{page.status} &middot; {TITLE}</title>
</svelte:head>

<main
	class="flex min-h-screen flex-col items-center justify-center px-6 text-center font-mono text-sm leading-relaxed text-neutral-300"
>
	<span aria-hidden="true" class="text-xl">⛈</span>

	<p class="mt-4 text-2xl font-semibold tracking-wide text-white">{page.status}</p>
	<p aria-hidden="true" class="mt-2 overflow-hidden whitespace-nowrap text-neutral-700">{RULE}</p>
	<p class="mt-2 max-w-sm">{message}</p>

	<a
		href={resolve('/')}
		class="mt-6 text-neutral-500 underline underline-offset-4 transition hover:text-neutral-300"
	>
		&larr; Back to the report
	</a>
</main>
