<script lang="ts">
	// A small looping sea, in the printout's key: a halftone dot field with three
	// sine layers drifting across it. The live readings drive it — crest height
	// from the wave height, drift speed from the period — but it's decorative, so
	// the numbers themselves live in the sections around it.
	//
	// Each layer's path is drawn two panels wide with a whole number of cycles, so
	// sliding it exactly one panel left loops seamlessly.
	import { metersToFeet } from '$lib/jeby/utils';

	let {
		waveHeight,
		wavePeriod
	}: {
		waveHeight: number | null; // meters
		wavePeriod: number | null; // seconds
	} = $props();

	const W = 200;
	const H = 84;

	const heightFt = $derived(waveHeight == null ? null : metersToFeet(waveHeight));

	// Crest height in view units, exaggerated so small chop still moves.
	const amp = $derived(Math.min(13, Math.max(3, (heightFt ?? 1) * 3.2)));
	// Longer swells roll through more slowly.
	const beat = $derived(Math.min(12, Math.max(3, wavePeriod ?? 5)));

	// A sine across two panels, closed to the bottom so it fills.
	function layer(amplitude: number, cycles: number, base: number): string {
		let d = `M 0 ${base}`;
		for (let x = 0; x <= W * 2; x += 4) {
			const y = base - amplitude * Math.sin((2 * Math.PI * x * cycles) / W);
			d += ` L ${x.toFixed(1)} ${y.toFixed(1)}`;
		}
		return `${d} L ${W * 2} ${H} L 0 ${H} Z`;
	}

	const layers = $derived([
		{
			d: layer(amp, 2, 34),
			fill: 'rgb(56 189 248 / 0.10)',
			stroke: '#0ea5e9',
			seconds: beat * 2.2
		},
		{
			d: layer(amp * 0.8, 3, 44),
			fill: 'rgb(56 189 248 / 0.12)',
			stroke: '#38bdf8',
			seconds: beat * 1.6
		},
		{ d: layer(amp * 0.6, 5, 54), fill: 'rgb(34 211 238 / 0.14)', stroke: '#22d3ee', seconds: beat }
	]);
</script>

<svg viewBox="0 0 {W} {H}" class="block w-full" role="img" aria-label="Animated sea">
	<defs>
		<!-- The halftone field the printout's sea is drawn with. -->
		<pattern id="wave-dots" width="6" height="6" patternUnits="userSpaceOnUse">
			<circle cx="1" cy="1" r="0.7" fill="rgb(56 189 248 / 0.22)" />
		</pattern>
	</defs>

	<rect width={W} height={H} fill="url(#wave-dots)" />

	{#each layers as wave, i (i)}
		<g class="drift" style="--seconds: {wave.seconds}s">
			<path d={wave.d} fill={wave.fill} />
			<path
				d={wave.d}
				fill="none"
				stroke={wave.stroke}
				stroke-width="1.5"
				stroke-linecap="round"
				stroke-linejoin="round"
			/>
		</g>
	{/each}
</svg>

<style>
	/* One panel's worth of travel, looped — the path is two panels wide, so the
	   seam never comes into view. */
	.drift {
		animation: drift var(--seconds) linear infinite;
	}

	@keyframes drift {
		from {
			transform: translateX(0);
		}
		to {
			transform: translateX(-200px);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.drift {
			animation: none;
		}
	}
</style>
