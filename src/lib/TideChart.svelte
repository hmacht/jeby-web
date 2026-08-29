<script lang="ts">
	// The day's tide curve: time across, predicted height up.
	//
	// The backend gives the highs and lows, not a continuous series — so the line
	// between them is drawn here as a half-cosine, which is how the water actually
	// moves: fastest midway between the turns, and standing still at each one.
	// Straight segments would put the fastest change at the turn, which is exactly
	// backwards. The interpolation is ours, though, not NOAA's, which is why only
	// the extremes get labelled and there's no hover readout — inviting someone to
	// read "1.4 ft at 3:12" off a modelled curve would overstate what we know.
	import type { Tides } from '$lib/jeby/models';
	import { metersToFeet } from '$lib/jeby/utils';

	let { tides, generatedAt }: { tides: Tides; generatedAt: string } = $props();

	// Drawn in viewBox units; the wrapper scales it. Left gutter holds the height
	// ticks, the bottom band the times — the container includes both, so the axis
	// never gets cropped.
	const W = 720;
	const H = 200;
	const PAD = { top: 20, right: 16, bottom: 28, left: 44 };
	const plotW = W - PAD.left - PAD.right;
	const plotH = H - PAD.top - PAD.bottom;

	const events = $derived(
		tides.today
			.filter((e) => e.height.value != null)
			.map((e) => ({
				type: e.type,
				t: new Date(e.at).getTime(),
				ft: metersToFeet(e.height.value as number)
			}))
			.sort((a, b) => a.t - b.t)
	);

	// Domains. x spans only the extremes we were given — extending it to midnight
	// would mean extrapolating past the data. y is padded so the turns don't sit
	// flat against the top and bottom edges.
	const domain = $derived.by(() => {
		const xs = events.map((e) => e.t);
		const ys = events.map((e) => e.ft);
		const x0 = Math.min(...xs);
		const x1 = Math.max(...xs);
		const lo = Math.min(...ys);
		const hi = Math.max(...ys);
		const pad = (hi - lo || 1) * 0.15;
		return { x0, x1, y0: lo - pad, y1: hi + pad };
	});

	const sx = $derived(
		(t: number) => PAD.left + ((t - domain.x0) / (domain.x1 - domain.x0 || 1)) * plotW
	);
	const sy = $derived(
		(ft: number) => PAD.top + (1 - (ft - domain.y0) / (domain.y1 - domain.y0 || 1)) * plotH
	);

	// Half-cosine between each pair of turns: zero slope at both ends, steepest in
	// the middle. Sampled rather than drawn as a bezier so the shape is the real
	// function and not an eyeballed approximation of it.
	const SAMPLES = 24;
	const points = $derived.by(() => {
		const out: Array<{ x: number; y: number }> = [];
		for (let i = 0; i < events.length - 1; i++) {
			const a = events[i];
			const b = events[i + 1];
			for (let s = 0; s < SAMPLES; s++) {
				const p = s / SAMPLES;
				const ft = a.ft + (b.ft - a.ft) * ((1 - Math.cos(Math.PI * p)) / 2);
				out.push({ x: sx(a.t + (b.t - a.t) * p), y: sy(ft) });
			}
		}
		const last = events[events.length - 1];
		if (last) out.push({ x: sx(last.t), y: sy(last.ft) });
		return out;
	});

	const line = $derived(points.map((p, i) => `${i ? 'L' : 'M'}${p.x} ${p.y}`).join(' '));
	// The wash is closed to the bottom of the plot, not to y=0: the baseline here
	// is the frame, not a zero the data is measured against.
	const area = $derived(
		points.length
			? `${line} L${points[points.length - 1].x} ${PAD.top + plotH} L${points[0].x} ${PAD.top + plotH} Z`
			: ''
	);

	// Three ticks — low, middle, high — rounded to a tenth of a foot.
	const yTicks = $derived([domain.y0, (domain.y0 + domain.y1) / 2, domain.y1]);

	// "Now" is the report's own timestamp rather than a live clock, so the server
	// and the browser draw the marker in the same place.
	const now = $derived(new Date(generatedAt).getTime());
	const nowInRange = $derived(now >= domain.x0 && now <= domain.x1);

	const clock = (t: number) =>
		new Date(t)
			.toLocaleTimeString('en-US', {
				hour: 'numeric',
				minute: '2-digit',
				timeZone: 'America/New_York'
			})
			.replace(' ', '')
			.toLowerCase();
</script>

{#if events.length >= 2}
	<!-- Wide chart on a narrow screen scrolls rather than shrinking its labels to
		nothing, matching how the rest of the printout handles overflow. -->
	<div class="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
		<svg
			viewBox="0 0 {W} {H}"
			class="h-auto w-full min-w-[34rem]"
			role="img"
			aria-label="Predicted tide height through the day at {tides.stationName}"
		>
			<defs>
				<!-- The same halftone field the sea animation is drawn on. Its pattern
					is 6 units in a 200-wide viewBox; this one is 720 wide, so the cell
					is scaled to land the dots at the same size on screen. -->
				<pattern id="tide-dots" width="8" height="8" patternUnits="userSpaceOnUse">
					<circle cx="1" cy="1" r="1" fill="rgb(56 189 248 / 0.22)" />
				</pattern>
			</defs>

			<!-- Behind the plot only: the gutters stay clear so the labels read. -->
			<rect x={PAD.left} y={PAD.top} width={plotW} height={plotH} fill="url(#tide-dots)" />

			<!-- Height ticks. Hairline, solid, one step off the surface. -->
			{#each yTicks as ft (ft)}
				<line
					x1={PAD.left}
					y1={sy(ft)}
					x2={W - PAD.right}
					y2={sy(ft)}
					stroke="var(--color-border)"
					stroke-width="1"
				/>
				<text
					x={PAD.left - 8}
					y={sy(ft)}
					text-anchor="end"
					dominant-baseline="middle"
					class="fill-neutral-500"
					font-size="13"
				>
					{ft.toFixed(1)}
				</text>
			{/each}

			<path d={area} fill="var(--tide)" fill-opacity="0.1" />
			<path
				d={line}
				fill="none"
				stroke="var(--tide)"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
			/>

			{#if nowInRange}
				<!-- White so it reads as a reference line over the dot field and the
					wash, rather than as another gridline. -->
				<line
					x1={sx(now)}
					y1={PAD.top}
					x2={sx(now)}
					y2={PAD.top + plotH}
					stroke="#ffffff"
					stroke-width="1"
				/>
				<text x={sx(now)} y={PAD.top - 7} text-anchor="middle" class="fill-white" font-size="12">
					now
				</text>
			{/if}

			<!-- A marker at each turn, ringed in the surface color so it stays legible
				where it sits on the line. The time below doubles as the x axis: the
				turns are the only moments on this chart worth naming. -->
			{#each events as e, i (e.t)}
				<circle
					cx={sx(e.t)}
					cy={sy(e.ft)}
					r="4"
					fill="var(--tide)"
					stroke="var(--color-background)"
					stroke-width="2"
				/>
				<text
					x={sx(e.t)}
					y={H - 8}
					text-anchor={i === 0 ? 'start' : i === events.length - 1 ? 'end' : 'middle'}
					class="fill-neutral-500"
					font-size="13"
				>
					{clock(e.t)}
				</text>
			{/each}
		</svg>
	</div>

	<!-- The same values as text, so nothing is reachable only by reading the plot. -->
	<dl class="mt-3">
		{#each events as e (e.t)}
			<div class="flex gap-2">
				<dt class="w-40 shrink-0 whitespace-nowrap text-neutral-500">{e.type}</dt>
				<dd>{clock(e.t)} &middot; {e.ft.toFixed(1)} ft</dd>
			</div>
		{/each}
	</dl>
{:else}
	<p class="mt-2 text-neutral-400">Not enough tide predictions to draw the day.</p>
{/if}

<style>
	svg {
		/* Validated against the page surface with the dataviz palette checker:
		   lightness band, chroma floor and 3:1 contrast all pass. */
		--tide: #0a84ff;
	}
</style>
