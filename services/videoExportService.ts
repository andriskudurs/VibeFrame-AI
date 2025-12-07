import { Project, Slide, ProjectMode, ImageAspectRatio, PresentationPoint } from "../types";

// --- KONFIGURĀCIJA ---
const WIDTH = 1920;
const HEIGHT = 1080;
const FPS = 30;
const CROSSFADE_DURATION = 1.0; 

// --- PALĪGFUNKCIJAS ---

const loadImage = (url: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
    img.src = url;
  });
};

const loadAudioBuffer = async (ctx: AudioContext, url: string): Promise<AudioBuffer> => {
  const response = await fetch(url);
  const arrayBuffer = await response.arrayBuffer();
  return await ctx.decodeAudioData(arrayBuffer);
};

const wrapText = (ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] => {
  const words = text.split(' ');
  let lines = [];
  let currentLine = words[0];

  for (let i = 1; i < words.length; i++) {
    const word = words[i];
    const width = ctx.measureText(currentLine + " " + word).width;
    if (width < maxWidth) {
      currentLine += " " + word;
    } else {
      lines.push(currentLine);
      currentLine = word;
    }
  }
  lines.push(currentLine);
  return lines;
};

const roundRect = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
  if (w < 2 * r) r = w / 2;
  if (h < 2 * r) r = h / 2;
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
};

// --- GALVENĀ EKSPORTA FUNKCIJA ---

export const exportVideo = async (
  project: Project, 
  backgroundMusicUrl: string | undefined, 
  musicVolume: number,
  logoBase64: string | undefined,
  onProgress: (status: string) => void
) => {
  
  const slides = project.slides;
  const mode = project.mode;
  const isPortrait = project.aspectRatio === ImageAspectRatio.PORTRAIT;

  const canvas = document.createElement("canvas");
  canvas.width = isPortrait ? 1080 : 1920;
  canvas.height = isPortrait ? 1920 : 1080;
  
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas context failed");

  const audioCtx = new AudioContext();
  const dest = audioCtx.createMediaStreamDestination();
  
  const canvasStream = canvas.captureStream(FPS);
  const combinedStream = new MediaStream([
      ...canvasStream.getVideoTracks(),
      ...dest.stream.getAudioTracks()
  ]);
  
  const recorder = new MediaRecorder(combinedStream, { 
      mimeType: 'video/webm; codecs=vp9',
      videoBitsPerSecond: 8000000
  });
  
  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };

  // Preload Logo
  let logoImg: HTMLImageElement | null = null;
  if (logoBase64) {
      try {
          logoImg = await loadImage(logoBase64);
      } catch(e) { console.warn("Logo load failed"); }
  }

  // Audio
  onProgress("Sagatavo audio...");
  let bgNode: AudioBufferSourceNode | null = null;

  if (backgroundMusicUrl) {
      try {
          const bgMusicBuffer = await loadAudioBuffer(audioCtx, backgroundMusicUrl);
          bgNode = audioCtx.createBufferSource();
          bgNode.buffer = bgMusicBuffer;
          bgNode.loop = true;
          const gainNode = audioCtx.createGain();
          gainNode.gain.value = musicVolume;
          bgNode.connect(gainNode);
          gainNode.connect(dest);
          bgNode.start();
      } catch (e) { console.warn("Music load failed", e); }
  }

  recorder.start();

  const playSegment = (
      audioUrl: string | undefined, 
      durationMs: number, 
      drawCallback: (p: number, elapsed: number) => void
  ): Promise<void> => {
      return new Promise(async (resolve) => {
          let audioBuffer: AudioBuffer | null = null;
          let durationSec = durationMs / 1000; 
          if (audioUrl) {
              try {
                  audioBuffer = await loadAudioBuffer(audioCtx, audioUrl);
                  durationSec = audioBuffer.duration;
              } catch (e) {}
          }

          let startTime = performance.now();
          if (audioBuffer) {
              const source = audioCtx.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(dest);
              source.start(audioCtx.currentTime);
          }

          const animate = (now: number) => {
              const elapsedSec = (now - startTime) / 1000;
              let progress = elapsedSec / durationSec;
              if (progress > 1) progress = 1;
              drawCallback(progress, elapsedSec);
              if (progress < 1) {
                  requestAnimationFrame(animate);
              } else {
                  resolve();
              }
          };
          requestAnimationFrame(animate);
      });
  };

  const images: HTMLImageElement[] = [];
  onProgress("Ielādē attēlus...");
  for (const s of slides) {
      images.push(await loadImage(s.image_url || ""));
  }

  // --- SLIDES LOOP ---
  for (let i = 0; i < slides.length; i++) {
      const slide = slides[i];
      const currentImg = images[i];
      const prevImg = i > 0 ? images[i - 1] : null;

      onProgress(`Renderē slaidu ${i + 1}/${slides.length}...`);

      const drawBase = (progress: number, elapsedInSlide: number) => {
          ctx.clearRect(0, 0, canvas.width, canvas.height);

          const isCrossfading = i > 0 && elapsedInSlide <= CROSSFADE_DURATION;

          if (isCrossfading && prevImg) {
               ctx.save();
               ctx.globalAlpha = 1.0;
               ctx.drawImage(prevImg, 0, 0, canvas.width, canvas.height);
               ctx.restore();
          }

          ctx.save();
          if (isCrossfading) {
              ctx.globalAlpha = elapsedInSlide / CROSSFADE_DURATION;
          } else {
              ctx.globalAlpha = 1.0;
          }

          const scale = 1.0 + (progress * 0.1); 
          const w = canvas.width * scale;
          const h = canvas.height * scale;
          const x = (canvas.width - w) / 2;
          const y = (canvas.height - h) / 2;
          
          ctx.drawImage(currentImg, x, y, w, h);
          ctx.restore();
      };

      const drawLogo = () => {
          if (logoImg) {
              const logoW = 150;
              const ratio = logoImg.height / logoImg.width;
              const logoH = logoW * ratio;
              const padding = 40;
              
              ctx.save();
              ctx.globalAlpha = 0.8;
              ctx.drawImage(logoImg, canvas.width - logoW - padding, padding, logoW, logoH);
              ctx.restore();
          }
      };

      // --- START PADDING (1 SEKUNDE) ---
      // Tiek izpildīts tikai PIRMAJAM slaidam
      if (i === 0) {
          await playSegment(undefined, 1000, (p, elapsed) => {
              drawBase(0, elapsed); // Zīmējam fonu
              drawLogo();
          });
      }

      if (mode === ProjectMode.PRESENTATION) {
          let totalSlideTime = 0;
          
          // Intro
          await playSegment(slide.intro_audio_url, slide.intro_duration_ms || 3000, (p, elapsed) => {
              drawBase(0, totalSlideTime + elapsed); 
              ctx.font = `bold ${isPortrait ? '60px' : '80px'} sans-serif`;
              ctx.fillStyle = "white";
              ctx.textAlign = "center";
              ctx.shadowColor = "rgba(0,0,0,0.9)";
              ctx.shadowBlur = 25;
              ctx.fillText(slide.heading || "", canvas.width/2, canvas.height * 0.2);
              ctx.shadowBlur = 0;
              drawLogo();
          });
          
          totalSlideTime += (slide.intro_duration_ms || 3000) / 1000;

          // Punkti
          if (slide.points) {
              for (let pIdx = 0; pIdx < slide.points.length; pIdx++) {
                  const point = slide.points[pIdx];
                  await playSegment(point.audio_url, point.duration_ms || 3000, (p, elapsed) => {
                      drawBase(0.1 + (pIdx * 0.05), totalSlideTime + elapsed);
                      
                      // Zīmējam Virsrakstu (vienmēr redzams)
                      ctx.font = `bold ${isPortrait ? '60px' : '80px'} sans-serif`;
                      ctx.fillStyle = "white";
                      ctx.textAlign = "center";
                      ctx.shadowColor = "rgba(0,0,0,0.9)";
                      ctx.shadowBlur = 25;
                      ctx.fillText(slide.heading || "", canvas.width/2, canvas.height * 0.2);
                      ctx.shadowBlur = 0;

                      let startY = canvas.height * 0.35;
                      const gap = isPortrait ? 140 : 120;

                      // Zīmējam punktus līdz pašreizējam
                      for (let j = 0; j <= pIdx; j++) {
                          const isCurrent = j === pIdx;
                          const pItem = slide.points![j];
                          ctx.globalAlpha = isCurrent ? 1.0 : 0.5;
                          ctx.fillStyle = "#a78bfa"; 
                          ctx.beginPath();
                          ctx.arc(isPortrait ? 100 : 200, startY - 20, 15, 0, Math.PI * 2);
                          ctx.fill();

                          const boxX = isPortrait ? 150 : 250;
                          const boxW = canvas.width - (isPortrait ? 250 : 500);
                          const boxH = 100;

                          ctx.save();
                          if (isCurrent) {
                              ctx.fillStyle = "rgba(0, 0, 0, 0.6)"; 
                              ctx.strokeStyle = "rgba(34, 211, 238, 0.8)"; 
                              ctx.lineWidth = 4;
                              roundRect(ctx, boxX, startY - 70, boxW, boxH, 20);
                              ctx.stroke();
                          } else {
                              ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
                          }
                          ctx.fill();
                          ctx.restore();

                          ctx.font = `${isPortrait ? '40px' : 'bold 45px'} sans-serif`;
                          ctx.fillStyle = isCurrent ? "white" : "#ccc";
                          ctx.textAlign = "left";
                          ctx.textBaseline = "middle";
                          ctx.fillText(pItem.visual_text, boxX + 40, startY - 20);
                          startY += gap;
                      }
                      ctx.globalAlpha = 1.0;
                      drawLogo();
                  });
                  totalSlideTime += (point.duration_ms || 3000) / 1000;
              }
          }

          // --- END PADDING (2 SEKUNDES - PRESENTATION) ---
          // Tikai PĒDĒJAM slaidam
          if (i === slides.length - 1) {
              await playSegment(undefined, 2000, (p, elapsed) => {
                  drawBase(1, totalSlideTime + elapsed);
                  
                  // Zīmējam Virsrakstu
                  ctx.font = `bold ${isPortrait ? '60px' : '80px'} sans-serif`;
                  ctx.fillStyle = "white";
                  ctx.textAlign = "center";
                  ctx.fillText(slide.heading || "", canvas.width/2, canvas.height * 0.2);

                  // Zīmējam VISUS punktus (jo video beidzas)
                  let startY = canvas.height * 0.35;
                  const gap = isPortrait ? 140 : 120;
                  
                  slide.points?.forEach(pItem => {
                      // Punktu bumbiņa
                      ctx.globalAlpha = 1.0;
                      ctx.fillStyle = "#a78bfa"; 
                      ctx.beginPath();
                      ctx.arc(isPortrait ? 100 : 200, startY - 20, 15, 0, Math.PI * 2);
                      ctx.fill();

                      // Kaste (visi ir "neaktīvi" jeb vienādi, vai visi aktīvi - gaumes lieta. 
                      // Šeit atstājam tumšu fonu lasāmībai)
                      const boxX = isPortrait ? 150 : 250;
                      const boxW = canvas.width - (isPortrait ? 250 : 500);
                      const boxH = 100;

                      ctx.save();
                      ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
                      roundRect(ctx, boxX, startY - 70, boxW, boxH, 20);
                      ctx.fill();
                      ctx.restore();

                      ctx.font = `${isPortrait ? '40px' : 'bold 45px'} sans-serif`;
                      ctx.fillStyle = "#ccc";
                      ctx.textAlign = "left";
                      ctx.textBaseline = "middle";
                      ctx.fillText(pItem.visual_text, boxX + 40, startY - 20);
                      startY += gap;
                  });
                  drawLogo();
              });
          }

      } else {
          // --- EXPLAINER MODE ---
          await playSegment(slide.audio_url, slide.duration_ms, (progress, elapsed) => {
              drawBase(progress, elapsed);

              const boxW = canvas.width * (isPortrait ? 0.9 : 0.6);
              const boxH = canvas.height * 0.3;
              const boxX = (canvas.width - boxW) / 2;
              const boxY = canvas.height - boxH - 100;

              ctx.save();
              ctx.fillStyle = "rgba(0, 0, 0, 0.4)"; 
              roundRect(ctx, boxX, boxY, boxW, boxH, 30);
              ctx.fill();
              ctx.restore();

              const text = slide.text_content;
              const charCount = Math.floor(text.length * progress);
              const visibleText = text.substring(0, charCount);

              ctx.font = `bold ${isPortrait ? '40px' : '50px'} sans-serif`;
              ctx.fillStyle = "white";
              ctx.textAlign = "left"; 
              ctx.textBaseline = "top";
              ctx.shadowColor = "black";
              ctx.shadowBlur = 4;

              const lines = wrapText(ctx, visibleText, boxW - 100);
              const maxLines = 4;
              const visibleLines = lines.slice(-maxLines);
              
              let textY = boxY + 50;
              const textX = boxX + 50; 
              
              visibleLines.forEach(line => {
                  ctx.fillText(line, textX, textY); 
                  textY += 60;
              });
              ctx.shadowBlur = 0;
              
              if (progress < 1) {
                  const lastLine = visibleLines[visibleLines.length - 1] || "";
                  const lastWidth = ctx.measureText(lastLine).width;
                  ctx.fillStyle = "#22d3ee"; 
                  ctx.fillRect(textX + lastWidth + 5, textY - 60, 5, 50);
              }
              drawLogo();
          });

          // --- END PADDING (2 SEKUNDES - EXPLAINER) ---
          // Tikai PĒDĒJAM slaidam
          if (i === slides.length - 1) {
              await playSegment(undefined, 2000, (p, elapsed) => {
                  drawBase(1, elapsed + (slide.duration_ms / 1000)); // Saglabājam pēdējo kadru
                  
                  // Zīmējam visu tekstu (100% visible)
                  const boxW = canvas.width * (isPortrait ? 0.9 : 0.6);
                  const boxH = canvas.height * 0.3;
                  const boxX = (canvas.width - boxW) / 2;
                  const boxY = canvas.height - boxH - 100;

                  ctx.save();
                  ctx.fillStyle = "rgba(0, 0, 0, 0.4)"; 
                  roundRect(ctx, boxX, boxY, boxW, boxH, 30);
                  ctx.fill();
                  ctx.restore();

                  const text = slide.text_content;
                  // Šeit nav progress, rādam visu
                  ctx.font = `bold ${isPortrait ? '40px' : '50px'} sans-serif`;
                  ctx.fillStyle = "white";
                  ctx.textAlign = "left"; 
                  ctx.textBaseline = "top";
                  
                  const lines = wrapText(ctx, text, boxW - 100);
                  const maxLines = 4;
                  const visibleLines = lines.slice(-maxLines); // Rādīt pēdējās rindas
                  
                  let textY = boxY + 50;
                  const textX = boxX + 50; 
                  visibleLines.forEach(line => {
                      ctx.fillText(line, textX, textY); 
                      textY += 60;
                  });
                  drawLogo();
              });
          }
      }
  }

  if (bgNode) bgNode.stop();
  recorder.stop();
  recorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `vibeframe_export_${project.topic.replace(/\s+/g, '_')}.webm`;
      a.click();
      onProgress("");
  };
};