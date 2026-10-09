# Reference-matched interface (2026-10-09)

The earlier implementation followed the general pixel-art theme but differed materially from the supplied examples: repeated SVG strips produced thick frames, the study board was too tall, and the controls read as large cards rather than small signs in the scenery. This revision prioritizes the actual supplied composition and painted parts.

## Source and production method

Built-in image generation was used in **edit mode**, with the user's screenshots as edit targets or character references. No CLI image generator or external stock sprite library was used. The exact eight prompts are preserved in [reference-prompts.json](reference-prompts.json), including the rejected initial wide-room aspect and the selected follow-up. These prompts record requested invariants, not proof that generation retained every original pixel.

The selected assets are saved under `public/assets/reference/`. PNG outputs were converted to WebP at quality 92 / method 6 without cropping, scaling, painting, or modifying alpha. Transparent outputs retain byte-identical alpha. [The manifest](../public/assets/reference/manifest.json) records actual returned dimensions, source filenames, transparency, byte counts and SHA-256 hashes.

| Selected asset            | Actual dimensions  | Purpose                                                                                                    |
| ------------------------- | ------------------ | ---------------------------------------------------------------------------------------------------------- |
| navigation-v1.webp        | 909 × 1730, alpha  | Complete illustrated wood frame, six inset rows, seedling and pixel icons; all changing labels remain HTML |
| calendar-controls-v1.webp | 2172 × 724, alpha  | Slim hanging date/season plaque with calendar/sun and adjacent blue settings/theme controls                |
| standing-sign-v1.webp     | 1536 × 1024, alpha | Complete small wood sign with two posts; real title/count and action overlay its cream face                |
| study-room-v2.webp        | 1647 × 955, opaque | Reference-derived room with landscape parchment, warm lamps, harbour window, ivy, books and aquarium       |
| dictionary-book-v1.webp   | 1542 × 1020, alpha | Complete two-page landscape notebook with five colorful illustrated index icons                            |
| aquarium-v1.webp          | 1774 × 887, opaque | Curved blue aquarium at left, warm reading alcove at right and existing lower-right count sign             |
| companions-atlas-v1.webp  | 1774 × 887, alpha  | Four poses each for the lying orange-white cat and blue flower-holding bird, four columns × two rows       |

The initial `study-room-v1.webp` (1766 × 891) is retained as edit provenance but excluded from the installed app-shell precache. The outpainting prompt requested approximately 1766 × 1104 while retaining a centered strip. The tool actually returned **1647 × 955**, with some regenerated detail. The selected scene follows the supplied layout closely; it is not a lossless outpaint or a pixel-identical copy of that target. Desktop coordinates are calibrated to the returned image rather than to an assumed requested size.

## Composition and live controls

- The desktop navigation is 224 × 426 at the upper left. The reference-painted six rows carry normal-font HTML labels; the selected cream fill is live, and only its icon uses the native pixel icon to remain visible over that fill.
- The date and selected season occupy blank writing areas in the upper-right hanging plaque. The original blue control art has real accessible Settings and day/night buttons over it.
- Four standing signs replace the large home cards and footer strip. Counts come from the actual vocabulary, session and world projection. Empty earned beds are hidden rather than drawn as rectangular wooden boxes. The decorative scene never fabricates learning progress.
- The learning-room image uses a cover transform with its actual 1647:955 aspect. The HTML reading surface starts at approximately 32% of scene width / 24% of scene height and occupies 42.1% / 47.5%; the horizontal input/check strip follows the reference desk at 29.5% / 79%. Long content scrolls inside the paper. Independent cat and bird atlas windows rest on the left and right painted benches.
- New acquisition remains Copy → Definition → Audio. The step strip is compact, with a small task plaque; the target, POS, IPA, definition, optional Chinese hint and example use the normal reading font.
- Correct answers cue the reference blue bird's wing poses and a short hop, plus a small speech bubble. Feedback does not gate Continue or alter grading.
- The dictionary is a complete transparent painted notebook, with a narrow index page and larger reading page. Definitions show the primary meaning and numbered other meanings on separate lines. Examples, Collocations, Word family and Other meanings are actual section controls; Notes is a small separate action. Switching a section preserves lexical/POS/pronunciation ownership. Visiting a family link or returning to the scheduled meaning restores its Definitions section.
- Recognition and repair stay in the aquarium. A compact live book sits over the right reading alcove; the left tank remains visible. The standing count sign reports the actual current mature count, independent of decorative fish. The separate diver remains the existing keeper atlas.
- The review-confirmation footer stays outside the reading-page scroll, so the three editable choices and confirmation remain accessible while consulting details. Known, uncertain and unknown follow the previously implemented repair rules and grouped FSRS update.

The six home navigation labels and all study/dictionary words, POS, phonetics and controls use readable ordinary fonts. Pixel detail belongs to painted wood, environment and illustrated icons. Existing duck, butterfly, gardener and diver assets and reduced/static motion behavior remain in place. No dictionary, audio file, scheduling engine, IndexedDB schema or backup format was changed.

## Provenance scope

The new `assets/reference/` files derive from user-supplied concept screenshots, edited at the user's request. The source screenshots' independent copyright/licence provenance was not provided or verified. These files are **not included in the CC0 dedication for independently created project-original art**. Original screenshots, local backups and browser profiles are not included in public source. [ASSET_LICENSES.md](../ASSET_LICENSES.md) distinguishes the two scopes.

## Verification

Fresh-profile local visual checks cover 1440 × 1000, 1280 × 900 and 1920 × 1080 desktop views, the bird's actual frame animation, five dictionary bookmarks, the aquarium recognition panel and the retained 390 × 844 confirmation fallback. Scenery and sprite images are decoded before screenshots. Checks report no horizontal overflow or page exceptions; OS reduced motion stops both atlas frames and spatial motion.

Behavioral results and the actual first-run failures/reruns are recorded in [VALIDATION.md](../VALIDATION.md). Automated tests do not establish the user's aesthetic satisfaction, browser parity or exact equality to a reference screenshot.
