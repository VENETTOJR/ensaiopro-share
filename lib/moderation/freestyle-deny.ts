/**
 * Validação de prompts freestyle (Story 06 — FR-5.3, AC5.3, NFR-5.1).
 *
 * Bloqueia 4 categorias:
 *   - NSFW óbvio (sexual explícito, pt/en, sinônimos)
 *   - Conteúdo infantil (criança, child, kid, etc — proibido por compliance)
 *   - Celebridades famosas (lista deny ~50 nomes — pode ser editada por admin)
 *   - Marcas registradas óbvias (Disney, Marvel, Apple, Coca-Cola, etc)
 *
 * Princípio §1.bis: motivo retornado pro user é NEUTRO ("Esse conteúdo não pode
 * ser gerado."). Motivo técnico vai SÓ pra log admin (freestyle_moderation_log).
 */

const NSFW_TERMS = [
  // Português
  "nu", "nua", "nudez", "pelado", "pelada", "peito", "peitos", "seio", "seios",
  "bunda", "rabo", "cu", "buceta", "xota", "pênis", "penis", "pinto", "rola",
  "pornô", "porno", "pornografia", "sexo explícito", "fudendo", "transando",
  "masturbação", "orgia", "orgasmo",
  // Inglês
  "nude", "naked", "nudity", "topless", "boobs", "tits", "breast", "ass",
  "pussy", "vagina", "dick", "cock", "penis", "porn", "porno", "pornography",
  "explicit sex", "fucking", "masturbation", "orgasm", "orgy",
  "nsfw", "xxx", "rated x", "hardcore",
];

const CHILD_TERMS = [
  // Português
  "criança", "crianças", "menino", "menina", "bebê", "bebe", "infantil",
  "infante", "menor de idade", "filho pequeno", "filha pequena",
  // Inglês
  "child", "children", "kid", "kids", "minor", "underage",
  "toddler", "infant", "baby", "young girl", "young boy",
  "teen", "teenager", "preteen",
];

const CELEBRITY_DENY = [
  // BR
  "anitta", "neymar", "bruna marquezine", "luan santana", "sabrina sato",
  "xuxa", "ivete sangalo", "claudia leitte", "paula fernandes", "marília mendonça",
  "gusttavo lima", "wesley safadão", "felipe araújo", "jorge e mateus",
  "ronaldinho", "pelé", "gabigol", "vinícius júnior", "casemiro",
  // Internacionais
  "taylor swift", "beyoncé", "rihanna", "ariana grande", "selena gomez",
  "miley cyrus", "katy perry", "lady gaga", "justin bieber", "harry styles",
  "drake", "kanye west", "ye", "kim kardashian", "kylie jenner", "kendall jenner",
  "elon musk", "donald trump", "joe biden", "kamala harris", "barack obama",
  "messi", "cristiano ronaldo", "lebron james", "mike tyson",
  "tom cruise", "leonardo dicaprio", "brad pitt", "angelina jolie",
  "scarlett johansson", "robert downey", "chris hemsworth", "tom holland",
  "zendaya", "timothée chalamet", "margot robbie", "emma stone",
];

const BRAND_DENY = [
  "disney", "pixar", "marvel", "dc comics", "warner bros", "universal pictures",
  "nintendo", "playstation", "xbox", "fortnite", "minecraft", "roblox",
  "apple logo", "google logo", "microsoft logo", "amazon logo",
  "coca-cola", "coca cola", "pepsi", "mcdonald's", "mcdonalds", "burger king",
  "starbucks", "nike logo", "adidas logo", "louis vuitton", "gucci", "chanel",
  "rolex", "ferrari", "lamborghini", "porsche logo", "tesla logo",
  "harry potter", "hogwarts", "lord of the rings", "star wars", "jedi",
  "mickey mouse", "donald duck", "spider-man", "batman", "superman",
  "iron man", "captain america", "thor", "hulk",
];

export interface ModerationResult {
  ok: boolean;
  /** Motivo TÉCNICO (admin-only). Retornar mensagem NEUTRA pro user. */
  reason?: string;
  /** Categoria do bloqueio: 'nsfw' | 'child' | 'celebrity' | 'brand' */
  category?: "nsfw" | "child" | "celebrity" | "brand";
}

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove acentos
    .replace(/[^\w\s]/g, " ") // mantém só letra/digito/espaço
    .replace(/\s+/g, " ")
    .trim();
}

function containsAny(text: string, list: string[]): string | null {
  for (const term of list) {
    const t = normalize(term);
    // Match com word boundary suave (espaço ou início/fim)
    const re = new RegExp(`(^|\\s)${t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(\\s|$)`);
    if (re.test(text)) return term;
  }
  return null;
}

/**
 * Valida o prompt. Retorna ok=false e motivo técnico pra log admin.
 * Caller decide quando mostrar mensagem neutra ao user.
 */
export function validateFreestylePrompt(rawText: string): ModerationResult {
  if (!rawText || typeof rawText !== "string") {
    return { ok: false, reason: "prompt vazio", category: "nsfw" };
  }
  const text = rawText.trim();
  if (text.length < 20) {
    return { ok: false, reason: `prompt muito curto (${text.length} chars)`, category: "nsfw" };
  }
  if (text.length > 3000) {
    return { ok: false, reason: `prompt muito longo (${text.length} chars)`, category: "nsfw" };
  }

  const norm = normalize(text);

  const childHit = containsAny(norm, CHILD_TERMS);
  if (childHit) return { ok: false, reason: `child term: ${childHit}`, category: "child" };

  const nsfwHit = containsAny(norm, NSFW_TERMS);
  if (nsfwHit) return { ok: false, reason: `nsfw term: ${nsfwHit}`, category: "nsfw" };

  const celebHit = containsAny(norm, CELEBRITY_DENY);
  if (celebHit) return { ok: false, reason: `celebrity: ${celebHit}`, category: "celebrity" };

  const brandHit = containsAny(norm, BRAND_DENY);
  if (brandHit) return { ok: false, reason: `brand: ${brandHit}`, category: "brand" };

  return { ok: true };
}
