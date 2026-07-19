<script lang="ts">
	// Leaflet map of the data-source stations. Leaflet touches `window`, so it's
	// loaded lazily in onMount (browser only); the CSS import is SSR-safe because
	// Vite extracts it at build time.
	import 'leaflet/dist/leaflet.css';
	import { flushSync, mount, onMount, unmount } from 'svelte';
	import ExternalLink from '@lucide/svelte/icons/external-link';
	import RadioTower from '@lucide/svelte/icons/radio-tower';
	import type { Map as LeafletMap } from 'leaflet';
	import Modal from '$lib/Modal.svelte';
	import type { Station } from '$lib/jeby/models';
	import { formatCoords } from '$lib/jeby/utils';

	let { stations }: { stations: Station[] } = $props();

	// Vineyard Sound — used when no stations place the view.
	const FALLBACK_CENTER: [number, number] = [41.4, -70.42];

	// Marker click opens a modal with the station's profile image.
	let selected = $state<Station | null>(null);
	let modalOpen = $state(false);

	let container: HTMLDivElement;

	// Render the Lucide radio-tower component to an SVG string for the Leaflet
	// marker (which takes HTML, not a Svelte component).
	function radioTowerHtml(): string {
		const holder = document.createElement('div');
		const icon = mount(RadioTower, {
			target: holder,
			props: { size: 20, color: '#ef4444', strokeWidth: 2.25 }
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

			const towerIcon = L.divIcon({
				className: 'station-marker',
				html: `<span class="station-marker__badge">${radioTowerHtml()}</span>`,
				iconSize: [34, 34],
				iconAnchor: [17, 17]
			});

			const bounds = L.latLngBounds([]);
			for (const station of stations) {
				const latlng: [number, number] = [station.lat, station.long];
				bounds.extend(latlng);
				L.marker(latlng, { icon: towerIcon, title: station.name })
					.addTo(map)
					.on('click', () => {
						selected = station;
						modalOpen = true;
					});
			}

			if (bounds.isValid()) {
				map.fitBounds(bounds, { padding: [40, 40], maxZoom: 12 });
			} else {
				map.setView(FALLBACK_CENTER, 10);
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
	class="isolate h-full min-h-72 w-full overflow-hidden rounded-xl border border-border"
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
	{/if}
</Modal>

<!-- Leaflet gives div icons a white box by default; replace it with a round badge
	for the tower glyph. Global because Leaflet creates these outside Svelte's scope. -->
<style>
	:global(.leaflet-div-icon.station-marker) {
		background: transparent;
		border: 0;
	}

	:global(.station-marker__badge) {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 34px;
		height: 34px;
		border-radius: 9999px;
		background: #ffffff;
		box-shadow: 0 1px 3px rgb(0 0 0 / 0.4);
	}
</style>
