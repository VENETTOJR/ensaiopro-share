/**
 * Moldes de prompt profissional — estrutura que funciona para IA.
 *
 * Ordem dos blocos (extraída dos 242 prompts que funcionam):
 * 1. Abertura (Ultra-realistic 8K + tipo de tomada)
 * 2. Sujeito + pose detalhada
 * 3. Preservação facial (3 frases fixas — NÃO alterar)
 * 4. Roupa (tecido, cor, textura, corte)
 * 5. Objetos e cenário (balões, bolo, flores)
 * 6. Iluminação profissional (key/fill/rim)
 * 7. Câmera (lente, perspectiva, DOF)
 * 8. Realismo (texture, imperfections, quality)
 *
 * `{idade}` é substituído automaticamente pela idade do ensaio.
 */

export interface PromptTemplate {
  id: string;
  label: string;
  description: string;
  texto: string;
}

const PRESERVATION_WOMAN = `Her facial features must be accurately matched from the provided reference image. Hairstyle, hair texture, hair length, and hair color must be accurately matched from the provided reference image. Body type, physical build, proportions, and overall physique must be accurately matched from the provided reference image. Do not reinterpret or modify these elements; they must correspond exactly to the reference.`;

const PRESERVATION_CHILD = `CRITICAL IDENTITY PRESERVATION: the child MUST be the exact same child as in the provided reference image. Do not generate a different child, do not invent a new face. The child's facial features must match with photographic fidelity: face shape, eye shape, eye color, nose shape, lip shape, skin tone, hair color and texture — all exactly as in the reference. The child is exactly {idade} years old — preserve child age and facial proportions, NOT a teenager or adult.`;

const PRESERVATION_MAN = `His facial features must be accurately matched from the provided reference image. Hairstyle, hair texture, hair length, beard (if any), and hair color must be accurately matched from the provided reference image. Body type, physical build, proportions, and overall physique must be accurately matched from the provided reference image. Do not reinterpret or modify these elements; they must correspond exactly to the reference.`;

export const PROMPT_TEMPLATES: PromptTemplate[] = [
  {
    id: "mulher-adulto",
    label: "Mulher adulta",
    description: "Aniversário, corporativo, sensual, gestante, casamento",
    texto: `Ultra-realistic photo in 8K resolution of [DESCREVER CENÁRIO: ex: an elegant birthday celebration in a luxurious studio]. A woman is [DESCREVER POSE: ex: standing confidently in the center, torso turned slightly toward the camera, one hand resting on her hip]. Her expression is [DESCREVER EXPRESSÃO: ex: warm and confident with a soft natural smile].

${PRESERVATION_WOMAN}

She is wearing [DESCREVER ROUPA DETALHADA: tecido + cor + corte + acabamento. Ex: a floor-length deep red satin evening gown with a sweetheart neckline, thin shoulder straps, fitted bodice, and a subtle slit on one side]. The fabric has [DESCREVER TEXTURA: ex: a smooth glossy sheen with realistic light reflections and subtle natural folds]. She wears [DESCREVER SAPATO/ACESSÓRIOS: ex: matching red high-heeled sandals and delicate gold earrings].

[DESCREVER OBJETOS E CENÁRIO EM VOLTA. Ex:
- Behind her, two oversized rose-gold foil number balloons reading "{idade}" float at head level.
- A cluster of matte and metallic balloons is arranged in an organic asymmetric design on both sides.
- A decorated birthday cake on a side table with white frosting and gold drip.
]

The background is [DESCREVER FUNDO: ex: a clean professional studio with a soft neutral cream backdrop, smooth reflective floor with subtle shadows].

Photographic lighting: large softbox key light from front-left creating gentle highlights on the dress and face, balanced fill light reducing harsh shadows, subtle rim light separating subject from background. Shadows soft, diffuse, physically accurate.

Shot with a full-frame camera, 85mm prime lens, eye-level perspective, shallow depth of field with sharp focus on the subject and creamy background bokeh.

High dynamic range, precise color accuracy, luxurious editorial quality, visible natural skin texture, fabric sheen, realistic material imperfections, authentic professional portrait photography.`,
  },
  {
    id: "crianca",
    label: "Criança (menina/menino)",
    description: "Ensaio infantil, aniversário infantil, batizado, princesa",
    texto: `ultra-realistic photo, 8K resolution, a happy {idade}-year-old [girl/boy] (age: {idade}) [DESCREVER POSE: ex: standing confidently in an elegant studio birthday setup], soft studio lighting with bright warm tones, photographic lighting with gentle highlights and natural shadows, shallow depth of field subtly blurring the background, captured with a professional DSLR camera using an 85mm portrait lens, eye-level perspective with slight downward angle, high dynamic range, crisp focus on subject

the child is wearing [DESCREVER ROUPA INFANTIL: ex: a knee-length light blue princess-style dress with fitted bodice, puffed sleeves, and full tulle skirt, matching white ballet flats], [DESCREVER PEQUENOS DETALHES: ex: small satin ribbon at waistline, sparkle details]

${PRESERVATION_CHILD}

[DESCREVER OBJETOS/DECORAÇÃO: ex:
- behind the subject, a single large oversized silver mylar foil balloon showing the number "{idade}" floats at head level with glossy reflective surface
- additional cluster of pastel latex balloons in powder blue, pearl white, and silver tones arranged in an organic asymmetric cloud
- IMPORTANT: no numbers, no digits, no text on any decoration except the main number balloon (if using)
]

background: clean professional studio with seamless light cream backdrop, smooth soft-toned floor producing subtle natural shadows

photographic lighting: soft flattering high-end studio lighting — large softbox key light from front-left creating gentle highlights on the dress and face, balanced fill light reducing harsh shadows, subtle rim light separating subject from background

high dynamic range, precise color accuracy, luxurious editorial quality, visible natural skin texture, fabric sheen, tulle volume detail, realistic balloon reflections, authentic children's portrait photography quality`,
  },
  {
    id: "mulher-academia",
    label: "Mulher — Academia",
    description: "Ensaio fitness/musculação seguindo o padrão do `mulher-adulto`: halteres, espelho, deadlift, esteira, boxing",
    texto: `Ultra-realistic photo, 8K resolution, full-body vertical portrait of a woman standing in [DESCREVER CENÁRIO DE ACADEMIA. Ex: a modern weight-training room next to a heavy-duty squat rack with a loaded olympic barbell at chest height]. She is wearing [DESCREVER ROUPA DETALHADA: tecido + cor + corte + acabamento. Ex: a fitted high-support sports bra in matte black with thin elastic straps and mesh ventilation panels at the upper back, paired with high-waist black seamless leggings made of a slightly compressive technical fabric showing realistic compression folds at the hips and behind the knees, and subtle natural micro-creases where the fabric bends]. The fabric has [DESCREVER TEXTURA: ex: a smooth matte technical sheen with realistic compression folds and subtle natural micro-creases at the elbows and behind the knees]. She is wearing [DESCREVER CALÇADO: ex: low-cut black athletic training shoes with white sole and visible lacing texture]. In one hand, she holds [DESCREVER OBJETO TEMÁTICO: ex: a single medium hex dumbbell at hip level with relaxed grip, the other arm relaxed along her body], with realistic [material/textura do objeto].

${PRESERVATION_WOMAN}

The setting is [DESCREVER AMBIENTE COM RIQUEZA. Ex: a real high-end gym with black rubber tile flooring showing realistic worn-in texture and small chalk marks, a heavy steel squat rack in the foreground with the loaded barbell and weight plates showing realistic metal wear, scratches, and chipped paint on the plates. Behind her, a tall dumbbell tower holds organized rows of hex dumbbells of varying weights with realistic rubber-coated heads. The walls are exposed dark gray concrete with subtle texture variation].

Photographic lighting is [DESCREVER ILUMINAÇÃO REAL DO LUGAR — não receita softbox. Ex: real overhead gym lighting: warm pendant lights mounted on industrial black cables creating directional warm key light from above-front, soft natural fill from the ambient room reducing harsh shadows, and a faint cool rim light from a back-corner window separating her silhouette from the dark gym background]. Natural shadow gradients are visible along the leggings folds and on the rubber floor.

Shot with a full-frame DSLR or mirrorless camera, 85mm prime lens, shallow depth of field, sharp focus on the subject, soft natural background bokeh showing the gym equipment in slight blur, camera at approximately chest height for a natural perspective. Texture and material realism emphasized: matte technical fabric of the sportswear, rubber-coated dumbbell heads, knurled steel barbell texture, worn rubber flooring, subtle skin texture on visible areas, and natural imperfections such as minor fabric creases, small chalk dust on hands, and slight asymmetry in the equipment arrangement. Clean, high-dynamic-range image with balanced contrast, natural color grading, and lifelike skin tones.`,
  },
  {
    id: "menino-aniversario",
    label: "Menino — Aniversário",
    description: "Aniversário infantil masculino: super-herói, futebol, astronauta, racing/Hot Wheels, dinossauro/safari, pirata",
    texto: `Ultra-realistic photo in 8K resolution of a happy {idade}-year-old boy (age: {idade}) celebrating his birthday in [DESCREVER CENÁRIO TEMÁTICO. Escolha UM tema e detalhe — exemplos:
- SUPER-HERÓI: a comic-book themed birthday set with a city skyline backdrop, oversized POW/BAM speech-bubble props, red and blue color palette
- FUTEBOL: a soccer-themed setup with a synthetic grass floor, mini goalpost, scattered soccer balls, scoreboard reading "{idade}", green and white color palette
- ASTRONAUTA / ESPAÇO: a cosmic-themed studio with deep navy backdrop, hanging silver planets and stars, a child-sized cardboard rocket, metallic silver and electric blue palette
- RACING / HOT WHEELS: a race-track themed scene with checkered flag backdrop, orange Hot Wheels track loops, mini race cars on a side table, red/orange/black palette
- DINOSSAURO / SAFARI: a jungle-themed setup with tropical palm leaves, dinosaur figurines (T-Rex, Triceratops), wooden crates, earthy green and amber palette
- PIRATA: a treasure-hunt scene with a wooden ship wheel prop, treasure chest overflowing with gold coins, rope details, navy and gold palette
]. The boy is [DESCREVER POSE: ex: standing confidently in the center with hands on his hips like a hero, torso angled slightly toward the camera, chin up, feet planted shoulder-width apart]. His expression is [DESCREVER EXPRESSÃO: ex: a wide genuine smile showing pure joy, bright eyes full of excitement, natural childlike happiness — never forced or staged].

${PRESERVATION_CHILD}

The boy is wearing [DESCREVER FIGURINO TEMÁTICO COMPLETO — combinar com o cenário escolhido. Exemplos:
- SUPER-HERÓI: a high-quality Spider-Man / Batman / Captain America costume in matte fabric with realistic stitching, fitted to a child's body, matching cape flowing slightly behind, child-sized boots
- FUTEBOL: an authentic-looking soccer kit (jersey + shorts + long socks) in his favorite team colors, with subtle club crest, fabric showing realistic mesh texture and sweat-wicking detail, professional cleats
- ASTRONAUTA: a detailed white astronaut suit with realistic patches, fabric ribbing at joints, helmet held under one arm or placed on a side table, silver boots
- RACING: a miniature racing driver suit in red and black with sponsor patches, fireproof-fabric look with stitched seams, racing gloves, helmet on a side table
- DINOSSAURO/SAFARI: a khaki explorer outfit — beige cargo shorts, short-sleeve safari shirt with chest pockets, brown leather belt, small binoculars hanging from neck, sturdy hiking sandals
- PIRATA: a classic pirate outfit — white ruffled shirt, black vest, red sash at waist, dark trousers, small toy cutlass at hip, tricorn hat tilted slightly
]. The fabric has [DESCREVER TEXTURA: ex: visible weave detail, realistic folds at elbows and knees from natural child movement, no plastic-doll smoothness].

[DESCREVER OBJETOS E DECORAÇÃO. Exemplos:
- behind the boy, two oversized metallic foil number balloons reading "{idade}" float at head level with glossy reflective surface matching the theme palette
- additional cluster of latex balloons in the theme colors arranged in an organic asymmetric balloon-arch on both sides
- a themed birthday cake on a side table — themed topper, smooth fondant or buttercream finish, decorative elements matching the scene (e.g., edible figurines, themed sprinkles)
- 2–3 themed props placed naturally around the set (NOT cluttered) reinforcing the chosen theme
- IMPORTANT: no extra numbers, no digits, no readable text on any decoration except the main "{idade}" number balloon and (optionally) a single small themed sign
]

The background is [DESCREVER FUNDO: ex: a clean professional studio with a seamless backdrop in the dominant theme color, smooth floor producing subtle natural shadows, depth softened by shallow focus].

Photographic lighting: large softbox key light from front-left creating gentle warm highlights on the face and costume, balanced fill light eliminating harsh shadows, subtle rim light separating the boy from the background, overall warm festive tone with cinematic richness — never flat, never overexposed.

Shot with a full-frame DSLR camera, 85mm prime portrait lens, eye-level perspective adjusted to the child's height (slight downward angle, NOT shooting from above adult-height), shallow depth of field with tack-sharp focus on the boy's face and creamy thematic bokeh in the background.

High dynamic range, precise color accuracy, luxurious editorial children's portrait quality, visible natural skin texture, fabric weave detail, balloon glossy reflections, realistic material imperfections, authentic high-end children's birthday photography. Preserve childlike facial proportions — round cheeks, large eyes relative to face, soft features — do NOT adultize the subject.`,
  },
  {
    id: "homem-adulto",
    label: "Homem adulto",
    description: "Retrato masculino, corporativo masculino",
    texto: `Ultra-realistic photo in 8K resolution of [DESCREVER CENÁRIO: ex: a professional corporate portrait in a minimalist studio]. A man is [DESCREVER POSE: ex: standing confidently facing the camera with arms crossed, shoulders relaxed, slight tilt of the head]. His expression is [DESCREVER EXPRESSÃO: ex: confident and approachable with a subtle smile].

${PRESERVATION_MAN}

He is wearing [DESCREVER ROUPA: tecido + cor + corte. Ex: a well-tailored navy blue wool suit with a crisp white dress shirt and a slim dark tie, classic leather shoes]. The fabric has [DESCREVER TEXTURA: ex: visible subtle weave, clean tailoring lines, natural wrinkles at elbows].

[DESCREVER AMBIENTE/OBJETOS. Ex:
- Modern office background with soft depth of field
- Professional setting with subtle accent colors
]

Photographic lighting: softbox key light from front-right creating defined but soft highlights, balanced fill to preserve detail in shadows, rim light for separation. Shadows soft and controlled.

Shot with a full-frame camera, 85mm prime lens, eye-level perspective, shallow depth of field with tack-sharp focus on face.

High dynamic range, professional color grading, visible natural skin texture including pores and subtle imperfections, realistic fabric detail, authentic high-end portrait photography quality.`,
  },
];

/** Extrai a versão "raw" (sem placeholders de colchetes) pra preview. */
export function sanitizeTemplate(texto: string): string {
  return texto.replace(/\[[^\]]+\]/g, "").replace(/\n\n+/g, "\n\n").trim();
}
