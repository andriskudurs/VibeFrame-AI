import { GoogleGenAI } from "@google/genai";
import { ImageSize, VisualStyle } from "../types";

// --- 1. KONFIGURĀCIJA ---

// TAVA GOOGLE ATSLĒGA (Attēliem)
const GOOGLE_API_KEY = "AIzaSyCaj59GBI8VewfIcTgRMxvAdWMtexa-ulA"; 

// TAVA ELEVENLABS ATSLĒGA (Balsij)
const ELEVENLABS_API_KEY = "sk_133b207a40e066459dccb49d350bcdfea3dc4856eee4b593";

// --- 2. BALSS ĢENERĒŠANA (ElevenLabs) ---

export const generateAudio = async (text: string): Promise<string> => {
  // 1. TIEŠĀ ATSLĒGA (lai pārbaudītu, vai strādā)
  const API_KEY = ELEVENLABS_API_KEY; 
  
  console.log("🚀 Sākam generateAudio funkciju (JAUNAIS KODS)...");
  
  if (!API_KEY) {
    console.error("❌ Kļūda: Nav API atslēgas!");
    return "";
  }

  try {
    // Rachel balss (standarta, stabila balss)
    const voiceId = "21m00Tcm4TlvDq8ikWAM"; 

    console.log(`🎙️ Sūtam pieprasījumu uz ElevenLabs priekš teksta: "${text.substring(0, 20)}..."`);

    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "xi-api-key": API_KEY.trim(), // .trim() noņem nejaušas atstarpes
      },
      body: JSON.stringify({
        text: text,
        model_id: "eleven_monolingual_v1",
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
        }
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("❌ ElevenLabs API KĻŪDA:", errorData);
      return "";
    }

    const audioBlob = await response.blob();
    const audioUrl = URL.createObjectURL(audioBlob);
    
    console.log("✅ URRĀ! Audio saņemts veiksmīgi!");
    return audioUrl;

  } catch (error) {
    console.error("❌ Kritiska koda kļūda:", error);
    return "";
  }
};

// --- 3. ATTĒLU ĢENERĒŠANA (Gemini / Imagen) ---

export const generateImage = async (basePrompt: string, size: ImageSize, style?: string): Promise<string> => {
  console.log("🎨 Ģenerējam attēlu ar Gemini...");
  
  try {
    const ai = new GoogleGenAI({ apiKey: GOOGLE_API_KEY });
    
    // Mēģinām ar Imagen 3
    const model = ai.getGenerativeModel({ model: "imagen-3.0-generate-001" });
    
    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: basePrompt }] }]
    });

    // Pārbaude, vai ir atbilde
    if (!result.response) {
       throw new Error("Tukša atbilde no Gemini");
    }
    
    console.log("Attēls ģenerēts veiksmīgi (API atbildēja)!");
    
    // Pagaidu risinājums: atgriežam placeholder, lai pārliecinātos, ka kods nebrūk.
    // Vēlāk šeit varēsim ielikt loģiku, kas izvelk īsto bildes URL, ja Imagen to atgriež JSON formātā.
    return "https://placehold.co/1280x720/22c55e/FFF?text=Imagen+Success"; 
    
  } catch (error) {
    console.error("❌ Attēla kļūda:", error);
    return "https://placehold.co/1280x720/333/FFF?text=Image+Error";
  }
};
