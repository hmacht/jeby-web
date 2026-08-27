<script lang="ts">
	// Leaflet map of the data-source stations. Leaflet touches `window`, so it's
	// loaded lazily in onMount (browser only); the CSS import is SSR-safe because
	// Vite extracts it at build time.
	import 'leaflet/dist/leaflet.css';
	import { flushSync, mount, onMount, unmount, type Component } from 'svelte';
	import LifeBuoy from '@lucide/svelte/icons/life-buoy';
	import RadioTower from '@lucide/svelte/icons/radio-tower';
	import type { Map as LeafletMap } from 'leaflet';
	import { isMvco, type Station } from '$lib/jeby/models';

	let {
		stations,
		readings = {},
		onSelect
	}: {
		stations: Station[];
		readings?: Record<string, string | null>;
		// A marker tap raises the station's details. The modal lives one level up
		// so the cards beside the map open the same one.
		onSelect: (station: Station) => void;
	} = $props();

	// Vineyard Sound — used when no stations place the view.
	const FALLBACK_CENTER: [number, number] = [41.4, -70.42];

	let container: HTMLDivElement;

	// Render a Lucide icon component to an SVG string for the Leaflet marker
	// (which takes HTML, not a Svelte component).
	function iconHtml(component: Component): string {
		const holder = document.createElement('div');
		const icon = mount(component, {
			target: holder,
			props: { size: 20, color: '#ffffff', strokeWidth: 2.25 }
		});
		flushSync();
		const html = holder.innerHTML;
		unmount(icon);
		return html;
	}

	// Each station is a pill badge: its icon + live wave-height reading.
	function badgeIcon(L: typeof import('leaflet'), station: Station) {
		const component = isMvco(station.code) ? RadioTower : LifeBuoy;
		const tone = isMvco(station.code) ? 'station-badge--mvco' : 'station-badge--buoy';
		const ft = readings[station.code];
		return L.divIcon({
			className: 'station-badge-marker',
			html: `<div class="station-badge ${tone}">${iconHtml(component)}<span>${ft ?? '—'} ft</span></div>`,
			iconSize: [0, 0]
		});
	}

	onMount(() => {
		let map: LeafletMap | undefined;

		(async () => {
			const L = await import('leaflet');
			map = L.map(container, { scrollWheelZoom: false });

			// Standard OpenStreetMap tiles — these render ferry routes and other
			// nautical/marine detail straight from OSM data.
			L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
				attribution:
					'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
				maxZoom: 19
			}).addTo(map);

			const bounds = L.latLngBounds([]);
			for (const station of stations) {
				const latlng: [number, number] = [station.lat, station.long];
				bounds.extend(latlng);
				L.marker(latlng, { icon: badgeIcon(L, station), title: station.name })
					.addTo(map)
					.on('click', () => onSelect(station));
			}

			if (bounds.isValid()) {
				// Fit the stations, then back off one zoom step for a little breathing room.
				const fitZoom = Math.min(12, map.getBoundsZoom(bounds, false, L.point(40, 40)));
				map.setView(bounds.getCenter(), fitZoom - 1);
			} else {
				map.setView(FALLBACK_CENTER, 9);
			}
		})();

		return () => map?.remove();
	});
</script>

<!-- `isolate` contains Leaflet's internal z-indexes (its controls/popups go up to
	1000) in their own stacking context, so overlays like the forecast modal
	(z-50) still render above the map. -->
<div
	bind:this={container}
	class="map-dark isolate h-full min-h-72 w-full overflow-hidden rounded-xl border border-border"
></div>

<!-- Global because Leaflet builds these elements outside Svelte's style scope. -->
<style>
	/* Dark mode: invert the standard OSM tiles so we keep OSM's ferry routes and
	   labels but render them on a dark basemap. Only the tile pane is filtered, so
	   markers, popups, and controls stay untouched. */
	:global(.map-dark .leaflet-tile-pane) {
		filter: invert(1) hue-rotate(180deg) brightness(0.9) contrast(0.9);
	}

	/* Strip Leaflet's default div-icon box; the badge below is centered on the
	   station point via translate (the icon element itself is 0×0). */
	:global(.leaflet-div-icon.station-badge-marker) {
		background: transparent;
		border: 0;
	}

	:global(.station-badge) {
		display: inline-flex;
		align-items: center;
		gap: 0.375rem;
		transform: translate(-50%, -50%);
		padding: 0.375rem 0.75rem;
		border-radius: 9999px;
		border: 1px solid rgb(255 255 255 / 0.12);
		font-size: 0.875rem;
		font-weight: 600;
		line-height: 1;
		white-space: nowrap;
		color: #ffffff;
		box-shadow: 0 4px 12px rgb(0 0 0 / 0.4);
	}

	:global(.station-badge svg) {
		display: block;
	}

	/* The same tints as the station cards, and the same dark→bright diagonal —
	   a badge and its card are the one station in two places. Reversed against
	   the cards (bright first) so the small pill reads brighter on the map. */
	:global(.station-badge--mvco) {
		background-image: linear-gradient(135deg, var(--color-mvco-bright), var(--color-mvco-deep));
	}

	:global(.station-badge--buoy) {
		background-image: linear-gradient(135deg, var(--color-buoy-bright), var(--color-buoy-deep));
	}
</style>
