export const assetUrl = (path: string) =>
  `${import.meta.env.BASE_URL}${path.replace(/^\/+/, "")}`; // # Preserve GitHub Pages subpaths for public images and SVG sprites.
