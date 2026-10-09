# Woodland interface and companion refinement

Created for Lexigrove on 2026-10-05 using the OpenAI built-in image-generation tool. No fallback CLI/API runner was used. The user's 13 supplied screenshots were direction references; they are not shipped as background or interface files.

## Selected files

All selected image assets are saved inside `public/assets/coastal/`. The four new WebPs total 1,960,368 bytes. Actual sizes and hashes are in `woodland-v2-manifest.json`.

- `companions-atlas-v2.webp`: 1254 × 1254 RGBA, four pose rows (cat, blue bird, duck, butterfly). Generated transparent alpha is preserved exactly during WebP encoding.
- `keepers-atlas-v2.webp`: 1254 × 1254 RGBA, gardener idle/walk and aquarium keeper idle/wave rows. Generated transparent alpha is preserved exactly during encoding.
- `review-aquarium-v2.webp`: 1536 × 1024 RGB, an original blue aquarium gallery with an empty readable notebook area. No fish or characters are painted into the scene. Earned fish are separate live layers projected from the real world count.
- `study-room-v3.webp`: 1536 × 1024 RGB, the selected targeted edit of the earlier learning room, with a wood-bound notebook, brass rings, a small lamp, leaves and separate companion perches.

These images are compressed format conversions only; dimensions and artwork are not redrawn, cropped or resized in the conversion step. The requested atlas dimensions were 1024 square but the tool returned 1254 square. CSS uses the actual fractional grid. Bird feet extend below the nominal second row, so its CSS viewport is slightly taller with equal physical x/y scaling; the atlas itself remains unedited. Prompts describe requested output, not proof of perfect generated geometry.

The unchanged earlier `study-room.webp` remains as edit-source provenance but is excluded from the installed app-shell precache. Navigation, words, pronunciation, text, input, controls, standing signboards and dictionary bookmarks are actual accessible HTML/SVG, not a raster interface. Native `wood-board-v2.svg` and `paper-board-v2.svg` are original integer-grid frame artwork, with wood grain, brass nails and stepped edges. They follow the project's original standalone-art CC0 dedication to the extent rights apply; application components remain MIT.

## Integration and animation

The home uses persistent normal-font navigation labels, small standing wood signs, a hanging calendar at upper right, earth mounds rather than floating crates, and detailed sprite residents. The duplicate large cloud polygons are removed. Cats blink, ducks paddle, butterflies change wing shape, the gardener walks, and the aquarium keeper can wave. Correct feedback cues two short cycles of the blue bird's wing poses with hops and a decorative Nice! message. It awards no fictional score and never delays typing or Continue.

Every scheduled review, including subsequent repairs, uses the aquarium gallery; acquisition and optional practice use the wood study room. World-off hides scenery/residents and retains readable centered paper. Reduced/static preferences and OS reduced-motion stop both frame cycles and spatial motion. The word, POS, definition, example and pronunciation remain normal-font HTML. Real review choice editing, lexical ownership and one grouped FSRS outcome are preserved.

The front-facing notebook page bounds are matched to each scene, separately. At desktop size the learning room's text padding clears its real brass rings. The scene backgrounds already include their matching lamp/leaf geometry; native ornaments are used for the navigation/dictionary and compact fallback, avoiding duplicate ornaments over the room's paper. Four original coastal seasonal bases remain unchanged.

## Exact final prompt set

### Companion atlas

```text
Use case: stylized-concept. Asset type: production transparent pixel-art sprite sheet for a cozy vocabulary game. Reference images: first is cat/duck pixel detail reference, second is blue study companion mood reference only. Create original designs, do not copy reference pixels.
Deliverable: exactly 1024x1024 square RGBA sprite sheet, genuinely transparent background, arranged as a PERFECT 4 columns by 4 rows uniform grid (each cell 256x256). No gutters, no borders, no captions, no letters. Every character stays completely within its cell. Center each character at x=128, feet/bottom at y=220 within its own cell. Same character identity, scale and baseline across each row. Each character should occupy about 180x180 pixels, with plenty of clear space to avoid cell boundaries. Deliberate detailed 2D game pixel art, coherent 2–4px pixel clusters, stepped outlines, tiny highlighted fur/feather clusters and expressive eyes. Crisp no anti-aliasing, no painterly blur or vector blobs.
ROW 1 (top): a cute original cream and orange calico cat with pink collar and curled tail. Four subtle idle frames: eyes open tail curled left; eyes half closed tail center; eyes closed tail right; eyes open tail center. Cozy lying/sitting pose, face turns slightly to viewer. Orange patches, tiny whiskers, ear shading, paw detail.
ROW 2: a plump cobalt-blue songbird companion with ivory belly, tiny orange beak and feet, navy feather outlines. Four cheerful flap/hop animation frames: grounded folded wings; wings half open; wings fully open and slightly lifted; wings half lowered landing. Cute expressive original face, consistent proportions and clean baseline.
ROW 3: a cream-white duck floating, orange beak, tan/cream shading, tiny dark eye, detailed feathers. Four gentle paddling frames with slightly changed wing/body/tail contour, but no water or scenery painted behind it. Duck faces right in all frames.
ROW 4 (bottom): a small original orange and pale-yellow butterfly with brown detailed body and antennae. Four wingbeat frames: wings fully open; wings half open; wings narrow vertical; wings half open. Butterfly centered, consistent scale, no flowers or environment.
Transparent outside sprites; no shadow blobs or solid background, no buildings, no UI, no watermark. Accurate exact grid placement is critical for CSS steps animation.
```

### Keeper atlas

```text
Use case: stylized-concept. Asset type: original transparent 2D pixel game player animation atlas for Lexigrove. Reference image is style/character proportions only, invent different original designs.
Create a square 1024x1024 transparent RGBA sprite atlas with exact uniform FOUR columns and FOUR rows. Each of 16 cells is 256x256, no gutter, border, labels or text. Keep ALL sprite pixels inside each cell; center all characters in cell x128 with feet at y224. Occupy about 155x190 pixels in each cell, leaving clear transparent margins. Crisp coherent visible 3px pixel clusters, stepped outlines, detailed cute RPG characters, warm shaded materials, expressive eyes, no painterly blur, no vector shape look. Correct identical character scale, identity and baseline across animation frames is essential.
Rows 1 and 2: same original young harbor gardener character, warm brown hair, wide straw sun hat with teal ribbon, navy-blue overalls over cream shirt, little tan boots, a small satchel. Friendly chibi proportions with detailed hat weave pixels, hair, face, pockets, gloves. ROW1 four subtle idle frames: front standing; blink; tiny smile/body breath; front eyes open. ROW2 four walking cycle frames facing slightly right: left step; passing center; right step; passing center. Same hat and clothing, do not enlarge or relocate body between frames except legs and arms.
Rows 3 and 4: same original friendly small aquarium keeper character, teal and mustard-yellow dive suit with cream sleeves, round navy-rim clear dive goggles pushed up on forehead, tiny tan utility pouch, blue boots, dark short hair. No oxygen tube or weapons. ROW3 four idle frames: open eyes; blink; subtle breath; open eyes. ROW4 four friendly waving frames: arm lowered; hand lifting; hand raised; hand lowering. All feet remain on the same baseline. Cute calm inviting resident, no harsh military style.
Absolutely transparent outside each character; no shadows, ground, backgrounds, letters, UI or watermark. Perfect 4x4 equal atlas grid; full 16 sprites, no missing or extra sprites.
```

### Aquarium review scene

```text
Use case: stylized-concept. Asset type: original wide 1536x1024 pixel-art memory-aquarium review room for a vocabulary web game. Input image is mood and environmental detail reference only, not an edit target. Invent different original architecture and prop placement, do not copy the reference layout.
Primary request: a richly detailed, enchanting coastal aquarium reading gallery. This must look materially different from a normal study room. A huge curved glass aquarium fills the LEFT 36% with beautiful clear cyan and sapphire water, detailed violet/pink coral, green and teal sea grass, layered rocks and tiny glints. Tank glass arches overhead on the left; thick cool navy stone arch pillars, mosaic blue stone flooring in foreground. Keep the tank completely free of fish and creatures, since the actual game will add independently animated residents. No animal shapes baked into image.
Main central-right reading area: a wooden notebook stand on an old oak desk. A large completely BLANK ivory parchment notebook page occupies precisely x36%–77% of image width, y12%–79% of image height, facing front without skew. Flat readable empty center with very subtle paper texture. Thick detailed warm walnut wooden frame with brass corner studs, a few tiny ivy leaves attached to corners, small warm amber pendant lantern above its top edge, thin ring binding down the left edge. No marks or symbols on the paper, no UI. This empty paper is for readable live HTML word and recognition buttons, NOT a raster interface.
RIGHTMOST 23%: cozy dark navy arch wall, detailed tall oak bookshelf with book spines (no readable lettering), vine draping around stone, tiny lanterns, seashells and sea-glass bottles, warmly lit desk edge. A little clear stand/platform at lower right for a live friendly diver character. Lower left small wooden bench/platform for a live animal companion. No people, birds, cats, ducks, fish, jellyfish or other animals baked into the scene.
Style: detailed polished original 2D game environment, deliberate crisp pixel clusters and stepped silhouettes, rich deep-blue and turquoise underwater mood balanced by warm amber lanterns and ivory page. Thoughtful perspective and depth. No smooth vector look, no blur, no painterly smudges. Opaque background. Full single continuous scene, no collage, borders, website navigation, text, placeholder bars, buttons, numbers, logos or watermark. Preserve the empty reading-area geometry; make the beautiful aquarium dominate the atmosphere rather than making another generic wooden room.
```

### Wood-bound learning room edit

```text
Use case: precise-object-edit. Asset type: updated original pixel-art learning room background. Input image is the existing Lexigrove study-room scene and is the edit target.
Preserve exact 1536x1024 dimensions, camera, room geography, left coastal window and lighthouse, bookshelves, blue aquarium, floor, overall warm sunlight and detailed crisp pixel style. The central blank paper's interior geometry must stay almost exactly the same (approximately x36%–76%, y11%–79%). It must remain completely blank, quiet and front facing, ready for real HTML.
Change the central reading stand into a clearly wood-bound NOTEBOOK: strengthen its walnut wooden border with visible stepped pixel edges, wood grain and brass corner studs; add 6 small brass ring bindings only along the left paper edge, without reducing the empty paper interior or placing symbols on it. Add a SMALL amber hanging lantern centered just above the top paper border, hanging from a short dark chain. Small ivy leaves on the TOP wooden corners, not across the reading area. Keep the entire paper blank, no text, dividers, placeholder lines, symbols, input fields or UI.
Add two modest clean wooden companion perches, as real furniture: one small low cushioned wooden bench at x18%–31%, around y66%–70%, under the left window and beside the books; one small wooden shelf/perch at x80%–90%, around y68%–72%, beside the right aquarium. They should be clear enough for a separately animated calico cat on the left and songbird on the right. Do not paint those animals or other creatures into the background. Existing flowerpots can move slightly out of these two small perch regions, preserving the rest of the room.
This is a targeted environmental refinement, not a new composition or color filter. Maintain actual detailed coherent pixel clusters, no blurry brush strokes, no vector outlines. Opaque background. NO raster interface, no lettering or watermark.
```

