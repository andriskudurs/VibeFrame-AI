// --- 1. IEKŠĒJĀS TIPA DEFINĪCIJAS ---
export type ImageSize = "16:9" | "1:1" | "9:16";

// --- 2. KONFIGURĀCIJA ---

// PĀRLIECINIES, KA ŠEIT JOPROJĀM IR TAVA JAUNĀ ATSLĒGA (sk_f5...)!
// Ja tā pazūd kopējot, ieliec to atkal.
const ELEVENLABS_API_KEY = "sk_df178c92e402b2d5433cfeb3acc191423e1382d62f93351d"; // <--- ŠEIT JĀBŪT TAVAI ATSLĒGAI

// --- 3. AUDIO ILGUMA NOTEIKŠANA ---
export async function getAudioDuration(audioUrl: string): Promise<number> {
  return new Promise((resolve) => {
    const audio = new Audio();
    audio.src = audioUrl;
    audio.addEventListener('loadedmetadata', () => resolve(audio.duration));
    audio.addEventListener('error', () => resolve(0));
  });
}

// --- 4. BALSS ĢENERĒŠANA (ElevenLabs) ---
export const generateAudio = async (text: string): Promise<string> => {
  const API_KEY = ELEVENLABS_API_KEY.trim(); 
  
  console.log(`🔑 Mēģinām ar atslēgu (sākums): ${API_KEY.substring(0, 5)}...`);
  
  if (!API_KEY || API_KEY.length < 10) {
    console.error("❌ Kļūda: API atslēga izskatās tukša vai pārāk īsa!");
    return "";
  }

  try {
    // NOMAINĪJĀM BALSI UZ "ADAM" (Stabila un populāra)
    const voiceId = "pNInz6obpgDQGcFmaJgB"; 
    
    const logText = text.length > 20 ? text.substring(0, 20) + "..." : text;
    console.log(`🎙️ Sūtam pieprasījumu uz ElevenLabs (Modelis: Multilingual v2)...`);

    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "xi-api-key": API_KEY,
      },
      body: JSON.stringify({
        text: text,
        // SVARĪGI: Nomainījām modeli uz jaunāko, kas strādā visiem
        model_id: "eleven_multilingual_v2", 
        voice_settings: { stability: 0.5, similarity_boost: 0.75 }
      }),
    });

    if (!response.ok) {
      // ŠIS IR TAS, KAS PARĀDĪS PRECĪZU KĻŪDU
      const errorData = await response.json();
      console.error("❌ ELEVENLABS KĻŪDAS DETAĻAS:", JSON.stringify(errorData, null, 2));
      return "";
    }

    const audioBlob = await response.blob();
    const audioUrl = URL.createObjectURL(audioBlob);
    
    console.log("✅ URRĀ! Balss ir saņemta un strādā!");
    return audioUrl;

  } catch (error) {
    console.error("❌ Tīkla kļūda:", error);
    return "";
  }
};

// --- 5. ATTĒLU ĢENERĒŠANA (Safe Mode) ---
export const generateImage = async (basePrompt: string, size: ImageSize): Promise<string> => {
  return "https://placehold.co/1280x720/22c55e/FFF?text=System+Online"; 
};
