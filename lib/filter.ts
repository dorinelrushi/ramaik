/**
 * Albanian profanity filter and validator
 * Specifically filters: ropt, qifja, kurven, loqe, karo, picke (and common variations/inflections)
 */

// Normalized bad roots and exact match patterns
const FORBIDDEN_WORDS = [
  // ropt
  'ropt',
  'robt',
  'rop',
  // qifja
  'qifja',
  'qifsha',
  'qifsh',
  'qift',
  'qiu',
  'qire',
  'qirë',
  // kurven
  'kurven',
  'kurve',
  'kurva',
  'kurvë',
  'kurvat',
  // loqe
  'loqe',
  'loqja',
  'loqet',
  // karo
  'karo',
  'kari',
  'karin',
  'kar',
  'karuc',
  'karuç',
  // picke
  'picke',
  'picken',
  'pickë',
  'piçke',
  'piçkë',
  'piçken',
  'pidh',
  'pidhi',
  'pidhin',
];

/**
 * Normalize text: remove accents, normalize leetspeak/repeated characters
 */
export function normalizeText(text: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    // common substitutions
    .replace(/0/g, 'o')
    .replace(/1/g, 'i')
    .replace(/3/g, 'e')
    .replace(/4/g, 'a')
    .replace(/@/g, 'a')
    .replace(/\$/g, 's')
    .replace(/ç/g, 'c')
    .replace(/ë/g, 'e');
}

/**
 * Checks if a string contains any forbidden profanity (case-insensitive)
 */
export function containsProfanity(rawText: string): boolean {
  if (!rawText) return false;

  const normalized = normalizeText(rawText);

  // Check word boundaries and also check joined text (e.g. r.o.p.t -> ropt)
  const strippedOfPunctuation = normalized.replace(/[^a-z0-9]/g, ' ');
  const squashed = normalized.replace(/[^a-z0-9]/g, '');

  for (const word of FORBIDDEN_WORDS) {
    const normWord = normalizeText(word);

    // 1. Word boundary match in text with spaces
    const regex = new RegExp(`\\b${normWord}\\b`, 'i');
    if (regex.test(strippedOfPunctuation)) {
      return true;
    }

    // 2. Exact match if word is long enough (>= 4 chars) anywhere in squashed text
    if (normWord.length >= 4 && squashed.includes(normWord)) {
      return true;
    }

    // 3. For short words like 'kar', ensure it is matched as a standalone token or with standard suffixes
    if (normWord === 'kar' || normWord === 'rop') {
      const shortRegex = new RegExp(`(^|\\s|[^a-z])${normWord}($|\\s|[^a-z])`, 'i');
      if (shortRegex.test(rawText.toLowerCase())) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Replaces any forbidden word with asterisks so forbidden words are never shown on the web
 */
export function censorProfanity(text: string): string {
  if (!text) return '';
  let result = text;

  for (const word of FORBIDDEN_WORDS) {
    const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`\\b${escaped}\\b`, 'gi');
    result = result.replace(regex, '***');

    // Also censor variations with Albanian letters
    const normWord = normalizeText(word);
    if (normWord !== word) {
      const normEscaped = normWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const normRegex = new RegExp(`\\b${normEscaped}\\b`, 'gi');
      result = result.replace(normRegex, '***');
    }
  }

  return result;
}
