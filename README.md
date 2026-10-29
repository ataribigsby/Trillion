# Trillion

A single-file WebGL game: 3D Tetris on a cube, with Aloha, a calm ocean planet for your bonus items.

`index.html` is the whole game. Open it in a browser to play.

## Current reconciled build

Use this repository's `index.html` as the source of truth. The October 28 reconciliation starts from `554c627` (the touch/sphere build) and ports the arcade-feedback changes onto it. Do not replace it with the older October 27 attachment: that attachment does not contain the mobile controls, cassette selection, or planet-growth work.

The opening now progresses from a 3×3 plane to a 4×4 corner at 30 points and a full 5×5 cube at 60. Reaching the cube earns a fresh, zero-score level-three start on the title screen. Cassette-based level selection remains available in Aloha. Movement guides use keyboard letters on desktop and swipe-direction symbols in touch mode. Stack warnings follow local terrain and the actual canvas viewport. The guided opening uses legal plane spins instead of tipping onto unavailable faces.

Preserved from the touch build: both control spheres, center-pivot piece turning and edge adjustment, touch menu/power controls, Aloha drawer sphere hiding, cassette unlocks, planet expansion, saves, the seven-second award cards, and the singing-bowl chime.

Run `node checks/game-checks.cjs` for rule, progression, save, reward, guide-rendering, and guided-tutorial regression checks. Browser checks used an isolated localhost fixture with storage and network writes disabled, including a 390×700 touch layout: slide, hold-drop, spin, Aloha entry, and the shop drawer were exercised. A physical-phone playtest remains recommended.

### Playfield scale correction

The permanent dotted height rim and its camera zoom-out are removed. The camera centers and frames the rendered playfield and falling piece. Six-layer stacks have a local amber cap; seven-layer stacks pulse red (steady when reduced motion is enabled). There are no ceiling outlines or dashed tethers.

Mobile score and spheres are more compact. The tutorial has reserved space outside the mobile playfield and sits at the bottom on desktop.

Validation covers warning onset, no warning below six layers, no dotted geometry, close opening framing, the existing gameplay regression suite, and desktop/mobile browser previews.
