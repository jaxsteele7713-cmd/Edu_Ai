import React, { useEffect, useRef, useState } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality, Blob } from '@google/genai';
import { decodeAudio, encodeAudio } from '../services/geminiService';

const LiveTutor: React.FC = () => {
  const [active, setActive] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);

  const startSession = async () => {
    setError(null);
    try {
        // 1. Handle API Key Selection (Mandatory for real-time/preview models in this context)
        const win = window as any;
        if (win.aistudio) {
            const hasKey = await win.aistudio.hasSelectedApiKey();
            if (!hasKey) {
                setLog(prev => [...prev, "Authorization required. Please select a paid API key..."]);
                await win.aistudio.openSelectKey();
                // Proceed assuming success as per guidelines
            }
        }

        setActive(true);
        setLog(prev => [...prev, "Awakening the Tutor..."]);
        
        // Always create a new instance to use the latest key
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        
        const inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
        const outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        const outputNode = outputAudioContext.createGain();
        outputNode.connect(outputAudioContext.destination);
        
        // 2. Browser Media Permissions
        let userStream: MediaStream;
        try {
            userStream = await navigator.mediaDevices.getUserMedia({ 
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                }, 
                video: true 
            });
        } catch (mediaErr: any) {
            console.error("Media Error:", mediaErr);
            if (mediaErr.name === 'NotAllowedError' || mediaErr.name === 'PermissionDeniedError') {
                throw new Error("Browser denied access to Microphone/Camera. Please enable them in your browser settings.");
            }
            throw new Error("Could not access media devices. Ensure your hardware is connected.");
        }

        setStream(userStream);
        if (videoRef.current) {
            videoRef.current.srcObject = userStream;
            videoRef.current.play();
        }

        let nextStartTime = 0;
        const sources = new Set<AudioBufferSourceNode>();

        const sessionPromise = ai.live.connect({
            model: 'gemini-2.5-flash-native-audio-preview-09-2025',
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } },
                },
                systemInstruction: "You are LUMI, a wise and patient tutor in a dark academia library. You are helpful, concise, and encourage curiosity. Use a sophisticated yet accessible tone.",
            },
            callbacks: {
                onopen: () => {
                    setLog(prev => [...prev, "Connection established. LUMI is listening."]);
                    
                    // Audio Input Stream
                    const source = inputAudioContext.createMediaStreamSource(userStream);
                    const scriptProcessor = inputAudioContext.createScriptProcessor(4096, 1, 1);
                    scriptProcessor.onaudioprocess = (e) => {
                        const inputData = e.inputBuffer.getChannelData(0);
                        const l = inputData.length;
                        const int16 = new Int16Array(l);
                        for (let i = 0; i < l; i++) int16[i] = inputData[i] * 32768;
                        
                        const pcmBlob: Blob = {
                            data: encodeAudio(new Uint8Array(int16.buffer)),
                            mimeType: 'audio/pcm;rate=16000'
                        };

                        sessionPromise.then(session => session.sendRealtimeInput({ media: pcmBlob }))
                                     .catch(e => console.error("Send error:", e));
                    };
                    source.connect(scriptProcessor);
                    scriptProcessor.connect(inputAudioContext.destination);

                    // Video Frame Stream
                    const interval = setInterval(() => {
                        if(canvasRef.current && videoRef.current && active) {
                            const ctx = canvasRef.current.getContext('2d');
                            canvasRef.current.width = 320; 
                            canvasRef.current.height = 180;
                            ctx?.drawImage(videoRef.current, 0, 0, canvasRef.current.width, canvasRef.current.height);
                            const base64 = canvasRef.current.toDataURL('image/jpeg', 0.6).split(',')[1];
                            sessionPromise.then(session => session.sendRealtimeInput({ 
                                media: { mimeType: 'image/jpeg', data: base64 } 
                            })).catch(() => {});
                        } else if (!active) {
                            clearInterval(interval);
                        }
                    }, 1000);
                },
                onmessage: async (msg: LiveServerMessage) => {
                    // Handle Interruption
                    if (msg.serverContent?.interrupted) {
                        for (const source of sources.values()) {
                            try { source.stop(); } catch(e) {}
                            sources.delete(source);
                        }
                        nextStartTime = 0;
                        return;
                    }

                    const audioData = msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
                    if (audioData) {
                        const audioBytes = decodeAudio(audioData);
                        const dataInt16 = new Int16Array(audioBytes.buffer);
                        const buffer = outputAudioContext.createBuffer(1, dataInt16.length, 24000);
                        const channelData = buffer.getChannelData(0);
                        for (let i = 0; i < dataInt16.length; i++) {
                            channelData[i] = dataInt16[i] / 32768.0;
                        }

                        nextStartTime = Math.max(nextStartTime, outputAudioContext.currentTime);
                        const source = outputAudioContext.createBufferSource();
                        source.buffer = buffer;
                        source.connect(outputNode);
                        source.start(nextStartTime);
                        nextStartTime += buffer.duration;
                        sources.add(source);
                        source.onended = () => sources.delete(source);
                    }
                },
                onclose: () => {
                   setLog(prev => [...prev, "LUMI has departed."]);
                   setActive(false);
                },
                onerror: (e) => {
                    console.error("Session Error:", e);
                    const msg = (e as any)?.message || "The library connection was severed.";
                    if (msg.includes("entity was not found") && win.aistudio) {
                        win.aistudio.openSelectKey();
                    }
                    setError(msg);
                    setActive(false);
                }
            }
        });

    } catch (err: any) {
        console.error("Live Tutor Error:", err);
        setError(err.message || "Connection failed.");
        setActive(false);
    }
  };

  const stopSession = () => {
    if (stream) {
        stream.getTracks().forEach(t => t.stop());
        setStream(null);
    }
    setActive(false);
    // Hard refresh to clear session and media contexts properly
    window.location.reload(); 
  };

  return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-da-bg p-8 relative overflow-y-auto">
        <h2 className="text-3xl font-display text-da-gold mb-8 text-center">Consultation with LUMI</h2>
        
        <div className="relative w-full max-w-lg aspect-video bg-black rounded border-4 border-da-paper shadow-2xl mb-8 overflow-hidden group">
             <video ref={videoRef} className="w-full h-full object-cover opacity-80" muted playsInline />
             <canvas ref={canvasRef} className="hidden" />
             
             {!active && (
                 <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm">
                     <button 
                        onClick={startSession} 
                        className="px-8 py-3 bg-da-gold text-black font-bold uppercase tracking-widest hover:bg-white transition-all shadow-[0_0_20px_rgba(207,170,110,0.5)] transform active:scale-95"
                     >
                         <i className="fas fa-microphone mr-2"></i> Open Channel
                     </button>
                     <p className="mt-4 text-da-gold/60 text-xs uppercase tracking-tighter">Requires Camera & Microphone Access</p>
                 </div>
             )}
             
             {active && (
                 <div className="absolute bottom-4 right-4 flex items-center gap-2">
                     <span className="text-[10px] text-da-gold uppercase tracking-widest font-bold">LUMI IS PRESENT</span>
                     <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse shadow-[0_0_10px_red]"></div>
                 </div>
             )}
        </div>

        {error && (
            <div className="w-full max-w-lg mb-6 p-4 border border-red-500/30 bg-red-500/10 text-red-400 text-sm rounded flex items-center gap-3">
                <i className="fas fa-exclamation-triangle"></i>
                <p>{error}</p>
            </div>
        )}

        <div className="w-full max-w-lg bg-da-paper p-4 h-32 overflow-y-auto font-mono text-[10px] border border-da-accent/20 rounded shadow-inner">
            {log.map((l, i) => <div key={i} className="mb-1 text-da-text/70">{`> ${l}`}</div>)}
            {active && <div className="animate-pulse text-da-gold">_</div>}
        </div>

        {active && (
            <button 
                onClick={stopSession} 
                className="mt-8 px-6 py-2 border border-da-red/50 text-da-red hover:bg-da-red hover:text-white transition-all uppercase text-xs tracking-widest rounded-sm"
            >
                Close Consultation
            </button>
        )}
        
        <div className="mt-8 text-center max-w-md">
            <p className="text-da-text/40 text-xs italic font-serif">
                "Real-time wisdom requires a steady connection and an authorized library card (API Key)."
            </p>
        </div>
    </div>
  );
};

export default LiveTutor;