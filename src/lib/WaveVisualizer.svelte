<script lang="ts">
	// A bold wave graphic: a thick gradient sine ribbon whose crests grow with wave
	// height and spread out with wave length, over a hatched water texture. The
	// selected boat is a skinny pill above the wave, its left edge on the first
	// crest and its length to the wave's horizontal scale; dotted lines drop from
	// each end to circle markers on the wave. Numbers below carry the exact values.
	import WavesHorizontal from '@lucide/svelte/icons/waves-horizontal';
	import type { Vessel } from '$lib/jeby/models';
	import { metersToFeet } from '$lib/jeby/utils';

	let {
		waveHeight,
		waveLength,
		wavePeriod,
		vessel
	}: {
		waveHeight: number | null; // meters
		waveLength: number | null; // meters
		wavePeriod: number | null; // seconds
		vessel: Vessel | null;
	} = $props();

	const heightFt = $derived(waveHeight == null ? null : metersToFeet(waveHeight));
	const lengthFt = $derived(waveLength == null ? null : metersToFeet(waveLength));

	// Pull the first number out of the vessel's free-form length ("21.5 ft",
	// "under 26 ft", "65 ft and up").
	const boatLengthFt = $derived.by(() => {
		const m = vessel?.length.match(/[\d.]+/);
		return m ? Number(m[0]) : null;
	});

	const W = 320;
	// The gap between BASELINE and H is the water below the wave — the hatched
	// band that runs to the bottom edge of the card.
	const H = 152;
	const BASELINE = 84;

	// Crest height in px from wave height (ft), exaggerated and capped.
	const amp = $derived(heightFt == null ? 10 : Math.min(32, Math.max(9, heightFt * 6)));

	// The graph always shows the same stretch of ocean, so the crests and the boat
	// share one scale and the picture reads the same from day to day.
	const VIEW_FEET = 300;
	const pxPerFoot = W / VIEW_FEET;
	// Px per wavelength: longer swells spread the crests out. Floored so a short
	// chop doesn't collapse into noise.
	const wavelengthPx = $derived(Math.max(16, (lengthFt ?? 60) * pxPerFoot));

	// A sine wave across the width.
	const wavePath = $derived.by(() => {
		let d = `M 0 ${BASELINE}`;
		for (let x = 0; x <= W; x += 4) {
			const y = BASELINE - amp * Math.sin((2 * Math.PI * x) / wavelengthPx);
			d += ` L ${x.toFixed(1)} ${y.toFixed(1)}`;
		}
		return d;
	});
	const fillPath = $derived(`${wavePath} L ${W} ${H} L 0 ${H} Z`);

	// The first crest sits a quarter wavelength in — where the boat pill starts.
	const firstCrestX = $derived(wavelengthPx / 4);

	// Boat length reference: a skinny pill above the waves whose left edge sits on
	// the first crest, at the wave's horizontal scale (clamped to fit). leftY/rightY
	// are where each end of the boat drops onto the wave.
	const BOAT_Y = 30;
	const boat = $derived.by(() => {
		if (boatLengthFt == null || lengthFt == null || lengthFt <= 0) return null;
		const left = firstCrestX;
		const raw = boatLengthFt * pxPerFoot;
		const right = left + Math.max(10, Math.min(raw, W - left - 6));
		const waveY = (x: number) => BASELINE - amp * Math.sin((2 * Math.PI * x) / wavelengthPx);
		return { left, right, leftY: waveY(left), rightY: waveY(right) };
	});

	const fmt = (v: number | null, digits = 0) => (v == null ? '—' : v.toFixed(digits));
</script>

<section
	class="flex min-h-80 flex-col overflow-hidden rounded-2xl border border-border bg-surface p-5"
>
	<div class="flex items-center gap-2">
		<WavesHorizontal size={18} class="shrink-0 text-sky-400" />
		<h3 class="text-base font-medium text-white">Wave Visualizer</h3>
	</div>

	<dl class="mt-4 grid grid-cols-3 gap-3">
		<div>
			<dt class="text-xs text-neutral-400">Height</dt>
			<dd class="mt-0.5 text-2xl font-semibold tabular-nums text-white">{fmt(heightFt, 1)} ft</dd>
		</div>
		<div>
			<dt class="text-xs text-neutral-400">Length</dt>
			<dd class="mt-0.5 text-2xl font-semibold tabular-nums text-white">{fmt(lengthFt)} ft</dd>
		</div>
		<div>
			<dt class="text-xs text-neutral-400">Period</dt>
			<dd class="mt-0.5 text-2xl font-semibold tabular-nums text-white">{fmt(wavePeriod)} s</dd>
		</div>
	</dl>

	<!-- The wave bleeds past the card padding to touch the left, right, and bottom
		edges. `mt-auto` rather than `flex-1`: the svg keeps its aspect ratio, so a
		stretched wrapper would leave a gap under it — this puts any slack above. -->
	<div class="-mx-5 -mb-5 mt-auto pt-4">
		<svg
			viewBox="0 0 {W} {H}"
			class="block w-full"
			role="img"
			aria-label="Wave height and length with the selected boat's length to scale"
		>
			<defs>
				<pattern
					id="wave-hatch"
					width="8"
					height="8"
					patternTransform="rotate(45)"
					patternUnits="userSpaceOnUse"
				>
					<line
						x1="0"
						y1="0"
						x2="0"
						y2="8"
						stroke="#ffffff"
						stroke-opacity="0.05"
						stroke-width="2"
					/>
				</pattern>
				<linearGradient id="wave-stroke" x1="0" y1="0" x2="1" y2="0">
					<stop offset="0%" stop-color="#22d3ee" />
					<stop offset="100%" stop-color="#3b82f6" />
				</linearGradient>
				<linearGradient id="wave-fill" x1="0" y1="0" x2="0" y2="1">
					<stop offset="0%" stop-color="#38bdf8" stop-opacity="0.22" />
					<stop offset="100%" stop-color="#38bdf8" stop-opacity="0" />
				</linearGradient>
			</defs>

			<!-- Water: soft gradient + diagonal hatch texture. -->
			<path d={fillPath} fill="url(#wave-fill)" />
			<path d={fillPath} fill="url(#wave-hatch)" />

			<!-- Dotted drop-lines from the boat's ends to the wave (behind the ribbon). -->
			{#if boat}
				<line
					x1={boat.left}
					y1={BOAT_Y + 6}
					x2={boat.left}
					y2={boat.leftY}
					stroke="#e5e7eb"
					stroke-opacity="0.45"
					stroke-width="1.3"
					stroke-dasharray="1.5 3"
				/>
				<line
					x1={boat.right}
					y1={BOAT_Y + 6}
					x2={boat.right}
					y2={boat.rightY}
					stroke="#e5e7eb"
					stroke-opacity="0.45"
					stroke-width="1.3"
					stroke-dasharray="1.5 3"
				/>
			{/if}

			<!-- The bold wave ribbon. -->
			<path
				d={wavePath}
				fill="none"
				stroke="url(#wave-stroke)"
				stroke-width="9"
				stroke-linecap="round"
				stroke-linejoin="round"
			/>

			<!-- Skinny boat pill (left edge on the first crest) + markers where its ends
				meet the wave. -->
			{#if boat}
				{#if vessel}
					<text x={boat.left} y={BOAT_Y - 7} fill="#a3a3a3" font-size="11">
						{vessel.name} &middot; {vessel.length}
					</text>
				{/if}
				<rect
					x={boat.left}
					y={BOAT_Y}
					width={boat.right - boat.left}
					height="6"
					rx="3"
					fill="#e5e7eb"
				/>
				<circle cx={boat.left} cy={boat.leftY} r="8.5" fill="#22d3ee" />
				<circle cx={boat.left} cy={boat.leftY} r="3.4" fill="#ffffff" />
				<circle cx={boat.right} cy={boat.rightY} r="8.5" fill="#22d3ee" />
				<circle cx={boat.right} cy={boat.rightY} r="3.4" fill="#ffffff" />
			{/if}
		</svg>
	</div>
</section>
