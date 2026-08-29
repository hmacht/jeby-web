// Types and helpers for talking to the jeby-go API.

import { cToF, metersToFeet, mpsToMph } from './utils';

// A numeric reading paired with its unit. `value` is null when the sensor
// didn't report; `unit` is always set since it's a property of the field.
export interface Measurement {
	value: number | null;
	unit: string;
}

// The AI's reasoning behind a BumpyScore: how to drive the boat through it
// (steering) and how the ride will feel aboard (bumpy). Each is null when that
// analysis wasn't produced (not computed yet, or during the backend's overnight
// quiet hours).
export interface BumpyAnalysis {
	steering: string | null;
	bumpy: string | null;
}

export interface BumpyScore {
	score: number | null; // 0 - 100
	disclaimers: string[];
	analysis: BumpyAnalysis;
}

// A vessel in the registry, as served by /vessels. Specs are free-form strings
// because craft categories are ranges ("26-65 ft") and some specs are unknown.
export interface Vessel {
	code: string;
	name: string;
	description: string;
	weight: string;
	length: string;
	horsepower: string;
	maxPassengers: string;
}

// Whether the given vessel is the Island Queen.
export function isIslandQueen(vessel: Vessel | null | undefined): boolean {
	return vessel?.code === 'IQ';
}

// The ocean readings from a single station (the MVCO sensor or the NOAA buoy).
export interface StationConditions {
	waveHeight: Measurement;
	wavePeriod: Measurement;
	waveLength: Measurement;
	windSpeed: Measurement;
	windDirectionDegrees: Measurement;
	windDirectionCardinal: string | null;
	waterTemp: Measurement;
}

// The full conditions payload for one vessel: the vessel it's for, that vessel's
// BumpyScore, and the ocean readings from each station we pull.
export interface Conditions {
	vessel: Vessel;
	bumpyScore: BumpyScore;
	mvco: StationConditions;
	buoy: StationConditions;
}

// A flat, station-merged view of the readings for display. Each field prefers
// the NOAA buoy and falls back to the MVCO sensor so a gap in one source still
// shows a number.
export interface Readings {
	waveHeight: number | null; // meters
	wavePeriod: number | null; // seconds
	waveLength: number | null; // meters
	windSpeed: number | null; // m/s
	windDirectionDegrees: number | null;
	windDirectionCardinal: string | null;
	waterTemp: number | null; // degC
}

// The StationConditions fields that are Measurements (i.e. numeric readings).
type MeasurementKey = {
	[K in keyof StationConditions]: StationConditions[K] extends Measurement ? K : never;
}[keyof StationConditions];

// Flatten the two stations into one set of readings, preferring the buoy and
// falling back to MVCO for each field independently.
export function flattenConditions(conditions: Conditions | null): Readings {
	const buoy = conditions?.buoy;
	const mvco = conditions?.mvco;
	const pick = (key: MeasurementKey) => buoy?.[key]?.value ?? mvco?.[key]?.value ?? null;

	return {
		waveHeight: pick('waveHeight'),
		wavePeriod: pick('wavePeriod'),
		waveLength: pick('waveLength'),
		windSpeed: pick('windSpeed'),
		windDirectionDegrees: pick('windDirectionDegrees'),
		windDirectionCardinal: buoy?.windDirectionCardinal ?? mvco?.windDirectionCardinal ?? null,
		waterTemp: pick('waterTemp')
	};
}

export interface ForecastPeriod {
	header: string;
	text: string;
}

export interface ForecastSummary {
	periods: ForecastPeriod[];
	full: string;
}

export interface Alert {
	event: string;
	description: string;
	severity: string;
}

export interface Images {
	buoy360: string | null;
	asitcam2: string;
}

// A data source we pull readings from, as served by /stations. Lat/long place it
// on the map; the URLs link out to the source.
export interface Station {
	code: string;
	name: string;
	lat: number;
	long: number;
	// Charted depth at the mooring, shown on the station card the way the app
	// shows it.
	depthMeters: number;
	// The station's current camera frame, null when unavailable.
	liveImageUrl: string | null;
	profileUrl: string;
	detailsUrl: string;
}

// Current land weather from the NWS station at Martha's Vineyard Airport. The
// marine endpoints cover the water; this covers the air. Values are null when
// the station didn't report them.
export interface Weather {
	station: string;
	stationName: string;
	observedAt: string | null;
	summary: string | null;
	// An icon token for the current weather (e.g. "clear", "partly_cloudy"),
	// with the sun/moon variant picked by isDaytime.
	condition: string | null;
	isDaytime: boolean | null;
	iconUrl: string | null;
	airTemp: Measurement;
	feelsLike: Measurement;
	dewpoint: Measurement;
	humidity: Measurement;
	windSpeed: Measurement;
	windGust: Measurement;
	windDirectionDegrees: Measurement;
	windDirectionCardinal: string | null;
	pressure: Measurement;
	visibility: Measurement;
}

// One entry from the station's present-weather list, e.g. light freezing rain.
export interface WeatherPhenomenon {
	weather: string;
	intensity: string | null;
	modifier: string | null;
	text: string;
}

// One forecast period — "Today", "Tonight", "Wednesday" — over the window it
// covers, flagged for whether its wording calls for storms.
export interface StormPeriod {
	name: string;
	from: string;
	until: string;
	forecast: string;
	stormy: boolean;
}

// One forecast quantity over the window it applies to. The backend renders both
// instants in Vineyard local time, offset included.
export interface TimedValue {
	value: number;
	unit: string;
	from: string;
	until: string;
}

// Whether it's storming right now, from the airport observation and the alerts
// feed.
export interface StormNow {
	// 'Occurring' or 'None', ready to print — and null when a source was
	// unavailable, because 'None' must never stand in for "we couldn't check".
	storm: string | null;
	// 'Overhead' or 'Nearby' on an occurring storm, else null.
	proximity: string | null;
	// Whether rain is falling with it. A dry thunderstorm is a real state.
	raining: boolean | null;
	// The evidence in plain sentences, so the UI can show its work. Never empty.
	because: string[];
}

// Whether a storm is expected today, from the forecast grid. Graded on every
// request, including while one is already occurring — the two questions never
// suppress each other.
export interface StormToday {
	// 'Likely', 'Possible' or 'None', ready to print, null when the grid was
	// unavailable.
	storm: string | null;
	// The NWS coverage term behind a Possible or Likely: 'Slight Chance',
	// 'Chance', 'Likely', 'Definite'. Null when there's no storm to qualify.
	confidence: string | null;
	because: string[];
}

// The storm picture: what's happening now, and what today's forecast says.
//
// The series are already trimmed by the backend — probabilities to the current
// Vineyard day, the outlook to the next two periods — but every entry keeps the
// real window it applies to, which can start before midnight or run past it. So
// render from/until rather than assuming a label.
export interface Storms {
	// Two independent answers to two independent questions, from two different
	// sources. An outage in one doesn't blind you to the other.
	now: StormNow;
	today: StormToday;
	// The sources that didn't answer, empty when everything did. Any entry means
	// the evidence below is partial.
	unavailable: string[];
	observed: WeatherPhenomenon[];
	alerts: Alert[];
	// Forecast series in effect at some point today, oldest window first.
	thunderChance: TimedValue[];
	precipitationChance: TimedValue[];
	skyCover: TimedValue[];
	// The strongest gust forecast for today, or null if the grid didn't say.
	peakGust: TimedValue | null;
	outlook: StormPeriod[];
}

// Backend source names, in the words the report uses for them.
const STORM_SOURCE_LABELS: Record<string, string> = {
	observation: 'station observations',
	alerts: 'NWS alerts',
	gridpoint: 'hourly probabilities',
	forecast: 'the forecast periods'
};

// The missing sources as a readable list, or null when nothing is missing. A
// storm can be found with a source still down, so this is worth showing
// alongside any state rather than only the unknown one.
export function stormsMissing(storms: Storms | null): string | null {
	const sources = storms?.unavailable ?? [];
	if (sources.length === 0) return null;
	const labels = sources.map((s) => STORM_SOURCE_LABELS[s] ?? s);
	if (labels.length === 1) return labels[0];
	return `${labels.slice(0, -1).join(', ')} and ${labels[labels.length - 1]}`;
}

// Station codes from the /stations registry. Centralized so a code change (or a
// new station) only has to be made here rather than across the UI.
export const STATION_CODE = {
	mvco: 'MVCO',
	buoy: '44020'
} as const;

// Whether a station code is the MVCO sensor (vs. the NOAA buoy).
export function isMvco(code: string): boolean {
	return code === STATION_CODE.mvco;
}

// Pick the readings for a station out of a conditions payload: the MVCO sensor,
// or the NOAA buoy for everything else.
export function stationConditions(
	conditions: Conditions | null,
	code: string
): StationConditions | null {
	if (!conditions) return null;
	return isMvco(code) ? conditions.mvco : conditions.buoy;
}

// A single labeled reading, formatted for display in imperial units.
export interface ReadingRow {
	label: string;
	value: string;
}

// Turn a station's readings into display rows (feet / mph / °F / seconds), with
// an em dash for anything the sensor didn't report.
export function stationReadingRows(station: StationConditions | null): ReadingRow[] {
	const fmt = (value: number | null, convert: (n: number) => number, unit: string, digits = 0) =>
		value == null ? '—' : `${convert(value).toFixed(digits)} ${unit}`;

	const wind =
		station?.windSpeed.value == null
			? '—'
			: `${mpsToMph(station.windSpeed.value).toFixed(0)} mph${
					station.windDirectionCardinal ? ` ${station.windDirectionCardinal}` : ''
				}`;

	return [
		{ label: 'Wave height', value: fmt(station?.waveHeight.value ?? null, metersToFeet, 'ft', 1) },
		{
			label: 'Wave period',
			value: station?.wavePeriod.value == null ? '—' : `${station.wavePeriod.value.toFixed(0)} s`
		},
		{ label: 'Wave length', value: fmt(station?.waveLength.value ?? null, metersToFeet, 'ft') },
		{ label: 'Wind', value: wind },
		{ label: 'Water temp', value: fmt(station?.waterTemp.value ?? null, cToF, '°F') }
	];
}

// Turn an average wave height (meters) into a friendly feet range, e.g. "2-3".
export function seasRange(waveHeightMeters: number | null): string | null {
	if (waveHeightMeters == null) return null;
	const feet = metersToFeet(waveHeightMeters);
	const lo = Math.max(0, Math.floor(feet));
	const hi = Math.ceil(feet);
	return lo === hi ? `${hi}` : `${lo}-${hi}`;
}
