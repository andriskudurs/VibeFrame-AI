import React, { useState, useRef, useEffect } from 'react';
import { Slide, ImageSize, ImageAspectRatio } from '../types';

interface VideoPlayerProps {
  slides: Slide[];
  aspectRatio?: ImageAspectRatio;
  imageSize?: ImageSize;
  backgroundMusicUrl?: string;
  musicVolume?: number;
  onExport: () => void;
  isExporting: boolean;
  logoUrl?: string;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({ 
  slides, 
  aspectRatio = ImageAspectRatio.LANDSCAPE, 
  imageSize = ImageSize.SIZE_1K,
  backgroundMusicUrl,
  musicVolume = 0.15,
  onExport,
  isExporting,
  logoUrl
}) => {
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [currentPointIndex, setCurrentPointIndex] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [visibleCharCount, setVisibleCharCount] = useState(0);
  const [prevImage, setPrevImage] = useState<string | undefined>(undefined);
  const [isTransitioning, setIsTransitioning] = useState(false);
  
  const audioRef = useRef<HTMLAudioElement>(null); 
  const musicRef = useRef<HTMLAudioElement>(null); 
  const textContainerRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number>(0); // Jauns: animācijas cikla ID

  const currentSlide = slides[currentSlideIndex];
  const isPortrait = aspectRatio === ImageAspectRatio.PORTRAIT;
  const is4K = imageSize === ImageSize.SIZE_4K;
  const isPresentationSlide = !!currentSlide.points && currentSlide.points.length > 0;

  const getCurrentAudioUrl = () => {
    if (!isPresentationSlide) {
        return currentSlide.audio_url;
    } else {
        if (currentPointIndex === -1) {
            return currentSlide.intro_audio_url || currentSlide.audio_url;
        } else {
            const point = currentSlide.points?.[currentPointIndex];
            return point?.audio_url;
        }
    }
  };
  const currentAudioSrc = getCurrentAudioUrl();

  // --- AUDIO KONTROLE ---
  useEffect(() => {
    if (audioRef.current) {
       if (isPlaying) {
           const playPromise = audioRef.current.play();
           if (playPromise !== undefined) playPromise.catch(() => {});
       } else {
           audioRef.current.pause();
       }
    }
  }, [isPlaying, currentAudioSrc, currentSlideIndex, currentPointIndex]);

  // --- MŪZIKAS KONTROLE ---
  useEffect(() => {
    if (musicRef.current && backgroundMusicUrl) {
        musicRef.current.volume = musicVolume || 0.15;
        if (isPlaying) {
            if (musicRef.current.paused) musicRef.current.play().catch(() => {});
        } else {
            musicRef.current.pause();
            musicRef.current.currentTime = 0;
        }
    }
  }, [isPlaying, backgroundMusicUrl, musicVolume]);

  // --- TYPEWRITER SINHRONIZĀCIJA (JAUNAIS KODS) ---
  useEffect(() => {
      // Funkcija, kas sinhronizē tekstu ar audio laiku
      const syncTextWithAudio = () => {
          if (!isPlaying || isPresentationSlide) return; // Prezentācijas režīmā punkti parādās savādāk

          const text = currentSlide.text_content || "";
          
          // Ja ir audio, ņemam laiku no audio. Ja nav, simulējam laiku.
          let progress = 0;

          if (audioRef.current && currentAudioSrc) {
              const currentTime = audioRef.current.currentTime;
              const duration = audioRef.current.duration || (currentSlide.duration_ms / 1000) || 5;
              progress = Math.min(currentTime / duration, 1.0);
          } else {
              // Fallback: Ja nav audio faila, izmantojam vienkāršu taimeri (tikai priekšskatījumam)
              // Šis ir reti, jo parasti audio ir ģenerēts.
              setVisibleCharCount(text.length);
              return;
          }

          const targetCharCount = Math.floor(text.length * progress);
          setVisibleCharCount(targetCharCount);

          // Auto-scroll uz leju, ja teksts ir garš
          if (textContainerRef.current) {
              textContainerRef.current.scrollTop = textContainerRef.current.scrollHeight;
          }

          // Turpinām ciklu
          if (progress < 1.0 && isPlaying) {
              animationFrameRef.current = requestAnimationFrame(syncTextWithAudio);
          }
      };

      if (isPlaying && !isPresentationSlide) {
          // Sākam animācijas ciklu
          animationFrameRef.current = requestAnimationFrame(syncTextWithAudio);
      } else {
          // Apturam ciklu
          if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      }

      return () => {
          if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      };
  }, [isPlaying, currentAudioSrc, currentSlideIndex, isPresentationSlide]); // Atkarības: ja mainās audio vai slaids, restarts

  const handleAudioEnded = () => {
    if (isPresentationSlide) {
        const totalPoints = currentSlide.points?.length || 0;
        if (currentPointIndex < totalPoints - 1) {
            setCurrentPointIndex(prev => prev + 1);
        } else {
            goToNextSlide();
        }
    } else {
        goToNextSlide();
    }
  };

  const goToNextSlide = () => {
    if (currentSlideIndex < slides.length - 1) {
        setPrevImage(currentSlide.image_url);
        setIsTransitioning(true);
        setCurrentSlideIndex(prev => prev + 1);
        setCurrentPointIndex(-1);
        setVisibleCharCount(0);
        setTimeout(() => {
            setIsTransitioning(false);
            setPrevImage(undefined);
        }, 1000);
    } else {
        setIsPlaying(false);
    }
  };

  const handleReset = () => {
    setIsPlaying(false);
    setCurrentSlideIndex(0);
    setCurrentPointIndex(-1);
    setVisibleCharCount(0);
    setPrevImage(undefined);
  };

  const animationStyle = isPlaying && is4K ? {
    animation: `kenburns ${currentSlide.duration_ms}ms ease-out forwards`
  } : {};

  return (
    <div className="w-full flex flex-col items-center justify-center mb-8">
      
      <div className={`relative bg-black shadow-2xl overflow-hidden rounded-xl border border-white/10 transition-all duration-500 ease-in-out ${isPortrait ? 'w-full max-w-[350px] aspect-[9/16]' : 'w-full max-w-5xl aspect-video'}`}>
        <style>{`
            @keyframes kenburns { 0% { transform: scale(1); } 100% { transform: scale(1.15); } } 
            .no-scrollbar::-webkit-scrollbar { display: none; }
            @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
            .animate-crossfade { animation: fadeIn 1s ease-in-out forwards; }
        `}</style>

        {/* LOGO OVERLAY */}
        {logoUrl && (
            <div className="absolute top-6 right-6 z-50 opacity-80 pointer-events-none">
                <img src={logoUrl} alt="Logo" className="w-16 h-auto object-contain drop-shadow-lg" />
            </div>
        )}

        {/* PREV IMAGE */}
        {isTransitioning && prevImage && (
            <div className="absolute inset-0 w-full h-full z-0">
                <img src={prevImage} alt="Previous" className="w-full h-full object-cover opacity-100" />
            </div>
        )}

        {/* CURRENT IMAGE */}
        {currentSlide.image_url ? (
          <div className={`absolute inset-0 w-full h-full z-10 ${isTransitioning ? 'animate-crossfade' : ''}`}>
             <img src={currentSlide.image_url} alt="Current" className="w-full h-full object-cover" style={animationStyle} />
             <div className={`absolute inset-0 ${isPresentationSlide ? 'bg-gradient-to-t from-black/80 via-black/40 to-black/20' : 'bg-gradient-to-t from-black/90 via-black/10 to-transparent'}`} />
          </div>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900 text-gray-500"><p>🖼️ Gaida attēlu...</p></div>
        )}

        {/* CONTENT */}
        <div className="absolute inset-0 p-8 flex flex-col z-20 pointer-events-none">
           {isPresentationSlide ? (
             <div className="flex flex-col justify-center h-full max-w-3xl mx-auto w-full">
                <h2 className={`font-display font-bold text-white mb-8 drop-shadow-xl transition-all duration-700 ${isPortrait ? 'text-2xl text-center mb-4' : 'text-5xl'} ${currentPointIndex === -1 ? 'scale-105 opacity-100' : 'scale-100 opacity-90'}`} style={{ textShadow: '0 4px 20px rgba(0,0,0,0.5)' }}>{currentSlide.heading}</h2>
                <div className="space-y-4">
                  {currentSlide.points?.map((point, idx) => {
                    const isActive = idx === currentPointIndex;
                    const isFuture = idx > currentPointIndex;
                    if (isFuture) return null;
                    return (
                      <div key={idx} className={`flex items-center gap-4 transition-all duration-700 ease-out ${isActive ? 'opacity-100 translate-x-0' : 'opacity-50 translate-x-0 scale-95'}`}>
                        <div className={`w-3 h-3 rounded-full shadow-lg transition-colors ${isActive ? 'bg-vibe-cyan shadow-vibe-cyan/50' : 'bg-white/50'}`} />
                        <div className={`px-6 py-4 rounded-xl backdrop-blur-xl border transition-all duration-500 ${isActive ? 'bg-white/10 border-vibe-cyan/50 shadow-xl shadow-black/20' : 'bg-black/20 border-white/5'}`}>
                          <p className={`font-medium drop-shadow-md transition-all ${isPortrait ? 'text-sm' : 'text-2xl'} ${isActive ? 'text-white' : 'text-gray-300'}`}>{point.visual_text}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
             </div>
           ) : (
             <div className="flex flex-col justify-end h-full pb-8 items-center">
                <div ref={textContainerRef} className={`relative w-full max-w-3xl rounded-2xl p-6 overflow-hidden transition-all duration-300 border border-white/10 backdrop-blur-md bg-black/40 ${isPortrait ? 'max-h-[45%] p-4' : 'max-h-[30%]'}`}>
                    <p className={`font-display font-bold text-white leading-relaxed tracking-wide drop-shadow-md whitespace-pre-wrap text-left ${isPortrait ? 'text-lg' : 'text-2xl'}`}>
                        {currentSlide.text_content.slice(0, visibleCharCount)}
                        <span className="inline-block w-2 h-6 bg-vibe-cyan ml-1 align-middle animate-pulse"/>
                    </p>
                    <div className="absolute top-0 left-0 right-0 h-8 bg-gradient-to-b from-black/60 to-transparent pointer-events-none"></div>
                </div>
             </div>
           )}
        </div>

        <audio ref={audioRef} src={currentAudioSrc} onEnded={handleAudioEnded} className="hidden" />
        {backgroundMusicUrl && <audio ref={musicRef} src={backgroundMusicUrl} loop className="hidden" />}
      </div>

      <div className="flex flex-col items-center gap-3 mt-6">
        <div className="flex gap-4">
            <button onClick={() => setIsPlaying(!isPlaying)} className="bg-white text-black px-8 py-3 rounded-full font-bold hover:scale-105 transition-transform flex items-center gap-2 shadow-lg shadow-white/20">
              {isPlaying ? <><span className="w-3 h-3 bg-red-500 rounded-sm"></span> Stop</> : <><svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg> Play Preview</>}
            </button>
            <button onClick={handleReset} className="bg-white/10 text-white px-6 py-3 rounded-full font-medium hover:bg-white/20 transition-colors border border-white/10">⏮️ Reset</button>
            <button onClick={onExport} disabled={isExporting} className={`px-6 py-3 rounded-full font-medium transition-all flex items-center gap-2 border border-white/10 ${isExporting ? 'bg-gray-800 text-gray-500 cursor-not-allowed' : 'bg-vibe-purple/20 text-vibe-purple hover:bg-vibe-purple/30 border-vibe-purple/20 shadow-lg shadow-vibe-purple/10'}`}>
              {isExporting ? <>⏳ Notiek eksports...</> : <><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg> Lejupielādēt</>}
            </button>
        </div>
        {backgroundMusicUrl && <div className="flex items-center gap-2 text-xs text-gray-400 bg-black/30 px-3 py-1 rounded-full border border-white/5"><span>🎵 Mūzika</span><div className="w-1 h-1 rounded-full bg-vibe-cyan animate-pulse"></div></div>}
      </div>
    </div>
  );
};