import React, { useState, useEffect } from 'react';
import { Project, ImageSize, Slide, Language, LanguageData, VisualStyle, ProjectMode, ImageAspectRatio } from './types';
import { generateScript, translateTexts } from './services/geminiService';
import { generateImage, generateAudio, getAudioDuration } from './services/mediaService';
import { exportVideo } from './services/videoExportService';
import { SlideCard } from './components/SlideCard';
import { VideoPlayer } from './components/VideoPlayer';

const VOICE_OPTIONS = [
  { id: '21m00Tcm4TlvDq8ikWAM', name: 'Rachel (US Female)' },
  { id: 'ErXwobaDyN084deNv74k', name: 'Antoni (US Male)' },
  { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Bella (US Female)' },
  { id: 'TxGEqnHWrfWFTfGW9XjX', name: 'Josh (US Male)' },
];

const App: React.FC = () => {
  // State Management
  const [topic, setTopic] = useState<string>('');
  const [sourceFileContent, setSourceFileContent] = useState<string>('');
  const [sourceFileName, setSourceFileName] = useState<string>('');
  
  const [selectedImageSize, setSelectedImageSize] = useState<ImageSize>(ImageSize.SIZE_1K);
  const [aspectRatio, setAspectRatio] = useState<ImageAspectRatio>(ImageAspectRatio.LANDSCAPE);
  const [visualStyle, setVisualStyle] = useState<VisualStyle>(VisualStyle.CINEMATIC);
  const [projectMode, setProjectMode] = useState<ProjectMode>(ProjectMode.EXPLAINER);
  const [userTone, setUserTone] = useState<string>('');

  // AUDIO & MUSIC
  const [audioProvider, setAudioProvider] = useState<'gemini' | 'elevenlabs'>('gemini');
  const [elevenVoiceId, setElevenVoiceId] = useState<string>(VOICE_OPTIONS[0].id);
  const [backgroundMusicUrl, setBackgroundMusicUrl] = useState<string | undefined>(undefined);
  const [musicVolume, setMusicVolume] = useState<number>(0.15);

  const [project, setProject] = useState<Project | null>(null);
  const [isGeneratingScript, setIsGeneratingScript] = useState<boolean>(false);
  const [isGeneratingMedia, setIsGeneratingMedia] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [generationProgress, setGenerationProgress] = useState<string>('');
  const [exportProgress, setExportProgress] = useState<string>('');
  
  const [targetLanguage, setTargetLanguage] = useState<Language>(Language.LV);

  // Sinhronizējam UI skaļumu ar projektu
  useEffect(() => {
    if (project) {
        if (project.musicVolume !== undefined) setMusicVolume(project.musicVolume);
        if (project.visualStyle) setVisualStyle(project.visualStyle);
    }
  }, [project?.id]);

  const handleVolumeChange = (vol: number) => {
      setMusicVolume(vol);
      if (project) {
          setProject({ ...project, musicVolume: vol });
      }
  };

  // --- HANDLERS ---

  const handleSourceFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      setSourceFileContent(e.target?.result as string);
      setSourceFileName(file.name);
    };
    reader.readAsText(file);
  };
  const triggerSourceInput = () => document.getElementById('source-file-upload')?.click();

  const handleMusicUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !project) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        const base64Audio = e.target?.result as string;
        setProject({ ...project, backgroundMusicBase64: base64Audio, musicVolume: musicVolume });
    };
    reader.readAsDataURL(file);
  };

  // JAUNS: Logo augšupielāde
  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !project) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        const base64Logo = e.target?.result as string;
        setProject({ ...project, logoBase64: base64Logo });
    };
    reader.readAsDataURL(file);
  };

  const handleGenerateScript = async () => {
    if (!topic.trim() && !sourceFileContent) {
        alert("Lūdzu ievadiet tēmu vai pievienojiet failu.");
        return;
    }
    setIsGeneratingScript(true);
    setProject(null);
    try {
      const newProject = await generateScript(topic, selectedImageSize, visualStyle, userTone, projectMode, sourceFileContent);
      newProject.imageSize = selectedImageSize;
      newProject.aspectRatio = aspectRatio;
      newProject.musicVolume = musicVolume;
      setProject(newProject);
    } catch (error) {
      console.error("Script Gen Error:", error);
      alert("Kļūda ģenerējot scenāriju.");
    } finally {
      setIsGeneratingScript(false);
    }
  };
  
  const handleSlideUpdate = (id: string, field: string, newValue: any) => {
    if (!project) return;
    const updatedSlides = project.slides.map(slide => {
      if (slide.id === id) return { 
          ...slide, 
          [field]: newValue, 
          audio_url: undefined, 
          intro_audio_url: undefined, 
          duration_ms: 0 
      };
      return slide;
    });
    setProject({ ...project, slides: updatedSlides });
  };

  const handleClearSlideImage = (id: string) => {
    if (!project) return;
    const updatedSlides = project.slides.map(slide => {
      if (slide.id === id) {
          return { ...slide, image_url: undefined };
      }
      return slide;
    });
    setProject({ ...project, slides: updatedSlides });
  };

  const handleRegenerateAllImages = () => {
      if (!project) return;
      const confirmed = window.confirm(`Vai tiešām dzēst VISUS attēlus un ģenerēt no jauna ar stilu "${visualStyle}"? Audio saglabāsies.`);
      if (!confirmed) return;
      const clearedSlides = project.slides.map(s => ({ ...s, image_url: undefined }));
      setProject({ ...project, slides: clearedSlides, visualStyle: visualStyle });
  };

  // --- Slide Management Handlers ---
  const handleMoveSlide = (index: number, direction: 'up' | 'down') => {
      if (!project) return;
      const newSlides = [...project.slides];
      if (direction === 'up' && index > 0) {
          [newSlides[index], newSlides[index - 1]] = [newSlides[index - 1], newSlides[index]];
      } else if (direction === 'down' && index < newSlides.length - 1) {
          [newSlides[index], newSlides[index + 1]] = [newSlides[index + 1], newSlides[index]];
      }
      setProject({ ...project, slides: newSlides });
  };
  const handleDeleteSlide = (id: string) => {
      if (!project) return;
      if (project.slides.length <= 1) { alert("Projektam jābūt vismaz vienam slaidam."); return; }
      if (!window.confirm("Vai tiešām dzēst šo slaidu?")) return;
      const newSlides = project.slides.filter(s => s.id !== id);
      setProject({ ...project, slides: newSlides });
  };
  const handleAddSlide = () => {
      if (!project) return;

      const newId = `manual-slide-${Date.now()}`;
      
      // Noklusējuma prompts pielāgojas izvēlētajam stilam, lai lietotājam mazāk jāraksta
      const defaultPrompt = `${project.visualStyle} style background representing the topic`;

      let newSlide: Slide;

      if (project.mode === ProjectMode.PRESENTATION) {
          // --- PREZENTĀCIJAS REŽĪMS ---
          newSlide = {
              id: newId,
              visual_prompt: defaultPrompt,
              text_content: "", 
              duration_ms: 0,
              heading: "Jauna Sadaļa", 
              intro_audio: "Ievada teksts par šo sadaļu...", 
              points: [
                  { 
                      visual_text: "Galvenais arguments", 
                      spoken_text: "Plašāks skaidrojums par šo argumentu..." 
                  }
              ]
          };
      } else {
          // --- SKAIDROJOŠAIS (EXPLAINER) REŽĪMS ---
          newSlide = {
              id: newId,
              visual_prompt: defaultPrompt,
              text_content: "Ievadiet jauno tekstu šeit...",
              duration_ms: 0,
              heading: undefined,
              intro_audio: undefined,
              points: undefined
          };
      }

      setProject({ ...project, slides: [...project.slides, newSlide] });
      
      setTimeout(() => {
          window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
      }, 100);
  };

  const handleTranslateProject = async () => {
      if (!project) return;
      setIsGeneratingMedia(true);
      setGenerationProgress("Tulko tekstus...");
      
      try {
          const newSlides = [...project.slides];
          const targetLangName = LanguageData[targetLanguage].name;

          if (project.mode === ProjectMode.EXPLAINER) {
              // --- SKAIDROJOŠĀ REŽĪMA TULKOŠANA ---
              const textsToTranslate = newSlides.map(s => s.text_content);
              const translated = await translateTexts(textsToTranslate, targetLangName);
              
              for(let i=0; i<newSlides.length; i++) {
                  newSlides[i] = { ...newSlides[i], text_content: translated[i], audio_url: undefined };
              }

          } else {
              // --- PREZENTĀCIJAS REŽĪMA TULKOŠANA (FIXED) ---
              // Mēs ejam cauri katram slaidam un savācam tekstus masīvā, 
              // lai nosūtītu tos tulkot vienā batchā katram slaidam.
              
              for (let i = 0; i < newSlides.length; i++) {
                  let slide = newSlides[i];
                  
                  // 1. Savācam visus teksta laukus no šī slaida
                  const batchTexts: string[] = [];
                  
                  // Index 0: Heading
                  batchTexts.push(slide.heading || "");
                  // Index 1: Intro Audio Text
                  batchTexts.push(slide.intro_audio || "");
                  
                  // Index 2..N: Points Visual & Spoken
                  slide.points?.forEach(p => {
                      batchTexts.push(p.visual_text);
                      batchTexts.push(p.spoken_text);
                  });

                  // 2. Tulkojam batchu
                  const translatedBatch = await translateTexts(batchTexts, targetLangName);
                  
                  // 3. Saliekam atpakaļ
                  let tIndex = 0;
                  slide = {
                      ...slide,
                      heading: translatedBatch[tIndex++],
                      intro_audio: translatedBatch[tIndex++],
                      intro_audio_url: undefined, // Reset Audio
                      points: slide.points?.map(p => ({
                          ...p,
                          visual_text: translatedBatch[tIndex++],
                          spoken_text: translatedBatch[tIndex++],
                          audio_url: undefined // Reset Audio
                      }))
                  };
                  
                  newSlides[i] = slide;
                  setGenerationProgress(`Tulko slaidu ${i+1}/${newSlides.length}...`);
              }
          }

          setProject({ ...project, slides: newSlides });
          setIsGeneratingMedia(false); 
          setGenerationProgress("");
          alert(`Veiksmīgi iztulkots uz: ${targetLangName}. \nSpiediet "Ģenerēt Multividi", lai ierunātu tekstu jaunajā valodā.`);

      } catch (e) {
          console.error("Translation error", e);
          alert("Kļūda tulkošanas procesā. Pārbaudiet API atslēgu vai interneta savienojumu.");
          setIsGeneratingMedia(false);
      }
  };

  const generateMediaForSlides = async () => {
    if (!project) return;
    setIsGeneratingMedia(true);
    const updatedSlides = [...project.slides];
    const totalSlides = updatedSlides.length;
    const locale = LanguageData[targetLanguage].locale;

    try {
      for (let i = 0; i < updatedSlides.length; i++) {
        let slide = updatedSlides[i];
        setGenerationProgress(`Apstrādā slaidu ${i + 1} no ${totalSlides}...`);

        if (!slide.image_url) {
            try {
                const imageUrl = await generateImage(slide.visual_prompt, project.imageSize, visualStyle);
                slide = { ...slide, image_url: imageUrl };
            } catch (e) {
                slide = { ...slide, image_url: `https://placehold.co/1280x720/222/white?text=Image+Failed` };
            }
        }

        if (project.mode === ProjectMode.EXPLAINER) {
           if (!slide.audio_url && slide.text_content) {
               try {
                  const audioUrl = await generateAudio(slide.text_content, locale, audioProvider, elevenVoiceId);
                  const duration = await getAudioDuration(audioUrl);
                  slide = { ...slide, audio_url: audioUrl, duration_ms: duration };
               } catch (e) {
                  slide = { ...slide, duration_ms: 5000 }; 
               }
           }
        } else {
           if (slide.intro_audio && !slide.intro_audio_url) {
               try {
                   const introUrl = await generateAudio(slide.intro_audio, locale, audioProvider, elevenVoiceId);
                   const introDur = await getAudioDuration(introUrl);
                   slide = { ...slide, intro_audio_url: introUrl, intro_duration_ms: introDur };
               } catch (e) {}
           }
           if (slide.points) {
               const newPoints = [...slide.points];
               for(let p=0; p<newPoints.length; p++) {
                   if (!newPoints[p].audio_url && newPoints[p].spoken_text) {
                       try {
                           const pUrl = await generateAudio(newPoints[p].spoken_text, locale, audioProvider, elevenVoiceId);
                           const pDur = await getAudioDuration(pUrl);
                           newPoints[p] = { ...newPoints[p], audio_url: pUrl, duration_ms: pDur };
                       } catch (e) {}
                   }
               }
               slide = { ...slide, points: newPoints };
           }
           const totalPointDur = slide.points?.reduce((acc, p) => acc + (p.duration_ms || 0), 0) || 0;
           slide.duration_ms = (slide.intro_duration_ms || 0) + totalPointDur;
        }
        updatedSlides[i] = slide;
        setProject({ ...project, slides: updatedSlides });
      }
    } catch (e) { console.error("Generation Error", e); } 
    finally { setIsGeneratingMedia(false); setGenerationProgress(""); }
  };

  const handleExportVideo = async () => {
      if (!project) return;
      setIsExporting(true);
      setExportProgress('Sākam eksportu...'); 
      try {
          // Padodam arī LOGO
          await exportVideo(project, project.backgroundMusicBase64, project.musicVolume || 0.15, project.logoBase64, (msg) => setExportProgress(msg));
      } catch (e) {
          console.error("Export failed", e);
          alert("Eksports neizdevās.");
      } finally {
          setIsExporting(false);
          setExportProgress("");
      }
  };

  const handleSaveProject = () => {
    if (!project) return;
    const blob = new Blob([JSON.stringify(project)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vibe-project-${project.topic.replace(/\s+/g, '-').toLowerCase()}.json`;
    a.click();
  };

  const handleLoadProject = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const loaded = JSON.parse(e.target?.result as string) as Project;
            loaded.slides = loaded.slides.map(slide => ({
                ...slide,
                audio_url: slide.audio_url?.startsWith('blob:') ? undefined : slide.audio_url,
                intro_audio_url: slide.intro_audio_url?.startsWith('blob:') ? undefined : slide.intro_audio_url,
                points: slide.points?.map(p => ({ ...p, audio_url: p.audio_url?.startsWith('blob:') ? undefined : p.audio_url }))
            }));
            setProject(loaded);
            setTopic(loaded.topic || "");
            if (loaded.mode) setProjectMode(loaded.mode);
            if (loaded.aspectRatio) setAspectRatio(loaded.aspectRatio);
            if (loaded.imageSize) setSelectedImageSize(loaded.imageSize);
            if (loaded.visualStyle) setVisualStyle(loaded.visualStyle);
        } catch (err) { alert("Nederīgs projekta fails."); }
    };
    reader.readAsText(file);
    event.target.value = '';
  };
  
  const triggerFileInput = () => document.getElementById('project-upload')?.click();
  const triggerMusicInput = () => document.getElementById('music-upload')?.click();
  const triggerLogoInput = () => document.getElementById('logo-upload')?.click();

  const hasMedia = project?.slides.length! > 0;

  return (
    <div className="min-h-screen bg-vibe-dark text-white font-sans selection:bg-vibe-purple selection:text-white pb-20">
      <header className="sticky top-0 z-50 bg-black/80 backdrop-blur-md border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-vibe-purple to-vibe-cyan flex items-center justify-center shadow-lg shadow-vibe-purple/20">
                <span className="text-xl">✨</span>
            </div>
            <h1 className="font-display font-bold text-xl tracking-tight hidden sm:block">VibeFrame <span className="text-vibe-purple">AI</span></h1>
          </div>
          <div className="flex items-center gap-3">
            <input type="file" id="project-upload" accept=".json" onChange={handleLoadProject} className="hidden" />
            <button onClick={triggerFileInput} className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-gray-300 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-colors">Atvērt</button>
            <button onClick={handleSaveProject} disabled={!project} className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium border border-white/10 rounded-lg transition-colors ${!project ? 'text-gray-600 bg-transparent cursor-not-allowed' : 'text-vibe-cyan bg-vibe-cyan/10 hover:bg-vibe-cyan/20 border-vibe-cyan/20'}`}>Saglabāt</button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-10 space-y-12">
        <section className="max-w-3xl mx-auto space-y-8 animate-[fadeIn_0.5s_ease-out]">
            <div className="bg-vibe-panel p-6 rounded-2xl border border-white/10 shadow-2xl shadow-black/50 space-y-4">
                <div className="flex bg-black/40 p-1 rounded-xl mb-2 border border-white/5">
                    <button onClick={() => setProjectMode(ProjectMode.EXPLAINER)} className={`flex-1 py-3 rounded-lg text-sm font-bold transition-all ${projectMode === ProjectMode.EXPLAINER ? 'bg-vibe-purple text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}>🎬 Skaidrojošais</button>
                    <button onClick={() => setProjectMode(ProjectMode.PRESENTATION)} className={`flex-1 py-3 rounded-lg text-sm font-bold transition-all ${projectMode === ProjectMode.PRESENTATION ? 'bg-vibe-cyan text-black shadow-lg' : 'text-gray-400 hover:text-white'}`}>📊 Prezentācija</button>
                </div>
                
                <div className="relative">
                   <input type="file" id="source-file-upload" accept=".txt,.md" onChange={handleSourceFileUpload} className="hidden" />
                   <textarea value={topic} onChange={(e) => setTopic(e.target.value)} placeholder={sourceFileName ? "Papildus instrukcijas..." : "Tēma, prompt vai video ideja... \n(Spied Enter jaunai rindai, Ctrl+Enter lai ģenerētu)"} rows={8} className="w-full bg-black/30 border border-white/10 rounded-xl pl-4 pr-12 pb-16 py-3 text-lg focus:outline-none focus:border-vibe-purple transition-all placeholder-gray-600 text-white resize-y min-h-[180px] scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent font-sans" onKeyDown={(e) => {if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { handleGenerateScript(); }}} />
                   <button onClick={triggerSourceInput} className={`absolute top-3 right-3 p-1.5 rounded-lg transition-colors ${sourceFileName ? 'text-vibe-cyan bg-vibe-cyan/10' : 'text-gray-400 hover:text-white hover:bg-white/10'}`} title="Pievienot teksta failu"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg></button>
                   <button onClick={handleGenerateScript} disabled={isGeneratingScript || (!topic.trim() && !sourceFileContent)} className={`hidden md:flex absolute bottom-4 right-4 px-8 py-2 rounded-lg font-bold text-white transition-all duration-300 items-center gap-2 whitespace-nowrap shadow-lg z-10 ${isGeneratingScript ? 'bg-gray-800 cursor-wait' : 'bg-gradient-to-r from-vibe-purple to-vibe-cyan shadow-vibe-purple/20 hover:shadow-vibe-cyan/40 hover:scale-105 hover:brightness-110 active:scale-95'}`}>{isGeneratingScript ? 'Domā...' : 'Ģenerēt'}</button>
                </div>
                
                {sourceFileName && (
                      <div className="flex items-center gap-2 self-start bg-vibe-cyan/10 border border-vibe-cyan/20 px-3 py-1 rounded-full text-xs text-vibe-cyan animate-fade-in-up">
                         <span className="font-medium truncate max-w-[200px]">{sourceFileName}</span>
                         <button onClick={() => { setSourceFileContent(''); setSourceFileName(''); }} className="hover:text-white ml-1">✕</button>
                      </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3 pt-2">
                    
                    <div className="flex flex-col gap-1"><label className="text-xs text-gray-500 font-mono uppercase ml-1">Formāts</label><div className="flex gap-2"><select value={aspectRatio} onChange={(e) => setAspectRatio(e.target.value as ImageAspectRatio)} className="bg-black/30 border border-white/10 rounded-xl px-2 py-2 text-xs text-gray-300 focus:outline-none focus:border-vibe-purple flex-1"><option value={ImageAspectRatio.LANDSCAPE}>16:9 YT</option><option value={ImageAspectRatio.PORTRAIT}>9:16 TikTok</option></select><select value={selectedImageSize} onChange={(e) => setSelectedImageSize(e.target.value as ImageSize)} className="bg-black/30 border border-white/10 rounded-xl px-2 py-2 text-xs text-gray-300 focus:outline-none focus:border-vibe-purple w-16"><option value={ImageSize.SIZE_1K}>1K</option><option value={ImageSize.SIZE_4K}>4K</option></select></div></div>
                    
                    <div className="flex flex-col gap-1">
                        <label className="text-xs text-gray-500 font-mono uppercase ml-1">Stils</label>
                        <div className="flex gap-2">
                            <select value={visualStyle} onChange={(e) => setVisualStyle(e.target.value as VisualStyle)} className="bg-black/30 border border-white/10 rounded-xl px-3 py-2 text-xs text-gray-300 focus:outline-none focus:border-vibe-purple w-full">
                                {Object.values(VisualStyle).map((style) => <option key={style} value={style}>{style}</option>)}
                            </select>
                            <button onClick={handleRegenerateAllImages} disabled={!project || isGeneratingMedia} className="bg-white/10 hover:bg-white/20 text-white p-2 rounded-lg border border-white/10 transition-colors disabled:opacity-50" title="Pārģenerēt VISUS attēlus">♻️</button>
                        </div>
                    </div>

                    <div className="flex flex-col gap-1">
                        <label className="text-xs text-gray-500 font-mono uppercase ml-1">Tulkošana</label>
                        <div className="flex gap-2">
                            <select value={targetLanguage} onChange={(e) => setTargetLanguage(e.target.value as Language)} className="bg-black/30 border border-white/10 rounded-xl px-2 py-2 text-xs text-gray-300 focus:outline-none focus:border-vibe-purple flex-1">
                                {Object.values(Language).map((lang) => <option key={lang} value={lang}>{LanguageData[lang].name}</option>)}
                            </select>
                            <button onClick={handleTranslateProject} disabled={!project || isGeneratingMedia} className="bg-vibe-purple/20 hover:bg-vibe-purple/30 text-vibe-purple border border-vibe-purple/20 p-2 rounded-lg transition-colors disabled:opacity-50" title="Tulkot visu projektu">🌐</button>
                        </div>
                    </div>

                    <div className="flex flex-col gap-1">
                       <label className="text-xs text-gray-500 font-mono uppercase ml-1">Mediji</label>
                       <div className="flex gap-2">
                          <input type="file" id="music-upload" accept="audio/*" onChange={handleMusicUpload} className="hidden" />
                          <button onClick={triggerMusicInput} className={`flex-1 bg-black/30 border border-white/10 rounded-xl px-2 py-2 text-xs text-center focus:outline-none truncate ${project?.backgroundMusicBase64 ? 'text-vibe-cyan border-vibe-cyan/30' : 'text-gray-400'}`}>
                             {project?.backgroundMusicBase64 ? '🎵' : 'Mūzika'}
                          </button>
                          
                          <input type="file" id="logo-upload" accept="image/png,image/jpeg" onChange={handleLogoUpload} className="hidden" />
                          <button onClick={triggerLogoInput} className={`flex-1 bg-black/30 border border-white/10 rounded-xl px-2 py-2 text-xs text-center focus:outline-none truncate ${project?.logoBase64 ? 'text-vibe-purple border-vibe-purple/30' : 'text-gray-400'}`}>
                             {project?.logoBase64 ? '🖼️ Logo' : 'Logo'}
                          </button>
                       </div>
                       {project?.backgroundMusicBase64 && <input type="range" min="0" max="0.5" step="0.01" value={musicVolume} onChange={(e) => handleVolumeChange(parseFloat(e.target.value))} className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer mt-1" />}
                    </div>

                    <div className="flex flex-col gap-1"><label className="text-xs text-gray-500 font-mono uppercase ml-1">AI Balss</label><select value={audioProvider} onChange={(e) => setAudioProvider(e.target.value as any)} className="bg-black/30 border border-white/10 rounded-xl px-3 py-2 text-xs text-gray-300 focus:outline-none focus:border-vibe-purple w-full"><option value="gemini">Gemini</option><option value="elevenlabs">ElevenLabs</option></select></div>
                </div>
                
                <button onClick={handleGenerateScript} disabled={isGeneratingScript || (!topic.trim() && !sourceFileContent)} className={`md:hidden w-full px-8 py-3 rounded-xl font-semibold text-white transition-all duration-300 flex items-center justify-center gap-2 shadow-lg mt-4 ${isGeneratingScript ? 'bg-gray-800' : 'bg-gradient-to-r from-vibe-purple to-vibe-cyan shadow-vibe-purple/20 hover:shadow-vibe-cyan/40 hover:brightness-110 active:scale-95'}`}>Ģenerēt</button>
            </div>
        </section>

        {project && (
          <section className="animate-fade-in-up space-y-8">
            {hasMedia && (
                 <VideoPlayer 
                    slides={project.slides} 
                    aspectRatio={project.aspectRatio} 
                    imageSize={project.imageSize} 
                    backgroundMusicUrl={project.backgroundMusicBase64} 
                    musicVolume={musicVolume}
                    onExport={handleExportVideo}
                    isExporting={isExporting}
                    logoUrl={project.logoBase64}
                 />
            )}
            
            <div className="flex flex-col md:flex-row items-center justify-between bg-vibe-panel p-4 rounded-2xl border border-white/5 gap-4">
               <div className="flex items-center gap-3">
                   <span className={`text-xs font-bold px-3 py-1 rounded-full border ${project.mode === ProjectMode.PRESENTATION ? 'bg-vibe-cyan/20 text-vibe-cyan border-vibe-cyan/20' : 'bg-vibe-purple/20 text-vibe-purple border-vibe-purple/20'}`}>{project.mode === ProjectMode.PRESENTATION ? 'PREZENTĀCIJA' : 'SKAIDROJOŠAIS'}</span>
                   <h3 className="text-2xl font-display font-bold text-white">Scenārijs</h3>
               </div>
               <button onClick={generateMediaForSlides} disabled={isGeneratingMedia} className={`px-6 py-3 rounded-xl font-semibold text-sm transition-all duration-300 flex items-center gap-2 shadow-lg ${isGeneratingMedia ? 'bg-gray-800 text-gray-400 cursor-wait' : 'bg-gradient-to-r from-vibe-purple to-vibe-cyan text-white hover:scale-105'}`}>
                  {isGeneratingMedia ? generationProgress || 'Ģenerē...' : 'Ģenerēt Multividi'}
               </button>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pb-20">
              {project.slides.map((slide, index) => (
                  <SlideCard 
                    key={slide.id} 
                    slide={slide} 
                    index={index} 
                    onTextChange={handleSlideUpdate} 
                    onClearImage={handleClearSlideImage} 
                    onMoveUp={() => handleMoveSlide(index, 'up')}
                    onMoveDown={() => handleMoveSlide(index, 'down')}
                    onDelete={() => handleDeleteSlide(slide.id)}
                    disabled={isGeneratingMedia} 
                  />
              ))}
              
              <button 
                onClick={handleAddSlide} 
                className="h-full min-h-[400px] border-2 border-dashed border-white/10 rounded-2xl flex flex-col items-center justify-center text-gray-500 hover:text-white hover:border-white/30 hover:bg-white/5 transition-all group"
              >
                <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-lg">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                </div>
                <span className="font-bold text-lg">Pievienot Slaidu</span>
                <span className="text-xs text-gray-600 mt-2">Atkarībā no režīma (Prezentācija/Skaidrojums)</span>
              </button>
            </div>
          </section>
        )}
      </main>
    </div>
  );
};

export default App;