-- Refazer prompts de academia seguindo o padrão exato do `aniversario`
-- ────────────────────────────────────────────────────────────────────
-- Os 8 prompts inseridos em 0020 ficaram com look IA porque:
--  - Tinham bloco "CRITICAL BODY TYPE" extra que polui o sinal
--  - Mencionavam "preserve tattoos/scars/stretch marks if present"
--    (modelo tende a INVENTAR essas coisas mesmo com "if present")
--  - Tinham referência comercial ("Nike/Lululemon-campaign quality")
--  - Roupa estilizada (sage green, terracotta) que puxa estética AI-art
--  - Iluminação como receita ("softbox key + fill + rim") em vez de
--    descrita organicamente pra cena
-- Esta migration deleta os 8 e reinsere seguindo o padrão real do
-- `aniversario` (descrição rica de tecido, iluminação natural da cena,
-- cores neutras, confia no PRESERVATION_WOMAN sem bloco extra).

-- 2.1 Zona de pesos livres / squat rack
update public.prompts set texto = $$Ultra-realistic photo, 8K resolution, full-body vertical portrait of a woman standing in a modern weight-training room next to a heavy-duty squat rack with a loaded olympic barbell at chest height. She is wearing a fitted high-support sports bra in matte black with thin elastic straps and mesh ventilation panels at the upper back, paired with high-waist black seamless leggings made of a slightly compressive technical fabric showing realistic compression folds at the hips and behind the knees, and subtle natural micro-creases where the fabric bends. The leggings have a thin waistband seam and a small reflective detail at the side. She is wearing low-cut black athletic training shoes with white sole and visible lacing texture. In one hand, she holds a single medium hex dumbbell at hip level with relaxed grip, the other arm relaxed along her body.

Her facial features must be accurately matched from the provided reference image. Hairstyle, hair texture, hair length, and hair color must be accurately matched from the provided reference image. Body type, physical build, proportions, and overall physique must be accurately matched from the provided reference image. Do not reinterpret or modify these elements; they must correspond exactly to the reference.

The setting is a real high-end gym with black rubber tile flooring showing realistic worn-in texture and small chalk marks, a heavy steel squat rack in the foreground with the loaded barbell and weight plates showing realistic metal wear, scratches, and chipped paint on the plates. Behind her, a tall dumbbell tower holds organized rows of hex dumbbells of varying weights with realistic rubber-coated heads. The walls are exposed dark gray concrete with subtle texture variation. To one side, a wall-mounted weight-plate storage tree displays bumper plates in red, blue, and yellow colors with worn rubber edges.

Photographic lighting is real overhead gym lighting: warm pendant lights mounted on industrial black cables creating directional warm key light from above-front, soft natural fill from the ambient room reducing harsh shadows, and a faint cool rim light from a back-corner window separating her silhouette from the dark gym background. Natural shadow gradients are visible along the leggings folds and on the rubber floor beside her feet.

Shot with a full-frame DSLR or mirrorless camera, 85mm prime lens, shallow depth of field, sharp focus on the subject, soft natural background bokeh showing the squat rack and dumbbells in slight blur, camera at approximately chest height for a natural perspective. Texture and material realism emphasized: matte technical fabric of the sports bra and leggings, rubber-coated dumbbell head, knurled steel barbell texture, worn rubber flooring, subtle skin texture on visible areas (arms, collarbone, stomach), and natural imperfections such as minor fabric creases, small chalk dust on hands, and slight asymmetry in the dumbbell rack arrangement. Clean, high-dynamic-range image with balanced contrast, natural color grading, and lifelike skin tones.$$, updated_at = now()
where ensaio_type_id = (select id from public.ensaio_types where slug = 'academia')
  and numero = 1;

-- 2.2 Mirror pump (espelho)
update public.prompts set texto = $$Ultra-realistic photo, 8K resolution, three-quarter portrait of a woman standing in side-profile in front of a floor-to-ceiling gym mirror wall, captured at the moment she checks her form between sets. Her posture is natural and grounded, shoulders back, head turned slightly toward her own reflection, holding a single medium dumbbell in one hand at hip level with relaxed grip, the other arm relaxed.

Her facial features must be accurately matched from the provided reference image. Hairstyle, hair texture, hair length, and hair color must be accurately matched from the provided reference image. Body type, physical build, proportions, and overall physique must be accurately matched from the provided reference image. Do not reinterpret or modify these elements; they must correspond exactly to the reference.

She is wearing a fitted seamless racerback sports bra in dark charcoal gray, with smooth technical fabric that catches soft warm highlights from the overhead lights. The bra fits cleanly with realistic tension across the chest and natural compression folds at the band. She is wearing matching high-waist seamless leggings in the same charcoal gray, with subtle compression detail at the waistband and natural micro-creases where the fabric bends behind the knees and at the hips. The leggings have a small flat seam running down the side. She is wearing white classic athletic training shoes with worn-in canvas texture and visible stitching.

The mirror wall behind her shows a believable matching reflection of her body and the room, with subtle dust and fingerprint marks on the glass surface adding realism. The reflection captures her side-profile and the equipment behind her at slightly diminished depth.

To one side, a wall-mounted dumbbell rack holds organized rows of hex dumbbells with realistic rubber-coated heads showing minor wear marks and small scratches. The floor is polished concrete in a soft warm gray tone, with realistic light reflections and subtle scuff marks from regular use.

Photographic lighting is warm overhead pendant lighting: a soft directional key light from above-front-left illuminating her side profile and the technical fabric, gentle ambient fill from the room reducing harsh shadows, and a subtle warm reflection from the mirror wall creating natural light bouncing back onto her body. Shadows are soft and natural along the leggings folds and on the polished floor.

Shot with a full-frame DSLR camera, 85mm prime lens, shallow depth of field, sharp focus on the subject and the mirror reflection, creamy background bokeh showing the gym equipment in soft blur, camera at chest height. Texture and material realism: matte technical fabric, rubber-coated dumbbells, polished concrete floor, glass mirror surface with realistic reflections, visible natural skin texture on visible areas, minor fabric creases, and authentic gym-environment imperfections (small scuff marks on floor, minor dust on mirror, organic asymmetry in equipment placement). High dynamic range, balanced contrast, lifelike skin tones, natural color grading.$$, updated_at = now()
where ensaio_type_id = (select id from public.ensaio_types where slug = 'academia')
  and numero = 2;

-- 2.3 Cardio / golden hour
update public.prompts set texto = $$Ultra-realistic photo, 8K resolution, full-body portrait of a woman standing beside a modern treadmill in a panoramic cardio area of a high-end gym, with a floor-to-ceiling window-wall behind her overlooking a city skyline at golden hour. Warm sunset light streams through the window casting long natural shadows across the polished floor.

Her facial features must be accurately matched from the provided reference image. Hairstyle, hair texture, hair length, and hair color must be accurately matched from the provided reference image. Body type, physical build, proportions, and overall physique must be accurately matched from the provided reference image. Do not reinterpret or modify these elements; they must correspond exactly to the reference.

She is wearing a fitted long-sleeve technical training top in heather gray with thumb holes at the cuffs (sleeves slightly pushed up to the forearm), the fabric a smooth performance knit catching warm sunlight highlights with subtle directional sheen and realistic micro-creases at the elbows. She is wearing matching full-length leggings in the same heather gray with a small side phone pocket showing realistic seam detail, and natural compression folds at the hips and behind the knees. She is wearing white classic athletic training shoes with light wear marks and visible canvas texture.

In one hand, she holds a brushed stainless-steel water bottle at hip level, the metallic surface catching warm golden highlights with realistic specular reflections. A small white sweat towel is draped over her opposite shoulder showing soft cotton texture and natural folds.

Behind her, the panoramic window reveals a softly blurred city skyline at golden hour with warm peach and amber tones in the sky, treadmills and stationary bikes in deep soft focus along the floor, and the polished gym floor reflecting the warm sunset light. Subtle natural lens flare from the low sun is visible at the edge of the frame.

Photographic lighting is natural sunset window light: warm directional key light from camera-right (the sun position) creating golden highlights on her side profile and the technical fabric, soft ambient fill from the bright sky bouncing back into the room keeping shadows gentle, and a subtle backlight rim from the window outlining her silhouette. Shadows are warm and natural across her body and on the floor.

Shot with a full-frame DSLR camera, 85mm prime lens, shallow depth of field, sharp focus on the subject, creamy warm background bokeh showing the city skyline blurred behind her, camera at chest height. Texture and material realism: heather knit performance fabric, brushed steel water bottle, soft cotton towel, polished concrete floor, visible natural skin texture on the face, neck, and forearms with warm golden light, minor fabric creases, and authentic environmental detail. High dynamic range, balanced warm-tone contrast, natural golden-hour color grading, lifelike skin tones.$$, updated_at = now()
where ensaio_type_id = (select id from public.ensaio_types where slug = 'academia')
  and numero = 3;

-- 2.4 Funcional / battle ropes
update public.prompts set texto = $$Ultra-realistic photo, 8K resolution, full-body portrait of a woman standing in an open functional-training area of a modern gym with green artificial-turf flooring. She stands with feet shoulder-width apart in a relaxed grounded stance between sets, holding the two ends of heavy black battle ropes lightly in each hand, the ropes resting on the turf in front of her with natural slack.

Her facial features must be accurately matched from the provided reference image. Hairstyle, hair texture, hair length, and hair color must be accurately matched from the provided reference image. Body type, physical build, proportions, and overall physique must be accurately matched from the provided reference image. Do not reinterpret or modify these elements; they must correspond exactly to the reference.

She is wearing an oversized cropped t-shirt in faded charcoal cotton with realistic worn-in fabric texture and natural creases at the hem and neckline, layered loosely over a fitted black sports bra peeking at the waistline. She is wearing matching cuffed jogger pants in the same charcoal tone with a soft cotton-blend texture, natural drape and folds at the knees and ankles, an elastic waistband and small side pockets. She is wearing low-cut black athletic training shoes with worn-in canvas texture.

The battle ropes she holds are thick black fitness ropes with realistic woven texture, anchored at the far end to a heavy steel plate visible behind. Around her, several kettlebells of varying weights rest on the turf showing realistic cast-iron texture with worn paint and small scratches. Behind her, hanging gymnastic rings dangle from chains connected to the ceiling, and a wall-mounted plyometric box stands against an exposed-concrete wall.

The walls are exposed dark concrete with subtle texture variation, lit by a thin LED accent strip running along the floor edge in soft warm amber glow. The ceiling exposes industrial ducts and pendant lights.

Photographic lighting is dim moody industrial gym lighting: directional warm pendant key light from above-front creating soft definition on her shoulders and the technical fabric, cool ambient fill from the LED floor strip producing subtle warm-cool color contrast, and a strong warm rim light from a back pendant separating her silhouette from the dark concrete background. Shadows are deep and natural on the turf and across her clothing.

Shot with a full-frame DSLR camera, 35mm wide-angle lens for a strong environmental composition showing the full functional-training area, eye-level perspective, medium-to-shallow depth of field with sharp focus on the subject and battle ropes, soft background bokeh on the kettlebells and rings. Texture and material realism: woven battle rope texture, cast-iron kettlebells with worn finish, artificial turf with realistic blade detail, exposed concrete with grain variation, soft cotton clothing fabric, visible natural skin texture on visible areas, minor fabric creases, and authentic gym-environment imperfections. High dynamic range, balanced moody contrast, natural color grading, lifelike skin tones.$$, updated_at = now()
where ensaio_type_id = (select id from public.ensaio_types where slug = 'academia')
  and numero = 4;

-- 2.5 Deadlift / plataforma
update public.prompts set texto = $$Ultra-realistic photo, 8K resolution, full-body portrait of a woman standing on a wooden powerlifting platform in front of a loaded olympic barbell resting on the floor, in a real powerlifting gym environment. She stands behind the bar in a grounded relaxed stance, hands at her sides, looking forward with a calm focused expression — this is the moment before the lift, not mid-lift, so the bar rests on the floor at her feet.

Her facial features must be accurately matched from the provided reference image. Hairstyle, hair texture, hair length, and hair color must be accurately matched from the provided reference image. Body type, physical build, proportions, and overall physique must be accurately matched from the provided reference image. Do not reinterpret or modify these elements; they must correspond exactly to the reference.

She is wearing a fitted cropped tank top in heather gray with a soft cotton-blend texture, the fabric showing natural creases and realistic compression at the band. She is wearing matching high-waist black biker shorts with a smooth technical fabric, a thin elastic waistband, and a subtle side stripe detail. She is wearing tall black knee-high cotton socks pulled up just below the knee with realistic ribbing texture and a flat-sole black-and-white classic lifting shoe (Converse-style) with worn canvas detail. A thin black leather lifting belt sits loose around her waist (not cinched), with realistic leather grain and visible buckle.

The barbell at her feet is a knurled steel olympic bar loaded with a pair of black bumper plates on each side showing realistic rubber wear, scuff marks, and small chips on the rubber edges. A small wooden chalk bowl sits on a side stand to her left, with visible chalk dust around it and on her hands and forearms. The wooden platform shows realistic plank texture with small dings, scratches, and worn finish from years of use.

Behind her, racks of additional weight plates organized by color line the back wall, exposed brick adds environmental texture, steel beams cross the ceiling, and dim warm pendant lights cast directional moody illumination across the space.

Photographic lighting is dramatic warm gym lighting: directional key light from above-front-left creating definition on her side profile and the technical fabric, soft ambient fill keeping skin tones natural, strong warm rim light from a back pendant outlining her shoulders and hair against the dark brick. Shadows are deep and natural across her body, the platform, and the bar.

Shot with a full-frame DSLR camera, 35mm wide-angle lens for environmental composition showing her, the bar, and the platform, slight low-eye-level perspective (camera at hip height showing the bar in foreground and her standing tall behind), medium depth of field with sharp focus on the subject and bar. Texture and material realism: knurled steel bar surface, rubber bumper plates with worn edges, chalk dust on hands and forearms, soft cotton tank top, smooth technical biker shorts, leather lifting belt with realistic grain, worn wooden platform planks, exposed brick texture, visible natural skin texture on visible areas. High dynamic range, balanced dramatic contrast, natural warm-tone color grading, lifelike skin tones.$$, updated_at = now()
where ensaio_type_id = (select id from public.ensaio_types where slug = 'academia')
  and numero = 5;

-- 2.6 Boxing
update public.prompts set texto = $$Ultra-realistic photo, 8K resolution, three-quarter portrait of a woman standing in a real boxing gym in a relaxed fighter stance between rounds. She holds her gloved hands lightly in guard position at chest level, body turned slightly with weight distributed evenly, head tilted forward in focus.

Her facial features must be accurately matched from the provided reference image. Hairstyle, hair texture, hair length, and hair color must be accurately matched from the provided reference image. Body type, physical build, proportions, and overall physique must be accurately matched from the provided reference image. Do not reinterpret or modify these elements; they must correspond exactly to the reference.

She is wearing a fitted cropped tank top in matte black with a smooth cotton-blend fabric showing natural creases and realistic tension at the band, paired with classic high-waist boxing shorts in matte black satin with thin red side piping running down the leg, the satin fabric catching soft warm highlights with realistic micro-folds at the hem. She is wearing classic boxing shoes laced high with worn-in black leather and visible stitching detail. White cotton hand wraps are visible at her wrists with natural fabric texture, layered under classic black-and-red boxing gloves with realistic worn leather, visible stitching, small scuff marks and authentic creases at the knuckles.

Behind her, a heavy black boxing bag hangs from thick chains in soft focus, showing realistic worn leather texture with patches of repair tape near the bottom. Further back, a boxing ring with classic red ropes is partially visible blurred at the edge of the frame. The walls are exposed wood plank and dark steel beams with realistic aged texture, and a warm overhead pendant light fixture is visible casting directional illumination.

Photographic lighting is warm overhead boxing-gym lighting: a strong directional key light from above-front creating soft definition on her shoulders and the matte fabric, gentle ambient fill from the room keeping skin tones natural, strong warm rim light from a side pendant outlining her silhouette against the dark gym background. Dust particles are visible in the air catching the rim light, adding atmospheric depth. Shadows are warm and natural across her clothing and on the wooden floor beneath her.

Shot with a full-frame DSLR camera, 85mm prime lens, shallow depth of field, sharp focus on the subject and gloves, creamy warm background bokeh on the heavy bag and ring, camera at chest height. Texture and material realism: worn leather boxing gloves, white cotton hand wraps, matte cotton tank, satin boxing shorts with red piping, leather boxing shoes, hanging chains and worn heavy bag, wood plank walls, dust particles in light, visible natural skin texture on visible areas, minor fabric creases, and authentic boxing-gym environmental detail. High dynamic range, balanced warm-tone contrast, natural color grading, lifelike skin tones.$$, updated_at = now()
where ensaio_type_id = (select id from public.ensaio_types where slug = 'academia')
  and numero = 6;

-- 2.7 Pós-treino / banco
update public.prompts set texto = $$Ultra-realistic photo, 8K resolution, three-quarter portrait of a woman taking a quiet rest moment between sets in a high-end modern gym. She is sitting on the edge of a flat black-padded weight bench with elbows resting on her knees, slight forward lean, head turned softly toward the camera with a calm post-effort expression.

Her facial features must be accurately matched from the provided reference image. Hairstyle, hair texture, hair length, and hair color must be accurately matched from the provided reference image. Body type, physical build, proportions, and overall physique must be accurately matched from the provided reference image. Do not reinterpret or modify these elements; they must correspond exactly to the reference.

She is wearing a fitted seamless cropped training top in muted dusty rose with a high neckline and soft compression fit, the technical fabric showing natural micro-creases at the band and realistic tension across the chest. She is wearing matching high-waist biker shorts in the same dusty rose tone with a smooth seamless fabric, a thin waistband, and natural compression folds at the hips. She is wearing low-cut white athletic training shoes with light wear marks and visible canvas texture. A small white sweat towel is draped over her shoulder with soft cotton texture and natural folds.

In one hand, she holds a brushed stainless-steel water bottle at her side with realistic metallic surface catching soft warm highlights and small water condensation droplets on the outside. A pair of medium hex dumbbells rest on the rubber floor at her feet showing realistic rubber-coated heads with minor wear marks.

Behind her, the gym shows soft warm pendant lighting, a wooden accent wall with realistic plank texture, and equipment in deep soft focus including a cable machine and additional benches. The rubber floor has subtle warm tones with realistic minor scuff marks.

Photographic lighting is warm intimate gym lighting: a soft directional key light from above-front-left creating gentle highlights on her face, shoulders, and the technical fabric, balanced ambient fill keeping skin tones natural and soft, and a subtle warm rim light from a back pendant separating her from the wooden wall. Shadows are soft and natural across her body and the bench.

Shot with a full-frame DSLR camera, 85mm prime lens, slight downward angle (camera at her seated chest height), shallow depth of field with sharp focus on her face, creamy warm background bokeh on the gym equipment and wooden wall. Texture and material realism: smooth seamless technical fabric, soft cotton sweat towel, brushed steel water bottle with condensation droplets, rubber-coated dumbbells, black-padded bench surface, wooden plank wall, visible natural skin texture on the face, neck, arms, and legs, minor fabric creases, and authentic intimate gym-environment detail. High dynamic range, balanced warm contrast, natural color grading, lifelike skin tones.$$, updated_at = now()
where ensaio_type_id = (select id from public.ensaio_types where slug = 'academia')
  and numero = 7;

-- 2.8 Outdoor rooftop sunrise
update public.prompts set texto = $$Ultra-realistic photo, 8K resolution, full-body portrait of a woman standing on a rooftop outdoor calisthenics area at sunrise, with a city skyline blurred in soft focus behind her. She stands beside a steel pull-up bar with one hand resting lightly on the bar, body weight relaxed in a natural contrapposto with weight on one leg, looking toward the camera with a calm soft expression.

Her facial features must be accurately matched from the provided reference image. Hairstyle, hair texture, hair length, and hair color must be accurately matched from the provided reference image. Body type, physical build, proportions, and overall physique must be accurately matched from the provided reference image. Do not reinterpret or modify these elements; they must correspond exactly to the reference.

She is wearing a fitted seamless racerback tank top in soft white with a smooth technical fabric showing realistic micro-creases at the band and natural tension across the back, paired with matching high-waist biker shorts in soft white with a thin elastic waistband and natural compression folds at the hips. She is wearing white classic athletic training shoes with light wear and visible canvas texture. Her hair is in a low natural ponytail with a few loose strands moving softly in the morning breeze.

The rooftop has a polished concrete surface with realistic light scuff marks, a steel pull-up bar mounted on heavy posts, parallel bars to one side, and a single black kettlebell resting on the floor showing realistic cast-iron texture. The edge of the rooftop is visible to one side with a thin black metal railing.

Behind her, the city skyline is rendered in deep soft focus with warm pastel sunrise tones — peach, amber, and soft lavender across the sky with subtle morning haze and a rising sun creating natural lens flare at the edge of the frame. Distant buildings are blurred with realistic atmospheric depth.

Photographic lighting is warm sunrise natural light: directional warm key light from camera-right (the sun position) creating golden highlights on her side profile and the white fabric, soft ambient fill from the bright morning sky bouncing back, and a subtle backlight rim from the rising sun outlining her silhouette and hair. Shadows are warm and natural across her body and on the concrete floor.

Shot with a full-frame DSLR camera, 85mm prime lens, shallow depth of field with sharp focus on the subject, creamy warm background bokeh showing the city skyline and rising sun, camera at chest height. Texture and material realism: smooth seamless technical fabric, polished concrete with realistic scuff marks, steel pull-up bar with worn paint, cast-iron kettlebell with patina, visible natural skin texture on the face, arms, and legs with warm golden morning light, minor fabric creases, and authentic outdoor environmental detail (subtle morning haze, distant building blur, natural lens flare). High dynamic range, balanced warm-tone contrast, natural golden-hour color grading, lifelike skin tones.$$, updated_at = now()
where ensaio_type_id = (select id from public.ensaio_types where slug = 'academia')
  and numero = 8;
