import { GoogleGenAI, Modality } from "@google/genai";
import { ImageSize, VisualStyle } from "../types";

// ------------------------------------------------------------------
// ELEVENLABS KONFIGURĀCIJA
// Iekopē savu "sk_..." atslēgu zemāk pēdiņās.
// Mēs izdzēsām process.env, lai tas netraucētu pārlūkam.
const ELEVENLABS_API_KEY = "sk_133b207a40e066459dccb49d350bcdfea3dc4856eee4b593"; // <--- IELĪMĒ SAVU ATSLĒGU ŠEIT

// Šis ir balss ID (Rachel - populāra, mierīga balss). 
// Vari vēlāk nomainīt uz citu no ElevenLabs bibliotēkas.
const VOICE_ID = "21m00Tcm4TlvDq8ikWAM"; 
// ------------------------------------------------------------------

const SAMPLE_RATE = 24000;
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Tālāk seko tava retryOperation funkcija... (to atstāj kā ir)

async function retryOperation<T>(operation: () => Promise<T>, retries: number = 3, delayMs: number = 2000): Promise<T> {
  try {
    return await operation();
  } catch (error: any) {
    if (retries <= 0) throw error;
    // Don't retry on specific fatal errors if needed, but generally we retry
    console.warn(`Retry in ${delayMs}ms...`, error.message);
    await delay(delayMs);
    return retryOperation(operation, retries - 1, delayMs * 2);
  }
}

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) { view.setUint8(offset + i, string.charCodeAt(i)); }
}

function pcmToWav(pcmData: Uint8Array, sampleRate: number = SAMPLE_RATE): Blob {
  const wavHeader = new ArrayBuffer(44);
  const view = new DataView(wavHeader);
  writeString(view, 0, 'RIFF'); view.setUint32(4, 36 + pcmData.length, true); writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt '); view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true); view.setUint32(24, sampleRate, true); view.setUint32(28, sampleRate * 2, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true); 
  writeString(view, 36, 'data'); view.setUint32(40, pcmData.length, true);
  return new Blob([wavHeader, pcmData], { type: 'audio/wav' });
}

function decodeBase64(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) { bytes[i] = binaryString.charCodeAt(i); }
  return bytes;
}

// --- IMAGE GENERATION (UPDATED) ---
export const generateImage = async (basePrompt: string, size: ImageSize, style?: string): Promise<string> => {
  // IELIEC SAVU GOOGLE (GEMINI) ATSLĒGU ŠEIT:
  const ai = new GoogleGenAI({ apiKey: "AIzaSyBRbciebifR9Ie3lwQSCulN1ccEZr3gt8s" }); 
  
  // Pārējais kods paliek kā ir...

  const finalPrompt = style 
    ? `${style} style. ${basePrompt}` 
    : basePrompt;

  const generateWithModel = async (model: string, config: any) => {
    try {
        const response = await ai.models.generateContent({
          model: model,
          contents: { parts: [{ text: finalPrompt }] },
          config: config,
        });
        
        // Check for image data
        for (const part of response.candidates?.[0]?.content?.parts || []) {
            if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
        }
        
        // Check if model returned text (refusal)
        const textPart = response.candidates?.[0]?.content?.parts?.[0]?.text;
        if (textPart) {
             throw new Error(`Model returned text instead of image: ${textPart.substring(0, 50)}...`);
        }

        throw new Error("No image data found in API response");
    } catch (e: any) {
        throw e;
    }
  };

  return retryOperation(async () => {
      // Logic: 
      // 1. If 1K -> Use Flash.
      // 2. If > 1K -> Try Pro. If Pro fails (Auth, No Data, Safety), FALLBACK to Flash.
      
      if (size === ImageSize.SIZE_1K) {
          return await generateWithModel('gemini-2.5-flash-image', { imageConfig: { aspectRatio: "16:9" } });
      } else {
          try {
            return await generateWithModel('gemini-3-pro-image-preview', { imageConfig: { aspectRatio: "16:9", imageSize: size } });
          } catch (error: any) {
            console.warn(`Pro Image Gen failed (${error.message}). Falling back to Flash.`);
            // Fallback to Flash
            return await generateWithModel('gemini-2.5-flash-image', { imageConfig: { aspectRatio: "16:9" } });
          }
      }
  }, 2, 2000); // 2 retries
};

const generateElevenLabsAudio = async (text: string, voiceId: string): Promise<string> => {
  if (!ELEVENLABS_API_KEY || ELEVENLABS_API_KEY.includes("TAVA_")) throw new Error("Missing API Key");
  return retryOperation(async () => {
      const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
        method: 'POST',
        headers: { 'xi-api-key': ELEVENLABS_API_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, model_id: "eleven_multilingual_v2", voice_settings: { stability: 0.5, similarity_boost: 0.75 } })
      });
      if (!response.ok) { const err = await response.json(); throw new Error(`ElevenLabs: ${JSON.stringify(err)}`); }
      const blob = await response.blob();
      return URL.createObjectURL(blob);
  }, 2, 1000);
};

export const generateAudio = async (text: string, locale: string = 'lv-LV', provider: 'gemini' | 'elevenlabs' = 'gemini', voiceId: string = '21m00Tcm4TlvDq8ikWAM'): Promise<string> => {
  if (provider === 'elevenlabs') return await generateElevenLabsAudio(text, voiceId);
  return retryOperation(async () => {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text }] }],
        config: { responseModalities: [Modality.AUDIO], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } } },
      });
      const base64 = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (!base64) throw new Error("No audio");
      return URL.createObjectURL(pcmToWav(decodeBase64(base64), SAMPLE_RATE));
  }, 3, 2000);
};

export const getAudioDuration = (audioUrl: string): Promise<number> => {
  return new Promise<number>((resolve) => {
     const audio = new Audio(audioUrl);
     audio.onloadedmetadata = () => {
         if (audio.duration === Infinity || isNaN(audio.duration)) {
             audio.currentTime = 1e101;
             audio.ontimeupdate = () => { audio.ontimeupdate = null; resolve(audio.duration * 1000); }
         } else { resolve(audio.duration * 1000); }
     };
     audio.onerror = () => resolve(5000);
  });
};
