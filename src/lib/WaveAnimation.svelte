<script module lang="ts">
	// Line colors, front to back, in the order stations are handed in. Exported so
	// anything labelling the same stations — the card's readings, a legend — can
	// key off this list rather than keeping a copy in step.
	export const WAVE_LINE_COLORS = ['#38bdf8', '#2dd4bf', '#a78bfa'];
</script>

<script lang="ts">
	// A small looping sea, in the printout's key: a halftone dot field with a sine
	// layer per reporting station, drifting across it.
	//
	// Each layer is that station's own reading, so they genuinely diverge: crest
	// spacing from its wave length, drift from its period (one crest passes per
	// period), height from its wave height. When the stations disagree, the lines
	// come apart — that gap is the thing worth seeing.
	//
	// Hand it the stations and the conditions payload; it works out the rest.
	import { isMvco, stationConditions, type Conditions, type Station } from '$lib/jeby/models';
	import { metersToFeet } from '$lib/jeby/utils';

	let {
		stations,
		conditions
	}: {
		stations: Station[];
		conditions: Conditions | null;
	} = $props();

	const W = 200;
	const H = 104;

	// The stretch of ocean the panel covers, which sets the horizontal scale.
	const VIEW_FEET = 300;
	const PX_PER_FOOT = W / VIEW_FEET;

	// Vertical is exaggerated: a 2 ft sea over 300 ft of water is a flat line at
	// true scale. Horizontal spacing and the timing are honest.
	const HEIGHT_EXAGGERATION = 10;
	// What a foot of wave height is worth vertically, for the scale bar.
	const PX_PER_FOOT_TALL = PX_PER_FOOT * HEIGHT_EXAGGERATION;

	// Drawn front to back, well apart so each line reads on its own. Blue for the
	// first, teal for the second — far enough apart to tell at a glance.
	const PALETTE = [
		{ stroke: WAVE_LINE_COLORS[0], fill: 'rgb(56 189 248 / 0.10)', base: 32, phase: 0 },
		{ stroke: WAVE_LINE_COLORS[1], fill: 'rgb(45 212 191 / 0.10)', base: 66, phase: 2.1 },
		{ stroke: WAVE_LINE_COLORS[2], fill: 'rgb(167 139 250 / 0.10)', base: 96, phase: 4.2 }
	];

	// Where each station actually sits, since that's what the lines are telling
	// you apart: MVCO is off the island's back (south) shore, the buoy is out in
	// the Sound.
	const stationLabel = (code: string) =>
		isMvco(code) ? 'MVCO · back of the island' : 'Buoy · in the Sound';

	// One series per station, straight off its own readings.
	const series = $derived(
		stations.map((station) => {
			const reading = stationConditions(conditions, station.code);
			return {
				label: stationLabel(station.code),
				waveHeight: reading?.waveHeight.value ?? null,
				waveLength: reading?.waveLength.value ?? null,
				wavePeriod: reading?.wavePeriod.value ?? null
			};
		})
	);

	// A two-foot ruler, so the exaggerated vertical still has a reference. Held as
	// a share of the panel's height so it tracks the svg at any rendered size.
	const SCALE_FEET = 2;
	const rulerPercent = ((SCALE_FEET * PX_PER_FOOT_TALL) / H) * 100;

	// A sine across the span, closed to the bottom so it fills.
	function path(
		amplitude: number,
		base: number,
		phase: number,
		length: number,
		to: number
	): string {
		let d = `M 0 ${base}`;
		for (let x = 0; x <= to; x += 4) {
			const y = base - amplitude * Math.sin((2 * Math.PI * x) / length + phase);
			d += ` L ${x.toFixed(1)} ${y.toFixed(1)}`;
		}
		return `${d} L ${to.toFixed(1)} ${H} L 0 ${H} Z`;
	}

	const layers = $derived(
		series.slice(0, PALETTE.length).map((source, i) => {
			const look = PALETTE[i];
			const heightFt = source.waveHeight == null ? null : metersToFeet(source.waveHeight);
			const lengthFt = source.waveLength == null ? null : metersToFeet(source.waveLength);

			// Crest to trough is the wave height, so the sine's amplitude is half.
			const amp = Math.max(1.5, ((heightFt ?? 1) / 2) * PX_PER_FOOT * HEIGHT_EXAGGERATION);
			const wavelength = Math.max(16, (lengthFt ?? 60) * PX_PER_FOOT);
			const seconds = Math.max(1, source.wavePeriod ?? 5);

			// Wide enough that after sliding one wavelength left the panel is still
			// covered; sliding by exactly one wavelength maps the sine onto itself,
			// so the loop has no seam.
			const span = W + wavelength + 8;

			return {
				...look,
				label: source.label,
				wavelength,
				seconds,
				d: path(amp, look.base, look.phase, wavelength, span)
			};
		})
	);
</script>

<div>
	<div class="flex items-stretch gap-2">
		<div class="min-w-0 flex-1 overflow-hidden rounded border border-border">
			<svg viewBox="0 0 {W} {H}" class="block w-full" role="img" aria-label="Animated sea">
				<defs>
					<!-- The halftone field the printout's sea is drawn with. -->
					<pattern id="wave-dots" width="6" height="6" patternUnits="userSpaceOnUse">
						<circle cx="1" cy="1" r="0.7" fill="rgb(56 189 248 / 0.22)" />
					</pattern>
				</defs>

				<rect width={W} height={H} fill="url(#wave-dots)" />

				{#each layers as wave (wave.label)}
					<g class="drift" style="--seconds: {wave.seconds}s; --shift: {-wave.wavelength}px">
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
		</div>

		<!-- Vertical scale, outside the box: a ruler rather than a zero line, since
			each layer sits at its own depth. Sized as a share of the panel, so it
			stays true at any width. -->
		<div class="flex w-14 shrink-0 items-center gap-1.5 text-xs text-neutral-500">
			<span
				class="block w-1.5 border-y border-r border-neutral-600"
				style="height: {rulerPercent}%"
				aria-hidden="true"
			></span>
			<span class="whitespace-nowrap">{SCALE_FEET} ft</span>
		</div>
	</div>

	<!-- Horizontal scale and the key, both aligned under the box. -->
	<div class="flex">
		<div class="min-w-0 flex-1">
			<div class="flex justify-between pt-1 text-xs text-neutral-500">
				<span>0 ft</span>
				<span>{VIEW_FEET} ft</span>
			</div>

			<!-- Which line is which. Each drifts at its own source's period. -->
			<ul class="mt-3 space-y-1 text-xs text-neutral-500">
				{#each layers as wave (wave.label)}
					<li class="flex items-center gap-2">
						<span
							class="inline-block h-0.5 w-5 shrink-0 rounded-full"
							style="background: {wave.stroke}"
							aria-hidden="true"
						></span>
						{wave.label}
					</li>
				{/each}
			</ul>
		</div>
		<div class="w-14 shrink-0" aria-hidden="true"></div>
	</div>
</div>

<style>
	/* One wavelength of travel per period, looped. Sliding by exactly a wavelength
	   lands the sine back on itself, so the seam never shows. */
	.drift {
		animation: drift var(--seconds) linear infinite;
	}

	@keyframes drift {
		from {
			transform: translateX(0);
		}
		to {
			transform: translateX(var(--shift));
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.drift {
			animation: none;
		}
	}
</style>
