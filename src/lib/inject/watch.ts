/**
 * Surveille les changements du DOM de FACEIT et relance `onChange` (regroupé, au plus
 * toutes les `minIntervalMs`). Les mutations causées par nos propres blocs sont ignorées.
 */
const isOwnNode = (node: Node) => node instanceof Element && node.tagName === 'FRTV-WIDGET';

export function watchDom(onChange: () => void, minIntervalMs = 250): () => void {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let lastRun = 0;
  let stopped = false;

  const run = () => {
    timer = null;
    if (stopped) return;
    lastRun = Date.now();
    onChange();
  };

  const schedule = () => {
    if (timer !== null || stopped) return;
    const wait = Math.max(0, minIntervalMs - (Date.now() - lastRun));
    timer = setTimeout(() => requestAnimationFrame(run), wait);
  };

  const observer = new MutationObserver((mutations) => {
    const relevant = mutations.some(
      (m) => ![...m.addedNodes, ...m.removedNodes].every(isOwnNode) || (m.addedNodes.length === 0 && m.removedNodes.length === 0),
    );
    if (relevant) schedule();
  });
  observer.observe(document.body, { childList: true, subtree: true });
  schedule();

  return () => {
    stopped = true;
    observer.disconnect();
    if (timer !== null) clearTimeout(timer);
  };
}
