/** Horodatage du build (défini dans wxt.config.ts). */
declare const __FRTV_BUILD__: string;

// Import d'un fichier CSS sous forme de texte (injecté dans chaque Shadow DOM).
declare module '*?inline' {
  const css: string;
  export default css;
}
