# Scene and resident cohesion (2026-10-13)

The scene used detailed painted pixel textures while separate residents had heavy dark outlines, larger flat color regions and sharper nearest-neighbor scaling. Residents also kept their daylight brightness over a separately darkened backdrop, and viewport-relative placement did not follow the backdrop's cover crop. These are distinct sources of the pasted-on appearance.

## Selected art

The built-in image tool was used in edit mode with the actual seasonal coast, learning room and existing character identities as references. The selected gardener/diver atlas is `public/assets/coastal/keepers-atlas-v3.webp`; the selected cat/bird/duck/butterfly atlas is `public/assets/coastal/companions-atlas-v3.webp`. Both returned PNGs are 1254 × 1254 with alpha. Exact prompts, the initial unselected keeper output and the selected follow-up are recorded in [scene-cohesion-prompts.json](scene-cohesion-prompts.json). Output assets have finer fur, feathers and garment shading, colored edges and less exaggerated eyes.

PNG outputs were converted to **lossless WebP** without resizing, cropping, blurring, painting or recoloring. Alpha bytes and the RGB values of visible pixels were checked against the generated source. An encoder may normalize RGB under fully transparent pixels, which has no visible effect; the manifest records the observed conversion result. [cohesion-v3-manifest.json](../public/assets/coastal/cohesion-v3-manifest.json) contains actual sizes, hashes, byte counts and atlas-row geometry.

The requested equal square row grid was not produced exactly. CSS therefore uses the actual transparent gaps and contact baselines measured from the returned images, rather than stretching every pose into an assumed square. The four horizontal poses remain separate sprite windows; no raster interface text is embedded.

## Integration

- Background and resident rasters share normal browser resampling. No blur filter is applied to compensate for a detail mismatch.
- Desktop coastal residents use the same centered 3:2 cover stage as the 1536 × 1024 seasonal scenery. Cats rest on the stone edge, the gardener walks a short distance inside the grassy terrace, the duck paddles in water and the bird perches on the greenhouse edge. Resize changes both scene and resident placement together. The aquarium focus zoom also scales the entire decorative layer, instead of magnifying the backdrop alone.
- Cat, bird and human contact shadows use the measured sprite baselines. The duck has a restrained water contact ellipse. These are small CSS contact effects, not painted replacements for the generated artwork.
- A common decorative scene layer receives night grading, so the scenery, residents, earned crops and earned tank life darken together. Live signs remain readable outside that decorative layer. The learning-room backdrop and its companions receive the same interior night grade.
- Learning-room cat and bird feet are anchored to the actual painted bench surfaces. The correct-answer bubble sits above the bird's sprite and remains separate from the input/Continue controls.
- Coarse animated water bars are replaced with small, translucent broken glints. The old flat glass/water overlay is hidden because the background already contains the illustrated aquarium. Genuine earned fish/bubbles remain independently projected from progress.
- Superseded keeper, companion and reference companion atlases remain as source provenance but are excluded from the app-shell precache. Current v3 atlases are precached for offline scene loading. App reduced/static effects and OS reduced motion remain supported.

No word dataset, audio recording, review scheduler, learning stage, local database schema, backup format or user history changed in this visual revision.

## Provenance and validation limits

Character identities include reference-derived art from user-supplied screenshots. Their independent underlying source terms were not supplied or verified. The v3 files are therefore excluded from the project-original CC0 dedication; see [ASSET_LICENSES.md](../ASSET_LICENSES.md).

Fresh-browser checks measure the actual cover stage, resident aspect ratios, selected v3 images, shared resampling and night layer. Screenshots decode scene and sprite images before capture. Desktop checks cover 1440 × 1000, 1280 × 900 and 1920 × 1080; the retained compact confirmation fallback is checked at 390 × 844. Results are recorded in [VALIDATION.md](../VALIDATION.md). These checks do not establish pixel-identical reference art or subjective aesthetic acceptance.
