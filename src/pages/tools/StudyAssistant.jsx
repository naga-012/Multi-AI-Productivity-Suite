import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { 
  GraduationCap, BookOpen, Layers, Award, Clipboard, Trash2, CheckCircle2, 
  Sparkles, RefreshCw, ChevronRight, HelpCircle, ArrowRight, Play, Check, AlertTriangle
} from 'lucide-react';

const StudyAssistant = () => {
  const { token, API_URL } = useAuth();

  // Ingestion states
  const [topic, setTopic] = useState('');
  const [level, setLevel] = useState('Intermediate');
  
  // Output data states
  const [explanationHTML, setExplanationHTML] = useState('');
  const [quizArray, setQuizArray] = useState([]);
  const [flashcardsArray, setFlashcardsArray] = useState([]);
  const [practiceProblems, setPracticeProblems] = useState([]);

  // Tab views
  const [activeTab, setActiveTab] = useState('explain'); // explain, quiz, flashcards, practice
  
  // Interactive UI states
  const [quizAnswers, setQuizAnswers] = useState({}); // { questionId: selectedOptionIndex }
  const [flippedCards, setFlippedCards] = useState([]); // Array of flipped card IDs
  const [showPracticeAnswers, setShowPracticeAnswers] = useState([]); // Array of visible practice answers

  const [processing, setProcessing] = useState(false);
  const [successToast, setSuccessToast] = useState('');
  const [error, setError] = useState('');

  const complexityLevels = ['Beginner', 'Intermediate', 'Expert Specialist'];

  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!topic.trim()) return;

    setError('');
    setExplanationHTML('');
    setQuizArray([]);
    setFlashcardsArray([]);
    setPracticeProblems([]);
    setQuizAnswers({});
    setFlippedCards([]);
    setShowPracticeAnswers([]);
    setProcessing(true);

    try {
      const res = await fetch(`${API_URL}/study/process`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          topic,
          level
        })
      });

      if (!res.ok) {
        throw new Error('Study materials generator compiler error.');
      }

      const data = await res.json();
      setExplanationHTML(data.explanationHTML);
      setQuizArray(data.quizArray);
      setFlashcardsArray(data.flashcardsArray);
      setPracticeProblems(data.practiceProblems);
      setActiveTab('explain'); // default tab
    } catch (err) {
      console.error(err);
      setError(err.message || 'Error communicating with study harvester.');
    } finally {
      setProcessing(false);
    }
  };

  const handlePreloadOCT = () => {
    setTopic('Optical Coherence Tomography (OCT) Interpretation Patterns');
  };

  const handleClear = () => {
    setTopic('');
    setExplanationHTML('');
    setQuizArray([]);
    setFlashcardsArray([]);
    setPracticeProblems([]);
    setQuizAnswers({});
    setFlippedCards([]);
    setShowPracticeAnswers([]);
    setError('');
  };

  const handleCopyGuide = () => {
    if (!explanationHTML) return;

    let guideText = `=== OCUCARE CLINICAL MASTERY STUDY GUIDE ===\n\n`;
    guideText += `TOPIC: ${topic}\nCOMPLEXITY: ${level}\n\n`;
    
    // Add text contents
    guideText += `${explanationHTML.replace(/###|####/g, '').trim()}\n\n`;

    // Add quiz questions
    guideText += `--- REVIEWS PRACTICE QUESTIONS ---\n`;
    quizArray.forEach(q => {
      guideText += `Q: ${q.question}\n`;
      q.options.forEach((opt, idx) => {
        guideText += `   [${idx}] ${opt}\n`;
      });
      guideText += `Correct Choice: Option [${q.correctOption}]\n`;
      guideText += `Rationale: ${q.rationaleText}\n\n`;
    });

    navigator.clipboard.writeText(guideText);
    setSuccessToast('Study Guide ledger copied to clipboard.');
    setTimeout(() => setSuccessToast(''), 3000);
  };

  const handleOptionSelect = (qId, optionIdx) => {
    // Prevent re-selecting once graded
    if (quizAnswers[qId] !== undefined) return;
    setQuizAnswers({
      ...quizAnswers,
      [qId]: optionIdx
    });
  };

  const toggleCardFlip = (id) => {
    if (flippedCards.includes(id)) {
      setFlippedCards(flippedCards.filter(cId => cId !== id));
    } else {
      setFlippedCards([...flippedCards, id]);
    }
  };

  const togglePracticeAnswer = (id) => {
    if (showPracticeAnswers.includes(id)) {
      setShowPracticeAnswers(showPracticeAnswers.filter(aId => aId !== id));
    } else {
      setShowPracticeAnswers([...showPracticeAnswers, id]);
    }
  };

  // Helper render to print markdown bolds
  const renderFormattedText = (text) => {
    const lines = text.split('\n');
    return lines.map((line, lIdx) => {
      if (line.startsWith('### ')) {
        return <h3 key={lIdx} className="text-sm font-bold text-white uppercase tracking-wider mt-4 border-b border-slate-800 pb-1.5">{line.slice(4)}</h3>;
      }
      if (line.startsWith('#### ')) {
        return <h4 key={lIdx} className="text-xs font-bold text-slate-350 uppercase tracking-wider mt-3">{line.slice(5)}</h4>;
      }
      if (line.startsWith('- ')) {
        const parts = line.slice(2).split(/(\*\*.*?\*\*)/g);
        return (
          <div key={lIdx} className="flex items-start gap-2.5 pl-3 py-0.5 text-xs text-slate-350">
            <span className="text-brand-500 mt-1 shrink-0">•</span>
            <p>
              {parts.map((p, pIdx) => {
                if (p.startsWith('**') && p.endsWith('**')) {
                  return <strong key={pIdx} className="font-extrabold text-white">{p.slice(2, -2)}</strong>;
                }
                return p;
              })}
            </p>
          </div>
        );
      }
      return <p key={lIdx} className="text-xs text-slate-400 leading-relaxed font-sans mt-2">{line}</p>;
    });
  };

  // Graded quiz scorecard calculations
  const parsedQuestionsCount = quizArray.length;
  const answeredQuestionsCount = Object.keys(quizAnswers).length;
  const correctAnswersCount = quizArray.reduce((acc, q) => {
    if (quizAnswers[q.id] === q.correctOption) return acc + 1;
    return acc;
  }, 0);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Toast alert */}
      {successToast && (
        <div className="fixed bottom-5 right-5 bg-emerald-500 text-white font-semibold text-xs px-4 py-3 rounded-xl shadow-2xl z-50 flex items-center gap-2 border border-emerald-400/20 animate-bounce">
          <CheckCircle2 className="w-4 h-4" />
          <span>{successToast}</span>
        </div>
      )}

      <div className="border-b border-slate-800 pb-5">
        <h1 className="text-2xl font-bold text-white tracking-tight">AI Study Assistant & Knowledge Suite</h1>
        <p className="text-slate-400 text-sm">Distill medical theories, generate multiple-choice quizzes with real-time feedback, review card decks, and practice case scenarios.</p>
      </div>

      {error && (
        <div className="p-4 bg-red-950/40 border border-red-800/30 rounded-xl text-red-400 text-xs">
          {error}
        </div>
      )}

      {/* Grid split-screen layout */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-stretch">
        
        {/* Left Column: Topic ingestion & complexity dials */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 p-5 rounded-2xl flex flex-col space-y-5 shadow-sm">
          
          <div className="space-y-2">
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Study Subject Matter</label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="What topic would you like to master today? (e.g. OCT interpretation patterns)"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-650 focus:outline-none focus:ring-1 focus:ring-slate-800"
            />
          </div>

          {/* Complexity level select knobs */}
          <div className="space-y-2">
            <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Complexity Tier</span>
            <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-850 justify-between select-none">
              {complexityLevels.map(lvl => {
                const isSelected = level === lvl;
                return (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => setLevel(lvl)}
                    className={`flex-1 py-2 text-center rounded-lg text-[10px] font-bold uppercase tracking-wider transition ${
                      isSelected 
                        ? 'bg-slate-900 border border-slate-800 text-white' 
                        : 'text-slate-500 hover:text-slate-350'
                    }`}
                  >
                    {lvl.split(' ')[0]} {/* shortened labels */}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Action triggers */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={handlePreloadOCT}
              type="button"
              className="flex-1 py-2.5 bg-slate-950 hover:bg-slate-850 border border-slate-855 hover:border-slate-800 text-slate-400 hover:text-white rounded-xl text-xs font-bold transition uppercase tracking-wider"
            >
              Preload OCT Demo
            </button>
            <button
              onClick={handleGenerate}
              disabled={processing || !topic.trim()}
              className="flex-2 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white font-semibold py-2.5 px-6 rounded-xl shadow-lg transition flex items-center justify-center gap-2 text-xs uppercase tracking-wider"
            >
              {processing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Generating...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 animate-pulse" />
                  <span>Master Topic</span>
                </>
              )}
            </button>
          </div>

        </div>

        {/* Right Column: High-Fidelity canvas workspace */}
        <div className="lg:col-span-3 bg-slate-950 border border-slate-850 rounded-2xl p-5 flex flex-col h-[520px] shadow-2xl relative">
          
          {/* Header tab switchers */}
          <div className="border-b border-slate-855 pb-3 mb-4 flex justify-between items-center shrink-0">
            <div className="flex bg-slate-900/60 p-0.5 rounded-lg border border-slate-800">
              <button
                onClick={() => setActiveTab('explain')}
                disabled={!explanationHTML}
                className={`px-3 py-1.5 rounded text-[9px] font-bold uppercase tracking-wider transition ${
                  activeTab === 'explain' 
                    ? 'bg-slate-950 text-white border border-slate-800' 
                    : 'text-slate-500 hover:text-slate-355 disabled:opacity-30'
                }`}
              >
                📖 Explainer
              </button>
              <button
                onClick={() => setActiveTab('quiz')}
                disabled={quizArray.length === 0}
                className={`px-3 py-1.5 rounded text-[9px] font-bold uppercase tracking-wider transition ${
                  activeTab === 'quiz' 
                    ? 'bg-slate-950 text-white border border-slate-800' 
                    : 'text-slate-500 hover:text-slate-355 disabled:opacity-30'
                }`}
              >
                📝 Quiz MCQ
              </button>
              <button
                onClick={() => setActiveTab('flashcards')}
                disabled={flashcardsArray.length === 0}
                className={`px-3 py-1.5 rounded text-[9px] font-bold uppercase tracking-wider transition ${
                  activeTab === 'flashcards' 
                    ? 'bg-slate-950 text-white border border-slate-800' 
                    : 'text-slate-500 hover:text-slate-355 disabled:opacity-30'
                }`}
              >
                🎴 Flashcards
              </button>
              <button
                onClick={() => setActiveTab('practice')}
                disabled={practiceProblems.length === 0}
                className={`px-3 py-1.5 rounded text-[9px] font-bold uppercase tracking-wider transition ${
                  activeTab === 'practice' 
                    ? 'bg-slate-950 text-white border border-slate-800' 
                    : 'text-slate-500 hover:text-slate-355 disabled:opacity-30'
                }`}
              >
                🎯 Scenarios
              </button>
            </div>

            {/* Quick Actions */}
            {explanationHTML && (
              <div className="flex gap-2">
                <button
                  onClick={handleCopyGuide}
                  className="flex items-center gap-1 px-2.5 py-1 bg-slate-900 border border-slate-850 hover:border-slate-750 text-slate-400 hover:text-white rounded text-[9px] font-bold uppercase tracking-wider transition"
                >
                  <Clipboard className="w-3 h-3" /> Copy Guide
                </button>
                <button
                  onClick={handleClear}
                  className="flex items-center gap-1 px-2.5 py-1 bg-slate-900 border border-slate-850 hover:border-red-900 text-slate-450 hover:text-red-400 rounded text-[9px] font-bold uppercase tracking-wider transition"
                >
                  <Trash2 className="w-3 h-3" /> Clear
                </button>
              </div>
            )}
          </div>

          {/* Main workspace container viewports */}
          <div className="flex-1 overflow-auto min-h-0">
            {explanationHTML ? (
              
              // 1. Topic explainer panel
              activeTab === 'explain' ? (
                <div className="p-2 space-y-4 select-text">
                  <div className="p-5 bg-slate-900/40 border border-slate-855 rounded-2xl space-y-3">
                    {renderFormattedText(explanationHTML)}
                  </div>
                </div>
              ) :

              // 2. Graded MCQ quiz panel
              activeTab === 'quiz' ? (
                <div className="p-2 space-y-6">
                  {quizArray.map(q => {
                    const selectedIdx = quizAnswers[q.id];
                    const isAnswered = selectedIdx !== undefined;

                    return (
                      <div key={q.id} className="bg-slate-900/50 border border-slate-850 p-4.5 rounded-2xl space-y-4">
                        <div className="flex gap-2">
                          <span className="text-[10px] bg-slate-950 text-slate-500 font-bold border border-slate-855 px-2 py-0.5 rounded shrink-0 h-5">
                            Q#{q.id}
                          </span>
                          <h4 className="text-xs font-semibold text-slate-200 leading-normal">{q.question}</h4>
                        </div>

                        {/* MCQ selections lists */}
                        <div className="grid grid-cols-1 gap-2.5">
                          {q.options.map((opt, idx) => {
                            const isChosen = selectedIdx === idx;
                            const isCorrectChoice = q.correctOption === idx;
                            
                            let optStyle = 'bg-slate-950 hover:bg-slate-850 text-slate-350 border-slate-855';
                            if (isChosen) {
                              optStyle = isCorrectChoice 
                                ? 'bg-emerald-500/10 border-emerald-500 text-emerald-300' 
                                : 'bg-red-500/10 border-red-500 text-red-300';
                            } else if (isAnswered && isCorrectChoice) {
                              optStyle = 'bg-emerald-500/10 border-emerald-500/50 text-emerald-300';
                            }

                            return (
                              <button
                                key={idx}
                                onClick={() => handleOptionSelect(q.id, idx)}
                                disabled={isAnswered}
                                className={`w-full text-left px-4 py-2.5 rounded-xl border text-xs leading-normal font-medium transition flex justify-between items-center ${optStyle}`}
                              >
                                <span>{opt}</span>
                                {isChosen && (
                                  isCorrectChoice ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                                )}
                              </button>
                            );
                          })}
                        </div>

                        {/* Grade rationale displays */}
                        {isAnswered && (
                          <div className="p-3 bg-slate-950 border border-slate-855 rounded-xl text-[10px] leading-relaxed text-slate-400 select-text flex gap-2">
                            <span className="text-brand-500 font-bold shrink-0">Rationale:</span>
                            <span>{q.rationaleText}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  
                  {/* Quiz metrics scorecard */}
                  {answeredQuestionsCount > 0 && (
                    <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-between text-xs font-semibold shrink-0">
                      <span className="text-slate-450 uppercase tracking-wider">Session Scorecard:</span>
                      <span className="text-white">
                        {correctAnswersCount} / {parsedQuestionsCount} Graded Correctly ({Math.round((correctAnswersCount / parsedQuestionsCount) * 100)}%)
                      </span>
                    </div>
                  )}

                </div>
              ) :

              // 3. Review Flashcards deck tab
              activeTab === 'flashcards' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-2 select-none">
                  {flashcardsArray.map(card => {
                    const isFlipped = flippedCards.includes(card.id);
                    return (
                      <div
                        key={card.id}
                        onClick={() => toggleCardFlip(card.id)}
                        className={`h-36 border rounded-2xl p-5 flex flex-col justify-between cursor-pointer transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] ${
                          isFlipped 
                            ? 'bg-slate-900 border-slate-800 shadow-md' 
                            : 'bg-brand-950/15 border-brand-500/20 hover:border-brand-500/40 shadow-sm'
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Card #{card.id}</span>
                          <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${
                            isFlipped ? 'bg-slate-950 text-slate-400' : 'bg-brand-500/10 text-brand-400'
                          }`}>
                            {isFlipped ? 'Answer' : 'Prompt'}
                          </span>
                        </div>

                        <p className="text-xs text-slate-200 font-semibold leading-relaxed text-center py-2">
                          {isFlipped ? card.answerBack : card.promptFront}
                        </p>

                        <span className="text-[8px] font-bold text-slate-650 text-center uppercase tracking-widest block">
                          Click to Flip
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) :

              // 4. Clinical Case Scenarios practice tab
              <div className="p-2 space-y-4">
                {practiceProblems.map(prob => {
                  const isVisible = showPracticeAnswers.includes(prob.id);
                  return (
                    <div key={prob.id} className="bg-slate-900/50 border border-slate-850 p-5 rounded-2xl space-y-4 select-text">
                      <div className="space-y-1">
                        <span className="text-[9px] text-brand-400 font-bold uppercase tracking-wider block">Case Practice Scenario</span>
                        <p className="text-xs text-slate-200 leading-relaxed font-medium">{prob.scenario}</p>
                      </div>

                      <div className="border-t border-slate-850 pt-3">
                        <button
                          onClick={() => togglePracticeAnswer(prob.id)}
                          className="px-3.5 py-1.5 bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white rounded-lg text-[10px] font-bold uppercase tracking-wider transition"
                        >
                          {isVisible ? 'Hide Explanation' : 'Display Explanation'}
                        </button>

                        {isVisible && (
                          <div className="mt-3 p-4 bg-slate-950 border border-slate-855 rounded-xl text-xs text-slate-350 leading-relaxed space-y-2">
                            <span className="font-bold text-emerald-400 uppercase tracking-wider text-[9px] block">✨ Expert Clinical Solution</span>
                            <p>{prob.answerExplanation}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

            ) : (
              // Idle state view
              <div className="flex-1 flex flex-col items-center justify-center text-slate-500 text-center px-6 h-full">
                <GraduationCap className="w-12 h-12 stroke-[1] mb-2 text-slate-700 font-bold" />
                <h4 className="text-sm font-bold text-slate-400">Retention Studio Idle</h4>
                <p className="text-xs text-slate-500 mt-1 max-w-xs leading-normal">
                  Configure study keywords on the left panel and click Master Topic to compile explanations, MCQs, or scenario cases.
                </p>
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
};

export default StudyAssistant;
