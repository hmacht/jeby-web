<script lang="ts">
	// Site footer: mission + open-source link, data attribution, and contact,
	// stacked in bands of different grays with a repeating-squiggle pattern strip.
	import Mail from '@lucide/svelte/icons/mail';
	import squiggle from '$lib/assets/squiggle.png';
	import noaaLogo from '$lib/assets/NOAA-color-logo.png';
	import whoiLogo from '$lib/assets/WHOI-color-logo.png';
	import githubLogo from '$lib/assets/GitHub_Invertocat_Black.svg';

	const ORG = 'Jeby Oceanographic Lab';
</script>

<footer class="mt-24 border-t border-border text-neutral-300">
	<!-- Repeating-squiggle pattern strip (lightest band). -->
	<div
		aria-hidden="true"
		class="h-10 bg-neutral-800 bg-repeat-x opacity-60"
		style="background-image: url({squiggle}); background-size: auto 1.25rem; background-position: center;"
	></div>

	<!-- Main content (mid gray). -->
	<div class="bg-neutral-900 px-6 pb-24 pt-12 sm:px-12 lg:px-16">
		<div class="mx-auto grid max-w-5xl gap-10 sm:grid-cols-2 lg:grid-cols-3">
			<!-- Mission + open-source API -->
			<div>
				<h2 class="text-base font-semibold text-white">{ORG}</h2>
				<p class="mt-2 text-sm leading-relaxed text-neutral-400">
					A nonprofit oceanographic lab bringing live marine conditions and AI manrine analysis to
					the waters around Martha's Vineyard.
				</p>
				<a
					href="https://github.com/hmacht/jeby-go"
					target="_blank"
					rel="noopener noreferrer"
					class="mt-4 inline-flex items-center gap-2 rounded-lg border border-border bg-neutral-800 px-3 py-2 text-sm font-medium text-white transition hover:border-neutral-500"
				>
					<img src={githubLogo} alt="" aria-hidden="true" class="h-[18px] w-[18px] invert" />
					Open Source API
				</a>
			</div>

			<!-- Data sources -->
			<div>
				<h3 class="text-sm font-semibold uppercase tracking-wide text-neutral-400">Data</h3>
				<p class="mt-3 text-sm text-neutral-400">All readings are pulled from:</p>
				<ul class="mt-3 space-y-3 text-sm">
					<li class="flex items-center gap-2.5">
						<img src={noaaLogo} alt="" aria-hidden="true" class="h-6 w-6 shrink-0" />
						<span>
							National Oceanic and Atmospheric Administration
							<span class="text-neutral-500">(NOAA)</span>
						</span>
					</li>
					<li class="flex items-center gap-2.5">
						<img src={whoiLogo} alt="" aria-hidden="true" class="h-6 w-6 shrink-0" />
						<span>
							Woods Hole Oceanographic Institution
							<span class="text-neutral-500">(WHOI)</span>
						</span>
					</li>
				</ul>
			</div>

			<!-- Contact -->
			<div>
				<h3 class="text-sm font-semibold uppercase tracking-wide text-neutral-400">Contact</h3>
				<a
					href="mailto:henryamacht@gmail.com"
					class="mt-3 inline-flex items-center gap-2 text-sm text-white underline-offset-2 transition hover:text-neutral-300 hover:underline"
				>
					<Mail size={16} class="shrink-0" />
					henryamacht@gmail.com
				</a>
			</div>
		</div>
	</div>
</footer>
