// --- ENUMS ---

export enum ProjectMode {
  EXPLAINER = 'EXPLAINER',
  PRESENTATION = 'PRESENTATION'
}

export enum VisualStyle {
  CINEMATIC = 'Cinematic',
  REALISTIC = 'Realistic',
  ANIMATED = 'Animated',
  MINIMALIST = 'Minimalist',
  NEON = 'Neon',
  RETRO = 'Retro',
  FANTASY = 'Fantasy',
  CYBERPUNK = 'Cyberpunk'
}

export enum ImageSize {
  SIZE_1K = '1K',
  SIZE_4K = '4K'
}

export enum ImageAspectRatio {
  LANDSCAPE = '16:9',
  PORTRAIT = '9:16'
}

export enum Language {
  LV = 'LV',
  EN = 'EN',
  RU = 'RU',
  DE = 'DE',
  FR = 'FR',
  ES = 'ES'
}

// --- CONSTANTS ---

export interface LanguageInfo {
  name: string;
  locale: string;
}

export const LanguageData: Record<Language, LanguageInfo> = {
  [Language.LV]: { name: "Latvian", locale: "lv-LV" },
  [Language.EN]: { name: "English", locale: "en-US" },
  [Language.RU]: { name: "Russian", locale: "ru-RU" },
  [Language.DE]: { name: "German", locale: "de-DE" },
  [Language.FR]: { name: 'French', locale: 'fr-FR' },
  [Language.ES]: { name: 'Spanish', locale: 'es-ES' }
};

// --- NEW TYPES FOR MULTI-AGENT V2 ---

// JAUNS: Definējam divus attēlu tipus (Daba vs Tehnika)
// Tas ļauj aģentiem izlemt, vai drīkst lietot tekstu attēlā
export type ImageBranch = 'nature' | 'technical';

// --- INTERFACES ---

export interface PresentationPoint {
  visual_text: string;
  spoken_text: string;
  audio_url?: string;
  duration_ms?: number;
}

export interface Slide {
  id: string;
  visual_prompt: string;
  image_url?: string;
  duration_ms: number;

  // Explainer Mode
  text_content: string;
  audio_url?: string;

  // Presentation Mode
  heading?: string;
  intro_audio?: string;
  intro_audio_url?: string;
  intro_duration_ms?: number;
  points?: PresentationPoint[];

  // --- JAUNIE LAUKI (V2 Dual Branch) ---
  
  // Norāda, kurš zars ģenerēja šo slaidu ('nature' vai 'technical')
  image_branch?: ImageBranch; 
  
  // Tehniskā zara papildinājums: formulas un uzraksti, ko uzlikt virsū (Overlay)
  technical_overlays?: {
    label: string;
    formula?: string;
  }[];
}

export interface Project {
  id: string;
  topic: string;
  mode: ProjectMode;
  slides: Slide[];
  imageSize: ImageSize;
  aspectRatio: ImageAspectRatio;
  visualStyle: VisualStyle;
  createdAt: number;
  
  // Media
  backgroundMusicBase64?: string;
  musicVolume?: number;
  logoBase64?: string;
}

// --- AGENT INTERFACES ---

// 1. Drošinātājs: Pārbaudes rezultāts
export interface ValidationResult {
  isValid: boolean;     // Vai viss ir kārtībā? (True/False)
  errors: string[];     // Saraksts ar kļūdām, ja tādas ir
}

// 2. Ierobežotājs: Aģenta noteikumi
export interface AgentConstraint {
  maxRetries: number;       // Cik reizes mēģināt, ja neizdosies (piem., 3 reizes)
  timeoutMs: number;        // Cik ilgi gaidīt atbildi (milisekundēs)
  requireJson: boolean;     // Vai obligāti vajag JSON formātu? (Jā)
}

// 3. Konteksts: Darba uzdevums
export interface AgentContext {
  topic: string;            // Tēma
  tone: string;             // Tonis
  style: VisualStyle;       // Vizuālais stils
  sourceText?: string;      // Pievienotais fails (ja ir)
  targetLanguage: string;   // Valoda
}