import { GoogleGenAI } from "@google/genai";

// --- 1. IEKŠĒJĀS TIPA DEFINĪCIJAS ---
export type ImageSize = "16:9" | "1:1" | "9:16";

// --- 2. AUDIO ILGUMA NOTEIKŠANA ---
export async function getAudioDuration(audioUrl: string): Promise<number> {
  return new Promise((resolve) => {
    const audio = new Audio();
    audio.src = audioUrl;
    audio.addEventListener('loadedmetadata', () => resolve(audio.duration));
    audio.addEventListener('error', () => resolve(0));
  });
}

// --- 3. BALSS ĢENERĒŠANA (ElevenLabs) ---
export const generateAudio = async (text: string): Promise<string> => {
  // NOLASĀM ATSLĒGU TIKAI TAGAD (Fail-Safe)
  const API_KEY = import.meta.env.VITE_ELEVENLABS_API_KEY || "";
  
  if (!API_KEY || API_KEY.length < 10) {
    // Ja nav atslēgas, vienkārši atgriežam tukšu, lai neuzkaras
    console.warn("⚠️ ElevenLabs atslēga nav atrasta, izlaižam balss ģenerēšanu.");
    return "";
  }

  try {
    const voiceId = "pNInz6obpgDQGcFmaJgB"; // Adam
    console.log(`🎙️ Sūtam pieprasījumu uz ElevenLabs...`);

    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "xi-api-key": API_KEY,
      },
      body: JSON.stringify({
        text: text,
        model_id: "eleven_multilingual_v2", 
        voice_settings: { stability: 0.5, similarity_boost: 0.75 }
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("❌ ELEVENLABS KĻŪDA:", JSON.stringify(errorData, null, 2));
      return "";
    }

    const audioBlob = await response.blob();
    const audioUrl = URL.createObjectURL(audioBlob);
    console.log("✅ Balss saņemta!");
    return audioUrl;

  } catch (error) {
    console.error("❌ Tīkla kļūda (Audio):", error);
    return "";
  }
};

// --- 4. ATTĒLU ĢENERĒŠANA (Gemini Imagen - FIX) ---
export const generateImage = async (basePrompt: string, size: ImageSize): Promise<string> => {
  console.log(`🎨 Sākam attēla ģenerēšanu (${size})...`);

  // --- KRITISKAIS LABOJUMS ---
  // Mēs nolasām atslēgu TIEŠI ŠEIT UN TAGAD, nevis faila sākumā.
  // Tas garantē, ka .env fails ir ielādēts.
  const apiKey = import.meta.env.VITE_GOOGLE_API_KEY;

  // Debug - pārbaudām konsolē (nerādot pašu atslēgu)
  if (apiKey) {
      console.log("✅ API Atslēga tika veiksmīgi nolasīta no vides mainīgajiem.");
  } else {
      console.error("❌ KĻŪDA: VITE_GOOGLE_API_KEY ir tukšs vai undefined!");
      return "https://placehold.co/1280x720/ef4444/FFF?text=API+Key+Missing";
  }

  try {
    // Inicializējam tieši pirms lietošanas
    const ai = new GoogleGenAI({ apiKey: apiKey });
    
    // Izvēlamies Imagen modeli
    const model = ai.getGenerativeModel({ model: "imagen-3.0-generate-001" });

    // Pielāgojam promptu
    let aspectRatioPrompt = "";
    if (size === "16:9") aspectRatioPrompt = "Wide landscape aspect ratio, cinematic view.";
    else if (size === "9:16") aspectRatioPrompt = "Tall vertical portrait aspect ratio.";

    const fullPrompt = `${basePrompt}. ${aspectRatioPrompt} High quality, detailed.`;

    // Sūtam pieprasījumu
    const result = await model.generateContent(fullPrompt);
    const response = await result.response;
    
    const generatedText = response.text();

    if (!generatedText) {
        throw new Error("Tukša atbilde no Imagen");
    }
    
    console.log("✅ Attēls ģenerēts veiksmīgi!");

    // Pārbaude
    if (!generatedText.startsWith("http") && !generatedText.startsWith("data:image")) {
        console.warn("Imagen neatgrieza tiešu URL:", generatedText);
         return `https://placehold.co/1280x720/FFA500/FFF?text=Check+Console+For+Image`;
    }

    return generatedText;

  } catch (error) {
    console.error("❌ Attēla ģenerēšanas kļūda:", error);
    return "https://placehold.co/1280x720/ef4444/FFF?text=Generation+Error";
  }
};
