-- Story: ensaio infantil masculino de aniversário
-- ────────────────────────────────────────────────────────────────────
-- Slug `bebe` é "Ensaio Infantil Feminino" (migration 0003). Esta
-- migration cria o equivalente masculino com 8 prompts temáticos.
-- A lógica de idade obrigatória + age-lock no run-generation já cobre
-- ambos os slugs via lib/ensaio-slugs.ts (isInfantilSlug).

-- 1. Tipo de ensaio
insert into public.ensaio_types (slug, name, description, icon, sort_order, active, supports_idade)
values
  ('bebe-masc', 'Ensaio Infantil Masculino', 'Aniversário do herói da casa: super-herói, futebol, astronauta, racing', 'rocket', 8, true, true)
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description,
  icon = excluded.icon,
  sort_order = excluded.sort_order,
  active = excluded.active,
  supports_idade = excluded.supports_idade,
  updated_at = now();

-- 2. Prompts temáticos (8 cenas)
-- Bloco PRESERVATION_CHILD inline pra que o prompt funcione standalone
-- caso o run-generation algum dia mude (defesa em profundidade).

-- 2.1 Super-herói: Homem-Aranha
insert into public.prompts (ensaio_type_id, numero, categoria, texto, active, sort_order)
select
  id, 1, 'bebe-masc',
$$Ultra-realistic photo in 8K resolution of a happy {idade}-year-old boy (age: {idade}) celebrating his birthday in a comic-book themed studio set with a city skyline backdrop, oversized POW and BAM speech-bubble props on the walls, red and dark-blue color palette. The boy is standing confidently in the center, hands on his hips like a hero, chin up, feet shoulder-width apart, torso angled slightly toward the camera. His expression is a wide genuine smile showing pure joy with bright excited eyes — natural childlike happiness, never staged.

CRITICAL IDENTITY PRESERVATION: the child MUST be the exact same child as in the provided reference image. Do not generate a different child, do not invent a new face. The child's facial features must match with photographic fidelity: face shape, eye shape, eye color, nose shape, lip shape, skin tone, hair color and texture — all exactly as in the reference. The child is exactly {idade} years old — preserve child age and facial proportions, NOT a teenager or adult.

The boy is wearing a high-quality red-and-blue Spider-Man costume in matte stretch fabric with realistic black web-line stitching, fitted to a child's body with natural folds at elbows and knees, child-sized red boots. The fabric has visible weave detail, no plastic-doll smoothness.

Behind the boy, two oversized red metallic foil number balloons reading "{idade}" float at head level with glossy reflective surface. Additional cluster of red, dark-blue, and pearl-white latex balloons arranged in an organic asymmetric balloon-arch on both sides. A themed birthday cake on a side table with red fondant and a black web pattern, single sparkler candle. 2-3 small comic-book props (rolled-up newspaper, mini Spider-Man action figure) placed naturally. IMPORTANT: no extra numbers, no digits, no readable text on any decoration except the main "{idade}" balloon.

Background: clean professional studio with seamless red-tinted backdrop fading to dark, smooth floor with subtle natural shadows.

Photographic lighting: large softbox key light from front-left creating warm highlights on the costume and face, balanced fill light eliminating harsh shadows, subtle rim light separating the boy from the background, overall warm festive cinematic tone — never flat, never overexposed.

Shot with a full-frame DSLR camera, 85mm prime portrait lens, eye-level perspective adjusted to the child's height (slight downward angle, NOT shooting from adult height), shallow depth of field with tack-sharp focus on the boy's face and creamy thematic bokeh.

High dynamic range, precise color accuracy, luxurious editorial children's portrait quality, visible natural skin texture, fabric weave detail, balloon glossy reflections, authentic high-end children's birthday photography. Preserve childlike facial proportions — round cheeks, large eyes relative to face, soft features — do NOT adultize the subject.$$,
  true, 1
from public.ensaio_types where slug = 'bebe-masc';

-- 2.2 Super-herói: Batman
insert into public.prompts (ensaio_type_id, numero, categoria, texto, active, sort_order)
select
  id, 2, 'bebe-masc',
$$Ultra-realistic photo in 8K resolution of a happy {idade}-year-old boy (age: {idade}) celebrating his birthday in a Gotham-themed dark studio set with a moody bat-signal projection on a smoke-tinted backdrop, gothic city silhouette, deep black and yellow color palette. The boy is standing in a confident superhero stance, arms slightly out from body, cape flowing slightly behind him, head tilted up with a determined-yet-joyful look. His expression is a proud half-smile with bright excited eyes — natural childlike confidence.

CRITICAL IDENTITY PRESERVATION: the child MUST be the exact same child as in the provided reference image. Do not generate a different child, do not invent a new face. The child's facial features must match with photographic fidelity: face shape, eye shape, eye color, nose shape, lip shape, skin tone, hair color and texture — all exactly as in the reference. The child is exactly {idade} years old — preserve child age and facial proportions, NOT a teenager or adult.

The boy is wearing a premium Batman costume — matte black bodysuit with subtle gray panel detailing, embossed yellow bat emblem on chest, flowing black satin cape with internal wire giving subtle volume, utility belt with realistic stitched pouches, child-sized black boots. The fabric has visible matte texture and natural wrinkles at joints from movement.

Behind the boy, two oversized black-and-yellow metallic foil number balloons reading "{idade}" float at head level. Additional cluster of black, deep-yellow, and dark-gray latex balloons in an asymmetric arch. A themed birthday cake on a side table with black fondant and a yellow bat-symbol topper. 2-3 small props: a child-sized batarang prop, mini Batmobile toy, comic page on the table. IMPORTANT: no extra numbers, no digits, no readable text on any decoration except the main "{idade}" balloon.

Background: dark moody professional studio with seamless smoke-tinted backdrop, subtle bat-signal lighting effect projected behind, smooth dark floor with reflective accent.

Photographic lighting: dramatic key light from front-right with cooler tone, warm fill light to keep face bright and friendly, strong rim light from back creating defined separation, cinematic but child-appropriate (never scary, never harsh on the face).

Shot with a full-frame DSLR camera, 85mm prime portrait lens, eye-level perspective adjusted to the child's height with slight downward angle, shallow depth of field with tack-sharp focus on the boy's face.

High dynamic range, precise color accuracy, luxurious editorial children's portrait quality, visible natural skin texture, matte fabric detail, cape fabric movement, authentic high-end children's birthday photography. Preserve childlike facial proportions — round cheeks, large eyes, soft features — do NOT adultize the subject.$$,
  true, 2
from public.ensaio_types where slug = 'bebe-masc';

-- 2.3 Futebol
insert into public.prompts (ensaio_type_id, numero, categoria, texto, active, sort_order)
select
  id, 3, 'bebe-masc',
$$Ultra-realistic photo in 8K resolution of a happy {idade}-year-old boy (age: {idade}) celebrating his birthday in a soccer-themed studio with synthetic green grass floor, a child-sized mini goalpost with white netting behind him, scattered soccer balls, a stylized scoreboard reading "{idade}" on the back wall. The boy is standing with one foot on a soccer ball, arms slightly out, body angled toward the camera in a confident player stance. His expression is a wide genuine smile showing the joy of his favorite game — bright eyes, natural childlike excitement.

CRITICAL IDENTITY PRESERVATION: the child MUST be the exact same child as in the provided reference image. Do not generate a different child, do not invent a new face. The child's facial features must match with photographic fidelity: face shape, eye shape, eye color, nose shape, lip shape, skin tone, hair color and texture — all exactly as in the reference. The child is exactly {idade} years old — preserve child age and facial proportions, NOT a teenager or adult.

The boy is wearing an authentic-looking child-sized soccer kit — short-sleeve jersey + matching shorts in classic green-and-yellow tones, long socks pulled up to the knee, professional cleats in white with colored accents. The jersey shows realistic mesh texture, sweat-wicking fabric detail, a small generic crest on the chest (no readable team name or trademarked logo), subtle natural creases.

Behind the boy, two oversized metallic-green and yellow foil number balloons reading "{idade}" float at head level. Additional cluster of green, yellow, and white latex balloons arranged in an asymmetric arch. A themed birthday cake on a side table shaped like a soccer ball or with a soccer-field fondant top, a single candle. 2-3 props: a real soccer ball, a small trophy, a referee whistle on a lanyard. IMPORTANT: no extra numbers, no digits, no readable text on any decoration except the main "{idade}" balloon and scoreboard.

Background: clean professional studio with seamless green-tinted backdrop suggesting a stadium feel, subtle stadium-light flares in the distance, smooth grass-textured floor.

Photographic lighting: large softbox key light from front-left simulating warm afternoon stadium light, balanced fill, subtle rim light separating subject from background, golden-hour cinematic tone.

Shot with a full-frame DSLR camera, 85mm prime portrait lens, eye-level perspective adjusted to the child's height with slight downward angle, shallow depth of field with tack-sharp focus on the boy's face.

High dynamic range, precise color accuracy, luxurious editorial children's sports portrait quality, visible natural skin texture, jersey mesh detail, soccer-ball stitching detail, authentic children's birthday photography. Preserve childlike facial proportions — round cheeks, large eyes, soft features — do NOT adultize the subject.$$,
  true, 3
from public.ensaio_types where slug = 'bebe-masc';

-- 2.4 Astronauta / espaço
insert into public.prompts (ensaio_type_id, numero, categoria, texto, active, sort_order)
select
  id, 4, 'bebe-masc',
$$Ultra-realistic photo in 8K resolution of a happy {idade}-year-old boy (age: {idade}) celebrating his birthday in a cosmic-themed studio with deep navy backdrop dotted with stars, hanging silver planets and moons, a child-sized cardboard rocket on one side, metallic silver and electric blue color palette. The boy is standing confidently with his astronaut helmet held under one arm, the other arm slightly out, looking toward the camera with awe and excitement. His expression is wide-eyed wonder mixed with a bright smile — natural childlike joy.

CRITICAL IDENTITY PRESERVATION: the child MUST be the exact same child as in the provided reference image. Do not generate a different child, do not invent a new face. The child's facial features must match with photographic fidelity: face shape, eye shape, eye color, nose shape, lip shape, skin tone, hair color and texture — all exactly as in the reference. The child is exactly {idade} years old — preserve child age and facial proportions, NOT a teenager or adult.

The boy is wearing a detailed white astronaut suit with realistic mission patches (generic, not branded), fabric ribbing at elbows and knees, gloves on or hanging from belt clip, silver boots, oxygen tube hoses on the chest panel for visual richness. The fabric shows visible heavy-duty texture with natural folds at the joints.

Behind the boy, two oversized silver-chrome metallic foil number balloons reading "{idade}" float at head level. Additional cluster of silver, electric-blue, and pearl-white latex balloons arranged in an asymmetric cosmic cloud. A themed birthday cake on a side table with galaxy-swirl fondant in dark blue and silver, a small rocket topper. 2-3 props: a child-sized model rocket, small alien plush toy, a mock control panel with glowing soft LEDs (no readable text). IMPORTANT: no extra numbers, no digits, no readable text on any decoration except the main "{idade}" balloon.

Background: deep navy professional studio backdrop with subtle starfield projection, smooth dark reflective floor, faint nebula colors in the bokeh.

Photographic lighting: large softbox key light from front-left with cool blue tone, balanced warm fill keeping the face inviting, strong rim light from back-right giving cosmic separation, dramatic but friendly.

Shot with a full-frame DSLR camera, 85mm prime portrait lens, eye-level perspective adjusted to the child's height with slight downward angle, shallow depth of field with tack-sharp focus on the boy's face.

High dynamic range, precise color accuracy, luxurious editorial children's portrait quality, visible natural skin texture, suit fabric detail, balloon chrome reflections, authentic high-end children's birthday photography. Preserve childlike facial proportions — round cheeks, large eyes, soft features — do NOT adultize the subject.$$,
  true, 4
from public.ensaio_types where slug = 'bebe-masc';

-- 2.5 Racing / Hot Wheels
insert into public.prompts (ensaio_type_id, numero, categoria, texto, active, sort_order)
select
  id, 5, 'bebe-masc',
$$Ultra-realistic photo in 8K resolution of a happy {idade}-year-old boy (age: {idade}) celebrating his birthday in a race-track themed studio with a black-and-white checkered flag backdrop, orange Hot Wheels track loops mounted on the walls, mini race cars on a side table, red orange and black color palette. The boy is standing confidently in the center, holding a small racing helmet under one arm, other hand raised in a tiny victory fist, body angled slightly toward the camera. His expression is a triumphant smile with sparkling eyes — natural childlike excitement.

CRITICAL IDENTITY PRESERVATION: the child MUST be the exact same child as in the provided reference image. Do not generate a different child, do not invent a new face. The child's facial features must match with photographic fidelity: face shape, eye shape, eye color, nose shape, lip shape, skin tone, hair color and texture — all exactly as in the reference. The child is exactly {idade} years old — preserve child age and facial proportions, NOT a teenager or adult.

The boy is wearing a child-sized racing driver suit in red and black with subtle generic sponsor patches (no readable brand names), fireproof-fabric look with stitched seams, racing gloves on or held in hand, racing boots. The fabric shows realistic technical-textile texture and natural folds at elbows.

Behind the boy, two oversized red-and-black metallic foil number balloons reading "{idade}" float at head level. Additional cluster of red, black, and white latex balloons in an asymmetric arch with a checkered-pattern accent. A themed birthday cake on a side table shaped like a tire or race track with fondant detailing, a single candle. 2-3 props: a small trophy with a race-car topper, two Hot Wheels miniatures on the floor, a checkered flag draped over a chair. IMPORTANT: no extra numbers, no digits, no readable text on any decoration except the main "{idade}" balloon.

Background: clean professional studio with checkered flag backdrop, smooth black floor with subtle rubber-tire scuff accents, depth softened by shallow focus.

Photographic lighting: large softbox key light from front-left with energetic warm tone, balanced fill, strong rim light suggesting motion lighting, cinematic high-octane feel but warm and friendly.

Shot with a full-frame DSLR camera, 85mm prime portrait lens, eye-level perspective adjusted to the child's height with slight downward angle, shallow depth of field with tack-sharp focus on the boy's face.

High dynamic range, precise color accuracy, luxurious editorial children's portrait quality, visible natural skin texture, racing-suit fabric detail, balloon glossy reflections, authentic high-end children's birthday photography. Preserve childlike facial proportions — round cheeks, large eyes, soft features — do NOT adultize the subject.$$,
  true, 5
from public.ensaio_types where slug = 'bebe-masc';

-- 2.6 Dinossauro / safari
insert into public.prompts (ensaio_type_id, numero, categoria, texto, active, sort_order)
select
  id, 6, 'bebe-masc',
$$Ultra-realistic photo in 8K resolution of a happy {idade}-year-old boy (age: {idade}) celebrating his birthday in a jungle dinosaur-themed studio with tropical palm leaves cascading from above, lifelike dinosaur figurines (T-Rex, Triceratops, Brachiosaurus) on rocks and wooden crates, earthy green amber and stone color palette. The boy is crouched slightly with one hand resting on a small rock, looking at the camera with an excited explorer expression, body angled three-quarters toward the lens. His expression is wide-eyed wonder with a bright smile — natural childlike adventurous joy.

CRITICAL IDENTITY PRESERVATION: the child MUST be the exact same child as in the provided reference image. Do not generate a different child, do not invent a new face. The child's facial features must match with photographic fidelity: face shape, eye shape, eye color, nose shape, lip shape, skin tone, hair color and texture — all exactly as in the reference. The child is exactly {idade} years old — preserve child age and facial proportions, NOT a teenager or adult.

The boy is wearing a khaki explorer outfit — beige cargo shorts with realistic pocket detail, short-sleeve safari shirt with chest pockets and shoulder straps, brown leather belt, small generic-look binoculars hanging from his neck on a brown strap, sturdy brown hiking sandals or boots. The fabric shows visible weave and natural creasing.

Behind the boy, two oversized metallic-green foil number balloons reading "{idade}" float at head level among the leaves. Additional cluster of forest-green, brown, and ivory latex balloons arranged in an organic vine-like cloud. A themed birthday cake on a wooden crate shaped like a dinosaur egg with crackled fondant or a jungle-leaf cake with edible figurines, a single candle. 2-3 props: dinosaur figurines on the floor, a small treasure-map prop (no readable text), a wooden compass. IMPORTANT: no extra numbers, no digits, no readable text on any decoration except the main "{idade}" balloon.

Background: jungle-tinted professional studio with palm-leaf shadows projected on a warm earthy backdrop, smooth stone-textured floor, soft humid atmosphere.

Photographic lighting: large softbox key light from front-left with warm sunlight tone simulating broken jungle canopy light, dappled shadow accent, balanced fill, subtle rim light separating the boy from foliage.

Shot with a full-frame DSLR camera, 85mm prime portrait lens, eye-level perspective adjusted to the child's height with slight downward angle, shallow depth of field with tack-sharp focus on the boy's face and creamy jungle bokeh.

High dynamic range, precise color accuracy, luxurious editorial children's portrait quality, visible natural skin texture, fabric weave detail, leaf and figurine realism, authentic high-end children's birthday photography. Preserve childlike facial proportions — round cheeks, large eyes, soft features — do NOT adultize the subject.$$,
  true, 6
from public.ensaio_types where slug = 'bebe-masc';

-- 2.7 Pirata
insert into public.prompts (ensaio_type_id, numero, categoria, texto, active, sort_order)
select
  id, 7, 'bebe-masc',
$$Ultra-realistic photo in 8K resolution of a happy {idade}-year-old boy (age: {idade}) celebrating his birthday in a pirate-themed studio with a wooden ship's wheel mounted on one side, treasure chest overflowing with gold-painted plastic coins, thick rope details framing the scene, navy blue gold and dark wood color palette. The boy is standing in a confident swashbuckler pose, one hand on his hip, the other holding a toy cutlass pointing slightly up, body angled toward camera. His expression is a mischievous smirk with bright excited eyes — natural childlike adventure.

CRITICAL IDENTITY PRESERVATION: the child MUST be the exact same child as in the provided reference image. Do not generate a different child, do not invent a new face. The child's facial features must match with photographic fidelity: face shape, eye shape, eye color, nose shape, lip shape, skin tone, hair color and texture — all exactly as in the reference. The child is exactly {idade} years old — preserve child age and facial proportions, NOT a teenager or adult.

The boy is wearing a classic pirate outfit — white ruffled shirt with subtle linen texture, black quilted vest with brass buttons, red sash tied at the waist with natural folds, dark brown trousers, a small soft-prop cutlass at the hip, black leather boots, a tricorn hat tilted slightly with a small feather. The fabric shows realistic period-costume detail with natural creases.

Behind the boy, two oversized gold metallic foil number balloons reading "{idade}" float at head level. Additional cluster of navy-blue, gold, and ivory latex balloons in an organic arch. A themed birthday cake on a wooden barrel shaped like a treasure chest with edible gold-coin decorations, a single candle. 2-3 props: a rolled-up map prop (no readable text), a brass-look telescope, a small parrot plush toy on the chest, scattered gold coins. IMPORTANT: no extra numbers, no digits, no readable text on any decoration except the main "{idade}" balloon.

Background: warm wood-paneled professional studio backdrop suggesting a ship's cabin, smooth weathered-plank floor, soft seafoam atmospheric tint at the edges.

Photographic lighting: warm-toned softbox key light from front-left simulating lantern glow, balanced fill, subtle rim light from back-right creating cinematic adventure feel.

Shot with a full-frame DSLR camera, 85mm prime portrait lens, eye-level perspective adjusted to the child's height with slight downward angle, shallow depth of field with tack-sharp focus on the boy's face.

High dynamic range, precise color accuracy, luxurious editorial children's portrait quality, visible natural skin texture, costume fabric detail, gold-coin reflections, authentic high-end children's birthday photography. Preserve childlike facial proportions — round cheeks, large eyes, soft features — do NOT adultize the subject.$$,
  true, 7
from public.ensaio_types where slug = 'bebe-masc';

-- 2.8 Construção / engenheiro mirim
insert into public.prompts (ensaio_type_id, numero, categoria, texto, active, sort_order)
select
  id, 8, 'bebe-masc',
$$Ultra-realistic photo in 8K resolution of a happy {idade}-year-old boy (age: {idade}) celebrating his birthday in a construction-themed studio with a backdrop of stacked wooden planks and yellow caution-stripe accents, a child-sized wheelbarrow with foam bricks, toolbelt props, yellow black and warm wood color palette. The boy is standing confidently with a toy hammer resting over his shoulder, the other hand on his hip, body angled three-quarters to camera. His expression is a proud "I built this" smile with bright eyes — natural childlike pride.

CRITICAL IDENTITY PRESERVATION: the child MUST be the exact same child as in the provided reference image. Do not generate a different child, do not invent a new face. The child's facial features must match with photographic fidelity: face shape, eye shape, eye color, nose shape, lip shape, skin tone, hair color and texture — all exactly as in the reference. The child is exactly {idade} years old — preserve child age and facial proportions, NOT a teenager or adult.

The boy is wearing a child-sized construction outfit — denim overalls over a white t-shirt, tan work-style boots, a small yellow safety helmet (hardhat) tilted slightly back, a leather tool belt at the waist holding kid-safe foam tools. The fabric shows visible denim weave and natural creases at the knees.

Behind the boy, two oversized yellow-and-black metallic foil number balloons reading "{idade}" float at head level. Additional cluster of yellow, black, and warm-orange latex balloons in an asymmetric arch with caution-stripe accent ribbons. A themed birthday cake on a wooden crate shaped like a stack of bricks with fondant detail or with a mini cake-topper bulldozer, a single candle. 2-3 props: foam bricks scattered on the floor, a kid-safe toolbox, a roll of blueprint paper (no readable text). IMPORTANT: no extra numbers, no digits, no readable text on any decoration except the main "{idade}" balloon.

Background: warm professional studio with wooden plank backdrop, smooth concrete-textured floor with subtle dust accents, depth softened by shallow focus.

Photographic lighting: warm softbox key light from front-left simulating worksite morning sun, balanced fill, subtle rim light separating the boy from background, cheerful and bright.

Shot with a full-frame DSLR camera, 85mm prime portrait lens, eye-level perspective adjusted to the child's height with slight downward angle, shallow depth of field with tack-sharp focus on the boy's face.

High dynamic range, precise color accuracy, luxurious editorial children's portrait quality, visible natural skin texture, denim fabric detail, helmet plastic reflections, authentic high-end children's birthday photography. Preserve childlike facial proportions — round cheeks, large eyes, soft features — do NOT adultize the subject.$$,
  true, 8
from public.ensaio_types where slug = 'bebe-masc';
