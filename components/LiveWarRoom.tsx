
import React, { useEffect, useRef, useState } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality, Blob } from '@google/genai';
import { SYSTEM_INSTRUCTION } from '../constants';
import { Mic, MicOff, Radio, AlertCircle } from 'lucide-react';

const LiveWarRoom: React.FC = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [status, setStatus] = useState('Ready for Link');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // Audio Refs
  const inputContextRef = useRef<AudioContext | null>(null);
  const outputContextRef = useRef<AudioContext | null>(null);
  const inputSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const outputNodeRef = useRef<GainNode | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const sessionPromiseRef = useRef<Promise<any> | null>(null);

  // Visualizer Refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const connect = async () => {
    setStatus('Establishing Secure Link...');
    setErrorMsg(null);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      inputContextRef.current = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
      outputContextRef.current = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 24000 });
      
      // Analyser for visualizer
      analyserRef.current = inputContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;

      const inputNode = inputContextRef.current.createGain();
      outputNodeRef.current = outputContextRef.current.createGain();
      
      // Session Connect
      sessionPromiseRef.current = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        callbacks: {
          onopen: () => {
            setStatus('Secure Link Active');
            setIsConnected(true);
            
            // Audio Processing Pipeline
            if (!inputContextRef.current) return;
            inputSourceRef.current = inputContextRef.current.createMediaStreamSource(stream);
            inputSourceRef.current.connect(analyserRef.current!); // Connect to visualizer
            
            processorRef.current = inputContextRef.current.createScriptProcessor(4096, 1, 1);
            
            processorRef.current.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const pcmBlob = createBlob(inputData);
              sessionPromiseRef.current?.then((session) => {
                session.sendRealtimeInput({ media: pcmBlob });
              });
            };

            inputSourceRef.current.connect(processorRef.current);
            processorRef.current.connect(inputContextRef.current.destination);
            
            startVisualizer();
          },
          onmessage: async (msg: LiveServerMessage) => {
            const base64Audio = msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (base64Audio && outputContextRef.current && outputNodeRef.current) {
               // Handle Audio Playback
               if (outputContextRef.current.state === 'suspended') {
                 await outputContextRef.current.resume();
               }
               nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputContextRef.current.currentTime);
               const buffer = await decodeAudioData(decode(base64Audio), outputContextRef.current, 24000, 1);
               const source = outputContextRef.current.createBufferSource();
               source.buffer = buffer;
               source.connect(outputNodeRef.current);
               source.connect(outputContextRef.current.destination);
               
               source.addEventListener('ended', () => sourcesRef.current.delete(source));
               source.start(nextStartTimeRef.current);
               nextStartTimeRef.current += buffer.duration;
               sourcesRef.current.add(source);
            }

            if (msg.serverContent?.interrupted) {
               sourcesRef.current.forEach(s => s.stop());
               sourcesRef.current.clear();
               nextStartTimeRef.current = 0;
            }
          },
          onclose: () => {
            setStatus('Link Terminated');
            disconnect();
          },
          onerror: (e: any) => {
            console.error("Live API Error", e);
            if (e.message?.includes('403') || e.toString().includes('Permission denied')) {
                setErrorMsg("Access Denied: API Key lacks Live API permissions.");
            } else {
                setErrorMsg("Signal Lost: " + (e.message || "Unknown Error"));
            }
            setStatus('Connection Error');
            disconnect();
          }
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } // Deep, authoritative voice
          },
          systemInstruction: SYSTEM_INSTRUCTION + " You are in a Live Strategy War Room session. Speak concisely, aggressively, and like a seasoned litigator. We are preparing for battle.",
        }
      });

    } catch (error: any) {
      console.error("Connection failed", error);
      setStatus('Connection Failed');
      setErrorMsg(error.message || "Could not initialize audio link.");
    }
  };

  const disconnect = () => {
    // Safely close input context
    if (inputContextRef.current && inputContextRef.current.state !== 'closed') {
      try { inputContextRef.current.close(); } catch(e) { console.warn(e); }
    }
    
    // Safely close output context
    if (outputContextRef.current && outputContextRef.current.state !== 'closed') {
      try { outputContextRef.current.close(); } catch(e) { console.warn(e); }
    }
    
    inputSourceRef.current?.disconnect();
    processorRef.current?.disconnect();
    
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    
    sessionPromiseRef.current?.then(session => {
       try { session.close(); } catch(e) { console.warn(e); }
    });
    sessionPromiseRef.current = null;
    
    setIsConnected(false);
    // Note: We don't reset status here if there's an error, to let the user read it
    if (!errorMsg) setStatus('Ready for Link');
  };

  // Helpers
  const createBlob = (data: Float32Array): Blob => {
    const l = data.length;
    const int16 = new Int16Array(l);
    for (let i = 0; i < l; i++) {
      int16[i] = data[i] * 32768;
    }
    return {
      data: encode(new Uint8Array(int16.buffer)),
      mimeType: 'audio/pcm;rate=16000',
    };
  };

  const decode = (base64: string) => {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  };

  const encode = (bytes: Uint8Array) => {
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  };

  async function decodeAudioData(
    data: Uint8Array,
    ctx: AudioContext,
    sampleRate: number,
    numChannels: number,
  ): Promise<AudioBuffer> {
    const dataInt16 = new Int16Array(data.buffer);
    const frameCount = dataInt16.length / numChannels;
    const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
    for (let channel = 0; channel < numChannels; channel++) {
      const channelData = buffer.getChannelData(channel);
      for (let i = 0; i < frameCount; i++) {
        channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
      }
    }
    return buffer;
  }

  const startVisualizer = () => {
    if (!canvasRef.current || !analyserRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      animationFrameRef.current = requestAnimationFrame(draw);
      analyserRef.current!.getByteFrequencyData(dataArray);

      if (ctx) {
        ctx.fillStyle = '#020617'; // Slate 950
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        const barWidth = (canvas.width / bufferLength) * 2.5;
        let barHeight;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
          barHeight = dataArray[i] / 2;
          ctx.fillStyle = `rgb(${barHeight + 100}, 50, 0)`; // Amberish Red
          ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
          x += barWidth + 1;
        }
      }
    };
    draw();
  };

  useEffect(() => {
    return () => disconnect();
  }, []);

  return (
    <div className="h-full flex flex-col items-center justify-center bg-slate-950 relative overflow-hidden">
      {/* Background Pulse */}
      {isConnected && (
        <div className="absolute inset-0 z-0 flex items-center justify-center pointer-events-none">
          <div className="w-[500px] h-[500px] bg-amber-900/10 rounded-full animate-pulse blur-3xl"></div>
        </div>
      )}

      <div className="z-10 flex flex-col items-center gap-8">
        <div className="text-center">
          <h2 className="text-3xl font-display font-bold text-white tracking-widest">LIVE WAR ROOM</h2>
          <div className="flex flex-col items-center mt-2">
             <p className={`text-sm font-mono ${isConnected ? 'text-red-500 animate-pulse' : 'text-slate-500'}`}>
               STATUS: {status.toUpperCase()}
             </p>
             {errorMsg && (
               <div className="mt-2 flex items-center gap-2 text-red-400 bg-red-900/20 px-3 py-1 rounded border border-red-900/50">
                 <AlertCircle className="w-4 h-4" />
                 <span className="text-xs font-bold">{errorMsg}</span>
               </div>
             )}
          </div>
        </div>

        {/* Visualizer Canvas */}
        <div className="w-[600px] h-48 bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden shadow-2xl relative">
           <canvas ref={canvasRef} width="600" height="192" className="w-full h-full" />
           {!isConnected && (
             <div className="absolute inset-0 flex items-center justify-center text-slate-700">
               <Radio className="w-16 h-16 opacity-20" />
             </div>
           )}
        </div>

        {/* Controls */}
        <div className="flex items-center gap-6">
          {!isConnected ? (
            <button
              onClick={connect}
              className="w-20 h-20 rounded-full bg-slate-800 hover:bg-amber-600 border-2 border-slate-600 hover:border-amber-400 transition-all shadow-lg flex items-center justify-center group"
            >
              <Mic className="w-8 h-8 text-slate-400 group-hover:text-white" />
            </button>
          ) : (
            <>
              <button
                onClick={() => setIsMuted(!isMuted)}
                className={`w-14 h-14 rounded-full border-2 flex items-center justify-center transition-colors ${isMuted ? 'bg-red-900/20 border-red-500 text-red-500' : 'bg-slate-800 border-slate-600 text-slate-400 hover:text-white'}`}
              >
                {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
              </button>
              
              <button
                onClick={disconnect}
                className="w-20 h-20 rounded-full bg-red-600 hover:bg-red-500 border-4 border-slate-950 shadow-[0_0_30px_rgba(220,38,38,0.5)] flex items-center justify-center animate-pulse"
              >
                <div className="w-6 h-6 bg-white rounded-sm"></div>
              </button>
            </>
          )}
        </div>

        <div className="max-w-md text-center">
           <p className="text-xs text-slate-600">
             Protocol: Gemini 2.5 Native Audio // 16kHz PCM // Encrypted <br/>
             Use hands-free mode to pace and practice oral arguments.
           </p>
        </div>
      </div>
    </div>
  );
};

export default LiveWarRoom;
