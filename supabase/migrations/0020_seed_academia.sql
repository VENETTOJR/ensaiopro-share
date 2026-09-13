-- Story: ensaio academia / fitness — biotipo agnóstico
-- ────────────────────────────────────────────────────────────────────
-- Diferente do `fitness-yoga` (3 prompts misturando yoga + treino), este
-- slug é dedicado a musculação/academia com 8 cenas. Todos os prompts
-- carregam um bloco "CRITICAL BODY TYPE" reforçando que o corpo da
-- referência NÃO deve ser idealizado — não emagrecer, não enrijecer, não
-- adicionar definição muscular inexistente. Funciona em qualquer biotipo.

-- 1. Tipo de ensaio
insert into public.ensaio_types (slug, name, description, icon, sort_order, active, supports_idade)
values
  ('academia', 'Ensaio Academia', 'Treino, halteres, espelho, cardio — ensaio fitness em qualquer biotipo', 'dumbbell', 9, true, false)
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description,
  icon = excluded.icon,
  sort_order = excluded.sort_order,
  active = excluded.active,
  supports_idade = excluded.supports_idade,
  updated_at = now();

-- 2. Prompts (8 cenas — biotipo preservado)
-- Bloco PRESERVATION_WOMAN + CRITICAL BODY TYPE inline em todos.

-- 2.1 Zona de pesos livres / squat rack
insert into public.prompts (ensaio_type_id, numero, categoria, texto, active, sort_order)
select
  id, 1, 'academia',
$$Ultra-realistic photo in 8K resolution of a woman training in the free-weights zone of a high-end modern gym with black rubber flooring, a heavy-duty squat rack with a loaded barbell in the foreground, a dumbbell tower behind her, exposed brick walls with subtle neon accent strip, dramatic industrial lighting. The woman is standing beside the rack holding a pair of medium hex dumbbells with arms relaxed at her sides, body angled three-quarters to camera, chin up, weight grounded on both feet. Her expression is focused and confident with a subtle half-smile — strong without being theatrical.

Her facial features must be accurately matched from the provided reference image. Hairstyle, hair texture, hair length, and hair color must be accurately matched from the provided reference image. Body type, physical build, proportions, and overall physique must be accurately matched from the provided reference image. Do not reinterpret or modify these elements; they must correspond exactly to the reference.

CRITICAL BODY TYPE — Preserve the woman's actual body type, build, and proportions exactly as in the reference image. Do NOT idealize the figure into a generic fitness-model body. Do NOT make her thinner, more muscular, or more toned than she is. If the reference shows a soft body, render a soft body in workout clothes. If athletic, render athletic. If curvy or larger, render exactly that body. Render visible natural skin texture, real muscle tone matching the reference, no airbrushing, no unrealistic abs or definition that don't exist in the reference photo.

She is wearing a high-support seamless sports bra in matte black with mesh ventilation panels, paired with high-waist black seamless leggings with a subtle compression fit, premium black athletic sneakers with white sole. Hair styled practically in a high ponytail. Optional natural sweat sheen on collarbone and forearms. Athletic wear shows visible fabric weave and natural compression folds, no plastic shine. No readable brand logos on clothing or equipment.

Background: real-feeling industrial gym — exposed concrete and brick, equipment racks in deep soft focus, dark walls with subtle accent lighting, NO sterile white-studio look. Chalk-dust particles visible in the air catching the rim light.

Photographic lighting: directional editorial fitness lighting — large softbox key light from front-side, warm fill keeping skin tones natural, strong rim light from behind-right separating silhouette from dark background, dramatic but flattering, never harsh.

Shot with a full-frame DSLR camera, 85mm prime portrait lens, eye-level perspective (NOT from below), shallow depth of field with sharp focus on the subject and gym equipment in creamy bokeh.

High dynamic range, precise color accuracy, luxurious editorial fitness photography quality, visible natural skin texture (pores, freckles, body hair if present, scars and stretch marks if present in reference — preserve them all), realistic fabric texture, authentic high-end fitness portrait, Nike/Lululemon-campaign quality, never AI-glossy, never airbrushed.$$,
  true, 1
from public.ensaio_types where slug = 'academia';

-- 2.2 Mirror pump / espelho
insert into public.prompts (ensaio_type_id, numero, categoria, texto, active, sort_order)
select
  id, 2, 'academia',
$$Ultra-realistic photo in 8K resolution of a woman in front of a luxury gym mirror wall covering the floor-to-ceiling space, polished concrete floor reflecting soft warm accent lighting, sleek dumbbells lined up along a low rack on the side. The woman is standing in side-profile to the camera, looking at her own reflection with a focused expression while holding a single dumbbell at her hip with one hand, the other arm relaxed. Her expression is concentrated, breathing controlled, a subtle confident half-smile — strong without being theatrical.

Her facial features must be accurately matched from the provided reference image. Hairstyle, hair texture, hair length, and hair color must be accurately matched from the provided reference image. Body type, physical build, proportions, and overall physique must be accurately matched from the provided reference image. Do not reinterpret or modify these elements; they must correspond exactly to the reference.

CRITICAL BODY TYPE — Preserve the woman's actual body type, build, and proportions exactly as in the reference image. Do NOT idealize the figure into a generic fitness-model body. Do NOT make her thinner, more muscular, or more toned than she is. The mirror context does not change her body composition. If reference is soft, render soft. If athletic, render athletic. If curvy or larger, render exactly that. Render real muscle tone matching the reference, no airbrushing, no fake abs, no unrealistic definition.

She is wearing a strappy crisscross-back sports bra in deep wine tone, matching high-waist scrunch leggings with a soft fabric sheen, chunky retro white-and-cream training sneakers. Hair styled in a slicked-back low bun. Athletic wear shows visible fabric weave with realistic compression folds. Skin: optional fine natural sweat sheen on shoulders and back. No readable brand logos.

Background: minimalist luxury gym mirror wall reflecting soft warm pendant lighting, polished concrete floor, dumbbell rack in soft focus on the side. The reflection shows a believable matching version of her (not an exaggerated alternate body).

Photographic lighting: warm-toned softbox key light from front-left, balanced fill light, gentle rim light from above-right, editorial moody-warm cinematic feel.

Shot with a full-frame DSLR camera, 85mm prime portrait lens, eye-level perspective, shallow depth of field with sharp focus on the woman and her reflection, dumbbells in creamy bokeh.

High dynamic range, precise color accuracy, luxurious editorial fitness photography quality, visible natural skin texture, fabric texture, authentic high-end portrait, Nike/Lululemon-campaign quality, never AI-glossy, never airbrushed. Preserve scars, stretch marks, body hair, and any other natural features visible in the reference.$$,
  true, 2
from public.ensaio_types where slug = 'academia';

-- 2.3 Cardio / esteira / golden hour
insert into public.prompts (ensaio_type_id, numero, categoria, texto, active, sort_order)
select
  id, 3, 'academia',
$$Ultra-realistic photo in 8K resolution of a woman in a panoramic cardio zone with a floor-to-ceiling window-wall overlooking a city skyline at golden hour, modern treadmills and stationary bikes in soft focus, warm sunset light streaming through the windows casting long natural shadows. The woman is standing beside a treadmill holding a stainless-steel water bottle in one hand, sweat towel over the other shoulder, body angled toward the camera with a relaxed weight shift. Her expression is calm, satisfied post-effort, lips slightly parted breathing controlled, a soft natural smile.

Her facial features must be accurately matched from the provided reference image. Hairstyle, hair texture, hair length, and hair color must be accurately matched from the provided reference image. Body type, physical build, proportions, and overall physique must be accurately matched from the provided reference image. Do not reinterpret or modify these elements; they must correspond exactly to the reference.

CRITICAL BODY TYPE — Preserve the woman's actual body type, build, and proportions exactly as in the reference image. Do NOT idealize the figure. The cardio context does not change her body composition. If reference is soft, render soft in workout clothes. If athletic, render athletic. If curvy or larger, render exactly that. Render real natural skin texture, real muscle tone matching the reference, no airbrushing, no fake definition.

She is wearing a fitted long-sleeve technical top in heather gray with thumb holes (sleeves slightly pushed up), full-length leggings in matching gray with a side phone pocket, white classic training sneakers. Hair in a high ponytail with a few natural loose strands. Subtle natural sweat sheen on temples and collarbone. Athletic wear shows visible technical-fabric texture and compression folds. No readable brand logos.

Background: panoramic gym window overlooking city skyline in warm golden-hour light, treadmills and bikes in deep soft focus, polished floor reflecting warm sunlight. Natural lens flare from the sun is acceptable but subtle.

Photographic lighting: golden-hour natural window light as key from camera-left, balanced reflector fill from right keeping skin tones warm and even, gentle rim light through the back windows. Cinematic warm tone, editorial lifestyle feel, never washed out.

Shot with a full-frame DSLR camera, 85mm prime portrait lens, eye-level perspective, shallow depth of field with sharp focus on the woman and creamy city-bokeh in the background.

High dynamic range, precise color accuracy, luxurious editorial lifestyle-fitness photography quality, visible natural skin texture (pores, freckles, body hair if present, scars and stretch marks if present in reference), fabric weave detail, authentic high-end portrait, Nike/Lululemon-campaign quality, never AI-glossy, never airbrushed.$$,
  true, 3
from public.ensaio_types where slug = 'academia';

-- 2.4 Funcional / battle ropes
insert into public.prompts (ensaio_type_id, numero, categoria, texto, active, sort_order)
select
  id, 4, 'academia',
$$Ultra-realistic photo in 8K resolution of a woman in an open functional-training area with green turf flooring, battle ropes anchored to a heavy plate in the foreground, kettlebells and medicine balls scattered nearby, hanging gymnastics rings, neon accent strip lighting on dark concrete walls. The woman is standing with feet shoulder-width apart, gripping the two ends of the battle ropes lightly between sets, ropes resting on the turf, body angled three-quarters to camera. Her expression is focused-and-grounded with controlled breathing, a subtle confident half-smile.

Her facial features must be accurately matched from the provided reference image. Hairstyle, hair texture, hair length, and hair color must be accurately matched from the provided reference image. Body type, physical build, proportions, and overall physique must be accurately matched from the provided reference image. Do not reinterpret or modify these elements; they must correspond exactly to the reference.

CRITICAL BODY TYPE — Preserve the woman's actual body type, build, and proportions exactly as in the reference image. Do NOT idealize the figure. The functional-training context does not change her body composition. If reference is soft, render soft. If athletic, render athletic. If curvy or larger, render exactly that. Render real natural muscle tone matching the reference, no airbrushing, no invented six-pack, no unrealistic vascularity.

She is wearing a baggy oversized cropped t-shirt in faded charcoal over a fitted sports bra peeking at the waist, joggers cuffed at the ankle in matching charcoal, low-cut training shoes. Hair in a french braid down the back. Subtle natural sweat sheen on forearms and neck. Athletic wear shows realistic worn-in fabric texture, no plastic shine. No readable brand logos.

Background: dark concrete functional-training area with thin neon accent strip in cyan or amber along the floor edge, kettlebells and rings in soft focus, deep depth softened.

Photographic lighting: directional moody key light from front-side with cool ambient fill, strong rim light from back-right through the neon strip, dramatic editorial fitness mood, never washed out, never theatrical.

Shot with a full-frame DSLR camera, 35mm wide-angle for environmental shot OR 85mm prime portrait lens (your choice), eye-level perspective, shallow-to-medium depth of field with sharp focus on the woman.

High dynamic range, precise color accuracy, luxurious editorial fitness photography quality, visible natural skin texture, fabric texture, authentic high-end portrait. Preserve all natural features from the reference (scars, stretch marks, body hair, freckles). Never AI-glossy, never airbrushed.$$,
  true, 4
from public.ensaio_types where slug = 'academia';

-- 2.5 Deadlift / barra
insert into public.prompts (ensaio_type_id, numero, categoria, texto, active, sort_order)
select
  id, 5, 'academia',
$$Ultra-realistic photo in 8K resolution of a woman in a powerlifting platform area with a wooden lifting platform, an Olympic barbell loaded with bumper plates in front of her, a chalk bowl on a side stand, racks of weights in the background, exposed brick and steel beams, dramatic gym lighting. The woman is standing over the barbell in a deadlift setup pose — feet under the bar, hips hinged back, hands gripping the bar with chalk-dusted knuckles, back flat, head looking forward with focus, BUT this is a setup pose, not mid-lift, so the bar is at rest on the floor. Her expression is intensely focused and grounded, jaw set, no smile — pre-lift mental focus.

Her facial features must be accurately matched from the provided reference image. Hairstyle, hair texture, hair length, and hair color must be accurately matched from the provided reference image. Body type, physical build, proportions, and overall physique must be accurately matched from the provided reference image. Do not reinterpret or modify these elements; they must correspond exactly to the reference.

CRITICAL BODY TYPE — Preserve the woman's actual body type, build, and proportions exactly as in the reference image. Do NOT idealize the figure. The lifting context does not change her body composition. Powerlifters come in every body type. If reference is soft, render soft and strong. If athletic, render athletic. If curvy or larger, render exactly that — strength is not a body shape. Render real natural muscle tone matching the reference, no airbrushing, no invented muscle definition.

She is wearing a fitted cropped tank top in heather gray, high-waist black biker shorts with side-stripe accent, black knee-high socks, flat-sole lifting shoes (Converse-style), a thin black lifting belt around the waist (loose, not cinched). Hair in a slick-back bun. Visible chalk dust on hands, forearms, and shins. Athletic wear shows realistic fabric weave. No readable brand logos.

Background: industrial powerlifting gym with wooden platform, wall-mounted plate storage in deep soft focus, exposed brick and dim accent lighting, faint chalk dust visible in the air.

Photographic lighting: dramatic side-key light from camera-left creating defined natural muscle-shadow definition WHEN APPROPRIATE TO HER ACTUAL MUSCULATURE (do not invent definition that isn't there), warm fill from the right, strong rim light from behind. Editorial moody powerlifting feel.

Shot with a full-frame DSLR camera, 35mm wide-angle for full-body environmental composition, slight low-eye-level perspective showing the platform and the bar (NOT extreme low angle), medium depth of field with sharp focus on the woman.

High dynamic range, precise color accuracy, luxurious editorial powerlifting photography quality, visible natural skin texture, fabric texture, chalk dust realism, authentic high-end portrait. Preserve all natural features from the reference. Never AI-glossy, never airbrushed.$$,
  true, 5
from public.ensaio_types where slug = 'academia';

-- 2.6 Boxing / muay thai
insert into public.prompts (ensaio_type_id, numero, categoria, texto, active, sort_order)
select
  id, 6, 'academia',
$$Ultra-realistic photo in 8K resolution of a woman in a boxing gym with a heavy bag visible behind her, a boxing ring with red ropes in soft focus on one side, exposed wood and steel beams, chalk-dust particles in the air catching the warm overhead light. The woman is gloved up with hands in guard position raised at face level, body slightly turned in a fighter's stance, weight on the back foot, eyes locked on the imaginary opponent (camera). Her expression is intense focus, jaw set, breathing controlled — fighter mode, not modeling.

Her facial features must be accurately matched from the provided reference image. Hairstyle, hair texture, hair length, and hair color must be accurately matched from the provided reference image. Body type, physical build, proportions, and overall physique must be accurately matched from the provided reference image. Do not reinterpret or modify these elements; they must correspond exactly to the reference.

CRITICAL BODY TYPE — Preserve the woman's actual body type, build, and proportions exactly as in the reference image. Do NOT idealize the figure. Boxers come in every body type. If reference is soft, render soft. If athletic, render athletic. If curvy or larger, render exactly that. Render real natural muscle tone, no airbrushing, no invented six-pack.

She is wearing a cropped fitted tank top in matte black, high-waist boxing shorts in classic satin black with red side piping (no readable text), black-and-red boxing gloves with realistic worn-in leather, hand wraps visible at the wrists, classic boxing boots laced high. Hair in tight braids close to the scalp. Subtle natural sweat sheen on collarbone, shoulders, and forehead. No readable brand logos.

Background: classic boxing gym with heavy bag in soft focus behind, ring ropes blurred at the edge of frame, warm overhead pendant lighting, dust particles catching light.

Photographic lighting: warm overhead key light from above-front, strong side-rim light from camera-right defining her silhouette against the dark gym, dramatic editorial sports-photography feel.

Shot with a full-frame DSLR camera, 85mm prime portrait lens, eye-level perspective, shallow depth of field with sharp focus on the woman and gloves, heavy bag in creamy bokeh.

High dynamic range, precise color accuracy, luxurious editorial sports-fitness photography quality, visible natural skin texture, leather glove texture, fabric weave, authentic high-end fighter portrait. Preserve all natural features from the reference. Never AI-glossy, never airbrushed.$$,
  true, 6
from public.ensaio_types where slug = 'academia';

-- 2.7 Pós-treino / banco
insert into public.prompts (ensaio_type_id, numero, categoria, texto, active, sort_order)
select
  id, 7, 'academia',
$$Ultra-realistic photo in 8K resolution of a woman taking a post-set rest in a high-end gym, sitting on the edge of a flat black-padded weight bench, a sweat towel draped over her shoulder, a stainless-steel water bottle in one hand, a pair of dumbbells on the floor at her feet. The woman is sitting with elbows resting on her knees, slight forward lean, head turned softly toward the camera. Her expression is calm post-effort, breathing slowing, a soft natural smile with relaxed eyes — authentic moment, not posed.

Her facial features must be accurately matched from the provided reference image. Hairstyle, hair texture, hair length, and hair color must be accurately matched from the provided reference image. Body type, physical build, proportions, and overall physique must be accurately matched from the provided reference image. Do not reinterpret or modify these elements; they must correspond exactly to the reference.

CRITICAL BODY TYPE — Preserve the woman's actual body type, build, and proportions exactly as in the reference image. Do NOT idealize the figure. The rest context does not change her body composition. If reference is soft, render soft. If athletic, render athletic. If curvy or larger, render exactly that. Render real skin texture, natural muscle tone, no airbrushing.

She is wearing a cropped seamless training top in muted sage green with a high neckline, high-waist biker shorts in matching sage tone, low-cut white training shoes. Hair in a high messy bun with a few loose strands framing the face. Natural sweat sheen on temples, collarbone, and arms — visible but tasteful. Athletic wear shows natural compression folds and visible technical-fabric weave. No readable brand logos.

Background: high-end modern gym with soft warm pendant lighting, wooden accent wall, equipment in deep soft focus, intimate quiet moment feel.

Photographic lighting: soft warm-toned key light from front-left, balanced fill light, gentle rim light from behind, intimate cinematic feel reminiscent of editorial wellness photography, never harsh.

Shot with a full-frame DSLR camera, 85mm prime portrait lens, slight eye-level downward angle (camera same height as her seated position), shallow depth of field with sharp focus on her face.

High dynamic range, precise color accuracy, luxurious editorial wellness-fitness photography quality, visible natural skin texture (pores, freckles, body hair if present, scars and stretch marks if present in reference — preserve them all), fabric weave detail, authentic high-end intimate portrait. Never AI-glossy, never airbrushed.$$,
  true, 7
from public.ensaio_types where slug = 'academia';

-- 2.8 Outdoor / rooftop sunrise
insert into public.prompts (ensaio_type_id, numero, categoria, texto, active, sort_order)
select
  id, 8, 'academia',
$$Ultra-realistic photo in 8K resolution of a woman training on a rooftop outdoor gym at sunrise, calisthenics pull-up bars and parallel bars in the foreground, a kettlebell on the ground beside her, urban skyline blurred in soft focus behind, soft warm pastel sky with subtle clouds, gentle natural breeze. The woman is standing beside the pull-up bar with one hand resting lightly on it, body angled three-quarters to camera, weight on one leg in a relaxed contrapposto. Her expression is calm-and-determined with a soft natural smile, breathing controlled, hair moving slightly in the breeze.

Her facial features must be accurately matched from the provided reference image. Hairstyle, hair texture, hair length, and hair color must be accurately matched from the provided reference image. Body type, physical build, proportions, and overall physique must be accurately matched from the provided reference image. Do not reinterpret or modify these elements; they must correspond exactly to the reference.

CRITICAL BODY TYPE — Preserve the woman's actual body type, build, and proportions exactly as in the reference image. Do NOT idealize the figure. The outdoor calisthenics context does not change her body composition. If reference is soft, render soft. If athletic, render athletic. If curvy or larger, render exactly that. Render real natural skin texture, real muscle tone matching the reference, no airbrushing, no invented definition.

She is wearing a fitted seamless racerback tank top in muted terracotta, high-waist matching biker shorts, white classic athletic sneakers. Hair in a low ponytail with a few natural loose strands moving in the breeze. Subtle natural skin glow from morning light, no heavy sweat. Athletic wear shows realistic fabric weave and natural compression folds. No readable brand logos.

Background: rooftop edge with calisthenics equipment, urban skyline blurred in deep soft focus, warm pastel sunrise sky with peach and lavender tones, soft natural lens flare from the rising sun.

Photographic lighting: warm sunrise natural light as key from camera-right (the sun position), soft fill from a reflector or sky bounce keeping shadows gentle, golden-hour cinematic editorial feel, never washed out.

Shot with a full-frame DSLR camera, 35mm wide-angle for environmental skyline composition OR 85mm prime portrait lens (your choice), eye-level perspective, shallow-to-medium depth of field with sharp focus on the woman and creamy skyline bokeh.

High dynamic range, precise color accuracy, luxurious editorial outdoor-fitness lifestyle photography quality, visible natural skin texture, fabric weave detail, authentic high-end portrait. Preserve all natural features from the reference (scars, stretch marks, body hair, freckles). Never AI-glossy, never airbrushed.$$,
  true, 8
from public.ensaio_types where slug = 'academia';
