/**
 * Blocs FRTV insérés dans les pages FACEIT.
 * Chaque bloc = un élément `<frtv-widget>` avec son propre Shadow DOM (styles isolés de
 * FACEIT et des autres extensions) et sa racine React.
 */
import type { ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import uiCss from '../../styles/ui.css?inline';

export interface Widget {
  key: string;
  host: HTMLElement;
  remove(): void;
}

export interface WidgetOptions {
  /** `inline-flex` (badge dans une ligne) au lieu de `block`. */
  inline?: boolean;
  /** Classe ajoutée au conteneur racine (`frtv frtv-native …`). */
  className?: string;
  /** Thème FACEIT (par défaut) ou thème FRTV du panneau flottant. */
  theme?: 'native' | 'frtv';
  /**
   * Marges de l'hôte, en px (calculées d'après la page FACEIT). Elles passent par :host
   * avec !important : c'est la seule façon de battre le `all: initial !important` qui isole
   * le bloc (en cas de conflit, la règle !important interne au Shadow DOM l'emporte).
   */
  margin?: { top?: number; bottom?: number };
}

export function createWidget(key: string, node: ReactNode, options: WidgetOptions = {}): Widget {
  const host = document.createElement('frtv-widget');
  host.setAttribute('data-frtv-widget', key);
  host.setAttribute('data-frtv-build', typeof __FRTV_BUILD__ === 'string' ? __FRTV_BUILD__ : 'dev');
  const shadow = host.attachShadow({ mode: 'open' });

  const style = document.createElement('style');
  const display = options.inline ? 'inline-flex' : 'block';
  const margins = [
    options.margin?.top !== undefined ? `margin-top:${options.margin.top}px !important;` : '',
    options.margin?.bottom !== undefined ? `margin-bottom:${options.margin.bottom}px !important;` : '',
  ].join('');
  style.textContent = `:host{all:initial !important;display:${display} !important;${margins}}\n${uiCss}`;

  const container = document.createElement('div');
  const theme = options.theme === 'frtv' ? '' : ' frtv-native';
  container.className = `frtv${theme}${options.className ? ` ${options.className}` : ''}`;
  shadow.append(style, container);

  let root: Root | null = createRoot(container);
  root.render(node);

  return {
    key,
    host,
    remove() {
      root?.unmount();
      root = null;
      host.remove();
    },
  };
}

/**
 * Garde la liste des blocs montés. À chaque passage (`ensure` pour chaque bloc voulu,
 * puis `sweep`), les blocs dont l'ancre a disparu sont recréés ou supprimés : FACEIT
 * est une application React qui redessine souvent ses composants.
 */
export class WidgetManager {
  private widgets = new Map<string, Widget>();

  /**
   * Monte le bloc `key` s'il n'existe pas. `isPlaced` vérifie qu'il est toujours au bon
   * endroit : quand React (FACEIT) recrée un élément voisin, il le réinsère sans tenir
   * compte de nos blocs, qui se retrouvent alors mal placés ; on les déplace (sans
   * démonter React).
   */
  ensure(
    key: string,
    place: (host: HTMLElement) => void,
    node: () => ReactNode,
    options?: WidgetOptions,
    isPlaced?: (host: HTMLElement) => boolean,
  ): Widget {
    const existing = this.widgets.get(key);
    if (existing?.host.isConnected) {
      if (isPlaced && !isPlaced(existing.host)) place(existing.host);
      return existing;
    }
    existing?.remove();
    const widget = createWidget(key, node(), options);
    place(widget.host);
    this.widgets.set(key, widget);
    return widget;
  }

  has(key: string): boolean {
    return this.widgets.get(key)?.host.isConnected ?? false;
  }

  /** Supprime les blocs qui ne font plus partie de `keep`. */
  sweep(keep: Set<string>): void {
    for (const [key, widget] of this.widgets) {
      if (!keep.has(key) || !widget.host.isConnected) {
        widget.remove();
        this.widgets.delete(key);
      }
    }
  }

  clear(): void {
    this.widgets.forEach((w) => w.remove());
    this.widgets.clear();
  }
}
