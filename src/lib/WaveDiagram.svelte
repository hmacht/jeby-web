<script lang="ts">
	import boatImage from '$lib/assets/gw-freedom-215.png';
	import { metersToFeet } from '$lib/jeby';

	// Top-down boat image is 1080×396, so beam = length × (396 / 1080).
	const BOAT_ASPECT = 396 / 1080;

	let {
		waveLengthMeters,
		wavePeriodSeconds,
		boatLengthFt = 21.5,
		fieldWidthFt = 200
	}: {
		waveLengthMeters: number | null;
		wavePeriodSeconds: number | null;
		boatLengthFt?: number;
		fieldWidthFt?: number;
	} = $props();

	// SVG coordinate system is in pixels; it scales responsively via viewBox.
	const DIAGRAM_W = 1240;
	const DIAGRAM_H = 360;
	const LABEL_ROW = 100; // vertical space reserved for the top labels/brackets
	const WAVE_BOTTOM = DIAGRAM_H - 64; // leave room for the total-width bracket below

	// The whole frame represents `fieldWidthFt` feet; everything scales off that.
	const pxPerFt = $derived(DIAGRAM_W / fieldWidthFt);
	const boatLengthPx = $derived(boatLengthFt * pxPerFt);
	const boatBeamPx = $derived(boatLengthPx * BOAT_ASPECT); // match the image's aspect ratio
	const boatX = $derived((DIAGRAM_W - boatLengthPx) / 2);
	const boatY = $derived(LABEL_ROW + (WAVE_BOTTOM - LABEL_ROW - boatBeamPx) / 2);

	const wavelengthFt = $derived(waveLengthMeters == null ? null : metersToFeet(waveLengthMeters));
	const waveStepPx = $derived((wavelengthFt ?? 0) * pxPerFt);

	// Crests tiled from the left edge, so the first pair is exactly one wavelength.
	const waveLines = $derived.by(() => {
		if (waveStepPx <= 1) return [];
		const lines: number[] = [];
		for (let x = 0; x <= DIAGRAM_W; x += waveStepPx) lines.push(x);
		return lines;
	});

	// Shade every other gap between crests for a trough/crest banding effect.
	const waveBands = $derived(
		waveLines
			.slice(0, -1)
			.map((x, i) => ({ x, w: Math.min(DIAGRAM_W, x + waveStepPx) - x, i }))
			.filter((b) => b.i % 2 === 0)
	);
</script>

{#snippet bracket(x1: number, x2: number, y: number, label: string, color: string)}
	<g stroke={color} stroke-width="1.5">
		<line x1={x1} y1={y - 9} x2={x1} y2={y + 9} />
		<line x1={x2} y1={y - 9} x2={x2} y2={y + 9} />
		<line x1={x1} y1={y} x2={(x1 + x2) / 2 - 30} y2={y} />
		<line x1={(x1 + x2) / 2 + 30} y1={y} x2={x2} y2={y} />
	</g>
	<text
		x={(x1 + x2) / 2}
		y={y}
		fill={color}
		font-size="20"
		text-anchor="middle"
		dominant-baseline="central">{label}</text
	>
{/snippet}

<svg
	viewBox="0 0 {DIAGRAM_W} {DIAGRAM_H}"
	class="w-full"
	role="img"
	aria-label="Boat shown to scale against the swell, with wave crests one wavelength apart"
>
	<!-- Shade every other gap between crests -->
	{#each waveBands as b (b.x)}
		<rect x={b.x} y={LABEL_ROW} width={b.w} height={WAVE_BOTTOM - LABEL_ROW} fill="#121212" />
	{/each}

	<!-- Wave crests, one wavelength apart -->
	{#each waveLines as x (x)}
		<line x1={x} y1={LABEL_ROW} x2={x} y2={WAVE_BOTTOM} stroke="#3a3a3a" stroke-width="1.5" />
	{/each}

	<!-- Boat, drawn to scale (21.5 ft long) -->
	<image href={boatImage} x={boatX} y={boatY} width={boatLengthPx} height={boatBeamPx} />

	<!-- Wavelength bracket: peak to peak (white) -->
	{#if wavelengthFt != null && waveStepPx > 70}
		{@render bracket(0, waveStepPx, 40, `${Math.round(wavelengthFt)} ft`, '#ffffff')}
	{/if}

	<!-- Total field width bracket (gray), below the diagram -->
	{@render bracket(0, DIAGRAM_W, DIAGRAM_H - 28, `${Math.round(fieldWidthFt)} ft`, '#6b7280')}

	<!-- Wave period -->
	{#if wavePeriodSeconds != null}
		<text
			x={DIAGRAM_W}
			y="40"
			fill="#ffffff"
			font-size="16"
			text-anchor="end"
			dominant-baseline="central"
		>
			Wave period is every <tspan font-weight="700">{wavePeriodSeconds.toFixed(0)}</tspan> seconds
		</text>
	{/if}
</svg>
