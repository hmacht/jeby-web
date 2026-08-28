// Sweeps a light across an element's text once, when the page renders it.
//
// The class does the drawing (see layout.css); this just puts it on and takes it
// off again once the sweep finishes, so the text goes back to being ordinary
// text rather than a painted gradient.

export function shimmer(node: HTMLElement) {
	// Anyone who's asked for less motion gets none.
	if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

	const done = () => node.classList.remove('shimmer-text');

	node.addEventListener('animationend', done, { once: true });
	node.classList.add('shimmer-text');

	return {
		destroy() {
			node.removeEventListener('animationend', done);
		}
	};
}
