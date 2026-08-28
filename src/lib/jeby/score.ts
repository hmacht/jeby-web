// The BumpyScore color scale, shared by the score card and its details view so
// both read the same colors off the same 0–100 gradient.

// Evenly spaced gradient stops (0 → 100).
export const SCORE_STOPS = ['#4ade80', '#a3e635', '#facc15', '#fb923c', '#ef4444', '#a855f7'];

// The bar's left-to-right CSS gradient, matching the stops above.
export const SCORE_BAR_GRADIENT = `linear-gradient(to right, ${SCORE_STOPS.join(', ')})`;

// The RGB color at a 0–100 score position, interpolated across the stops.
function scoreRgb(pct: number): [number, number, number] {
	const p = Math.min(100, Math.max(0, pct)) / 100;
	const span = 1 / (SCORE_STOPS.length - 1);
	const i = Math.min(SCORE_STOPS.length - 2, Math.floor(p / span));
	const t = (p - i * span) / span;
	const lerp = (a: number, b: number) => Math.round(a + (b - a) * t);
	const hex = (c: string) =>
		[1, 3, 5].map((s) => parseInt(c.slice(s, s + 2), 16)) as [number, number, number];
	const [r1, g1, b1] = hex(SCORE_STOPS[i]);
	const [r2, g2, b2] = hex(SCORE_STOPS[i + 1]);
	return [lerp(r1, r2), lerp(g1, g2), lerp(b1, b2)];
}

// The scale color at a score, as a CSS color.
export function scoreColor(score: number): string {
	return `rgb(${scoreRgb(score).join(', ')})`;
}

// The card's dark→bright diagonal wash of the score's own color. With no score
// (quiet hours, or analysis not computed yet) it falls back to the Nantucket
// Sound buoy's blue instead of a color on the severity scale.
export function scoreGradient(score: number | null): string {
	if (score == null) {
		return 'linear-gradient(135deg, var(--color-buoy-deep), var(--color-buoy-bright))';
	}
	const base = scoreRgb(score);
	const mix = (by: number) => base.map((c) => Math.round(c * (1 - by))).join(', ');
	return `linear-gradient(135deg, rgb(${mix(0.74)}), rgb(${mix(0.3)}))`;
}

// A plain-language label for where a score sits on the scale.
export function scoreLabel(score: number): string {
	if (score < 15) return 'Glassy calm';
	if (score < 30) return 'Light chop';
	if (score < 50) return 'Moderate';
	if (score < 70) return 'Rough';
	if (score < 85) return 'Very rough';
	return 'Dangerous';
}
