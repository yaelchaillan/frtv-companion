/** Simulation en mémoire de `wxt/utils/storage` pour l'aperçu. */
type Watcher<T> = (value: T, old: T) => void;

function defineItem<T>(_key: string, options: { fallback: T }) {
  let value = options.fallback;
  const watchers = new Set<Watcher<T>>();
  return {
    fallback: options.fallback,
    getValue: async () => value,
    setValue: async (next: T) => {
      const old = value;
      value = next;
      watchers.forEach((w) => w(next, old));
    },
    watch: (cb: Watcher<T>) => {
      watchers.add(cb);
      return () => watchers.delete(cb);
    },
  };
}

export const storage = { defineItem };
