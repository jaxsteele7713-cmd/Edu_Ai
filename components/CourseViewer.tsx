
import React, { useState, useEffect, useRef } from 'react';
import { Course, QuizQuestion } from '../types';
import { addToHistory } from '../services/mockBackend';
import { generateQuiz, generateApplicationInsight, generateDeepDive } from '../services/geminiService';

interface CourseViewerProps {
  course: Course;
  onBack: () => void;
  currentUser?: string;
}

enum Level {
    FLASHCARDS = 0,
    QUIZ = 1,
    APPLICATION = 2,
    DEEP_DIVE = 3
}

const CourseViewer: React.FC<CourseViewerProps> = ({ course, onBack, currentUser }) => {
  // --- Global State ---
  const [currentLevel, setCurrentLevel] = useState<Level>(Level.FLASHCARDS);
  const [maxUnlockedLevel, setMaxUnlockedLevel] = useState<Level>(Level.FLASHCARDS);

  // --- Flashcard State ---
  const [currentCard, setCurrentCard] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const flashcards = Array.isArray(course.content) ? course.content : [];

  // --- Quiz State ---
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>(course.quiz || []);
  const [quizLoading, setQuizLoading] = useState(false);
  const [quizAnswers, setQuizAnswers] = useState<number[]>([]);
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizScore, setQuizScore] = useState(0);

  // --- Application & Deep Dive State ---
  const [applicationText, setApplicationText] = useState('');
  const [deepDiveText, setDeepDiveText] = useState('');
  const [insightLoading, setInsightLoading] = useState(false);

  // --- Handlers: Navigation ---

  const unlockLevel = (level: Level) => {
      if (level > maxUnlockedLevel) {
          setMaxUnlockedLevel(level);
      }
      setCurrentLevel(level);
  };

  const handleFinishFlashcards = () => {
      unlockLevel(Level.QUIZ);
  };

  const handleFinishQuiz = () => {
      if (quizScore >= 60) {
        unlockLevel(Level.APPLICATION);
      } else {
        alert("You must score at least 60% to proceed. Review the flashcards and try again.");
      }
  };

  const handleFinishApplication = () => {
      unlockLevel(Level.DEEP_DIVE);
  };

  const handleFinishDeepDive = async () => {
      if (currentUser) {
          await addToHistory(currentUser, course.id, 'completed');
      }
      onBack();
  };

  // --- Fetchers ---

  useEffect(() => {
      if (currentLevel === Level.QUIZ && quizQuestions.length === 0 && !quizLoading) {
          setQuizLoading(true);
          generateQuiz(course.title, flashcards).then(q => {
              setQuizQuestions(q);
              setQuizLoading(false);
          });
      }
  }, [currentLevel, quizQuestions.length]);

  useEffect(() => {
      if (currentLevel === Level.APPLICATION && !applicationText && !insightLoading) {
          setInsightLoading(true);
          generateApplicationInsight(course.title).then(text => {
              setApplicationText(text);
              setInsightLoading(false);
          });
      }
  }, [currentLevel, applicationText]);

  useEffect(() => {
      if (currentLevel === Level.DEEP_DIVE && !deepDiveText && !insightLoading) {
          setInsightLoading(true);
          generateDeepDive(course.title).then(text => {
              setDeepDiveText(text);
              setInsightLoading(false);
          });
      }
  }, [currentLevel, deepDiveText]);


  // --- Flashcard Logic ---
  const handleNextCard = () => {
    setIsFlipped(false);
    setTimeout(() => setCurrentCard(prev => (prev + 1) % flashcards.length), 200);
  };
  const handlePrevCard = () => {
    setIsFlipped(false);
    setTimeout(() => setCurrentCard(prev => (prev - 1 + flashcards.length) % flashcards.length), 200);
  };
  const isLastCard = currentCard === flashcards.length - 1;

  // --- Quiz Logic ---
  const handleQuizSelect = (qIndex: number, optionIndex: number) => {
      if (quizSubmitted) return;
      const newAns = [...quizAnswers];
      newAns[qIndex] = optionIndex;
      setQuizAnswers(newAns);
  };

  const submitQuiz = () => {
      if (quizAnswers.length < quizQuestions.length) return alert("Please answer all questions.");
      let correct = 0;
      quizQuestions.forEach((q, i) => {
          if (quizAnswers[i] === q.answer) correct++;
      });
      const score = (correct / quizQuestions.length) * 100;
      setQuizScore(score);
      setQuizSubmitted(true);
  };

  return (
    <div className="w-full h-full flex flex-col overflow-hidden bg-da-bg text-da-text transition-colors duration-500">
       
       {/* Top Navigation Bar (Levels) */}
       <div className="flex items-center justify-between px-4 py-3 bg-da-paper/90 border-b border-da-gold/20 backdrop-blur-md z-20 shadow-sm">
            <button onClick={onBack} className="text-xs uppercase tracking-widest hover:text-da-gold text-da-text/50">
                <i className="fas fa-arrow-left mr-2"></i> Exit
            </button>
            
            {/* PROGRESSION BAR */}
            <div className="flex gap-2 md:gap-4 overflow-x-auto no-scrollbar">
                {[
                    { l: Level.FLASHCARDS, icon: 'fa-clone', title: 'Knowledge' },
                    { l: Level.QUIZ, icon: 'fa-clipboard-check', title: 'Test' },
                    { l: Level.APPLICATION, icon: 'fa-tools', title: 'Praxis' },
                    { l: Level.DEEP_DIVE, icon: 'fa-brain', title: 'Gnosis' }
                ].map((item, i) => {
                    const isUnlocked = maxUnlockedLevel >= item.l;
                    const isActive = currentLevel === item.l;
                    return (
                        <button 
                            key={i}
                            onClick={() => isUnlocked && setCurrentLevel(item.l)}
                            disabled={!isUnlocked}
                            className={`
                                flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] md:text-xs uppercase tracking-wider transition-all whitespace-nowrap border
                                ${isActive 
                                    ? 'bg-da-gold text-da-bg font-bold shadow-md border-da-gold' 
                                    : isUnlocked 
                                        ? 'bg-da-paper text-da-text hover:bg-da-subtle border-da-accent/20' 
                                        : 'opacity-40 cursor-not-allowed text-da-text bg-da-subtle border-transparent'
                                }
                            `}
                        >
                            <i className={`fas ${!isUnlocked ? 'fa-lock' : item.icon}`}></i>
                            <span className="hidden md:inline">{item.title}</span>
                        </button>
                    )
                })}
            </div>
       </div>

       {/* Main Content Area */}
       <div className="flex-1 overflow-y-auto relative custom-scrollbar p-4 md:p-8">
            <div className="max-w-4xl mx-auto min-h-full flex flex-col">
                
                {/* Header Title */}
                <div className="text-center mb-8">
                    <h2 className="text-2xl md:text-4xl font-bold font-display text-da-gold mb-2">{course.title}</h2>
                    <p className="text-xs uppercase tracking-[0.3em] opacity-50 text-da-text">
                        {currentLevel === Level.FLASHCARDS && "Phase I: Acquisition"}
                        {currentLevel === Level.QUIZ && "Phase II: Verification"}
                        {currentLevel === Level.APPLICATION && "Phase III: Application"}
                        {currentLevel === Level.DEEP_DIVE && "Phase IV: Mastery"}
                    </p>
                </div>

                {/* --- LEVEL 1: FLASHCARDS --- */}
                {currentLevel === Level.FLASHCARDS && (
                    <div className="flex-1 flex flex-col items-center">
                        <div className="w-full max-w-lg relative perspective-1000 my-auto">
                            <div 
                                className={`relative w-full aspect-[3/4] md:aspect-[4/3] transition-all duration-500 transform-style-3d cursor-pointer ${isFlipped ? 'rotate-y-180' : ''}`}
                                onClick={() => setIsFlipped(!isFlipped)}
                            >
                                {/* Front */}
                                <div className="absolute inset-0 bg-da-paper border border-da-gold/20 p-8 flex flex-col items-center justify-center text-center backface-hidden rounded shadow-2xl">
                                    <div className="absolute top-4 left-4 text-[10px] uppercase text-da-text/30">Card {currentCard + 1}/{flashcards.length}</div>
                                    <h3 className="text-2xl md:text-3xl font-serif text-da-text font-bold leading-tight">{flashcards[currentCard]?.front}</h3>
                                    <div className="mt-8 text-xs text-da-gold uppercase tracking-widest opacity-60">Click to Reveal</div>
                                </div>
                                {/* Back */}
                                <div className="absolute inset-0 bg-da-paper border border-da-gold/20 p-8 flex flex-col items-center justify-center text-center backface-hidden rotate-y-180 rounded shadow-2xl">
                                    <p className="text-lg md:text-xl text-da-text leading-relaxed font-serif">{flashcards[currentCard]?.back}</p>
                                </div>
                            </div>
                        </div>

                        {/* Controls */}
                        <div className="flex items-center gap-8 mt-8 mb-8">
                            <button onClick={handlePrevCard} className="w-12 h-12 rounded-full bg-da-paper border border-da-gold/20 hover:bg-da-gold hover:text-da-bg hover:border-da-gold text-da-text flex items-center justify-center transition-colors shadow-sm">
                                <i className="fas fa-chevron-left"></i>
                            </button>
                            {isLastCard ? (
                                <button 
                                    onClick={handleFinishFlashcards}
                                    className="px-8 py-3 bg-da-gold text-da-bg font-bold uppercase tracking-widest rounded hover:bg-da-text hover:text-da-paper transition-all shadow-lg animate-pulse"
                                >
                                    Take The Test <i className="fas fa-arrow-right ml-2"></i>
                                </button>
                            ) : (
                                <button onClick={handleNextCard} className="w-12 h-12 rounded-full bg-da-paper border border-da-gold/20 hover:bg-da-gold hover:text-da-bg hover:border-da-gold text-da-text flex items-center justify-center transition-colors shadow-sm">
                                    <i className="fas fa-chevron-right"></i>
                                </button>
                            )}
                        </div>
                    </div>
                )}

                {/* --- LEVEL 2: QUIZ --- */}
                {currentLevel === Level.QUIZ && (
                    <div className="flex-1 flex flex-col items-center max-w-2xl mx-auto w-full animate-[fadeIn_0.5s]">
                        {quizLoading ? (
                            <div className="text-da-gold animate-pulse text-xl font-display my-auto">Drafting Examination...</div>
                        ) : (
                            <div className="w-full space-y-8">
                                {quizQuestions.map((q, qIdx) => (
                                    <div key={qIdx} className="bg-da-paper/50 p-6 rounded border border-da-gold/10 shadow-sm">
                                        <h3 className="text-lg font-bold mb-4 flex gap-3 text-da-text">
                                            <span className="text-da-gold">{qIdx + 1}.</span> {q.question}
                                        </h3>
                                        <div className="space-y-2">
                                            {q.options.map((opt, oIdx) => {
                                                let style = "bg-da-paper border-da-accent/20 hover:border-da-gold text-da-text/80";
                                                if (quizAnswers[qIdx] === oIdx) style = "bg-da-gold/10 border-da-gold text-da-gold font-bold";
                                                if (quizSubmitted) {
                                                    if (oIdx === q.answer) style = "bg-green-500/10 border-green-500 text-green-600 dark:text-green-400";
                                                    else if (quizAnswers[qIdx] === oIdx && oIdx !== q.answer) style = "bg-red-500/10 border-red-500 text-red-600 dark:text-red-400";
                                                }
                                                return (
                                                    <button 
                                                        key={oIdx}
                                                        onClick={() => handleQuizSelect(qIdx, oIdx)}
                                                        disabled={quizSubmitted}
                                                        className={`w-full text-left p-3 rounded border transition-all text-sm ${style}`}
                                                    >
                                                        <span className="opacity-50 mr-2">{String.fromCharCode(65 + oIdx)}.</span> {opt}
                                                    </button>
                                                )
                                            })}
                                        </div>
                                    </div>
                                ))}

                                {!quizSubmitted ? (
                                    <button 
                                        onClick={submitQuiz}
                                        className="w-full py-4 bg-da-gold text-da-bg font-bold uppercase tracking-widest rounded hover:opacity-90 transition-colors shadow-md"
                                    >
                                        Submit Answers
                                    </button>
                                ) : (
                                    <div className="text-center bg-da-paper p-6 rounded border border-da-gold/20 shadow-lg">
                                        <div className="text-4xl font-display text-da-gold mb-2">{Math.round(quizScore)}%</div>
                                        <p className="text-sm opacity-60 mb-4">{quizScore >= 60 ? "Proficiency Verified." : "Study Required."}</p>
                                        {quizScore >= 60 && (
                                            <button 
                                                onClick={handleFinishQuiz}
                                                className="px-8 py-2 bg-da-gold text-da-bg text-sm uppercase tracking-widest rounded font-bold hover:scale-105 transition-transform"
                                            >
                                                Proceed to Praxis
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* --- LEVEL 3: APPLICATION --- */}
                {currentLevel === Level.APPLICATION && (
                    <div className="flex-1 flex flex-col items-center max-w-2xl mx-auto w-full animate-[fadeIn_0.5s]">
                         {insightLoading ? (
                             <div className="text-da-gold animate-pulse text-xl font-display my-auto">Consulting Industry Archives...</div>
                         ) : (
                             <div className="bg-da-paper p-8 md:p-12 rounded border-l-4 border-da-gold shadow-2xl relative overflow-hidden">
                                 <i className="fas fa-tools absolute top-6 right-6 text-6xl text-da-text opacity-5"></i>
                                 <h3 className="text-2xl font-display text-da-gold mb-6">Practical Application</h3>
                                 <div className="prose prose-invert lg:prose-xl">
                                     <p className="font-serif leading-relaxed text-da-text whitespace-pre-line text-lg">{applicationText}</p>
                                 </div>
                                 <button 
                                    onClick={handleFinishApplication}
                                    className="mt-8 flex items-center gap-2 text-da-gold hover:text-da-text transition-colors text-sm uppercase tracking-widest border-b border-transparent hover:border-da-gold pb-1"
                                 >
                                     Unlock Deeper Wisdom <i className="fas fa-arrow-right"></i>
                                 </button>
                             </div>
                         )}
                    </div>
                )}

                {/* --- LEVEL 4: DEEP DIVE --- */}
                {currentLevel === Level.DEEP_DIVE && (
                    <div className="flex-1 flex flex-col items-center max-w-2xl mx-auto w-full animate-[fadeIn_0.5s]">
                         {insightLoading ? (
                             <div className="text-da-gold animate-pulse text-xl font-display my-auto">Gazing into the Abyss...</div>
                         ) : (
                             <div className="bg-gradient-to-b from-da-paper to-da-bg p-8 md:p-12 rounded border border-da-gold/30 shadow-[0_0_50px_rgba(207,170,110,0.1)] relative">
                                 <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-da-gold to-transparent opacity-50"></div>
                                 <i className="fas fa-eye absolute top-6 right-6 text-6xl text-da-gold/10 animate-pulse"></i>
                                 
                                 <h3 className="text-2xl font-display text-da-gold mb-2">Esoteric Knowledge</h3>
                                 <p className="text-[10px] uppercase tracking-widest text-da-gold/50 mb-6">Final Mastery</p>
                                 
                                 <div className="prose prose-invert lg:prose-xl mb-10">
                                     <p className="font-serif italic leading-loose text-da-text whitespace-pre-line text-lg">"{deepDiveText}"</p>
                                 </div>

                                 <button 
                                    onClick={handleFinishDeepDive}
                                    className="w-full py-4 bg-da-gold text-da-bg font-display text-lg uppercase tracking-[0.2em] hover:bg-da-text hover:text-da-paper transition-all rounded-sm shadow-md"
                                 >
                                     <i className="fas fa-check-double mr-3"></i> Mark As Mastered
                                 </button>
                             </div>
                         )}
                    </div>
                )}

            </div>
       </div>
    </div>
  );
};

export default CourseViewer;
