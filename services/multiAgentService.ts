import { GoogleGenAI } from "@google/genai";
import { Project, Slide, VisualStyle, ProjectMode, ImageSize, ImageAspectRatio, AgentConstraint, AgentContext, ImageBranch } from "../types";

export type AgentStatusCallback = (agentName: string, status: string) => void;

const cleanJsonString = (str: string) => {
  return str.replace(/```json/g, "").replace(/```/g, "").trim();
};

// --- BĀZES AĢENTS ---
class BaseAgent {
  protected ai: GoogleGenAI;
  protected model: string = 'gemini-2.5-flash';
  
  protected constraints: AgentConstraint = {
    maxRetries: 2,
    timeoutMs: 30000,
    requireJson: true
  };

  constructor() {
    this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  }

  protected async callGemini(systemPrompt: string, userContent: string, retryCount = 0): Promise<any> {
    try {
      const response = await this.ai.models.generateContent({
        model: this.model,
        contents: [
          { role: 'user', parts: [{ text: `SYSTEM: ${systemPrompt}\n\nUSER TASK: ${userContent}` }] }
        ],
        config: { responseMimeType: 'application/json' }
      });
      
      const text = response.text || "{}";
      const cleanedText = cleanJsonString(text);
      const parsedData = JSON.parse(cleanedText);

      if (!parsedData || Object.keys(parsedData).length === 0) {
          throw new Error("Saņemta tukša atbilde no AI");
      }
      return parsedData;

    } catch (e) {
      console.error(`Aģenta kļūda (Mēģinājums ${retryCount + 1}):`, e);
      if (retryCount < this.constraints.maxRetries) {
        return this.callGemini(systemPrompt, userContent, retryCount + 1);
      }
      throw new Error("Aģents nevarēja izpildīt uzdevumu.");
    }
  }
}

// --- 1. AĢENTS: ANALĪTIĶIS ---
class AnalystAgent extends BaseAgent {
  async analyze(ctx: AgentContext): Promise<{ key_themes: string[], dominant_branch: ImageBranch }> {
    const prompt = `
      Role: Senior Content Analyst.
      Task: Analyze input. Extract themes.
      CRITICAL DECISION: Determine dominant visual type.
      - 'nature': Scenery, people, abstract, real world photos.
      - 'technical': Diagrams, schematics, charts, chemical formulas, math.
      Output JSON: { "key_themes": ["string"], "dominant_branch": "nature" | "technical" }
    `;
    return this.callGemini(prompt, `Topic: ${ctx.topic}. Source snippet: ${ctx.sourceText?.substring(0, 1000) || "No source"}`);
  }
}

// --- 2. AĢENTS: STRUKTŪRAS ARHITEKTS (ROUTER) ---
// Tagad šis aģents izlemj "image_branch" katram slaidam atsevišķi
class StructureAgent extends BaseAgent {
  async createOutline(ctx: AgentContext, themes: string[]): Promise<{ slides: { title: string, purpose: string, image_branch: ImageBranch }[] }> {
    const prompt = `
      Role: Presentation Architect & Router.
      Task: Create slide outline.
      ROUTING LOGIC:
      For EACH slide, decide "image_branch":
      - 'nature': If slide needs emotional, photographic, or abstract background. (Text allowed).
      - 'technical': If slide explains a System, Formula, Process Map, or Data. (STRICT NO TEXT IN IMAGE).
      
      Output JSON: { 
        "slides": [ 
          { "title": "Headline", "purpose": "Explains X", "image_branch": "nature" | "technical" } 
        ] 
      }
    `;
    return this.callGemini(prompt, `Topic: ${ctx.topic}. Themes: ${themes.join(", ")}`);
  }
}

// --- 3. AĢENTS: SCENĀRISTS (ROUTER) ---
class ScriptwriterAgent extends BaseAgent {
  async writeScript(ctx: AgentContext, themes: string[]): Promise<{ segments: { text: string, visual_idea: string, image_branch: ImageBranch }[] }> {
    const prompt = `
      Role: Documentary Scriptwriter & Router.
      Tone: ${ctx.tone}. Language: ${ctx.targetLanguage}.
      Task: Write narration segments.
      ROUTING LOGIC:
      For EACH segment, decide "image_branch":
      - 'nature': Cinematic shots, real world, emotion.
      - 'technical': Schematics, blueprints, diagrams.
      
      Output JSON: { 
        "segments": [ 
          { "text": "Narration...", "visual_idea": "Description...", "image_branch": "nature" | "technical" } 
        ] 
      }
    `;
    return this.callGemini(prompt, `Topic: ${ctx.topic}. Themes: ${themes.join(", ")}`);
  }
}

// --- 4. AĢENTS: SATURA EKSPERTS ---
class ContentDetailAgent extends BaseAgent {
  async fillSlideDetails(ctx: AgentContext, slideTitle: string, purpose: string, branch: ImageBranch): Promise<any> {
    const prompt = `
      Role: Presentation Expert. Language: ${ctx.targetLanguage}.
      Task: Create content for slide "${slideTitle}" (${branch} mode).
      
      Output JSON: { 
        "intro_audio": "Short spoken intro...", 
        "points": [ { "visual_text": "Short bullet", "spoken_text": "Long explanation" } ],
        "visual_idea": "Description of the visual background"
      }
    `;
    return this.callGemini(prompt, `Context: ${purpose}. Tone: ${ctx.tone}`);
  }
}

// --- 5. AĢENTS: VIZUĀLAIS REŽISORS (DUAL BRANCH) ---
// Šis tagad ir sadalīts divās loģikās iekšēji
class VisualDirectorAgent extends BaseAgent {
  
  async createPrompt(ctx: AgentContext, visualIdea: string, branch: ImageBranch): Promise<{ visual_prompt: string }> {
    
    // ZARS 1: NATURE
    if (branch === 'nature') {
      const prompt = `
        Role: NATURE/CINEMATIC Prompt Engineer.
        Style: ${ctx.style}.
        Task: Create a high-quality image prompt.
        Rules:
        - Make it aesthetic, lighting-focused (golden hour, cinematic).
        - Text inside image is ALLOWED if appropriate (signs, titles).
        Output JSON: { "visual_prompt": "Cinematic shot of..." }
      `;
      return this.callGemini(prompt, `Idea: ${visualIdea}`);
    } 
    
    // ZARS 2: TECHNICAL
    else {
      const prompt = `
        Role: TECHNICAL DIAGRAM Prompt Engineer.
        Style: Technical Line Drawing / Blueprint / Clean Schematic.
        Task: Create a structural diagram prompt.
        CRITICAL CONSTRAINTS (Fail-Safe):
        - NO TEXT, NO LETTERS, NO NUMBERS in the image.
        - Only empty boxes, lines, arrows, geometric shapes.
        - Clean white or dark solid background.
        Output JSON: { "visual_prompt": "Technical schematic of... NO TEXT, empty placeholder boxes..." }
      `;
      return this.callGemini(prompt, `Idea: ${visualIdea}`);
    }
  }
}

// --- 6. ORĶESTRATORS ---

export const runMultiAgentPipeline = async (
  topic: string,
  mode: ProjectMode,
  style: VisualStyle,
  tone: string,
  imageSize: ImageSize,
  sourceText: string = "",
  onStatusUpdate: AgentStatusCallback
): Promise<Project> => {

  const ctx: AgentContext = {
    topic,
    tone: tone || "Professional",
    style,
    sourceText,
    targetLanguage: "Latvian"
  };

  const slides: Slide[] = [];

  try {
    // 1. ANALĪZE
    onStatusUpdate("Analītiķis", "Analizē tēmu un izvēlas vizuālo zaru...");
    const analyst = new AnalystAgent();
    const analysis = await analyst.analyze(ctx);
    const themes = analysis.key_themes || [topic];
    console.log(`Dominant branch identified: ${analysis.dominant_branch}`);

    // VIZUĀLAIS AĢENTS (Instancējam vienreiz)
    const director = new VisualDirectorAgent();

    if (mode === ProjectMode.PRESENTATION) {
      // === PREZENTĀCIJA ===
      onStatusUpdate("Arhitekts", "Plāno slaidu struktūru un tipus...");
      const architect = new StructureAgent();
      const outline = await architect.createOutline(ctx, themes);

      const detailAgent = new ContentDetailAgent();
      
      for (let i = 0; i < outline.slides.length; i++) {
        const s = outline.slides[i];
        // Fallback, ja aģents aizmirsa zaru
        const branch = s.image_branch || analysis.dominant_branch || 'nature'; 

        onStatusUpdate("Satura Eksperts", `Ģenerē saturu (${branch} režīms): ${s.title}...`);
        
        let details;
        try {
          details = await detailAgent.fillSlideDetails(ctx, s.title, s.purpose, branch);
        } catch (e) { continue; }

        // Ģenerējam Promptu atbilstoši zaram
        onStatusUpdate("Režisors", `Zīmē ${branch} vizuāli: ${s.title}...`);
        const viz = await director.createPrompt(ctx, details.visual_idea || s.purpose, branch);

        slides.push({
          id: `slide-${Date.now()}-${i}`,
          heading: s.title,
          intro_audio: details.intro_audio || "Ievads...",
          points: details.points || [],
          visual_prompt: viz.visual_prompt,
          image_branch: branch, // Saglabājam zaru vēsturei
          text_content: "", 
          duration_ms: 0
        });
      }

    } else {
      // === SKAIDROJOŠAIS ===
      onStatusUpdate("Scenārists", "Raksta stāstu un plāno vizuāļus...");
      const writer = new ScriptwriterAgent();
      const script = await writer.writeScript(ctx, themes);

      for (let i = 0; i < script.segments.length; i++) {
        const seg = script.segments[i];
        // Fallback zars
        const branch = seg.image_branch || analysis.dominant_branch || 'nature';

        onStatusUpdate("Režisors", `Veido ${branch} ainu ${i + 1}...`);
        
        let viz;
        try {
          viz = await director.createPrompt(ctx, seg.visual_idea, branch);
        } catch (e) {
           viz = { visual_prompt: `${style} style image representing ${topic}` };
        }

        slides.push({
          id: `slide-${Date.now()}-${i}`,
          text_content: seg.text,
          visual_prompt: viz.visual_prompt,
          image_branch: branch,
          duration_ms: 0
        });
      }
    }

  } catch (error) {
    console.error("Kritiska kļūda aģentu plūsmā:", error);
    onStatusUpdate("Sistēma", "Kļūda! Pārejam uz rezerves režīmu...");
    throw error;
  }

  onStatusUpdate("Sistēma", "Finalizē projektu...");

  return {
    id: crypto.randomUUID(),
    topic: topic,
    mode: mode,
    slides: slides,
    imageSize: imageSize,
    aspectRatio: ImageAspectRatio.LANDSCAPE,
    visualStyle: style,
    createdAt: Date.now()
  };
};