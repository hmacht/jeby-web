<script lang="ts">
	// The wave drawn entirely out of characters: a tilde surface over a halftone
	// dot sea, with the selected boat sitting on the first crest as [======].
	// Everything shares one horizontal scale — the grid spans a fixed stretch of
	// ocean — so the boat reads honestly against the crests.
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

	const COLS = 64;
	const ROWS = 12;
	// The stretch of ocean the grid covers, left edge to right.
	const VIEW_FEET = 300;
	// Row the flat waterline sits on; crests rise above it, troughs fall below.
	const MEAN_ROW = 4;

	const COLOR = {
		wave: '#38bdf8',
		water: 'rgb(56 189 248 / 0.28)',
		deep: 'rgb(56 189 248 / 0.14)',
		boat: '#e5e7eb'
	};

	type Cell = { ch: string; color: string };

	const grid = $derived.by(() => {
		const len = lengthFt && lengthFt > 0 ? lengthFt : 60;
		// Crest height in rows, exaggerated a little so small chop still reads.
		const amp = Math.min(3.4, Math.max(0.7, (heightFt ?? 1) * 0.9));
		const perFoot = COLS / VIEW_FEET;
		const surfaceAt = (col: number) => {
			const feet = (col / (COLS - 1)) * VIEW_FEET;
			return MEAN_ROW - amp * Math.sin((2 * Math.PI * feet) / len);
		};

		// The boat starts on the first crest, a quarter wavelength in.
		const boatStart = Math.round((len / 4) * perFoot);
		const boatCols = boatLengthFt == null ? null : Math.max(2, Math.round(boatLengthFt * perFoot));
		const boatEnd = boatCols == null ? null : Math.min(COLS - 1, boatStart + boatCols - 1);
		const boatRow = boatCols == null ? null : Math.max(0, Math.round(surfaceAt(boatStart)) - 1);

		const rows: Cell[][] = [];
		for (let row = 0; row < ROWS; row++) {
			const cells: Cell[] = [];
			for (let col = 0; col < COLS; col++) {
				const surface = surfaceAt(col);

				// The boat rides above the water it sits on.
				if (boatEnd != null && row === boatRow && col >= boatStart && col <= boatEnd) {
					const ch = col === boatStart ? '[' : col === boatEnd ? ']' : '=';
					cells.push({ ch, color: COLOR.boat });
					continue;
				}

				if (row < surface - 0.5) {
					cells.push({ ch: ' ', color: 'transparent' });
				} else if (row < surface + 0.5) {
					cells.push({ ch: '~', color: COLOR.wave });
				} else {
					// Halftone sea: dots on alternating cells, thinning with depth.
					const lit = (row + col) % 2 === 0;
					const deep = row > surface + 3;
					cells.push({
						ch: lit ? '·' : ' ',
						color: deep ? COLOR.deep : COLOR.water
					});
				}
			}
			rows.push(cells);
		}
		return rows;
	});

	// Each row is one HTML string with runs of same-colored cells grouped into a
	// span. Building it here rather than as elements keeps the characters flush:
	// any whitespace between them in the template would widen the grid. It's all
	// generated from numbers and a fixed set of glyphs, so there's nothing to
	// escape.
	const rowsHtml = $derived(
		grid.map((cells) => {
			let html = '';
			let run = '';
			let runColor = '';
			const flush = () => {
				if (run) html += `<span style="color:${runColor}">${run}</span>`;
				run = '';
			};
			for (const cell of cells) {
				if (cell.color !== runColor) {
					flush();
					runColor = cell.color;
				}
				run += cell.ch;
			}
			flush();
			return html;
		})
	);

	const fmt = (v: number | null, digits = 0) => (v == null ? '—' : v.toFixed(digits));
</script>

<div class="font-mono text-xs leading-none">
	<!-- Readouts -->
	<dl class="flex flex-wrap gap-x-6 gap-y-1 text-xs leading-relaxed">
		<div class="flex gap-2">
			<dt class="text-neutral-500">HEIGHT</dt>
			<dd class="text-white">{fmt(heightFt, 1)} ft</dd>
		</div>
		<div class="flex gap-2">
			<dt class="text-neutral-500">LENGTH</dt>
			<dd class="text-white">{fmt(lengthFt)} ft</dd>
		</div>
		<div class="flex gap-2">
			<dt class="text-neutral-500">PERIOD</dt>
			<dd class="text-white">{fmt(wavePeriod)} s</dd>
		</div>
	</dl>

	{#if vessel}
		<p class="mt-3 text-neutral-500">[====] {vessel.name} &middot; {vessel.length}</p>
	{/if}

	<!-- The sea itself -->
	<div class="mt-1 overflow-x-auto">
		{#each rowsHtml as row, i (i)}
			<!-- eslint-disable-next-line svelte/no-at-html-tags -- built above from numbers and a fixed set of glyphs -->
			<div class="whitespace-pre">{@html row}</div>
		{/each}
	</div>

	<p class="mt-1 whitespace-pre text-neutral-600">
		{'0 ft' + ' '.repeat(Math.max(1, COLS - 10)) + `${VIEW_FEET} ft`}
	</p>
</div>
