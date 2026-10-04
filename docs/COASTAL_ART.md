# Original coastal scene art

Created for Lexigrove on 2026-10-05 with the OpenAI built-in `image_gen` tool. The fallback CLI/API was not used. The two user-supplied concept images were mood, detail and composition direction references; they are not shipped as application assets. These five images are newly generated original compositions. No commercial game sprite sheets, traced elements, raster interface or baked lexical content are included.

## Files

All images are opaque landscape WebP files at 1536 × 1024. They were visually inspected after generation and encoded with Pillow at quality 91 and method 6. Encoding changes format and compression only; geometry and dimensions are preserved. File checksums and sizes are in `public/assets/coastal/manifest.json`.

| Project asset | Bytes | Visual role |
| --- | ---: | --- |
| `public/assets/coastal/coast-summer.webp` | 660356 | Sunny harbor, lush flowers and clear garden terrace |
| `public/assets/coastal/coast-spring.webp` | 691258 | Blossoming branches, tulips and fresh spring vegetation |
| `public/assets/coastal/coast-autumn.webp` | 653394 | Autumn canopy, dry seed heads, leaf clusters, pumpkins and harvest baskets |
| `public/assets/coastal/coast-winter.webp` | 638078 | Bare branches, berry shrubs, snow on roofs/stone ledges and a shovelled path |
| `public/assets/coastal/study-room.webp` | 487474 | Quiet blank parchment, coastal window, bookshelves, desk and lamp |

Total asset bytes: 3130560. The coast variants keep the same geography and interactive anchor regions. Garden crops and memory fish/plants belong to the application’s live DOM/SVG progression layer. Each coast tank was given a final focused empty-interior edit so static art does not award mature-memory residents or plants. The study room has no baked word text, input, button or lexical control; all readable content remains HTML.

## Integration anchors

Coordinates are normalized to the source image, before responsive camera cropping:

- Garden terrace: approximately x33–66%, y61–75%. Keep live crops on the clear terrace rather than on the stone walls.
- Aquarium glass: approximately x79–95%, y63–75%. Preserve the frame and surface reflection while live fish/plants occupy water.
- Study paper: approximately x36–76%, y11–79%. Its blank center is intentionally quiet so actual DOM typography stays clear.

The raster art is one base layer, not an interactive screenshot. Navigation, hotspots, notifications, progress, text, creature motion, water effects and reduced-motion behavior are implemented by the application. A generation prompt is not proof of exact pixel-level compliance; the outputs were reviewed for visible scene structure, seasonal differences, empty progression areas and absence of text.

## Exact prompt set

### Base summer coast

```text
Use case: stylized-concept
Asset type: original 1536 × 1024 landscape game environment raster for a responsive vocabulary learning web app. One continuous world, not a collage or UI mockup.
Input images: Images 1 and 2 are mood and pixel-detail references only; create a different original village layout, do not reproduce their houses, props or composition.
Primary request: a richly detailed cozy summer coastal village, deliberate crisp pixel art with stepped silhouettes and visible coherent pixel clusters, like a beautiful independently designed 2D game environment. Wide elevated eye-level view, foreground big enough for live interactive sprites. No paint strokes, no smooth vector art, no blur.
Composition: occupy full landscape frame. Top 30 percent sky with clustered fluffy clouds and distant low blue green hills. Blue harbor from middle right into far background, small fishing boats, a tiny lighthouse on the far-right distant headland, cottages in the distance. Left-middle a compact cream coastal study cottage with teal roof, warm wooden door, book-filled window, small porch, potted pink and violet flowers. Stone path curves from bottom-left past cottage toward harbor. Lower-center area from x35% to x63%, y66% to y87% is a quiet small clear level grass-and-soil garden terrace reserved for live SVG planting overlays; it should have a natural low stone boundary but no baked crops, animals or UI. Lower-right from x73% to x94%, y63% to y88% is a modest glass-and-wood greenhouse aquarium nook: visible empty blue-tinted water tank with simple plants on a low masonry base, suitable for animated fish overlays. Rich foreground flowering pots, hydrangeas, stones, fences, little stairs, baskets, reeds, shells, ivy and tall grasses should frame the margins without covering the clear terrace.
Lighting and palette: sunny blue sea, lively teal water highlights, cream walls, muted terracotta accents, lavender and coral flowers, deep blue-green shaded foliage, warm wood. Pleasant luminous afternoon, attractive purposeful depth.
Constraints: an original scene and original designs; no commercial game assets; no characters, cats, birds, ducks, fish or butterflies baked into the scene (they will be live separate sprites); no interface boxes, no cards, no sidebar, no text, no letters, no numbers, no UI controls, no watermark, no collage borders. Calm composition with detailed edges and a readable natural center. Pixel art all the way through, opaque background.
```

### Initial fish-removal edit

```text
Use case: precise-object-edit. Edit the provided summer coastal pixel environment. Keep absolutely the same geography, cottage, garden terrace, harbor, boats, flowers, greenhouse, pixel style, dimensions, lighting and composition. Change only the greenhouse aquarium glass tank at lower right: remove all fish or animal shapes from inside it, leaving clean blue water, simple aquatic plants and subtle water glints. This tank must appear empty of fish because live fish sprites will be added by the website in response to the user's progress. No fish silhouettes, no animals. Do not change anything else. No text, logos or interface.
```

### Spring edit

```text
Use case: lighting-weather.
Asset type: 1536 × 1024 original coastal pixel game environment seasonal variation.
Edit the provided generated original summer coastal scene into the season described below. Preserve exact same camera framing, cottage position and architecture (left middle), teal roof, harbor geography, lighthouse position, boats, path geometry, central garden terrace bounds and right greenhouse aquarium position and dimensions. This must remain visibly the same place through the seasons. Preserve crisp detailed coherent pixel clusters and stepped edges.
The lower-center garden terrace must stay visibly clear of crops and objects so live progress crops can be overlaid. The greenhouse blue aquarium must contain only clear water and simple aquatic plants, absolutely no fish or animal silhouettes. Remove any tiny fishlike shapes in the tank rather than carrying them over. No people, cats, ducks, fish, birds or other baked animals. No text, numbers, controls, interface cards, frames or watermark. Opaque landscape, no collage. Substantive new seasonal vegetation, not a hue filter. Season: SPRING. Fresh small lime-green leaves, a flowering pale-pink blossom tree at upper-left, blush and white blossom clusters through bushes, vibrant clusters of blue and purple spring flowers around the path, fresh light grass, flowering ivy, gentle clear sea-blue sky with softer wispy pixel clouds. Far hills lighter spring foliage. Rich but fresh and delicate bright coastal spring daylight. Keep original building and path geometry intact.
```

### Autumn edit

```text
Use case: lighting-weather.
Asset type: 1536 × 1024 original coastal pixel game environment seasonal variation.
Edit the provided generated original summer coastal scene into the season described below. Preserve exact same camera framing, cottage position and architecture (left middle), teal roof, harbor geography, lighthouse position, boats, path geometry, central garden terrace bounds and right greenhouse aquarium position and dimensions. This must remain visibly the same place through the seasons. Preserve crisp detailed coherent pixel clusters and stepped edges.
The lower-center garden terrace must stay visibly clear of crops and objects so live progress crops can be overlaid. The greenhouse blue aquarium must contain only clear water and simple aquatic plants, absolutely no fish or animal silhouettes. Remove any tiny fishlike shapes in the tank rather than carrying them over. No people, cats, ducks, fish, birds or other baked animals. No text, numbers, controls, interface cards, frames or watermark. Opaque landscape, no collage. Substantive new seasonal vegetation, not a hue filter. Season: AUTUMN. Upper-left deciduous canopy transformed to orange, ochre and russet leaves with branch structure exposed. Replace part of flowering shrubs with copper/red autumn shrubs and pale dry seed-head grasses. Add many pixel leaf clusters along path margins and low stone walls, a few pumpkins and harvest baskets near cottage porch and at foreground corners but keep central garden terrace clear. Dark golden late-afternoon sunlight, cool deep-blue harbor, purple distant hills, softly rose-gold clouds. Visible seasonal props and foliage, no recolor-only shortcut, no geometry changes.
```

### Winter edit

```text
Use case: lighting-weather.
Asset type: 1536 × 1024 original coastal pixel game environment seasonal variation.
Edit the provided generated original summer coastal scene into the season described below. Preserve exact same camera framing, cottage position and architecture (left middle), teal roof, harbor geography, lighthouse position, boats, path geometry, central garden terrace bounds and right greenhouse aquarium position and dimensions. This must remain visibly the same place through the seasons. Preserve crisp detailed coherent pixel clusters and stepped edges.
The lower-center garden terrace must stay visibly clear of crops and objects so live progress crops can be overlaid. The greenhouse blue aquarium must contain only clear water and simple aquatic plants, absolutely no fish or animal silhouettes. Remove any tiny fishlike shapes in the tank rather than carrying them over. No people, cats, ducks, fish, birds or other baked animals. No text, numbers, controls, interface cards, frames or watermark. Opaque landscape, no collage. Substantive new seasonal vegetation, not a hue filter. Season: WINTER. Snow layered on cottage teal roof, stone wall ledges, greenhouse roof edges, harbor pier rails and foreground stones. Bare deciduous branches replace leafy upper-left canopy, small evergreen dark green shrubs remain. White soft snow blanket on garden terrace with underlying terrace still visible and clear for live overlays. Clear stone path shovelled through snow, frosty plant stems and berry shrubs replace summer blooms. Cottage and greenhouse windows softly glowing warm amber against blue-grey winter daylight, pale winter sky and distant snowy hills. Harbor remains open blue water, no ice. No falling flakes baked in (live snow will animate). New snow geometry, bare branches, winter shrub forms—not a color filter.
```

### Final empty aquarium edit applied independently to all four coast assets

```text
Use case: precise-object-edit.
Edit only the interior of the rectangular glass aquarium located in the lower-right greenhouse (approximately x79%–95% of image width and y63%–75% height).
Remove EVERYTHING INSIDE THAT TANK except clean blue water: ALL fish, ALL black or dark fishlike marks, ALL aquatic plants, ALL yellow/green plant stems, ALL seaweed, ALL rocks, ALL pebbles, ALL sand/gravel decoration. Tank bottom is plain empty pale blue glass, tank water is translucent simple aqua-blue with subtle pixel reflections. It is a totally vacant fishless plantless aquarium, ready for live data-driven fish and plants added by the website later. Keep the glass tank frame, water surface highlights and aquarium geometry.
Keep every pixel outside the aquarium interior unchanged: seasonal trees, flowerpots OUTSIDE tank, cottage, greenhouse, harbor, sky, ships, empty central garden terrace, path and foreground must stay exactly the same. Preserve 1536 × 1024 resolution, original detailed pixel style and all spatial composition. No text or UI, no extra objects.
```

### Study room

```text
Use case: stylized-concept
Asset type: original 1536 × 1024 wide pixel art study-room environment for a web vocabulary-learning scene; actual words and controls will be real HTML overlay.
Input images: attached concepts are mood references, not reproduction targets. Invent an original room with different object arrangements, no raster interface.
Primary request: a warmly inviting cozy coastal study room with deliberate crisp pixel clusters, stepped edges and beautifully detailed small props. Wide straight-on slightly elevated view. Wooden oak desk spans lower frame. The leftmost 28 percent contains a tall bookshelf, stacked books, small potted trailing plant and large open window looking onto brilliant blue harbor and distant lighthouse of a cream-walled teal-roof coastal village; soft ivory curtains, muted pink flowers on sill. Rightmost 23 percent has a bookcase, green potted plant, warm hanging lamp, and an empty small blue aquarium set on a side cabinet (water and plants only, no fish). Main center region from x30% to x75%, y14% to y86% is a calm clear vertical rectangular cream-colored parchment sheet standing on the desk, subtle warm paper grain, stepped natural edges, absolutely blank with no text, labels, marks, placeholders, dividers or buttons. Sheet leaves clean negative space for a 620px-wide live DOM overlay. Low desk bottom edge has closed notebooks, pencil cup and small seashell arranged away from central typing area.
Style: refined actual pixel art, colorful but restrained, clear light paper against warm wood, harbor blue and sage-green accents. Warm natural daylight, readable quiet center and detailed inhabited margins. Continuous complete room no collage. No people, cats, birds, fish or other animals baked in, live creatures will be separate sprites.
Constraints: entirely original environment; no copying commercial game art or reference compositions; no website chrome, interface, cards, text, letters, numbers, symbols, UI buttons, watermark, painterly smears, smooth vector shapes or blur. Opaque landscape raster.
```

