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
  // ATSLĒGU NOLASĀM TIKAI IZSAUKUMA BRĪDĪ (Drošībai)
  const API_KEY = import.meta.env.VITE_ELEVENLABS_API_KEY || "";
  
  if (!API_KEY || API_KEY.length < 10) {
    console.warn("⚠️ ElevenLabs atslēga nav atrasta.");
    return "";
  }

  try {
    const voiceId = "pNInz6obpgDQGcFmaJgB"; // Adam
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "xi-api-key": API_KEY },
      body: JSON.stringify({
        text: text,
        model_id: "eleven_multilingual_v2", 
        voice_settings: { stability: 0.5, similarity_boost: 0.75 }
      }),
    });

    if (!response.ok) return "";
    const audioBlob = await response.blob();
    return URL.createObjectURL(audioBlob);
  } catch (error) {
    return "";
  }
};

// --- 4. ATTĒLU ĢENERĒŠANA (Imagen - AR TAVU PROMPTU) ---
export const generateImage = async (basePrompt: string, size: ImageSize): Promise<string> => {
  console.log(`🎨 Saņemts prompts: "${basePrompt}"`); // Šeit redzēsi savu tekstu konsolē!

  // 1. Iegūstam atslēgu (Fail-Safe: nolasām funkcijas iekšienē)
  const apiKey = import.meta.env.VITE_GOOGLE_API_KEY;
  if (!apiKey) {
      console.error("❌ KĻŪDA: Trūkst API atslēgas priekš Imagen!");
      return "https://placehold.co/1280x720/ef4444/FFF?text=API+Key+Missing";
  }

  try {
    // 2. Inicializējam Google AI ar atslēgu
    const ai = new GoogleGenAI({ apiKey: apiKey });
    
    // 3. Izvēlamies modeli (pārliecinies, ka tavā reģionā Imagen 3 ir aktīvs)
    const model = ai.getGenerativeModel({ model: "imagen-3.0-generate-001" });

    // 4. Pielāgojam promptu izmēram
    let aspectRatioPrompt = "aspect ratio 16:9";
    if (size === "9:16") aspectRatioPrompt = "aspect ratio 9:16";
    
    // Šeit mēs apvienojam TAVU promptu ar tehniskajiem parametriem
    const fullPrompt = `${basePrompt}. ${aspectRatioPrompt}, photorealistic, high details.`;

    // 5. Sūtam uz Google
    const result = await model.generateContent(fullPrompt);
    const response = result.response;

    // 6. Nolasām Base64 bildi (jo Google nedod linku, bet dod faila datus)
    const candidates = response.candidates;
    if (candidates && candidates.length > 0) {
        const parts = candidates[0].content.parts;
        if (parts && parts.length > 0) {
            const inlineData = parts[0].inlineData;
            if (inlineData && inlineData.data) {
                console.log("✅ Attēls (Base64) ģenerēts!");
                return `data:${inlineData.mimeType || "image/png"};base64,${inlineData.data}`;
            }
        }
    }
    
    throw new Error("Neizdevās nolasīt attēlu.");

  } catch (error) {
    console.error("❌ Attēla ģenerēšanas kļūda:", error);
    return `https://placehold.co/1280x720/333/FFF?text=Imagen+Error`;
  }
};
