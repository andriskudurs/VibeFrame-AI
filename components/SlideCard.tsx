import React from 'react';
import { Slide, PresentationPoint } from '../types';

interface SlideCardProps {
  slide: Slide;
  index: number;
  onTextChange: (id: string, field: string, value: any) => void;
  onClearImage: (id: string) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDelete: () => void;
  disabled: boolean;
}

export const SlideCard: React.FC<SlideCardProps> = ({
  slide,
  index,
  onTextChange,
  onClearImage,
  onMoveUp,
  onMoveDown,
  onDelete,
  disabled
}) => {

  // --- PUNKTU LOĢIKA ---
  
  // 1. Izmainīt konkrētu punktu
  const handlePointChange = (pointIndex: number, field: keyof PresentationPoint, value: string) => {
      const currentPoints = slide.points ? [...slide.points] : [];
      // Atjaunojam konkrēto lauku (visual_text vai spoken_text)
      currentPoints[pointIndex] = { 
          ...currentPoints[pointIndex], 
          [field]: value,
          // Ja mainās teksts, audio URL jānomet, lai pārģenerētu
          audio_url: field === 'spoken_text' ? undefined : currentPoints[pointIndex].audio_url 
      };
      
      // Sūtam visu atjaunoto masīvu uz App.tsx
      onTextChange(slide.id, 'points', currentPoints);
  };

  // 2. Pievienot jaunu punktu
  const handleAddPoint = () => {
      const currentPoints = slide.points ? [...slide.points] : [];
      const newPoint: PresentationPoint = {
          visual_text: "Jauns punkts",
          spoken_text: ""
      };
      onTextChange(slide.id, 'points', [...currentPoints, newPoint]);
  };

  // 3. Dzēst punktu
  const handleDeletePoint = (pointIndex: number) => {
      if (!window.confirm("Dzēst šo apakšpunktu?")) return;
      const currentPoints = slide.points ? [...slide.points] : [];
      currentPoints.splice(pointIndex, 1);
      onTextChange(slide.id, 'points', currentPoints);
  };

  return (
    <div className="bg-black/40 border border-white/10 rounded-2xl p-6 flex flex-col gap-6 relative group transition-all hover:border-white/20 hover:bg-black/50 shadow-lg animate-fade-in-up">
      
      {/* --- HEADER: Numurs, Kustība, Dzēšana --- */}
      <div className="flex items-center justify-between border-b border-white/5 pb-4">
        <div className="flex items-center gap-3">
            <span className="text-2xl font-display font-bold text-white/20">#{index + 1}</span>
            <div className="flex bg-white/5 rounded-lg p-1">
                <button onClick={onMoveUp} disabled={disabled} className="p-1.5 hover:bg-white/10 rounded text-gray-400 hover:text-white disabled:opacity-30">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
                </button>
                <button onClick={onMoveDown} disabled={disabled} className="p-1.5 hover:bg-white/10 rounded text-gray-400 hover:text-white disabled:opacity-30">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                </button>
            </div>
            {/* Režīma indikators */}
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${slide.heading !== undefined ? 'bg-vibe-cyan/10 text-vibe-cyan' : 'bg-vibe-purple/10 text-vibe-purple'}`}>
                {slide.heading !== undefined ? 'Prezentācija' : 'Skaidrojums'}
            </span>
        </div>
        
        <button 
            onClick={onDelete} 
            disabled={disabled}
            className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors group/del"
            title="Dzēst slaidu"
        >
            <svg className="w-5 h-5 group-hover/del:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* --- KREISĀ PUSE: Attēls un Prompt --- */}
        <div className="space-y-3">
            <div className="relative aspect-video bg-black/50 rounded-xl overflow-hidden border border-white/10 group/img">
                {slide.image_url ? (
                    <>
                        <img src={slide.image_url} alt="Slide visualization" className="w-full h-full object-cover opacity-80 group-hover/img:opacity-100 transition-opacity" />
                        <button 
                            onClick={() => onClearImage(slide.id)}
                            disabled={disabled}
                            className="absolute top-2 right-2 bg-black/60 hover:bg-red-500/80 text-white p-2 rounded-lg backdrop-blur-md opacity-0 group-hover/img:opacity-100 transition-all text-xs font-bold border border-white/10"
                            title="Pārģenerēt attēlu"
                        >
                            ↻ Pārģenerēt
                        </button>
                    </>
                ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-gray-600 p-4 text-center">
                        <span className="text-4xl mb-2">🖼️</span>
                        <span className="text-xs">Attēls tiks ģenerēts šeit</span>
                    </div>
                )}
            </div>
            
            <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-wider text-gray-500 font-mono pl-1">Vizuālais apraksts (Prompt)</label>
                <textarea 
                    value={slide.visual_prompt}
                    onChange={(e) => onTextChange(slide.id, 'visual_prompt', e.target.value)}
                    className="w-full bg-black/20 border border-white/10 rounded-lg p-3 text-xs text-gray-300 focus:outline-none focus:border-vibe-purple focus:bg-black/40 transition-all resize-none h-20"
                    placeholder="Apraksti bildi..."
                />
            </div>
        </div>

        {/* --- LABĀ PUSE: Saturs --- */}
        <div className="lg:col-span-2 space-y-6">
            
            {slide.heading !== undefined ? (
                // === PREZENTĀCIJAS REŽĪMA REDIĢĒŠANA ===
                <>
                    {/* 1. Virsraksts un Ievads */}
                    <div className="space-y-3 bg-white/5 p-4 rounded-xl border border-white/5">
                        <label className="text-[10px] uppercase tracking-wider text-vibe-cyan font-bold font-mono pl-1">Galvenā Tēma</label>
                        <div className="flex flex-col gap-2">
                            <input 
                                type="text"
                                value={slide.heading}
                                onChange={(e) => onTextChange(slide.id, 'heading', e.target.value)}
                                className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-lg font-bold text-white focus:outline-none focus:border-vibe-cyan placeholder-gray-600"
                                placeholder="Slaida virsraksts..."
                            />
                            <div className="relative">
                                <span className="absolute top-3 left-3 text-lg opacity-50">🗣️</span>
                                <textarea 
                                    value={slide.intro_audio || ""}
                                    onChange={(e) => onTextChange(slide.id, 'intro_audio', e.target.value)}
                                    className="w-full bg-black/20 border border-white/10 rounded-lg py-3 pl-10 pr-3 text-sm text-gray-300 focus:outline-none focus:border-vibe-cyan h-20 resize-none"
                                    placeholder="Ievada teksts (ko teiks AI pirms punktiem)..."
                                />
                                <div className={`absolute bottom-2 right-2 text-[10px] px-1.5 py-0.5 rounded ${slide.intro_audio_url ? 'bg-green-500/20 text-green-400' : 'bg-gray-700 text-gray-500'}`}>
                                    {slide.intro_audio_url ? 'Audio OK' : 'No Audio'}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 2. Apakšpunktu Saraksts */}
                    <div className="space-y-3">
                        <label className="text-[10px] uppercase tracking-wider text-gray-500 font-mono pl-1 flex justify-between items-center">
                            <span>Apakšpunkti (Bullet Points)</span>
                            <span className="text-xs bg-white/10 px-2 py-0.5 rounded-full">{slide.points?.length || 0}</span>
                        </label>
                        
                        <div className="space-y-3">
                            {slide.points?.map((point, pIdx) => (
                                <div key={pIdx} className="flex gap-3 bg-black/20 p-3 rounded-xl border border-white/5 hover:border-white/10 transition-colors">
                                    <div className="flex flex-col items-center gap-2 pt-2">
                                        <div className="w-6 h-6 rounded-full bg-vibe-cyan/20 text-vibe-cyan flex items-center justify-center text-xs font-bold border border-vibe-cyan/30">
                                            {pIdx + 1}
                                        </div>
                                        <button onClick={() => handleDeletePoint(pIdx)} className="text-gray-600 hover:text-red-400 p-1" title="Dzēst punktu">✕</button>
                                    </div>
                                    
                                    <div className="flex-1 space-y-2">
                                        {/* Vizuālais teksts */}
                                        <div className="flex items-center gap-2">
                                            <span className="text-lg opacity-50" title="Ekrāna teksts">👁️</span>
                                            <input 
                                                type="text"
                                                value={point.visual_text}
                                                onChange={(e) => handlePointChange(pIdx, 'visual_text', e.target.value)}
                                                className="flex-1 bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-vibe-cyan placeholder-gray-600"
                                                placeholder="Īss punkta nosaukums uz ekrāna..."
                                            />
                                        </div>
                                        
                                        {/* Runājamais teksts */}
                                        <div className="flex gap-2">
                                            <span className="text-lg opacity-50 mt-1" title="AI Balss teksts">🗣️</span>
                                            <div className="flex-1 relative">
                                                <textarea 
                                                    value={point.spoken_text}
                                                    onChange={(e) => handlePointChange(pIdx, 'spoken_text', e.target.value)}
                                                    className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-xs text-gray-300 focus:outline-none focus:border-vibe-cyan resize-none h-16 placeholder-gray-600"
                                                    placeholder="Paplašināts skaidrojums, ko teiks AI..."
                                                />
                                                <div className={`absolute bottom-2 right-2 text-[10px] px-1.5 py-0.5 rounded ${point.audio_url ? 'bg-green-500/20 text-green-400' : 'bg-gray-700 text-gray-500'}`}>
                                                    {point.audio_url ? 'Audio OK' : 'No Audio'}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <button 
                            onClick={handleAddPoint}
                            className="w-full py-2 border-2 border-dashed border-white/10 rounded-xl text-gray-500 hover:text-vibe-cyan hover:border-vibe-cyan/30 hover:bg-vibe-cyan/5 transition-all text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2"
                        >
                            <span>+ Pievienot Apakšpunktu</span>
                        </button>
                    </div>
                </>
            ) : (
                // === SKAIDROJOŠĀ REŽĪMA REDIĢĒŠANA (Simple) ===
                <div className="space-y-1">
                    <label className="text-[10px] uppercase tracking-wider text-vibe-purple font-bold font-mono pl-1">Skaidrojošais Teksts</label>
                    <textarea 
                        value={slide.text_content}
                        onChange={(e) => onTextChange(slide.id, 'text_content', e.target.value)}
                        className="w-full bg-black/20 border border-white/10 rounded-lg p-4 text-sm leading-relaxed text-gray-200 focus:outline-none focus:border-vibe-purple focus:bg-black/40 transition-all resize-none h-60 shadow-inner"
                        placeholder="Teksts, kas parādīsies uz ekrāna un tiks ierunāts..."
                    />
                    <div className="flex justify-end pt-2">
                        <div className={`text-xs px-2 py-1 rounded border ${slide.audio_url ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-gray-800 border-white/5 text-gray-500'}`}>
                            {slide.audio_url ? '🔊 Audio Ģenerēts' : '🔇 Audio Nav'}
                        </div>
                    </div>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};