// The whole report as monospace text: header, alerts, score on its scale, the
// weather ashore, and the station readings underneath.
//
// It renders two ways. On screen the score bar is drawn with block characters,
// which look the part in a browser. For the clipboard it falls back to plain
// ASCII — those blocks come out as empty boxes in Messages and plenty of
// editors, and copied text has to survive wherever it's pasted.

import {
	isMvco,
	stationConditions,
	stationReadingRows,
	stormsMissing,
	type Alert,
	type BumpyAnalysis,
	type Conditions,
	type Station,
	type Storms,
	type TimedValue,
	type Vessel,
	type Weather
} from '$lib/jeby/models';
import { cToF } from '$lib/jeby/utils';

export interface ReportInput {
	location: string;
	when: string;
	alerts: Alert[];
	score: number | null;
	quietHours: boolean;
	analysis: BumpyAnalysis | null;
	weather: Weather | null;
	storms: Storms | null;
	vessel: Vessel | null;
	stations: Station[];
	conditions: Conditions | null;
}

// The storm picture in one line. The backend answers "now" and "today"
// separately and writes both ready to print, so this just joins them; null means
// a source went unchecked, which must not read as an all clear.
export function stormStatus(storms: Storms | null): string {
	if (!storms) return 'Unavailable';
	return `${storms.now.storm ?? 'Unknown'} now, ${storms.today.storm ?? 'Unknown'} today`;
}

// Everything is drawn to a fixed column width so the bar, its scale, and the
// reading columns line up in a monospace face.
const WIDTH = 40;

const clamp = (value: number) => Math.min(100, Math.max(0, value));

// The bar we show: block characters, with the tick row beneath.
function blockBar(value: number | null): string {
	if (value == null) return '░'.repeat(WIDTH);
	const filled = Math.round((clamp(value) / 100) * WIDTH);
	return '▍'.repeat(filled) + '░'.repeat(WIDTH - filled);
}

// Tick labels placed under the columns they mark.
function blockScale(): string {
	const line = new Array(WIDTH + 3).fill(' ');
	const put = (text: string, col: number) => {
		for (let i = 0; i < text.length; i++) line[col + i] = text[i];
	};
	put('0', 0);
	put('25', 9);
	put('50', 19);
	put('75', 29);
	put('100', 37);
	return line.join('').trimEnd();
}

// Prose broken to the report's column width, so an analysis reads as an indented
// paragraph under its heading rather than running off the side.
function wrap(text: string, indent = '    '): string[] {
	const lines: string[] = [];
	let line = '';
	for (const word of text.split(/\s+/).filter(Boolean)) {
		const candidate = line ? `${line} ${word}` : word;
		if (line && indent.length + candidate.length > WIDTH) {
			lines.push(indent + line);
			line = word;
		} else {
			line = candidate;
		}
	}
	if (line) lines.push(indent + line);
	return lines;
}

// The bar we copy: twenty cells, so each one is five points, and the score
// rounds to the nearest cell. The ends carry the scale.
const BAR_CELLS = 20;
function asciiBar(value: number | null): string {
	let cells = '-'.repeat(BAR_CELLS);
	if (value != null) {
		const filled = Math.round((clamp(value) / 100) * BAR_CELLS);
		cells = '#'.repeat(filled) + '-'.repeat(BAR_CELLS - filled);
	}
	return `0 [${cells}] 100`;
}

// One report, rendered either for the screen or for the clipboard. Only the
// score bar differs.
export function buildReport(input: ReportInput, plainText = false): string {
	const {
		location,
		when,
		alerts,
		score,
		quietHours,
		analysis,
		weather,
		storms,
		vessel,
		stations,
		conditions
	} = input;
	const lines: string[] = [];

	lines.push('THE JEBY REPORT');
	lines.push(`${location} · ${when}`);
	lines.push('='.repeat(WIDTH));
	lines.push('');

	if (alerts.length) {
		for (const alert of alerts) lines.push(`! ${alert.event}: ${alert.description}`);
	} else {
		lines.push('NOAA has no active alerts for this area.');
	}
	lines.push('');

	const scoreText = quietHours
		? 'quiet hours'
		: score == null
			? 'not computed yet'
			: `${score} /100`;
	lines.push(`BUMPYSCORE   ${scoreText}`);
	if (vessel) lines.push(`TUNED FOR    ${vessel.name}`);

	const temp = weather?.airTemp.value == null ? '—' : `${Math.round(cToF(weather.airTemp.value))}°`;
	lines.push(`WEATHER      ${temp}${weather?.summary ? `  ${weather.summary}` : ''}`);
	lines.push('');

	if (plainText) {
		lines.push(asciiBar(score));
	} else {
		lines.push(blockBar(score));
		lines.push(blockScale());
	}
	lines.push('');

	lines.push('AI ANALYSIS');
	lines.push('-'.repeat(WIDTH));
	lines.push('  The ride');
	lines.push(...wrap(analysis?.bumpy ?? 'not available right now.'));
	lines.push('');
	lines.push('  Captain');
	lines.push(...wrap(analysis?.steering ?? 'not available right now.'));
	lines.push('');

	lines.push('STORMS');
	lines.push('-'.repeat(WIDTH));
	lines.push(`  ${'Status'.padEnd(14)}${stormStatus(storms)}`);
	if (storms) {
		// Named so a partial picture doesn't read as a complete one.
		const missing = stormsMissing(storms);
		if (missing) lines.push(...wrap(`Could not reach ${missing}.`));
		const pct = (v: number | null) => (v == null ? '—' : `${Math.round(v)}%`);
		// The series run all day; the window in effect is the one worth printing.
		const current = (series: TimedValue[]) => (series.length ? pct(series[0].value) : '—');
		lines.push(`  ${'Thunder'.padEnd(14)}${current(storms.thunderChance)}`);
		lines.push(`  ${'Precipitation'.padEnd(14)}${current(storms.precipitationChance)}`);
		for (const period of storms.outlook) {
			lines.push(`  ${period.name.padEnd(14)}${period.forecast}`);
		}
	}
	lines.push('');

	lines.push('STATION DATA');
	lines.push('-'.repeat(WIDTH));
	for (const station of stations) {
		lines.push(station.name);
		lines.push(
			`  ${isMvco(station.code) ? 'MVCO Sensor' : 'NOAA Buoy'} · ${Math.round(station.depthMeters)} m deep`
		);
		for (const row of stationReadingRows(stationConditions(conditions, station.code))) {
			lines.push(`  ${row.label.padEnd(14)}${row.value}`);
		}
		lines.push('');
	}

	return lines.join('\n').trimEnd();
}
