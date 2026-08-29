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

// One forecast period, flagged for whether its wording calls for storms.
export interface StormPeriod {
	name: string;
	forecast: string;
	stormy: boolean;
}

// The combined storm picture: two quick flags plus the evidence behind them.
export interface Storms {
	// Tri-state, matching the backend: true means a storm was found, false means
	// every source answered and none of them did, and null means a source we
	// needed was unavailable — we don't know. Never treat null as false; that
	// renders an all-clear to someone deciding whether to leave the harbor.
	stormNow: boolean | null;
	stormExpectedToday: boolean | null;
	// The sources that didn't answer, empty when everything did. Any entry means
	// the evidence below is partial.
	unavailable: string[];
	observed: WeatherPhenomenon[];
	alerts: Alert[];
	// Highest chance across the rest of today.
	thunderChance: Measurement;
	precipitationChance: Measurement;
	outlook: StormPeriod[];
}

// The storm picture collapsed to the one state the UI paints. 'unavailable' is
// the whole endpoint being down; 'unknown' is reaching it but having a source
// we needed go missing.
export type StormLevel = 'now' | 'today' | 'unknown' | 'clear' | 'unavailable';

// Precedence mirrors the backend's: a storm we actually found outranks a source
// that went missing, and a missing source outranks an all-clear. The last step
// is the point of the tri-state — 'clear' has to mean every source answered and
// none saw a storm, not merely that nothing came back true.
export function stormLevel(storms: Storms | null): StormLevel {
	if (!storms) return 'unavailable';
	if (storms.stormNow === true) return 'now';
	if (storms.stormExpectedToday === true) return 'today';
	if (storms.stormNow == null || storms.stormExpectedToday == null) return 'unknown';
	return 'clear';
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
