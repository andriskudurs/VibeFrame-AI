// Model Definitions

// 1. Logic & Thinking (ATSTĀJAM ŠO - TAS STRĀDĀ!)
// Šis veido scenāriju un domā. Gemini 3 ir lielisks.
export const MODEL_LOGIC = 'gemini-3-pro-preview'; 
export const LOGIC_THINKING_BUDGET = 32768;

// 2. Image Generation (IZLABOTS)
// "Imagen 3" ir Google jaunākais attēlu modelis.
// Ja tavs konts to vēl neatbalsta, kods automātiski mēģinās alternatīvu, 
// bet šis ir pareizais nosaukums.
export const MODEL_IMAGE = 'imagen-3.0-generate-001';

// 3. Text to Speech (IZLABOTS)
// "Gemini 2.5" neeksistē. Mēs izmantosim Flash, kas ir ātrs un lēts,
// vai arī vēlāk pieslēgsim ElevenLabs, ja gribēsi super-reālistisku balsi.
export const MODEL_TTS = 'gemini-1.5-flash';

// Default settings
export const DEFAULT_SLIDE_DURATION = 5000;
export const ESTIMATED_WORDS_PER_MINUTE = 150;
