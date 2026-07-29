<script lang="ts">
	// Leaflet map of the data-source stations. Leaflet touches `window`, so it's
	// loaded lazily in onMount (browser only); the CSS import is SSR-safe because
	// Vite extracts it at build time.
	import 'leaflet/dist/leaflet.css';
	import { flushSync, mount, onMount, unmount, type Component } from 'svelte';
	import ExternalLink from '@lucide/svelte/icons/external-link';
	import LifeBuoy from '@lucide/svelte/icons/life-buoy';
	import RadioTower from '@lucide/svelte/icons/radio-tower';
	import type { Map as LeafletMap } from 'leaflet';
	import Modal from '$lib/Modal.svelte';
	import { isMvco, type Station } from '$lib/jeby/models';
	import { formatCoords } from '$lib/jeby/utils';

	let {
		stations,
		stationImages = {}
	}: {
		stations: Station[];
		stationImages?: Record<string, string | null>;
	} = $props();

	// Vineyard Sound — used when no stations place the view.
	const FALLBACK_CENTER: [number, number] = [41.4, -70.42];

	// Marker click opens a modal with the station's profile + live camera image.
	let selected = $state<Station | null>(null);
	let modalOpen = $state(false);

	// The station's live camera image (if any) for the modal.
	const liveImage = $derived(selected ? (stationImages[selected.code] ?? null) : null);

	let container: HTMLDivElement;

	// Render a Lucide icon component to an SVG string for the Leaflet marker
	// (which takes HTML, not a Svelte component).
	function iconHtml(component: Component): string {
		const holder = document.createElement('div');
		const icon = mount(component, {
			target: holder,
			props: { size: 28, color: '#ef4444', strokeWidth: 2.25 }
		});
		flushSync();
		const html = holder.innerHTML;
		unmount(icon);
		return html;
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

			const divIcon = (component: Component) =>
				L.divIcon({
					className: 'station-marker',
					html: iconHtml(component),
					iconSize: [28, 28],
					iconAnchor: [14, 14]
				});
			// MVCO is a fixed observatory tower; everything else is a floating buoy.
			const towerIcon = divIcon(RadioTower);
			const buoyIcon = divIcon(LifeBuoy);

			const bounds = L.latLngBounds([]);
			for (const station of stations) {
				const latlng: [number, number] = [station.lat, station.long];
				bounds.extend(latlng);
				L.marker(latlng, {
					icon: isMvco(station.code) ? towerIcon : buoyIcon,
					title: station.name
				})
					.addTo(map)
					.on('click', () => {
						selected = station;
						modalOpen = true;
					});
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

<Modal bind:open={modalOpen} title="Station Details">
	{#if selected}
		<div class="flex gap-4">
			<img
				src={selected.profileUrl}
				alt={selected.name}
				class="h-28 w-28 shrink-0 rounded-lg border border-border object-cover"
			/>
			<div class="min-w-0">
				<h3 class="text-base font-semibold text-white">{selected.name}</h3>
				<p class="mt-1 text-sm text-neutral-400">{formatCoords(selected.lat, selected.long)}</p>
				<a
					href={selected.detailsUrl}
					target="_blank"
					rel="external noopener noreferrer"
					class="mt-3 inline-flex items-center gap-1.5 text-sm text-white underline underline-offset-2 transition hover:text-neutral-300"
				>
					Station details
					<ExternalLink size={14} />
				</a>
			</div>
		</div>
		{#if liveImage}
			<img
				src={liveImage}
				alt="Latest view from {selected.name}"
				class="mt-4 w-full rounded-lg border border-border"
			/>
		{/if}
	{/if}
</Modal>

<!-- Global because Leaflet builds these elements outside Svelte's style scope. -->
<style>
	/* Dark mode: invert the standard OSM tiles so we keep OSM's ferry routes and
	   labels but render them on a dark basemap. Only the tile pane is filtered, so
	   markers, popups, and controls stay untouched. */
	:global(.map-dark .leaflet-tile-pane) {
		filter: invert(1) hue-rotate(180deg) brightness(0.9) contrast(0.9);
	}

	/* No white box behind the marker — just the icon, with a drop-shadow so it
	   reads against the map. */
	:global(.leaflet-div-icon.station-marker) {
		background: transparent;
		border: 0;
		filter: drop-shadow(0 1px 2px rgb(0 0 0 / 0.7));
	}
</style>
