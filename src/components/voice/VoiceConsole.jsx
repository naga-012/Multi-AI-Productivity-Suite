import React, { useState } from 'react';
import { useVoiceAssistant } from '../../hooks/useVoiceAssistant';
import { Mic, MicOff, Volume2, VolumeX, ShieldAlert, X, Sliders, PlayCircle } from 'lucide-react';
import { useLocation } from 'react-router-dom';

const VoiceConsole = () => {
  const {
    isListening,
    transcript,
    error,
    supported,
    speaking,
    startListening,
    stopListening,
    speak,
    stopSpeaking
  } = useVoiceAssistant();

  const location = useLocation();

  const [rate, setRate] = useState(1.0);
  const [showConsole, setShowConsole] = useState(false);

  // Do not render voice orb on login portal
  if (location.pathname === '/login' || location.pathname === '/signup') {
    return null;
  }

  if (!supported) {
    return (
      <div className="fixed bottom-6 right-6 z-40 bg-slate-900 border border-slate-800 p-4.5 rounded-2xl shadow-2xl flex items-center gap-3 max-w-xs print:hidden animate-fade-in select-none">
        <ShieldAlert className="w-5 h-5 text-amber-500 shrink-0" />
        <div>
          <p className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">Voice Control Off</p>
          <p className="text-[9px] text-slate-550 leading-relaxed mt-0.5">Browser does not support Web Speech Recognition API.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-40 flex items-end gap-3.5 print:hidden">
      
      {/* Floating Ticker Console Overlay (Visible when toggled) */}
      {showConsole && (
        <div className="bg-slate-900/90 border border-slate-800 backdrop-blur-md p-4 rounded-2xl shadow-2xl flex flex-col gap-3 min-w-[280px] max-w-xs animate-fade-in select-none">
          <div className="flex justify-between items-center border-b border-slate-800 pb-2">
            <span className="text-[10px] font-bold text-slate-450 uppercase tracking-wider">AI Voice Console</span>
            <button
              onClick={() => setShowConsole(false)}
              className="text-slate-500 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Transcript overlay display */}
          <div className="bg-slate-950/80 border border-slate-850 rounded-xl p-3 h-20 overflow-y-auto flex flex-col justify-between">
            {isListening ? (
              <div className="flex justify-between items-center">
                <span className="text-[9px] text-rose-450 font-bold uppercase tracking-widest animate-pulse">
                  Listening...
                </span>
                {/* Waveform vertical pulse ripples */}
                <div className="flex items-center gap-0.5 h-4 px-1 shrink-0">
                  <div className="w-0.5 bg-rose-500 h-2.5 animate-pulse rounded" />
                  <div className="w-0.5 bg-rose-500 h-4 animate-pulse rounded [animation-delay:0.2s]" />
                  <div className="w-0.5 bg-rose-500 h-2 animate-pulse rounded [animation-delay:0.4s]" />
                  <div className="w-0.5 bg-rose-500 h-3 animate-pulse rounded [animation-delay:0.1s]" />
                </div>
              </div>
            ) : (
              <span className="text-[9px] text-slate-550 font-bold uppercase tracking-wider">
                Microphone Idle
              </span>
            )}
            <p className="text-[10px] text-slate-200 leading-normal italic line-clamp-2">
              {transcript || (isListening ? '"Speak a clinical command..."' : '"Click the mic and speak..."')}
            </p>
          </div>

          {error && (
            <p className="text-[9px] text-rose-400 bg-rose-950/20 border border-rose-950 px-2.5 py-1.5 rounded-lg">
              {error}
            </p>
          )}

          {/* Command reference hints */}
          <div className="text-[8px] text-slate-500 space-y-1 bg-slate-950/40 p-2 rounded-lg border border-slate-855">
            <span className="font-bold text-slate-400 block uppercase tracking-wide">Available Voice Commands:</span>
            <div className="grid grid-cols-2 gap-1 font-mono">
              <span>🗣️ "show dashboard"</span>
              <span>🗣️ "read summary"</span>
              <span>🗣️ "search patient Smith"</span>
              <span>🗣️ "run scan"</span>
            </div>
          </div>

          {/* Audio speeds slider rate controller */}
          <div className="space-y-1.5 pt-1">
            <div className="flex justify-between items-center text-[9px] font-bold text-slate-450 uppercase tracking-wider">
              <span className="flex items-center gap-1"><Sliders className="w-3 h-3" /> Voice Speed</span>
              <span>{rate.toFixed(1)}x</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="2.0"
              step="0.1"
              value={rate}
              onChange={(e) => setRate(parseFloat(e.target.value))}
              className="w-full accent-brand-500 h-1 bg-slate-800 rounded-lg cursor-pointer"
            />
          </div>

          {/* Speakers controls stop triggers */}
          {speaking && (
            <button
              onClick={stopSpeaking}
              className="w-full flex items-center justify-center gap-1.5 py-2 px-3 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 hover:border-rose-500/35 text-rose-450 rounded-xl text-[9px] font-bold uppercase tracking-wider transition"
            >
              <VolumeX className="w-3.5 h-3.5" /> Stop Speaking Voice
            </button>
          )}
        </div>
      )}

      {/* Floating Orb trigger button */}
      <button
        onClick={() => {
          if (isListening) {
            stopListening();
          } else {
            startListening();
            setShowConsole(true);
          }
        }}
        onDoubleClick={() => setShowConsole(!showConsole)}
        className={`w-14 h-14 rounded-full flex items-center justify-center border shadow-2xl relative transition-all duration-300 ${
          isListening 
            ? 'bg-rose-600 border-rose-500 text-white shadow-rose-500/20 ring-4 ring-rose-500/15' 
            : 'bg-slate-900 hover:bg-slate-850 border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white shadow-slate-950/40'
        }`}
        title="Double-click to open voice settings dashboard. Single click to speak."
      >
        {isListening ? (
          <Mic className="w-5 h-5 animate-pulse" />
        ) : (
          <Mic className="w-5 h-5" />
        )}
        
        {/* Visual scale pulse ring alerts */}
        {isListening && (
          <span className="absolute -inset-1 rounded-full border border-rose-500 animate-ping opacity-25 pointer-events-none" />
        )}
      </button>
      
    </div>
  );
};

export default VoiceConsole;
