# Paradise Builder — Sticker Prompts

Prompts for the drag-and-drop stickers kids will use to build their own paradise
page. Same cohesion rule as the game-card prompts: **style + palette + exclude
block byte-identical across every sticker**, only the first sentence changes.
Same seed / style reference reused for the whole set.

## Output spec (paste into your image tool, apply to every prompt)

- **PNG-24 with transparent background** — the sticker sits on top of a scene, so
  any halo of white shows. If your tool bakes in a background, mask it out before
  saving.
- **Square canvas 512×512 px**, subject centered, ~10% padding around edges.
- **No shadow beneath the subject** (the scene provides its own lighting).
- **Filename**: `sticker-<category>-<slug>.png` → drop in `public/uploads/stickers/`.

## Palette (Faithful Companion — from `src/app/globals.css`)

coral `#FF8269` · sky `#4ABDE8` · violet `#9474EF` · golden `#F3B840` ·
peach `#FFA56B` · cream `#FAF8F6` · ink `#3C3F4A`

## Content rules baked into every prompt

- **People are young and healthy** — everyone in paradise becomes young again
  (Job 33:25, Isa 65:20). No gray hair, no wrinkles, no canes, no walking sticks,
  no glasses. Distinguish age tiers by **stature, clothing, bearing, and hair
  style** — never by aging signs.
- **Modest clothing** — no bare shoulders, no shorts above the knee, no low
  necklines. Long skirts / dresses / trousers, layered tops.
- **No crosses, halos, or holiday imagery.** Use lambs/sheep for sacrifice themes.
- **No branded characters** (Caleb & Sophia, Disney, Pixar, etc.) — original
  characters only.
- **No depictions of Jehovah or Jesus.**
- **Diverse skin tones and hair colors** across the People set — no group looks
  like a single family.

---

## PEOPLE — MODERN (40)

The Modern People set — a modern family in paradise. Contemporary
casual clothing, the kind a JW family today would wear to a picnic or
a family study: comfortable, modest, tidy. **Everyone is young and
healthy** (Job 33:25, Isa 65:20) — age tiers are shown through
stature, clothing, bearing, and hair, never through wrinkles, gray
hair, or canes.

**5 ethnic / hair variants per role, 8 roles = 40 stickers:**
- **blonde** — fair pale skin, blonde hair
- **brunette** — fair-to-medium skin, medium-brown hair
- **black** — deep warm brown skin, natural textured hair
- **hispanic** — warm olive-tan skin, dark brown hair
- **asian** — light warm skin, straight jet-black hair

Filename pattern: `sticker-people-<variant>-<role>.png`
(e.g. `sticker-people-black-mother.png`).

Two future sets are planned for cultural and historical variety —
see **Planned future sets** at the end of this file.

Age distinction cues (all variants):
- **Grandmothers / grandfathers**: taller / larger frame, dignified
  upright bearing, hair styled fuller, "cardigan-and-slacks" or
  "long skirt-and-blouse" energy — modern but a touch more
  put-together than the parents.
- **Parents**: young adult stature, everyday casual family clothing,
  warm relaxed pose, often reaching toward a child.
- **Teens**: slim, taller than children, active or curious pose,
  casual layered clothing (hoodie or cardigan over a tee, jeans or
  long skirt).
- **Children**: short, rounder proportions, playful energetic pose,
  simple brightly-colored playclothes.

---

### Grandmothers (5)

**1. `sticker-people-blonde-grandmother.png`**
```
A cheerful young-looking modern grandmother with fair pale skin and long soft blonde hair in a neat loose updo, standing serenely with both hands folded in front of her and a warm dignified smile, wearing a modest knee-length skirt with a comfy cardigan over a blouse and a small necklace, no wrinkles no gray hair no cane, coral-dominant with peach and violet accents. Flat vector children's storybook sticker illustration, single centered subject on a fully transparent background, soft palette of coral #FF8269 / sky #4ABDE8 / violet #9474EF / golden #F3B840 / peach #FFA56B, soft golden light, bold rounded simple shapes, clean minimal linework, no fine detail, cheerful peaceful mood, reads clearly at 128px, flat 2D, no text, no logos, no shadow beneath. Exclude: text, letters, numbers, photorealism, 3D render, ANY background, muddy or garish colors, wrinkles, gray hair, canes, walking sticks, glasses, hearing aids, aging signs, ancient robes, tunics, biblical costume, crosses, halos, holiday imagery, realistic faces, branded characters, immodest or revealing clothing.
```

**2. `sticker-people-black-grandmother.png`**
```
A cheerful young-looking modern grandmother with deep warm brown skin and natural textured hair in graceful braids or a soft afro, seated on the grass gently tending a small flower with cupped hands, warm dignified smile, wearing a modest knee-length skirt with a comfy cardigan over a blouse and a small necklace, no wrinkles no gray hair no cane, coral-dominant with peach and violet accents. Flat vector children's storybook sticker illustration, single centered subject on a fully transparent background, soft palette of coral #FF8269 / sky #4ABDE8 / violet #9474EF / golden #F3B840 / peach #FFA56B, soft golden light, bold rounded simple shapes, clean minimal linework, no fine detail, cheerful peaceful mood, reads clearly at 128px, flat 2D, no text, no logos, no shadow beneath. Exclude: text, letters, numbers, photorealism, 3D render, ANY background, muddy or garish colors, wrinkles, gray hair, canes, walking sticks, glasses, hearing aids, aging signs, ancient robes, tunics, biblical costume, crosses, halos, holiday imagery, realistic faces, branded characters, immodest or revealing clothing.
```

**3. `sticker-people-hispanic-grandmother.png`**
```
A cheerful young-looking modern grandmother with warm olive-tan skin and long dark brown hair in a soft neat bun, walking with a soft folded blanket draped over one arm and a warm dignified smile, wearing a modest knee-length skirt with a comfy cardigan over a blouse and a small necklace, no wrinkles no gray hair no cane, coral-dominant with peach and violet accents. Flat vector children's storybook sticker illustration, single centered subject on a fully transparent background, soft palette of coral #FF8269 / sky #4ABDE8 / violet #9474EF / golden #F3B840 / peach #FFA56B, soft golden light, bold rounded simple shapes, clean minimal linework, no fine detail, cheerful peaceful mood, reads clearly at 128px, flat 2D, no text, no logos, no shadow beneath. Exclude: text, letters, numbers, photorealism, 3D render, ANY background, muddy or garish colors, wrinkles, gray hair, canes, walking sticks, glasses, hearing aids, aging signs, ancient robes, tunics, biblical costume, crosses, halos, holiday imagery, realistic faces, branded characters, immodest or revealing clothing.
```

**4. `sticker-people-asian-grandmother.png`**
```
A cheerful young-looking modern grandmother with light warm skin and straight jet-black hair in a neat soft updo or shoulder-length bob, kneeling and offering a small piece of fruit forward with an open hand and a warm dignified smile, wearing a modest knee-length skirt with a comfy cardigan over a blouse and a small necklace, no wrinkles no gray hair no cane, coral-dominant with peach and violet accents. Flat vector children's storybook sticker illustration, single centered subject on a fully transparent background, soft palette of coral #FF8269 / sky #4ABDE8 / violet #9474EF / golden #F3B840 / peach #FFA56B, soft golden light, bold rounded simple shapes, clean minimal linework, no fine detail, cheerful peaceful mood, reads clearly at 128px, flat 2D, no text, no logos, no shadow beneath. Exclude: text, letters, numbers, photorealism, 3D render, ANY background, muddy or garish colors, wrinkles, gray hair, canes, walking sticks, glasses, hearing aids, aging signs, ancient robes, tunics, biblical costume, crosses, halos, holiday imagery, realistic faces, branded characters, immodest or revealing clothing.
```

**33. `sticker-people-brunette-grandmother.png`**
```
A cheerful young-looking modern grandmother with fair-to-medium skin and rich medium-brown hair in soft shoulder-length waves, standing holding a small potted flowering plant in both hands with a warm dignified smile, wearing a modest knee-length skirt with a comfy cardigan over a blouse and a small necklace, no wrinkles no gray hair no cane, coral-dominant with peach and violet accents. Flat vector children's storybook sticker illustration, single centered subject on a fully transparent background, soft palette of coral #FF8269 / sky #4ABDE8 / violet #9474EF / golden #F3B840 / peach #FFA56B, soft golden light, bold rounded simple shapes, clean minimal linework, no fine detail, cheerful peaceful mood, reads clearly at 128px, flat 2D, no text, no logos, no shadow beneath. Exclude: text, letters, numbers, photorealism, 3D render, ANY background, muddy or garish colors, wrinkles, gray hair, canes, walking sticks, glasses, hearing aids, aging signs, ancient robes, tunics, biblical costume, crosses, halos, holiday imagery, realistic faces, branded characters, immodest or revealing clothing.
```

### Grandfathers (5)

**5. `sticker-people-blonde-grandfather.png`**
```
A cheerful young-looking modern grandfather with fair pale skin, a full head of tidy blonde hair and a neatly trimmed light blonde beard, standing with arms comfortably crossed and a warm dignified smile, wearing a modest button-down shirt under a comfy sweater vest with dress trousers, no wrinkles no gray hair no cane, sky-dominant with golden and peach accents. Flat vector children's storybook sticker illustration, single centered subject on a fully transparent background, soft palette of coral #FF8269 / sky #4ABDE8 / violet #9474EF / golden #F3B840 / peach #FFA56B, soft golden light, bold rounded simple shapes, clean minimal linework, no fine detail, cheerful peaceful mood, reads clearly at 128px, flat 2D, no text, no logos, no shadow beneath. Exclude: text, letters, numbers, photorealism, 3D render, ANY background, muddy or garish colors, wrinkles, gray hair, canes, walking sticks, glasses, hearing aids, aging signs, ancient robes, tunics, biblical costume, crosses, halos, holiday imagery, realistic faces, branded characters, immodest or revealing clothing.
```

**6. `sticker-people-black-grandfather.png`**
```
A cheerful young-looking modern grandfather with deep warm brown skin, short natural black hair and a neatly trimmed black beard, seated cross-legged holding an open book on his lap with a warm dignified smile, wearing a modest button-down shirt under a comfy sweater vest with dress trousers, no wrinkles no gray hair no cane, sky-dominant with golden and peach accents. Flat vector children's storybook sticker illustration, single centered subject on a fully transparent background, soft palette of coral #FF8269 / sky #4ABDE8 / violet #9474EF / golden #F3B840 / peach #FFA56B, soft golden light, bold rounded simple shapes, clean minimal linework, no fine detail, cheerful peaceful mood, reads clearly at 128px, flat 2D, no text, no logos, no shadow beneath. Exclude: text, letters, numbers, photorealism, 3D render, ANY background, muddy or garish colors, wrinkles, gray hair, canes, walking sticks, glasses, hearing aids, aging signs, ancient robes, tunics, biblical costume, crosses, halos, holiday imagery, realistic faces, branded characters, immodest or revealing clothing.
```

**7. `sticker-people-hispanic-grandfather.png`**
```
A cheerful young-looking modern grandfather with warm olive-tan skin, tidy dark brown hair with a neat side part and a neatly trimmed dark beard, kneeling on one knee to plant a small seedling in the earth with a warm dignified smile, wearing a modest button-down shirt under a comfy sweater vest with dress trousers, no wrinkles no gray hair no cane, sky-dominant with golden and peach accents. Flat vector children's storybook sticker illustration, single centered subject on a fully transparent background, soft palette of coral #FF8269 / sky #4ABDE8 / violet #9474EF / golden #F3B840 / peach #FFA56B, soft golden light, bold rounded simple shapes, clean minimal linework, no fine detail, cheerful peaceful mood, reads clearly at 128px, flat 2D, no text, no logos, no shadow beneath. Exclude: text, letters, numbers, photorealism, 3D render, ANY background, muddy or garish colors, wrinkles, gray hair, canes, walking sticks, glasses, hearing aids, aging signs, ancient robes, tunics, biblical costume, crosses, halos, holiday imagery, realistic faces, branded characters, immodest or revealing clothing.
```

**8. `sticker-people-asian-grandfather.png`**
```
A cheerful young-looking modern grandfather with light warm skin, short tidy straight jet-black hair (clean-shaven or a small neat mustache), standing with one hand pointing gently toward the distance and a warm dignified smile, wearing a modest button-down shirt under a comfy sweater vest with dress trousers, no wrinkles no gray hair no cane, sky-dominant with golden and peach accents. Flat vector children's storybook sticker illustration, single centered subject on a fully transparent background, soft palette of coral #FF8269 / sky #4ABDE8 / violet #9474EF / golden #F3B840 / peach #FFA56B, soft golden light, bold rounded simple shapes, clean minimal linework, no fine detail, cheerful peaceful mood, reads clearly at 128px, flat 2D, no text, no logos, no shadow beneath. Exclude: text, letters, numbers, photorealism, 3D render, ANY background, muddy or garish colors, wrinkles, gray hair, canes, walking sticks, glasses, hearing aids, aging signs, ancient robes, tunics, biblical costume, crosses, halos, holiday imagery, realistic faces, branded characters, immodest or revealing clothing.
```

**34. `sticker-people-brunette-grandfather.png`**
```
A cheerful young-looking modern grandfather with fair-to-medium skin, tidy medium-brown hair with a gentle wave and a neatly trimmed brown beard, standing with hands gently clasped behind his back and a warm dignified smile, wearing a modest button-down shirt under a comfy sweater vest with dress trousers, no wrinkles no gray hair no cane, sky-dominant with golden and peach accents. Flat vector children's storybook sticker illustration, single centered subject on a fully transparent background, soft palette of coral #FF8269 / sky #4ABDE8 / violet #9474EF / golden #F3B840 / peach #FFA56B, soft golden light, bold rounded simple shapes, clean minimal linework, no fine detail, cheerful peaceful mood, reads clearly at 128px, flat 2D, no text, no logos, no shadow beneath. Exclude: text, letters, numbers, photorealism, 3D render, ANY background, muddy or garish colors, wrinkles, gray hair, canes, walking sticks, glasses, hearing aids, aging signs, ancient robes, tunics, biblical costume, crosses, halos, holiday imagery, realistic faces, branded characters, immodest or revealing clothing.
```

### Mothers (5)

**9. `sticker-people-blonde-mother.png`**
```
A young adult modern mother with fair pale skin and long blonde hair pulled softly back, cradling a small woven basket of fresh fruit near her hip with a warm gentle smile, in a modest casual blouse and long skirt or comfy trousers, peach-dominant with coral and sky accents. Flat vector children's storybook sticker illustration, single centered subject on a fully transparent background, soft palette of coral #FF8269 / sky #4ABDE8 / violet #9474EF / golden #F3B840 / peach #FFA56B, soft golden light, bold rounded simple shapes, clean minimal linework, no fine detail, cheerful peaceful mood, reads clearly at 128px, flat 2D, no text, no logos, no shadow beneath. Exclude: text, letters, numbers, photorealism, 3D render, ANY background, muddy or garish colors, wrinkles, gray hair, canes, walking sticks, glasses, hearing aids, aging signs, ancient robes, tunics, biblical costume, crosses, halos, holiday imagery, realistic faces, branded characters, immodest or revealing clothing.
```

**10. `sticker-people-black-mother.png`**
```
A young adult modern mother with deep warm brown skin and natural textured black hair worn in a soft loose curl or a graceful puff, kneeling with both arms opened wide in welcome and a warm gentle smile, in a modest casual blouse and long skirt or comfy trousers, peach-dominant with coral and sky accents. Flat vector children's storybook sticker illustration, single centered subject on a fully transparent background, soft palette of coral #FF8269 / sky #4ABDE8 / violet #9474EF / golden #F3B840 / peach #FFA56B, soft golden light, bold rounded simple shapes, clean minimal linework, no fine detail, cheerful peaceful mood, reads clearly at 128px, flat 2D, no text, no logos, no shadow beneath. Exclude: text, letters, numbers, photorealism, 3D render, ANY background, muddy or garish colors, wrinkles, gray hair, canes, walking sticks, glasses, hearing aids, aging signs, ancient robes, tunics, biblical costume, crosses, halos, holiday imagery, realistic faces, branded characters, immodest or revealing clothing.
```

**11. `sticker-people-hispanic-mother.png`**
```
A young adult modern mother with warm olive-tan skin and long dark brown wavy hair pulled softly back, standing with hands clasped joyfully near her heart and a warm gentle smile, in a modest casual blouse and long skirt or comfy trousers, peach-dominant with coral and sky accents. Flat vector children's storybook sticker illustration, single centered subject on a fully transparent background, soft palette of coral #FF8269 / sky #4ABDE8 / violet #9474EF / golden #F3B840 / peach #FFA56B, soft golden light, bold rounded simple shapes, clean minimal linework, no fine detail, cheerful peaceful mood, reads clearly at 128px, flat 2D, no text, no logos, no shadow beneath. Exclude: text, letters, numbers, photorealism, 3D render, ANY background, muddy or garish colors, wrinkles, gray hair, canes, walking sticks, glasses, hearing aids, aging signs, ancient robes, tunics, biblical costume, crosses, halos, holiday imagery, realistic faces, branded characters, immodest or revealing clothing.
```

**12. `sticker-people-asian-mother.png`**
```
A young adult modern mother with light warm skin and long straight jet-black hair pulled softly back, walking with a small watering can in one hand and a warm gentle smile, in a modest casual blouse and long skirt or comfy trousers, peach-dominant with coral and sky accents. Flat vector children's storybook sticker illustration, single centered subject on a fully transparent background, soft palette of coral #FF8269 / sky #4ABDE8 / violet #9474EF / golden #F3B840 / peach #FFA56B, soft golden light, bold rounded simple shapes, clean minimal linework, no fine detail, cheerful peaceful mood, reads clearly at 128px, flat 2D, no text, no logos, no shadow beneath. Exclude: text, letters, numbers, photorealism, 3D render, ANY background, muddy or garish colors, wrinkles, gray hair, canes, walking sticks, glasses, hearing aids, aging signs, ancient robes, tunics, biblical costume, crosses, halos, holiday imagery, realistic faces, branded characters, immodest or revealing clothing.
```

**35. `sticker-people-brunette-mother.png`**
```
A young adult modern mother with fair-to-medium skin and long medium-brown wavy hair, standing with one hand gently tucking hair behind her ear and a warm gentle smile, in a modest casual blouse and long skirt or comfy trousers, peach-dominant with coral and sky accents. Flat vector children's storybook sticker illustration, single centered subject on a fully transparent background, soft palette of coral #FF8269 / sky #4ABDE8 / violet #9474EF / golden #F3B840 / peach #FFA56B, soft golden light, bold rounded simple shapes, clean minimal linework, no fine detail, cheerful peaceful mood, reads clearly at 128px, flat 2D, no text, no logos, no shadow beneath. Exclude: text, letters, numbers, photorealism, 3D render, ANY background, muddy or garish colors, wrinkles, gray hair, canes, walking sticks, glasses, hearing aids, aging signs, ancient robes, tunics, biblical costume, crosses, halos, holiday imagery, realistic faces, branded characters, immodest or revealing clothing.
```

### Fathers (5)

**13. `sticker-people-blonde-father.png`**
```
A young adult modern father with fair pale skin and short tidy blonde hair, standing with a friendly wave and a warm gentle smile, in a modest casual polo or button-down shirt with chinos or khakis, sky-dominant with golden and peach accents. Flat vector children's storybook sticker illustration, single centered subject on a fully transparent background, soft palette of coral #FF8269 / sky #4ABDE8 / violet #9474EF / golden #F3B840 / peach #FFA56B, soft golden light, bold rounded simple shapes, clean minimal linework, no fine detail, cheerful peaceful mood, reads clearly at 128px, flat 2D, no text, no logos, no shadow beneath. Exclude: text, letters, numbers, photorealism, 3D render, ANY background, muddy or garish colors, wrinkles, gray hair, canes, walking sticks, glasses, hearing aids, aging signs, ancient robes, tunics, biblical costume, crosses, halos, holiday imagery, realistic faces, branded characters, immodest or revealing clothing.
```

**14. `sticker-people-black-father.png`**
```
A young adult modern father with deep warm brown skin and short natural black hair with a clean lineup (clean-shaven or a small tidy beard), kneeling on one knee as if speaking with a child at eye level, warm gentle smile, in a modest casual polo or button-down shirt with chinos or khakis, sky-dominant with golden and peach accents. Flat vector children's storybook sticker illustration, single centered subject on a fully transparent background, soft palette of coral #FF8269 / sky #4ABDE8 / violet #9474EF / golden #F3B840 / peach #FFA56B, soft golden light, bold rounded simple shapes, clean minimal linework, no fine detail, cheerful peaceful mood, reads clearly at 128px, flat 2D, no text, no logos, no shadow beneath. Exclude: text, letters, numbers, photorealism, 3D render, ANY background, muddy or garish colors, wrinkles, gray hair, canes, walking sticks, glasses, hearing aids, aging signs, ancient robes, tunics, biblical costume, crosses, halos, holiday imagery, realistic faces, branded characters, immodest or revealing clothing.
```

**15. `sticker-people-hispanic-father.png`**
```
A young adult modern father with warm olive-tan skin and short tidy dark brown hair, seated cross-legged on the grass with hands relaxed on his knees and a warm gentle smile, in a modest casual polo or button-down shirt with chinos or khakis, sky-dominant with golden and peach accents. Flat vector children's storybook sticker illustration, single centered subject on a fully transparent background, soft palette of coral #FF8269 / sky #4ABDE8 / violet #9474EF / golden #F3B840 / peach #FFA56B, soft golden light, bold rounded simple shapes, clean minimal linework, no fine detail, cheerful peaceful mood, reads clearly at 128px, flat 2D, no text, no logos, no shadow beneath. Exclude: text, letters, numbers, photorealism, 3D render, ANY background, muddy or garish colors, wrinkles, gray hair, canes, walking sticks, glasses, hearing aids, aging signs, ancient robes, tunics, biblical costume, crosses, halos, holiday imagery, realistic faces, branded characters, immodest or revealing clothing.
```

**16. `sticker-people-asian-father.png`**
```
A young adult modern father with light warm skin and short tidy straight jet-black hair, walking with an armful of ripe golden wheat and a warm gentle smile, in a modest casual polo or button-down shirt with chinos or khakis, sky-dominant with golden and peach accents. Flat vector children's storybook sticker illustration, single centered subject on a fully transparent background, soft palette of coral #FF8269 / sky #4ABDE8 / violet #9474EF / golden #F3B840 / peach #FFA56B, soft golden light, bold rounded simple shapes, clean minimal linework, no fine detail, cheerful peaceful mood, reads clearly at 128px, flat 2D, no text, no logos, no shadow beneath. Exclude: text, letters, numbers, photorealism, 3D render, ANY background, muddy or garish colors, wrinkles, gray hair, canes, walking sticks, glasses, hearing aids, aging signs, ancient robes, tunics, biblical costume, crosses, halos, holiday imagery, realistic faces, branded characters, immodest or revealing clothing.
```

**36. `sticker-people-brunette-father.png`**
```
A young adult modern father with fair-to-medium skin and short tidy medium-brown hair, leaning forward slightly with hands relaxed on his knees and a warm gentle smile as if watching a child play, in a modest casual polo or button-down shirt with chinos or khakis, sky-dominant with golden and peach accents. Flat vector children's storybook sticker illustration, single centered subject on a fully transparent background, soft palette of coral #FF8269 / sky #4ABDE8 / violet #9474EF / golden #F3B840 / peach #FFA56B, soft golden light, bold rounded simple shapes, clean minimal linework, no fine detail, cheerful peaceful mood, reads clearly at 128px, flat 2D, no text, no logos, no shadow beneath. Exclude: text, letters, numbers, photorealism, 3D render, ANY background, muddy or garish colors, wrinkles, gray hair, canes, walking sticks, glasses, hearing aids, aging signs, ancient robes, tunics, biblical costume, crosses, halos, holiday imagery, realistic faces, branded characters, immodest or revealing clothing.
```

### Teen Girls (5)

**17. `sticker-people-blonde-teen-girl.png`**
```
A slim modern teen girl with fair pale skin and long blonde hair in a loose ponytail or braid, seated cross-legged on the grass reading an open book with hair falling softly forward, curious cheerful expression, in a modest tee under a cozy cardigan or hoodie with jeans or a long skirt, violet-dominant with coral and sky accents. Flat vector children's storybook sticker illustration, single centered subject on a fully transparent background, soft palette of coral #FF8269 / sky #4ABDE8 / violet #9474EF / golden #F3B840 / peach #FFA56B, soft golden light, bold rounded simple shapes, clean minimal linework, no fine detail, cheerful peaceful mood, reads clearly at 128px, flat 2D, no text, no logos, no shadow beneath. Exclude: text, letters, numbers, photorealism, 3D render, ANY background, muddy or garish colors, wrinkles, gray hair, canes, walking sticks, glasses, hearing aids, aging signs, ancient robes, tunics, biblical costume, crosses, halos, holiday imagery, realistic faces, branded characters, immodest or revealing clothing.
```

**18. `sticker-people-black-teen-girl.png`**
```
A slim modern teen girl with deep warm brown skin and natural textured hair in long box braids or a graceful twist-out, walking gracefully with a small basket of wildflowers, curious cheerful expression, in a modest tee under a cozy cardigan or hoodie with jeans or a long skirt, violet-dominant with coral and sky accents. Flat vector children's storybook sticker illustration, single centered subject on a fully transparent background, soft palette of coral #FF8269 / sky #4ABDE8 / violet #9474EF / golden #F3B840 / peach #FFA56B, soft golden light, bold rounded simple shapes, clean minimal linework, no fine detail, cheerful peaceful mood, reads clearly at 128px, flat 2D, no text, no logos, no shadow beneath. Exclude: text, letters, numbers, photorealism, 3D render, ANY background, muddy or garish colors, wrinkles, gray hair, canes, walking sticks, glasses, hearing aids, aging signs, ancient robes, tunics, biblical costume, crosses, halos, holiday imagery, realistic faces, branded characters, immodest or revealing clothing.
```

**19. `sticker-people-hispanic-teen-girl.png`**
```
A slim modern teen girl with warm olive-tan skin and long dark brown wavy hair in a high ponytail, kneeling to gently pet a small rabbit, curious cheerful expression, in a modest tee under a cozy cardigan or hoodie with jeans or a long skirt, violet-dominant with coral and sky accents. Flat vector children's storybook sticker illustration, single centered subject on a fully transparent background, soft palette of coral #FF8269 / sky #4ABDE8 / violet #9474EF / golden #F3B840 / peach #FFA56B, soft golden light, bold rounded simple shapes, clean minimal linework, no fine detail, cheerful peaceful mood, reads clearly at 128px, flat 2D, no text, no logos, no shadow beneath. Exclude: text, letters, numbers, photorealism, 3D render, ANY background, muddy or garish colors, wrinkles, gray hair, canes, walking sticks, glasses, hearing aids, aging signs, ancient robes, tunics, biblical costume, crosses, halos, holiday imagery, realistic faces, branded characters, immodest or revealing clothing.
```

**20. `sticker-people-asian-teen-girl.png`**
```
A slim modern teen girl with light warm skin and long straight jet-black hair in a loose ponytail or half-up half-down style, standing with one hand on her hip and the other pointing up toward something in the sky, curious cheerful expression, in a modest tee under a cozy cardigan or hoodie with jeans or a long skirt, violet-dominant with coral and sky accents. Flat vector children's storybook sticker illustration, single centered subject on a fully transparent background, soft palette of coral #FF8269 / sky #4ABDE8 / violet #9474EF / golden #F3B840 / peach #FFA56B, soft golden light, bold rounded simple shapes, clean minimal linework, no fine detail, cheerful peaceful mood, reads clearly at 128px, flat 2D, no text, no logos, no shadow beneath. Exclude: text, letters, numbers, photorealism, 3D render, ANY background, muddy or garish colors, wrinkles, gray hair, canes, walking sticks, glasses, hearing aids, aging signs, ancient robes, tunics, biblical costume, crosses, halos, holiday imagery, realistic faces, branded characters, immodest or revealing clothing.
```

**37. `sticker-people-brunette-teen-girl.png`**
```
A slim modern teen girl with fair-to-medium skin and long medium-brown wavy hair in a half-up bun, sitting on the grass hugging her knees while looking up thoughtfully with a curious cheerful smile, in a modest tee under a cozy cardigan or hoodie with jeans or a long skirt, violet-dominant with coral and sky accents. Flat vector children's storybook sticker illustration, single centered subject on a fully transparent background, soft palette of coral #FF8269 / sky #4ABDE8 / violet #9474EF / golden #F3B840 / peach #FFA56B, soft golden light, bold rounded simple shapes, clean minimal linework, no fine detail, cheerful peaceful mood, reads clearly at 128px, flat 2D, no text, no logos, no shadow beneath. Exclude: text, letters, numbers, photorealism, 3D render, ANY background, muddy or garish colors, wrinkles, gray hair, canes, walking sticks, glasses, hearing aids, aging signs, ancient robes, tunics, biblical costume, crosses, halos, holiday imagery, realistic faces, branded characters, immodest or revealing clothing.
```

### Teen Boys (5)

**21. `sticker-people-blonde-teen-boy.png`**
```
A slim modern teen boy with fair pale skin and short tidy blonde hair, seated cross-legged on the grass with an open book on his lap, curious cheerful expression, in a modest tee under a cozy zip-up hoodie or flannel with jeans, golden-dominant with sky and coral accents. Flat vector children's storybook sticker illustration, single centered subject on a fully transparent background, soft palette of coral #FF8269 / sky #4ABDE8 / violet #9474EF / golden #F3B840 / peach #FFA56B, soft golden light, bold rounded simple shapes, clean minimal linework, no fine detail, cheerful peaceful mood, reads clearly at 128px, flat 2D, no text, no logos, no shadow beneath. Exclude: text, letters, numbers, photorealism, 3D render, ANY background, muddy or garish colors, wrinkles, gray hair, canes, walking sticks, glasses, hearing aids, aging signs, ancient robes, tunics, biblical costume, crosses, halos, holiday imagery, realistic faces, branded characters, immodest or revealing clothing.
```

**22. `sticker-people-black-teen-boy.png`**
```
A slim modern teen boy with deep warm brown skin and short natural black hair with a clean lineup, walking briskly with a small satchel over one shoulder, curious cheerful expression, in a modest tee under a cozy zip-up hoodie or flannel with jeans, golden-dominant with sky and coral accents. Flat vector children's storybook sticker illustration, single centered subject on a fully transparent background, soft palette of coral #FF8269 / sky #4ABDE8 / violet #9474EF / golden #F3B840 / peach #FFA56B, soft golden light, bold rounded simple shapes, clean minimal linework, no fine detail, cheerful peaceful mood, reads clearly at 128px, flat 2D, no text, no logos, no shadow beneath. Exclude: text, letters, numbers, photorealism, 3D render, ANY background, muddy or garish colors, wrinkles, gray hair, canes, walking sticks, glasses, hearing aids, aging signs, ancient robes, tunics, biblical costume, crosses, halos, holiday imagery, realistic faces, branded characters, immodest or revealing clothing.
```

**23. `sticker-people-hispanic-teen-boy.png`**
```
A slim modern teen boy with warm olive-tan skin and short tidy dark brown hair, kneeling to pick a ripe piece of fruit from a low plant, curious cheerful expression, in a modest tee under a cozy zip-up hoodie or flannel with jeans, golden-dominant with sky and coral accents. Flat vector children's storybook sticker illustration, single centered subject on a fully transparent background, soft palette of coral #FF8269 / sky #4ABDE8 / violet #9474EF / golden #F3B840 / peach #FFA56B, soft golden light, bold rounded simple shapes, clean minimal linework, no fine detail, cheerful peaceful mood, reads clearly at 128px, flat 2D, no text, no logos, no shadow beneath. Exclude: text, letters, numbers, photorealism, 3D render, ANY background, muddy or garish colors, wrinkles, gray hair, canes, walking sticks, glasses, hearing aids, aging signs, ancient robes, tunics, biblical costume, crosses, halos, holiday imagery, realistic faces, branded characters, immodest or revealing clothing.
```

**24. `sticker-people-asian-teen-boy.png`**
```
A slim modern teen boy with light warm skin and short tidy straight jet-black hair, standing with both hands raised in a playful cheer, curious cheerful expression, in a modest tee under a cozy zip-up hoodie or flannel with jeans, golden-dominant with sky and coral accents. Flat vector children's storybook sticker illustration, single centered subject on a fully transparent background, soft palette of coral #FF8269 / sky #4ABDE8 / violet #9474EF / golden #F3B840 / peach #FFA56B, soft golden light, bold rounded simple shapes, clean minimal linework, no fine detail, cheerful peaceful mood, reads clearly at 128px, flat 2D, no text, no logos, no shadow beneath. Exclude: text, letters, numbers, photorealism, 3D render, ANY background, muddy or garish colors, wrinkles, gray hair, canes, walking sticks, glasses, hearing aids, aging signs, ancient robes, tunics, biblical costume, crosses, halos, holiday imagery, realistic faces, branded characters, immodest or revealing clothing.
```

**38. `sticker-people-brunette-teen-boy.png`**
```
A slim modern teen boy with fair-to-medium skin and tousled medium-brown hair, standing tossing a piece of fruit up in the air and catching it with a curious cheerful expression, in a modest tee under a cozy zip-up hoodie or flannel with jeans, golden-dominant with sky and coral accents. Flat vector children's storybook sticker illustration, single centered subject on a fully transparent background, soft palette of coral #FF8269 / sky #4ABDE8 / violet #9474EF / golden #F3B840 / peach #FFA56B, soft golden light, bold rounded simple shapes, clean minimal linework, no fine detail, cheerful peaceful mood, reads clearly at 128px, flat 2D, no text, no logos, no shadow beneath. Exclude: text, letters, numbers, photorealism, 3D render, ANY background, muddy or garish colors, wrinkles, gray hair, canes, walking sticks, glasses, hearing aids, aging signs, ancient robes, tunics, biblical costume, crosses, halos, holiday imagery, realistic faces, branded characters, immodest or revealing clothing.
```

### Child Girls (5)

**25. `sticker-people-blonde-child-girl.png`**
```
A joyful young child girl with fair pale skin and blonde hair in two little pigtails with rounder proportions, in a joyful mid-skip pose with pigtails bouncing in the air, in a modest brightly colored short-sleeve tee and leggings or a simple play dress, coral-dominant with peach and golden accents. Flat vector children's storybook sticker illustration, single centered subject on a fully transparent background, soft palette of coral #FF8269 / sky #4ABDE8 / violet #9474EF / golden #F3B840 / peach #FFA56B, soft golden light, bold rounded simple shapes, clean minimal linework, no fine detail, cheerful peaceful mood, reads clearly at 128px, flat 2D, no text, no logos, no shadow beneath. Exclude: text, letters, numbers, photorealism, 3D render, ANY background, muddy or garish colors, wrinkles, gray hair, canes, walking sticks, glasses, hearing aids, aging signs, ancient robes, tunics, biblical costume, crosses, halos, holiday imagery, realistic faces, branded characters, immodest or revealing clothing.
```

**26. `sticker-people-black-child-girl.png`**
```
A joyful young child girl with deep warm brown skin and natural black hair in two adorable afro puffs or braided pigtails with small beads with rounder proportions, seated on the grass playing happily with a small flower in her hands, in a modest brightly colored short-sleeve tee and leggings or a simple play dress, coral-dominant with peach and golden accents. Flat vector children's storybook sticker illustration, single centered subject on a fully transparent background, soft palette of coral #FF8269 / sky #4ABDE8 / violet #9474EF / golden #F3B840 / peach #FFA56B, soft golden light, bold rounded simple shapes, clean minimal linework, no fine detail, cheerful peaceful mood, reads clearly at 128px, flat 2D, no text, no logos, no shadow beneath. Exclude: text, letters, numbers, photorealism, 3D render, ANY background, muddy or garish colors, wrinkles, gray hair, canes, walking sticks, glasses, hearing aids, aging signs, ancient robes, tunics, biblical costume, crosses, halos, holiday imagery, realistic faces, branded characters, immodest or revealing clothing.
```

**27. `sticker-people-hispanic-child-girl.png`**
```
A joyful young child girl with warm olive-tan skin and dark brown hair in two braided pigtails with colorful ribbons and rounder proportions, kneeling with wonder-eyed delight to look at a butterfly perched on her outstretched finger, in a modest brightly colored short-sleeve tee and leggings or a simple play dress, coral-dominant with peach and golden accents. Flat vector children's storybook sticker illustration, single centered subject on a fully transparent background, soft palette of coral #FF8269 / sky #4ABDE8 / violet #9474EF / golden #F3B840 / peach #FFA56B, soft golden light, bold rounded simple shapes, clean minimal linework, no fine detail, cheerful peaceful mood, reads clearly at 128px, flat 2D, no text, no logos, no shadow beneath. Exclude: text, letters, numbers, photorealism, 3D render, ANY background, muddy or garish colors, wrinkles, gray hair, canes, walking sticks, glasses, hearing aids, aging signs, ancient robes, tunics, biblical costume, crosses, halos, holiday imagery, realistic faces, branded characters, immodest or revealing clothing.
```

**28. `sticker-people-asian-child-girl.png`**
```
A joyful young child girl with light warm skin and straight jet-black hair in a cute short bob or two little pigtails with rounder proportions, twirling in a soft spin with arms extended and a joyful laugh, in a modest brightly colored short-sleeve tee and leggings or a simple play dress, coral-dominant with peach and golden accents. Flat vector children's storybook sticker illustration, single centered subject on a fully transparent background, soft palette of coral #FF8269 / sky #4ABDE8 / violet #9474EF / golden #F3B840 / peach #FFA56B, soft golden light, bold rounded simple shapes, clean minimal linework, no fine detail, cheerful peaceful mood, reads clearly at 128px, flat 2D, no text, no logos, no shadow beneath. Exclude: text, letters, numbers, photorealism, 3D render, ANY background, muddy or garish colors, wrinkles, gray hair, canes, walking sticks, glasses, hearing aids, aging signs, ancient robes, tunics, biblical costume, crosses, halos, holiday imagery, realistic faces, branded characters, immodest or revealing clothing.
```

**39. `sticker-people-brunette-child-girl.png`**
```
A joyful young child girl with fair-to-medium skin and medium-brown hair in a single french braid down her back with rounder proportions, holding a small hand-picked bouquet of wildflowers up to her nose to smell it with a joyful smile, in a modest brightly colored short-sleeve tee and leggings or a simple play dress, coral-dominant with peach and golden accents. Flat vector children's storybook sticker illustration, single centered subject on a fully transparent background, soft palette of coral #FF8269 / sky #4ABDE8 / violet #9474EF / golden #F3B840 / peach #FFA56B, soft golden light, bold rounded simple shapes, clean minimal linework, no fine detail, cheerful peaceful mood, reads clearly at 128px, flat 2D, no text, no logos, no shadow beneath. Exclude: text, letters, numbers, photorealism, 3D render, ANY background, muddy or garish colors, wrinkles, gray hair, canes, walking sticks, glasses, hearing aids, aging signs, ancient robes, tunics, biblical costume, crosses, halos, holiday imagery, realistic faces, branded characters, immodest or revealing clothing.
```

### Child Boys (5)

**29. `sticker-people-blonde-child-boy.png`**
```
A joyful young child boy with fair pale skin and short blonde hair with rounder proportions, in a joyful mid-skip pose with arms swinging happily, in a modest brightly colored short-sleeve tee and shorts-length trousers, sky-dominant with golden and coral accents. Flat vector children's storybook sticker illustration, single centered subject on a fully transparent background, soft palette of coral #FF8269 / sky #4ABDE8 / violet #9474EF / golden #F3B840 / peach #FFA56B, soft golden light, bold rounded simple shapes, clean minimal linework, no fine detail, cheerful peaceful mood, reads clearly at 128px, flat 2D, no text, no logos, no shadow beneath. Exclude: text, letters, numbers, photorealism, 3D render, ANY background, muddy or garish colors, wrinkles, gray hair, canes, walking sticks, glasses, hearing aids, aging signs, ancient robes, tunics, biblical costume, crosses, halos, holiday imagery, realistic faces, branded characters, immodest or revealing clothing.
```

**30. `sticker-people-black-child-boy.png`**
```
A joyful young child boy with deep warm brown skin and short natural black hair with a tidy shape-up with rounder proportions, seated cross-legged on the grass happily eating a piece of ripe fruit, in a modest brightly colored short-sleeve tee and shorts-length trousers, sky-dominant with golden and coral accents. Flat vector children's storybook sticker illustration, single centered subject on a fully transparent background, soft palette of coral #FF8269 / sky #4ABDE8 / violet #9474EF / golden #F3B840 / peach #FFA56B, soft golden light, bold rounded simple shapes, clean minimal linework, no fine detail, cheerful peaceful mood, reads clearly at 128px, flat 2D, no text, no logos, no shadow beneath. Exclude: text, letters, numbers, photorealism, 3D render, ANY background, muddy or garish colors, wrinkles, gray hair, canes, walking sticks, glasses, hearing aids, aging signs, ancient robes, tunics, biblical costume, crosses, halos, holiday imagery, realistic faces, branded characters, immodest or revealing clothing.
```

**31. `sticker-people-hispanic-child-boy.png`**
```
A joyful young child boy with warm olive-tan skin and short tidy dark brown hair with rounder proportions, kneeling with wonder-eyed delight to look at a small ladybug on a leaf, in a modest brightly colored short-sleeve tee and shorts-length trousers, sky-dominant with golden and coral accents. Flat vector children's storybook sticker illustration, single centered subject on a fully transparent background, soft palette of coral #FF8269 / sky #4ABDE8 / violet #9474EF / golden #F3B840 / peach #FFA56B, soft golden light, bold rounded simple shapes, clean minimal linework, no fine detail, cheerful peaceful mood, reads clearly at 128px, flat 2D, no text, no logos, no shadow beneath. Exclude: text, letters, numbers, photorealism, 3D render, ANY background, muddy or garish colors, wrinkles, gray hair, canes, walking sticks, glasses, hearing aids, aging signs, ancient robes, tunics, biblical costume, crosses, halos, holiday imagery, realistic faces, branded characters, immodest or revealing clothing.
```

**32. `sticker-people-asian-child-boy.png`**
```
A joyful young child boy with light warm skin and short tidy straight jet-black hair with rounder proportions, jumping with both feet off the ground and arms raised in joyful celebration, in a modest brightly colored short-sleeve tee and shorts-length trousers, sky-dominant with golden and coral accents. Flat vector children's storybook sticker illustration, single centered subject on a fully transparent background, soft palette of coral #FF8269 / sky #4ABDE8 / violet #9474EF / golden #F3B840 / peach #FFA56B, soft golden light, bold rounded simple shapes, clean minimal linework, no fine detail, cheerful peaceful mood, reads clearly at 128px, flat 2D, no text, no logos, no shadow beneath. Exclude: text, letters, numbers, photorealism, 3D render, ANY background, muddy or garish colors, wrinkles, gray hair, canes, walking sticks, glasses, hearing aids, aging signs, ancient robes, tunics, biblical costume, crosses, halos, holiday imagery, realistic faces, branded characters, immodest or revealing clothing.
```

---

**40. `sticker-people-brunette-child-boy.png`**
```
A joyful young child boy with fair-to-medium skin and short tousled medium-brown hair with rounder proportions, running with both arms outstretched like an airplane in a joyful energetic pose, in a modest brightly colored short-sleeve tee and shorts-length trousers, sky-dominant with golden and coral accents. Flat vector children's storybook sticker illustration, single centered subject on a fully transparent background, soft palette of coral #FF8269 / sky #4ABDE8 / violet #9474EF / golden #F3B840 / peach #FFA56B, soft golden light, bold rounded simple shapes, clean minimal linework, no fine detail, cheerful peaceful mood, reads clearly at 128px, flat 2D, no text, no logos, no shadow beneath. Exclude: text, letters, numbers, photorealism, 3D render, ANY background, muddy or garish colors, wrinkles, gray hair, canes, walking sticks, glasses, hearing aids, aging signs, ancient robes, tunics, biblical costume, crosses, halos, holiday imagery, realistic faces, branded characters, immodest or revealing clothing.
```

---

## ANIMALS — ISAIAH 11 PAIRS (5)

### 9. `sticker-animals-lion-lamb.png`
```
A gentle friendly lion resting peacefully beside a small lamb curled against its side, both content and calm, golden-dominant with cream and peach accents. Flat vector children's storybook sticker illustration, single centered subject on a fully transparent background, soft palette of coral #FF8269 / sky #4ABDE8 / violet #9474EF / golden #F3B840 / peach #FFA56B, soft golden light, bold rounded simple shapes, clean minimal linework, no fine detail, cheerful peaceful mood, reads clearly at 128px, flat 2D, no text, no logos, no shadow beneath. Exclude: text, letters, numbers, photorealism, 3D render, ANY background, muddy or garish colors, teeth showing, aggressive posture, blood, hunting, crosses, halos, holiday imagery, realistic faces, branded characters.
```

### 10. `sticker-animals-wolf-kid.png`
```
A gentle wolf lying peacefully beside a small young goat kid, both content and calm side by side, violet-dominant with cream and sky accents. Flat vector children's storybook sticker illustration, single centered subject on a fully transparent background, soft palette of coral #FF8269 / sky #4ABDE8 / violet #9474EF / golden #F3B840 / peach #FFA56B, soft golden light, bold rounded simple shapes, clean minimal linework, no fine detail, cheerful peaceful mood, reads clearly at 128px, flat 2D, no text, no logos, no shadow beneath. Exclude: text, letters, numbers, photorealism, 3D render, ANY background, muddy or garish colors, teeth showing, aggressive posture, blood, hunting, crosses, halos, holiday imagery, realistic faces, branded characters.
```

### 11. `sticker-animals-leopard-calf.png`
```
A gentle spotted leopard lying beside a young calf, both peaceful and content nose to nose, peach-dominant with golden and sky accents. Flat vector children's storybook sticker illustration, single centered subject on a fully transparent background, soft palette of coral #FF8269 / sky #4ABDE8 / violet #9474EF / golden #F3B840 / peach #FFA56B, soft golden light, bold rounded simple shapes, clean minimal linework, no fine detail, cheerful peaceful mood, reads clearly at 128px, flat 2D, no text, no logos, no shadow beneath. Exclude: text, letters, numbers, photorealism, 3D render, ANY background, muddy or garish colors, teeth showing, aggressive posture, blood, hunting, crosses, halos, holiday imagery, realistic faces, branded characters.
```

### 12. `sticker-animals-bear-cow.png`
```
A friendly brown bear standing peacefully beside a gentle cow, both grazing calmly together, coral-dominant with golden and cream accents. Flat vector children's storybook sticker illustration, single centered subject on a fully transparent background, soft palette of coral #FF8269 / sky #4ABDE8 / violet #9474EF / golden #F3B840 / peach #FFA56B, soft golden light, bold rounded simple shapes, clean minimal linework, no fine detail, cheerful peaceful mood, reads clearly at 128px, flat 2D, no text, no logos, no shadow beneath. Exclude: text, letters, numbers, photorealism, 3D render, ANY background, muddy or garish colors, teeth showing, aggressive posture, blood, hunting, crosses, halos, holiday imagery, realistic faces, branded characters.
```

### 13. `sticker-animals-child-cobra.png`
```
A joyful young child kneeling and gently reaching toward a small coiled cobra beside a hole in the ground, the cobra calm and non-threatening with a soft smile, sky-dominant with golden and coral accents. Flat vector children's storybook sticker illustration, single centered subject on a fully transparent background, soft palette of coral #FF8269 / sky #4ABDE8 / violet #9474EF / golden #F3B840 / peach #FFA56B, soft golden light, bold rounded simple shapes, clean minimal linework, no fine detail, cheerful peaceful mood, reads clearly at 128px, flat 2D, no text, no logos, no shadow beneath. Exclude: text, letters, numbers, photorealism, 3D render, ANY background, muddy or garish colors, fangs, striking pose, aggression, fear on the child's face, crosses, halos, holiday imagery, realistic faces, branded characters, immodest or revealing clothing.
```

---

## ANIMALS — SOLO (13)

### 14. `sticker-animals-dove.png`
```
A gentle white dove in flight with wings softly spread, sky-dominant with cream and peach accents. Flat vector children's storybook sticker illustration, single centered subject on a fully transparent background, soft palette of coral #FF8269 / sky #4ABDE8 / violet #9474EF / golden #F3B840 / peach #FFA56B, soft golden light, bold rounded simple shapes, clean minimal linework, no fine detail, cheerful peaceful mood, reads clearly at 128px, flat 2D, no text, no logos, no shadow beneath. Exclude: text, letters, numbers, photorealism, 3D render, ANY background, muddy or garish colors, crosses, halos, holiday imagery, realistic faces, branded characters.
```

### 15. `sticker-animals-horse.png`
```
A gentle friendly horse standing calmly in profile with a soft mane and a kind expression, golden-dominant with peach and cream accents. Flat vector children's storybook sticker illustration, single centered subject on a fully transparent background, soft palette of coral #FF8269 / sky #4ABDE8 / violet #9474EF / golden #F3B840 / peach #FFA56B, soft golden light, bold rounded simple shapes, clean minimal linework, no fine detail, cheerful peaceful mood, reads clearly at 128px, flat 2D, no text, no logos, no shadow beneath. Exclude: text, letters, numbers, photorealism, 3D render, ANY background, muddy or garish colors, saddle, bridle, reins, harness, crosses, halos, holiday imagery, realistic faces, branded characters.
```

### 16. `sticker-animals-giraffe.png`
```
A cheerful giraffe standing tall with a long graceful neck and a soft friendly face, golden-dominant with peach and coral accents. Flat vector children's storybook sticker illustration, single centered subject on a fully transparent background, soft palette of coral #FF8269 / sky #4ABDE8 / violet #9474EF / golden #F3B840 / peach #FFA56B, soft golden light, bold rounded simple shapes, clean minimal linework, no fine detail, cheerful peaceful mood, reads clearly at 128px, flat 2D, no text, no logos, no shadow beneath. Exclude: text, letters, numbers, photorealism, 3D render, ANY background, muddy or garish colors, crosses, halos, holiday imagery, realistic faces, branded characters.
```

### 17. `sticker-animals-deer.png`
```
A gentle young deer standing in profile with soft ears turned forward and a peaceful expression, peach-dominant with golden and cream accents. Flat vector children's storybook sticker illustration, single centered subject on a fully transparent background, soft palette of coral #FF8269 / sky #4ABDE8 / violet #9474EF / golden #F3B840 / peach #FFA56B, soft golden light, bold rounded simple shapes, clean minimal linework, no fine detail, cheerful peaceful mood, reads clearly at 128px, flat 2D, no text, no logos, no shadow beneath. Exclude: text, letters, numbers, photorealism, 3D render, ANY background, muddy or garish colors, antlers with sharp points, crosses, halos, holiday imagery, realistic faces, branded characters.
```

### 18. `sticker-animals-rabbit.png`
```
A soft cheerful rabbit sitting upright with tall ears and a small twitchy nose, cream-dominant with peach and coral accents. Flat vector children's storybook sticker illustration, single centered subject on a fully transparent background, soft palette of coral #FF8269 / sky #4ABDE8 / violet #9474EF / golden #F3B840 / peach #FFA56B, soft golden light, bold rounded simple shapes, clean minimal linework, no fine detail, cheerful peaceful mood, reads clearly at 128px, flat 2D, no text, no logos, no shadow beneath. Exclude: text, letters, numbers, photorealism, 3D render, ANY background, muddy or garish colors, crosses, halos, holiday imagery, realistic faces, branded characters.
```

### 19. `sticker-animals-butterfly.png`
```
A large cheerful butterfly with softly patterned wings spread open, violet-dominant with coral and golden accents. Flat vector children's storybook sticker illustration, single centered subject on a fully transparent background, soft palette of coral #FF8269 / sky #4ABDE8 / violet #9474EF / golden #F3B840 / peach #FFA56B, soft golden light, bold rounded simple shapes, clean minimal linework, no fine detail, cheerful peaceful mood, reads clearly at 128px, flat 2D, no text, no logos, no shadow beneath. Exclude: text, letters, numbers, photorealism, 3D render, ANY background, muddy or garish colors, crosses, halos, holiday imagery, realistic faces, branded characters.
```

### 20. `sticker-animals-songbird.png`
```
A cheerful small songbird perched with head tilted as if singing, mouth softly open, coral-dominant with sky and golden accents. Flat vector children's storybook sticker illustration, single centered subject on a fully transparent background, soft palette of coral #FF8269 / sky #4ABDE8 / violet #9474EF / golden #F3B840 / peach #FFA56B, soft golden light, bold rounded simple shapes, clean minimal linework, no fine detail, cheerful peaceful mood, reads clearly at 128px, flat 2D, no text, no logos, no shadow beneath. Exclude: text, letters, numbers, photorealism, 3D render, ANY background, muddy or garish colors, crosses, halos, holiday imagery, realistic faces, branded characters.
```

### 21. `sticker-animals-fish.png`
```
A cheerful freshwater fish mid-leap with a small splash arc beneath, sky-dominant with cream and coral accents. Flat vector children's storybook sticker illustration, single centered subject on a fully transparent background, soft palette of coral #FF8269 / sky #4ABDE8 / violet #9474EF / golden #F3B840 / peach #FFA56B, soft golden light, bold rounded simple shapes, clean minimal linework, no fine detail, cheerful peaceful mood, reads clearly at 128px, flat 2D, no text, no logos, no shadow beneath. Exclude: text, letters, numbers, photorealism, 3D render, ANY background, muddy or garish colors, fishing hook, fishing line, crosses, halos, holiday imagery, realistic faces, branded characters.
```

### 41. `sticker-animals-giraffe-classic.png`
```
An elegant giraffe standing in profile with a long graceful neck, small horns, patterned coat rendered in soft warm tones, natural proportions with subtle detail, golden-dominant with peach and cream accents. Flat vector children's storybook sticker illustration, single centered subject on a fully transparent background, soft palette of coral #FF8269 / sky #4ABDE8 / violet #9474EF / golden #F3B840 / peach #FFA56B / cream #FAF8F6, soft golden light, refined rounded shapes with a touch more detail than a young-child sticker, clean minimal linework, calm serene mood, reads clearly at 128px, flat 2D, no text, no logos, no shadow beneath. Exclude: text, letters, numbers, photorealism, 3D render, ANY background, muddy or garish colors, cartoonish smile, huge eyes, exaggerated childlike proportions, crosses, halos, holiday imagery, realistic photographic faces, branded characters.
```

### 42. `sticker-animals-rabbit-classic.png`
```
A poised rabbit sitting alertly upright with tall ears in profile view, subtle fur texture rendered in bold shapes, warm gentle expression without an exaggerated smile, cream-dominant with peach and golden accents. Flat vector children's storybook sticker illustration, single centered subject on a fully transparent background, soft palette of coral #FF8269 / sky #4ABDE8 / violet #9474EF / golden #F3B840 / peach #FFA56B / cream #FAF8F6, soft golden light, refined rounded shapes with a touch more detail than a young-child sticker, clean minimal linework, calm serene mood, reads clearly at 128px, flat 2D, no text, no logos, no shadow beneath. Exclude: text, letters, numbers, photorealism, 3D render, ANY background, muddy or garish colors, cartoonish smile, huge eyes, exaggerated childlike proportions, crosses, halos, holiday imagery, realistic photographic faces, branded characters.
```

### 43. `sticker-animals-butterfly-classic.png`
```
A refined butterfly with softly patterned wings shown from above, symmetrical intricate wing markings suggested with simple shapes, natural proportions, violet-dominant with coral and golden accents. Flat vector children's storybook sticker illustration, single centered subject on a fully transparent background, soft palette of coral #FF8269 / sky #4ABDE8 / violet #9474EF / golden #F3B840 / peach #FFA56B / cream #FAF8F6, soft golden light, refined rounded shapes with a touch more detail than a young-child sticker, clean minimal linework, calm serene mood, reads clearly at 128px, flat 2D, no text, no logos, no shadow beneath. Exclude: text, letters, numbers, photorealism, 3D render, ANY background, muddy or garish colors, cartoonish face on wings, huge eyes, sparkles, glitter, crosses, halos, holiday imagery, realistic photographic detail, branded characters.
```

### 44. `sticker-animals-songbird-classic.png`
```
A small songbird perched in profile with head slightly tilted as if listening, soft feathered form rendered in bold shapes, natural bird proportions, coral-dominant with sky and golden accents. Flat vector children's storybook sticker illustration, single centered subject on a fully transparent background, soft palette of coral #FF8269 / sky #4ABDE8 / violet #9474EF / golden #F3B840 / peach #FFA56B / cream #FAF8F6, soft golden light, refined rounded shapes with a touch more detail than a young-child sticker, clean minimal linework, calm serene mood, reads clearly at 128px, flat 2D, no text, no logos, no shadow beneath. Exclude: text, letters, numbers, photorealism, 3D render, ANY background, muddy or garish colors, cartoonish smile, huge eyes, exaggerated childlike proportions, crosses, halos, holiday imagery, realistic photographic faces, branded characters.
```

### 45. `sticker-animals-fish-classic.png`
```
A freshwater fish mid-leap in a graceful curved arc with a small splash of ripples beneath, natural fish proportions with subtle scale suggestion, sky-dominant with cream and coral accents. Flat vector children's storybook sticker illustration, single centered subject on a fully transparent background, soft palette of coral #FF8269 / sky #4ABDE8 / violet #9474EF / golden #F3B840 / peach #FFA56B / cream #FAF8F6, soft golden light, refined rounded shapes with a touch more detail than a young-child sticker, clean minimal linework, calm serene mood, reads clearly at 128px, flat 2D, no text, no logos, no shadow beneath. Exclude: text, letters, numbers, photorealism, 3D render, ANY background, muddy or garish colors, cartoonish smile, huge eyes, fishing hook, fishing line, crosses, halos, holiday imagery, realistic photographic detail, branded characters.
```

---

## PLANTS & FRUIT (11)

### 22. `sticker-plants-fruit-tree.png`
```
A cheerful round fruit tree with a sturdy trunk and a full leafy canopy dotted with ripe red and golden fruit, coral-dominant with golden and sky accents. Flat vector children's storybook sticker illustration, single centered subject on a fully transparent background, soft palette of coral #FF8269 / sky #4ABDE8 / violet #9474EF / golden #F3B840 / peach #FFA56B, soft golden light, bold rounded simple shapes, clean minimal linework, no fine detail, cheerful peaceful mood, reads clearly at 128px, flat 2D, no text, no logos, no shadow beneath. Exclude: text, letters, numbers, photorealism, 3D render, ANY background, muddy or garish colors, crosses, halos, holiday imagery, realistic faces, branded characters.
```

### 23. `sticker-plants-grape-vine.png`
```
A curling grape vine with a heavy cluster of purple grapes and two broad green leaves, violet-dominant with golden and coral accents. Flat vector children's storybook sticker illustration, single centered subject on a fully transparent background, soft palette of coral #FF8269 / sky #4ABDE8 / violet #9474EF / golden #F3B840 / peach #FFA56B, soft golden light, bold rounded simple shapes, clean minimal linework, no fine detail, cheerful peaceful mood, reads clearly at 128px, flat 2D, no text, no logos, no shadow beneath. Exclude: text, letters, numbers, photorealism, 3D render, ANY background, muddy or garish colors, crosses, halos, holiday imagery, realistic faces, branded characters.
```

### 24. `sticker-plants-wheat-sheaf.png`
```
A tied sheaf of ripe golden wheat stalks standing upright with soft grain heads, golden-dominant with peach and coral accents. Flat vector children's storybook sticker illustration, single centered subject on a fully transparent background, soft palette of coral #FF8269 / sky #4ABDE8 / violet #9474EF / golden #F3B840 / peach #FFA56B, soft golden light, bold rounded simple shapes, clean minimal linework, no fine detail, cheerful peaceful mood, reads clearly at 128px, flat 2D, no text, no logos, no shadow beneath. Exclude: text, letters, numbers, photorealism, 3D render, ANY background, muddy or garish colors, sickle, scythe, blade, crosses, halos, holiday imagery, realistic faces, branded characters.
```

### 25. `sticker-plants-wildflowers.png`
```
A cheerful patch of tall wildflowers of different colors clustered together on green stems, coral-dominant with violet and golden accents. Flat vector children's storybook sticker illustration, single centered subject on a fully transparent background, soft palette of coral #FF8269 / sky #4ABDE8 / violet #9474EF / golden #F3B840 / peach #FFA56B, soft golden light, bold rounded simple shapes, clean minimal linework, no fine detail, cheerful peaceful mood, reads clearly at 128px, flat 2D, no text, no logos, no shadow beneath. Exclude: text, letters, numbers, photorealism, 3D render, ANY background, muddy or garish colors, crosses, halos, holiday imagery, realistic faces, branded characters.
```

### 26. `sticker-plants-veggie-basket.png`
```
A friendly woven basket overflowing with colorful vegetables — a round pumpkin, carrots poking out, leafy greens on top, peach-dominant with coral and golden accents. Flat vector children's storybook sticker illustration, single centered subject on a fully transparent background, soft palette of coral #FF8269 / sky #4ABDE8 / violet #9474EF / golden #F3B840 / peach #FFA56B, soft golden light, bold rounded simple shapes, clean minimal linework, no fine detail, cheerful peaceful mood, reads clearly at 128px, flat 2D, no text, no logos, no shadow beneath. Exclude: text, letters, numbers, photorealism, 3D render, ANY background, muddy or garish colors, crosses, halos, holiday imagery, realistic faces, branded characters.
```

### 27. `sticker-plants-blossoming-tree.png`
```
A gentle blossoming tree in bloom with soft pink and coral flowers on graceful branches, peach-dominant with coral and sky accents. Flat vector children's storybook sticker illustration, single centered subject on a fully transparent background, soft palette of coral #FF8269 / sky #4ABDE8 / violet #9474EF / golden #F3B840 / peach #FFA56B, soft golden light, bold rounded simple shapes, clean minimal linework, no fine detail, cheerful peaceful mood, reads clearly at 128px, flat 2D, no text, no logos, no shadow beneath. Exclude: text, letters, numbers, photorealism, 3D render, ANY background, muddy or garish colors, crosses, halos, holiday imagery, realistic faces, branded characters.
```

### 28. `sticker-plants-potted-plant.png`
```
A cheerful terracotta pot with a small flowering plant bursting from it, golden-dominant with coral and violet accents. Flat vector children's storybook sticker illustration, single centered subject on a fully transparent background, soft palette of coral #FF8269 / sky #4ABDE8 / violet #9474EF / golden #F3B840 / peach #FFA56B, soft golden light, bold rounded simple shapes, clean minimal linework, no fine detail, cheerful peaceful mood, reads clearly at 128px, flat 2D, no text, no logos, no shadow beneath. Exclude: text, letters, numbers, photorealism, 3D render, ANY background, muddy or garish colors, crosses, halos, holiday imagery, realistic faces, branded characters.
```

### 46. `sticker-plants-fruit-tree-classic.png`
```
A mature fruit tree with a well-formed trunk and a full leafy canopy dotted with ripe fruit, natural tree proportions with subtle branch structure suggested, coral-dominant with golden and sky accents. Flat vector children's storybook sticker illustration, single centered subject on a fully transparent background, soft palette of coral #FF8269 / sky #4ABDE8 / violet #9474EF / golden #F3B840 / peach #FFA56B / cream #FAF8F6, soft golden light, refined rounded shapes with a touch more detail than a young-child sticker, clean minimal linework, calm serene mood, reads clearly at 128px, flat 2D, no text, no logos, no shadow beneath. Exclude: text, letters, numbers, photorealism, 3D render, ANY background, muddy or garish colors, cartoonish faces on the fruit, cartoonish faces on the tree, sparkles, glitter, crosses, halos, holiday imagery, realistic photographic detail, branded characters.
```

### 47. `sticker-plants-wildflowers-classic.png`
```
A refined arrangement of tall wildflower stems in bloom clustered together with graceful naturalistic curves, coral-dominant with violet and golden accents. Flat vector children's storybook sticker illustration, single centered subject on a fully transparent background, soft palette of coral #FF8269 / sky #4ABDE8 / violet #9474EF / golden #F3B840 / peach #FFA56B / cream #FAF8F6, soft golden light, refined rounded shapes with a touch more detail than a young-child sticker, clean minimal linework, calm serene mood, reads clearly at 128px, flat 2D, no text, no logos, no shadow beneath. Exclude: text, letters, numbers, photorealism, 3D render, ANY background, muddy or garish colors, cartoonish faces on the flowers, sparkles, glitter, crosses, halos, holiday imagery, realistic photographic detail, branded characters.
```

### 48. `sticker-plants-potted-plant-classic.png`
```
An elegant terracotta pot with a well-formed leafy plant, natural plant proportions with visible stem structure, golden-dominant with coral and cream accents. Flat vector children's storybook sticker illustration, single centered subject on a fully transparent background, soft palette of coral #FF8269 / sky #4ABDE8 / violet #9474EF / golden #F3B840 / peach #FFA56B / cream #FAF8F6, soft golden light, refined rounded shapes with a touch more detail than a young-child sticker, clean minimal linework, calm serene mood, reads clearly at 128px, flat 2D, no text, no logos, no shadow beneath. Exclude: text, letters, numbers, photorealism, 3D render, ANY background, muddy or garish colors, cartoonish faces on the plant, sparkles, glitter, ribbons, bows, crosses, halos, holiday imagery, realistic photographic detail, branded characters.
```

### 49. `sticker-plants-veggie-basket-classic.png`
```
A neatly arranged woven basket filled with an assortment of colorful vegetables — a round pumpkin, carrots, leafy greens, peppers — presented naturalistically, peach-dominant with coral and golden accents. Flat vector children's storybook sticker illustration, single centered subject on a fully transparent background, soft palette of coral #FF8269 / sky #4ABDE8 / violet #9474EF / golden #F3B840 / peach #FFA56B / cream #FAF8F6, soft golden light, refined rounded shapes with a touch more detail than a young-child sticker, clean minimal linework, calm serene mood, reads clearly at 128px, flat 2D, no text, no logos, no shadow beneath. Exclude: text, letters, numbers, photorealism, 3D render, ANY background, muddy or garish colors, cartoonish faces on the vegetables, sparkles, glitter, ribbons, bows, crosses, halos, holiday imagery, realistic photographic detail, branded characters.
```

---

## HOMES & LAND (11)

### 29. `sticker-homes-cottage.png`
```
A cozy small cottage with a peaked golden roof, warm-lit windows, a wooden door, and a small chimney puffing a soft cloud of smoke, peach-dominant with coral and sky accents. Flat vector children's storybook sticker illustration, single centered subject on a fully transparent background, soft palette of coral #FF8269 / sky #4ABDE8 / violet #9474EF / golden #F3B840 / peach #FFA56B, soft golden light, bold rounded simple shapes, clean minimal linework, no fine detail, cheerful peaceful mood, reads clearly at 128px, flat 2D, no text, no logos, no shadow beneath. Exclude: text, letters, numbers, photorealism, 3D render, ANY background, muddy or garish colors, crosses, halos, holiday imagery, chimneys shaped like church steeples, realistic faces, branded characters.
```

### 30. `sticker-homes-garden-gate.png`
```
A cheerful wooden garden gate arched with climbing flowers on either side, half-open in welcome, coral-dominant with golden and violet accents. Flat vector children's storybook sticker illustration, single centered subject on a fully transparent background, soft palette of coral #FF8269 / sky #4ABDE8 / violet #9474EF / golden #F3B840 / peach #FFA56B, soft golden light, bold rounded simple shapes, clean minimal linework, no fine detail, cheerful peaceful mood, reads clearly at 128px, flat 2D, no text, no logos, no shadow beneath. Exclude: text, letters, numbers, photorealism, 3D render, ANY background, muddy or garish colors, crosses, halos, holiday imagery, realistic faces, branded characters.
```

### 31. `sticker-homes-well.png`
```
A charming stone well with a small wooden roof and a bucket hanging from a rope, sky-dominant with peach and golden accents. Flat vector children's storybook sticker illustration, single centered subject on a fully transparent background, soft palette of coral #FF8269 / sky #4ABDE8 / violet #9474EF / golden #F3B840 / peach #FFA56B, soft golden light, bold rounded simple shapes, clean minimal linework, no fine detail, cheerful peaceful mood, reads clearly at 128px, flat 2D, no text, no logos, no shadow beneath. Exclude: text, letters, numbers, photorealism, 3D render, ANY background, muddy or garish colors, crosses, halos, holiday imagery, realistic faces, branded characters.
```

### 32. `sticker-homes-stone-path.png`
```
A short winding path of round stepping stones curving gently forward through small tufts of grass on either side, golden-dominant with peach and cream accents. Flat vector children's storybook sticker illustration, single centered subject on a fully transparent background, soft palette of coral #FF8269 / sky #4ABDE8 / violet #9474EF / golden #F3B840 / peach #FFA56B, soft golden light, bold rounded simple shapes, clean minimal linework, no fine detail, cheerful peaceful mood, reads clearly at 128px, flat 2D, no text, no logos, no shadow beneath. Exclude: text, letters, numbers, photorealism, 3D render, ANY background, muddy or garish colors, crosses, halos, holiday imagery, realistic faces, branded characters.
```

### 33. `sticker-homes-bench.png`
```
A charming wooden garden bench with soft curved slats and a small flowering plant beside it, coral-dominant with peach and golden accents. Flat vector children's storybook sticker illustration, single centered subject on a fully transparent background, soft palette of coral #FF8269 / sky #4ABDE8 / violet #9474EF / golden #F3B840 / peach #FFA56B, soft golden light, bold rounded simple shapes, clean minimal linework, no fine detail, cheerful peaceful mood, reads clearly at 128px, flat 2D, no text, no logos, no shadow beneath. Exclude: text, letters, numbers, photorealism, 3D render, ANY background, muddy or garish colors, crosses, halos, holiday imagery, realistic faces, branded characters.
```

### 50. `sticker-homes-tool-shed.png`
```
A sturdy small wooden tool shed with a peaked wood-shingle roof, plain plank walls, a simple wooden door slightly ajar, and a few hand tools (rake, shovel handle) resting neatly against the outside wall, wood-brown-dominant with sky and golden accents. Flat vector children's storybook sticker illustration, single centered subject on a fully transparent background, soft palette of coral #FF8269 / sky #4ABDE8 / violet #9474EF / golden #F3B840 / peach #FFA56B / cream #FAF8F6, soft golden light, bold rounded simple shapes, clean minimal linework, no fine detail, cheerful peaceful mood, reads clearly at 128px, flat 2D, no text, no logos, no shadow beneath. Exclude: text, letters, numbers, photorealism, 3D render, ANY background, muddy or garish colors, flowers, ribbons, bows, decorative curls, pastel dominance, sharp weapon-like tools, crosses, halos, holiday imagery, realistic faces, branded characters.
```

### 51. `sticker-homes-wheelbarrow.png`
```
A sturdy wooden wheelbarrow with a single front wheel, two straight handles, and a small heap of round logs stacked inside, wood-brown-dominant with sky and golden accents. Flat vector children's storybook sticker illustration, single centered subject on a fully transparent background, soft palette of coral #FF8269 / sky #4ABDE8 / violet #9474EF / golden #F3B840 / peach #FFA56B / cream #FAF8F6, soft golden light, bold rounded simple shapes, clean minimal linework, no fine detail, cheerful peaceful mood, reads clearly at 128px, flat 2D, no text, no logos, no shadow beneath. Exclude: text, letters, numbers, photorealism, 3D render, ANY background, muddy or garish colors, flowers in the wheelbarrow, ribbons, bows, pastel dominance, crosses, halos, holiday imagery, realistic faces, branded characters.
```

### 52. `sticker-homes-rope-swing.png`
```
A simple sturdy plank-and-rope swing hanging from two long ropes as if suspended from an unseen tree branch above, gently swaying, wood-brown-dominant with sky and cream accents. Flat vector children's storybook sticker illustration, single centered subject on a fully transparent background, soft palette of coral #FF8269 / sky #4ABDE8 / violet #9474EF / golden #F3B840 / peach #FFA56B / cream #FAF8F6, soft golden light, bold rounded simple shapes, clean minimal linework, no fine detail, cheerful peaceful mood, reads clearly at 128px, flat 2D, no text, no logos, no shadow beneath. Exclude: text, letters, numbers, photorealism, 3D render, ANY background, muddy or garish colors, flowers, ribbons, bows, decorative curls, pastel dominance, crosses, halos, holiday imagery, realistic faces, branded characters.
```

### 53. `sticker-homes-treehouse.png`
```
A cheerful sturdy small treehouse of plain wood planks nestled among the branches of a stylised tree, a knotted rope ladder hanging from the door, a peaked wood-shingle roof, sky-and-wood-brown-dominant with golden and cream accents. Flat vector children's storybook sticker illustration, single centered subject on a fully transparent background, soft palette of coral #FF8269 / sky #4ABDE8 / violet #9474EF / golden #F3B840 / peach #FFA56B / cream #FAF8F6, soft golden light, bold rounded simple shapes, clean minimal linework, no fine detail, cheerful peaceful mood, reads clearly at 128px, flat 2D, no text, no logos, no shadow beneath. Exclude: text, letters, numbers, photorealism, 3D render, ANY background, muddy or garish colors, flowers, ribbons, bows, fairy lights, pastel dominance, crosses, halos, holiday imagery, realistic faces, branded characters.
```

### 54. `sticker-homes-campfire.png`
```
A friendly campfire ring of round stones with a small stack of criss-crossed logs inside and a cheerful warm flame with a curl of gentle smoke rising above, golden-dominant with wood-brown and cream accents. Flat vector children's storybook sticker illustration, single centered subject on a fully transparent background, soft palette of coral #FF8269 / sky #4ABDE8 / violet #9474EF / golden #F3B840 / peach #FFA56B / cream #FAF8F6, soft golden light, bold rounded simple shapes, clean minimal linework, no fine detail, cheerful peaceful mood, reads clearly at 128px, flat 2D, no text, no logos, no shadow beneath. Exclude: text, letters, numbers, photorealism, 3D render, ANY background, muddy or garish colors, huge threatening flames, thick dark smoke, cooking pot, marshmallows, holiday imagery, ribbons, bows, pastel dominance, crosses, halos, realistic faces, branded characters.
```

### 55. `sticker-homes-wooden-fence.png`
```
A short section of sturdy horizontal wooden rail fence with two thick vertical posts and three horizontal rails, wood-brown-dominant with sky and golden accents. Flat vector children's storybook sticker illustration, single centered subject on a fully transparent background, soft palette of coral #FF8269 / sky #4ABDE8 / violet #9474EF / golden #F3B840 / peach #FFA56B / cream #FAF8F6, soft golden light, bold rounded simple shapes, clean minimal linework, no fine detail, cheerful peaceful mood, reads clearly at 128px, flat 2D, no text, no logos, no shadow beneath. Exclude: text, letters, numbers, photorealism, 3D render, ANY background, muddy or garish colors, flowers on the fence, climbing vines, ribbons, bows, pastel dominance, crosses, halos, holiday imagery, realistic faces, branded characters.
```

---

## SKY, WATER & WEATHER (7)

### 34. `sticker-sky-rainbow.png`
```
A cheerful full arched rainbow in soft complete colors with two small white clouds floating beneath either end, sky-dominant with coral and violet accents. Flat vector children's storybook sticker illustration, single centered subject on a fully transparent background, soft palette of coral #FF8269 / sky #4ABDE8 / violet #9474EF / golden #F3B840 / peach #FFA56B, soft golden light, bold rounded simple shapes, clean minimal linework, no fine detail, cheerful peaceful mood, reads clearly at 128px, flat 2D, no text, no logos, no shadow beneath. Exclude: text, letters, numbers, photorealism, 3D render, ANY background, muddy or garish colors, pot of gold, leprechaun, crosses, halos, holiday imagery, realistic faces, branded characters.
```

### 35. `sticker-sky-sun.png`
```
A cheerful smiling bright sun with soft gentle rays radiating outward, golden-dominant with peach and coral accents. Flat vector children's storybook sticker illustration, single centered subject on a fully transparent background, soft palette of coral #FF8269 / sky #4ABDE8 / violet #9474EF / golden #F3B840 / peach #FFA56B, soft golden light, bold rounded simple shapes, clean minimal linework, no fine detail, cheerful peaceful mood, reads clearly at 128px, flat 2D, no text, no logos, no shadow beneath. Exclude: text, letters, numbers, photorealism, 3D render, ANY background, muddy or garish colors, sun with an angry face, crosses, halos, holiday imagery, realistic faces, branded characters.
```

### 36. `sticker-sky-cloud.png`
```
A soft fluffy cheerful cloud with rounded puffy edges, cream-dominant with sky and peach accents. Flat vector children's storybook sticker illustration, single centered subject on a fully transparent background, soft palette of coral #FF8269 / sky #4ABDE8 / violet #9474EF / golden #F3B840 / peach #FFA56B, soft golden light, bold rounded simple shapes, clean minimal linework, no fine detail, cheerful peaceful mood, reads clearly at 128px, flat 2D, no text, no logos, no shadow beneath. Exclude: text, letters, numbers, photorealism, 3D render, ANY background, muddy or garish colors, storm cloud, lightning, rain, dark tones, crosses, halos, holiday imagery, realistic faces, branded characters.
```

### 37. `sticker-sky-waterfall.png`
```
A gentle small waterfall cascading over smooth round rocks into a soft pool below with a few splashes, sky-dominant with cream and violet accents. Flat vector children's storybook sticker illustration, single centered subject on a fully transparent background, soft palette of coral #FF8269 / sky #4ABDE8 / violet #9474EF / golden #F3B840 / peach #FFA56B, soft golden light, bold rounded simple shapes, clean minimal linework, no fine detail, cheerful peaceful mood, reads clearly at 128px, flat 2D, no text, no logos, no shadow beneath. Exclude: text, letters, numbers, photorealism, 3D render, ANY background, muddy or garish colors, crosses, halos, holiday imagery, realistic faces, branded characters.
```

### 56. `sticker-sky-sun-classic.png`
```
A radiant bright sun with clean gentle rays extending outward in a geometric star pattern, no facial features, natural proportions, golden-dominant with peach and coral accents. Flat vector children's storybook sticker illustration, single centered subject on a fully transparent background, soft palette of coral #FF8269 / sky #4ABDE8 / violet #9474EF / golden #F3B840 / peach #FFA56B / cream #FAF8F6, soft golden light emanating from center, refined rounded shapes with a touch more detail than a young-child sticker, clean minimal linework, calm serene mood, reads clearly at 128px, flat 2D, no text, no logos, no shadow beneath. Exclude: text, letters, numbers, photorealism, 3D render, ANY background, muddy or garish colors, smiling face on the sun, cartoonish eyes, angry face, sparkles, crosses, halos, holiday imagery, realistic photographic detail, branded characters.
```

### 57. `sticker-sky-cloud-classic.png`
```
A soft cumulus cloud with naturalistic rounded contours and gentle undulating edges, subtle shading suggested through simple shape overlap, cream-dominant with sky and peach accents. Flat vector children's storybook sticker illustration, single centered subject on a fully transparent background, soft palette of coral #FF8269 / sky #4ABDE8 / violet #9474EF / golden #F3B840 / peach #FFA56B / cream #FAF8F6, soft golden light, refined rounded shapes with a touch more detail than a young-child sticker, clean minimal linework, calm serene mood, reads clearly at 128px, flat 2D, no text, no logos, no shadow beneath. Exclude: text, letters, numbers, photorealism, 3D render, ANY background, muddy or garish colors, smiling face on the cloud, cartoonish eyes, storm cloud, lightning, rain, dark tones, sparkles, crosses, halos, holiday imagery, realistic photographic detail, branded characters.
```

### 58. `sticker-sky-rainbow-classic.png`
```
An elegant full arched rainbow with a subtle graceful curve, bands of soft complete color rendered as clean concentric arcs, no accompanying clouds, sky-dominant with coral and violet accents. Flat vector children's storybook sticker illustration, single centered subject on a fully transparent background, soft palette of coral #FF8269 / sky #4ABDE8 / violet #9474EF / golden #F3B840 / peach #FFA56B / cream #FAF8F6, soft golden light, refined rounded shapes with a touch more detail than a young-child sticker, clean minimal linework, calm serene mood, reads clearly at 128px, flat 2D, no text, no logos, no shadow beneath. Exclude: text, letters, numbers, photorealism, 3D render, ANY background, muddy or garish colors, pot of gold, leprechaun, unicorn, sparkles, glitter, crosses, halos, holiday imagery, realistic photographic detail, branded characters.
```

---

## What to do with these

1. Paste each prompt (one at a time) into your image tool (ChatGPT/Claude web with image generation, Midjourney, etc.).
2. Save each PNG using the filename shown above the prompt.
3. Drop them all into `public/uploads/stickers/`.
4. When you have at least 12–15 done (any mix of categories), tell me and I'll wire up the game shell — sticker picker, drag-and-drop canvas, "Save my paradise" flow. The game reads the folder, so you can keep adding stickers later without any code change.

---

# Planned future sets

Stubs for expansion sets. Same style + palette + exclude rules will
apply, so the whole sticker library stays visually one book. Fill each
list in as you decide which figures matter most for the kids.

## Bible Times People — the resurrected faithful

For depicting the resurrected ones from Bible accounts and the
"princes in all the earth" (Isa 32:1). Robes and tunics ARE
appropriate here because these are historical figures — the "no
biblical costume" exclude line from the Modern set is inverted for
this set.

Suggested figures (all young and healthy in paradise, matching Job
33:25):

- Patriarchs: Noah, Abraham, Isaac, Jacob, Joseph
- Matriarchs: Sarah, Rebekah, Rachel, Ruth, Hannah
- Judges & prophets: Deborah, Samuel, Elijah, Daniel
- Kings: David (young shepherd or crowned), Solomon, Hezekiah, Josiah
- Faithful examples: Job, Esther, Nehemiah

Filename pattern: `sticker-bible-<name>.png` (e.g.
`sticker-bible-david.png`, `sticker-bible-ruth.png`).

Prompts to be written when you're ready — TBD.

## Cultures Around the World — modern

For the "great crowd out of all nations, tribes, peoples and tongues"
(Rev 7:9) — modern people from cultures around the world, in dignified
everyday or traditional attire from their region. Kids can build a
paradise scene reflecting the whole earthly family.

Suggested culture pairs (a child + adult from each region, or family
groups):

- East Asia (Japanese, Korean, Chinese) — traditional or modern
- South Asia (Indian, Sri Lankan) — sari, kurta
- Southeast Asia (Filipino, Thai, Vietnamese, Indonesian)
- Middle East — modern modest dress
- Africa — a few regions: West African (Ankara / kente), East African,
  Southern African
- Latin America — everyday or festival attire
- Pacific Islander (Samoan, Hawaiian, Maori)
- Indigenous North American
- Eastern European (Ukrainian, Polish, Russian folk)
- Northern European (Scottish, Scandinavian)

Filename pattern: `sticker-culture-<region>-<role>.png` (e.g.
`sticker-culture-japan-mother.png`, `sticker-culture-ghana-child.png`).

Prompts to be written when you're ready — TBD.
