import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { 
  Globe, Volume2, Clipboard, Trash2, ArrowRight, Languages, 
  CheckCircle2, RefreshCw, AudioLines, AlertCircle, HelpCircle
} from 'lucide-react';

const Translator = () => {
  const { token, API_URL } = useAuth();

  // Languages list (20+ global languages)
  const languagesList = [
    { name: 'Telugu', label: 'Telugu (తెలుగు)' },
    { name: 'Spanish', label: 'Spanish (Español)' },
    { name: 'French', label: 'French (Français)' },
    { name: 'German', label: 'German (Deutsch)' },
    { name: 'Mandarin', label: 'Mandarin (中文)' },
    { name: 'Hindi', label: 'Hindi (हिन्दी)' },
    { name: 'Arabic', label: 'Arabic (العربية)' },
    { name: 'Bengali', label: 'Bengali (বাংলা)' },
    { name: 'Portuguese', label: 'Portuguese (Português)' },
    { name: 'Russian', label: 'Russian (Русский)' },
    { name: 'Japanese', label: 'Japanese (日本語)' },
    { name: 'Punjabi', label: 'Punjabi (ਪੰਜਾਬੀ)' },
    { name: 'Javanese', label: 'Javanese (Basa Jawa)' },
    { name: 'Turkish', label: 'Turkish (Türkçe)' },
    { name: 'Korean', label: 'Korean (한국어)' },
    { name: 'Marathi', label: 'Marathi (मराठी)' },
    { name: 'Vietnamese', label: 'Vietnamese (Tiếng Việt)' },
    { name: 'Tamil', label: 'Tamil (தமிழ்)' },
    { name: 'Italian', label: 'Italian (Italiano)' },
    { name: 'Urdu', label: 'Urdu (اردو)' }
  ];

  // States
  const [sourceLang, setSourceLang] = useState('auto');
  const [targetLang, setTargetLang] = useState('Telugu');
  const [inputText, setInputText] = useState('');
  const [translatedText, setTranslatedText] = useState('');
  const [detectedLang, setDetectedLang] = useState('');
  
  // Simulation states
  const [translating, setTranslating] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [error, setError] = useState('');
  const [successToast, setSuccessToast] = useState('');

  // Handle timeline pre-loading link redirects
  useEffect(() => {
    const buffer = sessionStorage.getItem('ocucare_translate_buffer');
    if (buffer) {
      setInputText(buffer);
      sessionStorage.removeItem('ocucare_translate_buffer');
      // Trigger translation automatically for the buffer text
      processTranslation(buffer, targetLang, sourceLang);
    }
  }, []);

  const processTranslation = async (textVal, target, source) => {
    if (!textVal.trim()) return;

    setError('');
    setTranslating(true);

    try {
      const res = await fetch(`${API_URL}/translate/process`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          text: textVal,
          targetLanguage: target,
          sourceLanguage: source
        })
      });

      if (!res.ok) {
        throw new Error('Failed to process clinical translation.');
      }

      const data = await res.json();
      setTranslatedText(data.translatedText);
      setDetectedLang(data.detectedLanguage);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Error communicating with translation gateway.');
    } finally {
      setTranslating(false);
    }
  };

  // Trigger translation when typing (debounced) or changing target language
  const handleTextChange = (e) => {
    const val = e.target.value;
    if (val.length > 5000) return; // character cap limit
    setInputText(val);

    // Auto translate if text ends in space or punctuation to feel live
    if (val.endsWith(' ') || val.endsWith('.') || val.length > 20) {
      const delayDebounce = setTimeout(() => {
        processTranslation(val, targetLang, sourceLang);
      }, 500);
      return () => clearTimeout(delayDebounce);
    }
  };

  const handleTargetLangChange = (e) => {
    const target = e.target.value;
    setTargetLang(target);
    if (inputText.trim()) {
      processTranslation(inputText, target, sourceLang);
    }
  };

  const handleManualTranslate = () => {
    processTranslation(inputText, targetLang, sourceLang);
  };

  const handleClear = () => {
    setInputText('');
    setTranslatedText('');
    setDetectedLang('');
    setError('');
  };

  const handleCopy = () => {
    if (!translatedText) return;
    navigator.clipboard.writeText(translatedText);
    showToast('Translation copied to clipboard.');
  };

  // Text-To-Speech simulation (triggers a 2-second audio soundwave ripple)
  const handleSpeak = () => {
    if (!translatedText || speaking) return;
    setSpeaking(true);
    setTimeout(() => {
      setSpeaking(false);
    }, 2500);
  };

  const showToast = (msg) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(''), 3000);
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Toast Alert */}
      {successToast && (
        <div className="fixed bottom-5 right-5 bg-emerald-500 text-white font-semibold text-xs px-4 py-3 rounded-xl shadow-2xl z-50 flex items-center gap-2 border border-emerald-400/20 animate-bounce">
          <CheckCircle2 className="w-4 h-4" />
          <span>{successToast}</span>
        </div>
      )}

      <div className="border-b border-slate-800 pb-5">
        <h1 className="text-2xl font-bold text-white tracking-tight">AI Clinical Translator</h1>
        <p className="text-slate-400 text-sm">Translate diagnostics, prescriptions, and patient history notes into 20+ global languages with medical context preservation.</p>
      </div>

      {error && (
        <div className="p-4 bg-red-950/40 border border-red-800/30 rounded-xl text-red-400 text-xs">
          {error}
        </div>
      )}

      {/* Translator Panel Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
        
        {/* Source Text Column (Left) */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col h-[500px] shadow-sm">
          {/* Header controls */}
          <div className="flex justify-between items-center border-b border-slate-800 pb-3 mb-4 shrink-0">
            <div className="flex items-center gap-2">
              <Globe className="w-4.5 h-4.5 text-brand-400" />
              <select
                value={sourceLang}
                onChange={(e) => setSourceLang(e.target.value)}
                className="bg-transparent text-xs font-bold text-slate-350 focus:outline-none cursor-pointer uppercase tracking-wider"
              >
                <option value="auto">🌐 Detect Language Automatically</option>
                <option value="English">English</option>
                <option value="Spanish">Spanish</option>
                <option value="French">French</option>
              </select>
            </div>
            
            {detectedLang && sourceLang === 'auto' && (
              <span className="text-[10px] bg-brand-500/10 text-brand-400 font-bold border border-brand-500/20 px-2 py-0.5 rounded">
                Detected: {detectedLang}
              </span>
            )}
          </div>

          {/* Text input area */}
          <div className="flex-1 flex flex-col min-h-0">
            <textarea
              value={inputText}
              onChange={handleTextChange}
              placeholder="Paste clinical patient logs, notes, or messages to translate (e.g. 'Your retinal scan shows early signs of diabetic retinopathy.')..."
              className="flex-1 bg-transparent text-xs text-white placeholder-slate-500 resize-none focus:outline-none leading-relaxed"
            />
            
            {/* Source controls */}
            <div className="flex justify-between items-center border-t border-slate-850 pt-3 mt-3 shrink-0">
              <span className="text-[10px] font-bold text-slate-550">
                {inputText.length} / 5000 characters
              </span>
              
              <div className="flex gap-2">
                <button
                  onClick={handleClear}
                  disabled={!inputText}
                  className="p-2 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white rounded-lg transition disabled:opacity-30"
                  title="Clear source text"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <button
                  onClick={handleManualTranslate}
                  disabled={translating || !inputText.trim()}
                  className="px-3.5 py-2 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white rounded-lg text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 transition"
                >
                  {translating ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : 'Translate'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Target Translation Column (Right) */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col h-[500px] shadow-sm">
          {/* Header controls */}
          <div className="flex justify-between items-center border-b border-slate-800 pb-3 mb-4 shrink-0">
            <div className="flex items-center gap-2">
              <Languages className="w-4.5 h-4.5 text-emerald-400" />
              <select
                value={targetLang}
                onChange={handleTargetLangChange}
                className="bg-transparent text-xs font-bold text-slate-350 focus:outline-none cursor-pointer uppercase tracking-wider border-b border-slate-800"
              >
                {languagesList.map(lang => (
                  <option key={lang.name} value={lang.name}>{lang.label}</option>
                ))}
              </select>
            </div>
            
            {translating && (
              <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest animate-pulse">
                Processing Vector...
              </span>
            )}
          </div>

          {/* Translation display area */}
          <div className="flex-1 flex flex-col min-h-0">
            {translatedText ? (
              <div className="flex-1 bg-slate-950 border border-slate-855 rounded-xl p-4 overflow-y-auto font-sans text-xs text-slate-200 leading-relaxed whitespace-pre-wrap flex flex-col justify-between">
                
                <div className="flex-1">
                  {translatedText}
                </div>

                {/* Text to Speech visual ripples drawer */}
                {speaking && (
                  <div className="mt-4 p-3 bg-emerald-500/5 border border-emerald-500/20 rounded-xl flex items-center justify-between shrink-0 animate-pulse">
                    <div className="flex items-center gap-2 text-emerald-400">
                      <AudioLines className="w-4.5 h-4.5" />
                      <span className="text-[10px] font-bold uppercase tracking-wider">Audio Playback Active</span>
                    </div>
                    <div className="flex gap-1">
                      <span className="w-1.5 h-3 bg-emerald-400 rounded-full animate-bounce delay-100" />
                      <span className="w-1.5 h-5 bg-emerald-400 rounded-full animate-bounce delay-200" />
                      <span className="w-1.5 h-2.5 bg-emerald-400 rounded-full animate-bounce delay-300" />
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-500 text-center px-6">
                <HelpCircle className="w-12 h-12 stroke-[1] mb-2 text-slate-650" />
                <h4 className="text-sm font-bold text-slate-400">Translation Empty</h4>
                <p className="text-xs text-slate-500 mt-1 max-w-xs leading-normal">
                  Write clinical source logs in the left panel to output medical-grade translations.
                </p>
              </div>
            )}

            {/* Target actions bar */}
            <div className="flex justify-end items-center border-t border-slate-850 pt-3 mt-3 gap-2 shrink-0 select-none">
              <button
                onClick={handleSpeak}
                disabled={!translatedText || speaking}
                className="p-2 bg-slate-950 hover:bg-slate-800 border border-slate-850 hover:border-slate-750 text-slate-400 hover:text-white rounded-lg transition disabled:opacity-30 flex items-center gap-1.5 text-[10px] font-bold"
                title="Speak translation"
              >
                <Volume2 className="w-4 h-4" /> Speak
              </button>
              <button
                onClick={handleCopy}
                disabled={!translatedText}
                className="px-3.5 py-2 bg-slate-950 hover:bg-slate-800 border border-slate-850 hover:border-slate-750 text-slate-400 hover:text-white rounded-lg transition disabled:opacity-30 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5"
                title="Copy to clipboard"
              >
                <Clipboard className="w-4 h-4" /> Copy
              </button>
            </div>
          </div>
        </div>

      </div>

      {/* Guide Card (Hidden during translations) */}
      {!inputText && (
        <div className="p-4 bg-slate-900/60 border border-slate-850 rounded-2xl flex items-start gap-3.5 text-xs text-slate-450">
          <Globe className="w-5 h-5 text-brand-450 mt-0.5 shrink-0" />
          <div className="space-y-1">
            <span className="font-bold text-slate-200">OPHTHALMIC CLINIC TRANSLATION NOTE:</span>
            <p className="leading-relaxed">This translator utilizes custom language parsing directories tuned for ocular medicine, visual fields, and optical scans. Patient details highlighted inside timelines will open here automatically when clicking "Translate Note".</p>
          </div>
        </div>
      )}

    </div>
  );
};

export default Translator;
