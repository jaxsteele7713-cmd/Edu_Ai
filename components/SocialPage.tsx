
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { User, Course, Comment } from '../types';
import { getPublicCourses, getAllScholars, toggleLikeCourse, addCommentToCourse, getFollows, toggleFollowUser } from '../services/mockBackend';
import { 
    generateBattleRound, 
    simulateOpponentTurn, 
    judgeBattleRound,
    generateSocraticChallenge,
    simulateSkepticTurn,
    judgeSocraticRound,
    generateCalculusProblem
} from '../services/geminiService';

interface SocialPageProps {
  currentUser: User;
  onSelectCourse: (course: Course) => void;
}

type Tab = 'commons' | 'scholars' | 'debate';
type BattleState = 'lobby' | 'matchmaking' | 'active' | 'judging' | 'results';
type BattleMode = 'friendly' | 'rapid' | 'socratic' | 'numericals'; // Added numericals

const OPPONENT_PERSONAS = [
    { name: "The Skeptic", bio: "Questions everything.", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=skeptic" },
    { name: "The Historian", bio: "Cites ancient precedents.", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=historian" },
    { name: "The Futurist", bio: "Obsessed with tomorrow.", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=futurist" },
    { name: "The Poet", bio: "Favors beautiful rhetoric.", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=poet" }
];

const SOCRATIC_TOPICS = [
    "The Limit Paradox",
    "Instantaneous Rate (Derivatives)",
    "Accumulation of Infinitesimals (Integrals)"
];

const NUMERICAL_TOPICS = [
    "Limits",
    "Derivatives",
    "Integrals",
    "Series",
    "Differential Equations"
];

// --- Math Renderer Component ---
const MathRenderer: React.FC<{ latex: string, inline?: boolean }> = ({ latex, inline = false }) => {
    const containerRef = useRef<HTMLSpanElement>(null);
    useEffect(() => {
        if (containerRef.current && (window as any).katex) {
            (window as any).katex.render(latex, containerRef.current, {
                throwOnError: false,
                displayMode: !inline,
                output: 'html'
            });
        }
    }, [latex, inline]);
    return <span ref={containerRef} className={inline ? "inline-block" : "block my-2"} />;
};

const SocialPage: React.FC<SocialPageProps> = ({ currentUser, onSelectCourse }) => {
  const [activeTab, setActiveTab] = useState<Tab>('commons');
  const [courses, setCourses] = useState<Course[]>([]);
  const [scholars, setScholars] = useState<User[]>([]);
  const [following, setFollowing] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshSeed, setRefreshSeed] = useState(0);

  // Search State
  const [searchQuery, setSearchQuery] = useState('');

  // State for commenting
  const [commentingId, setCommentingId] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');

  // --- BATTLE ARENA STATE ---
  const [battleState, setBattleState] = useState<BattleState>('lobby');
  const [battleConfig, setBattleConfig] = useState({ topic: '', mode: 'friendly' as BattleMode, playerCount: 2 });
  const [opponents, setOpponents] = useState<typeof OPPONENT_PERSONAS>([]);
  const [currentRound, setCurrentRound] = useState(1);
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [userAnswer, setUserAnswer] = useState('');
  const [timeLeft, setTimeLeft] = useState(0);
  const [answers, setAnswers] = useState<{user: string, answer: string, score?: number, feedback?: string}[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [totalScores, setTotalScores] = useState<Record<string, number>>({});

  // --- SOCRATIC STATE ---
  const [socraticHistory, setSocraticHistory] = useState<{role: 'skeptic'|'user', text: string}[]>([]);
  const [socraticTurn, setSocraticTurn] = useState(0); // 0 to 3
  const [socraticResult, setSocraticResult] = useState<{pass: boolean, score: number, feedback: string} | null>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // --- NUMERICALS STATE ---
  const [mathProblem, setMathProblem] = useState<{question: string, options: string[], correctIndex: number, explanation: string} | null>(null);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [mathFeedback, setMathFeedback] = useState<'correct'|'wrong'|null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const [c, s, f] = await Promise.all([
        getPublicCourses(),
        getAllScholars(),
        getFollows(currentUser.username)
      ]);
      setCourses(c.sort((a,b) => (b.likes?.length || 0) - (a.likes?.length || 0))); // Sort by popularity
      setScholars(s);
      setFollowing(f);
      setLoading(false);
    };
    fetchData();
  }, [refreshSeed, currentUser.username]);

  // Scroll to bottom of chat
  useEffect(() => {
      if (chatContainerRef.current) {
          chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
      }
  }, [socraticHistory]);

  const handleLike = async (courseId: string) => {
     await toggleLikeCourse(courseId, currentUser.username);
     setRefreshSeed(s => s + 1); // Trigger refresh to update UI
  };

  const handleFollow = async (targetUser: string) => {
    await toggleFollowUser(currentUser.username, targetUser);
    setRefreshSeed(s => s + 1);
  };

  const submitComment = async (courseId: string) => {
    if (!commentText.trim()) return;
    const newComment: Comment = {
        id: `c-${Date.now()}`,
        author: currentUser.username,
        text: commentText,
        timestamp: Date.now()
    };
    await addCommentToCourse(courseId, newComment);
    setCommentText('');
    setCommentingId(null); // Close input
    setRefreshSeed(s => s + 1);
  };

  // Filter Logic
  const filteredCourses = useMemo(() => {
    if (!searchQuery) return courses;
    const q = searchQuery.toLowerCase();
    return courses.filter(c => 
        c.title.toLowerCase().includes(q) || 
        c.subject.toLowerCase().includes(q) ||
        c.author.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q)
    );
  }, [courses, searchQuery]);

  const filteredScholars = useMemo(() => {
      if (!searchQuery) return scholars;
      const q = searchQuery.toLowerCase();
      return scholars.filter(s => 
          s.username.toLowerCase().includes(q) || 
          s.bio.toLowerCase().includes(q)
      );
  }, [scholars, searchQuery]);

  // --- BATTLE LOGIC ---

  const startMatchmaking = () => {
      if(!battleConfig.topic) return alert("Please define a topic.");
      setBattleState('matchmaking');
      
      if (battleConfig.mode === 'socratic') {
          startSocraticRound();
      } else if (battleConfig.mode === 'numericals') {
          startNumericalRound();
      } else {
          // Initialize Standard Debate
          setTimeout(() => {
              const numOpponents = battleConfig.playerCount - 1;
              const picked = [...OPPONENT_PERSONAS].sort(() => 0.5 - Math.random()).slice(0, numOpponents);
              setOpponents(picked);
              setTotalScores({ [currentUser.username]: 0, ...Object.fromEntries(picked.map(o => [o.name, 0])) });
              startRound();
          }, 2500);
      }
  };

  // STANDARD ROUND
  const startRound = async () => {
      setBattleState('active');
      setUserAnswer('');
      setAnswers([]);
      setCurrentQuestion("Formulating question...");
      
      const q = await generateBattleRound(battleConfig.topic, battleConfig.mode);
      setCurrentQuestion(q);
      setTimeLeft(battleConfig.mode === 'rapid' ? 45 : 120);
  };

  // SOCRATIC ROUND
  const startSocraticRound = async () => {
      setBattleState('active');
      setSocraticTurn(1);
      setSocraticResult(null);
      setSocraticHistory([]);
      setUserAnswer('');

      const opening = await generateSocraticChallenge(battleConfig.topic);
      setSocraticHistory([{ role: 'skeptic', text: opening }]);
  };

  // NUMERICAL ROUND
  const startNumericalRound = async () => {
      setBattleState('active');
      setMathProblem(null);
      setSelectedOption(null);
      setMathFeedback(null);
      
      const problem = await generateCalculusProblem(battleConfig.topic);
      if (problem) {
          setMathProblem(problem);
      } else {
          setBattleState('lobby');
          alert("The archives are silent on this topic right now.");
      }
  };

  // Timer (Standard Only)
  useEffect(() => {
      let interval: any;
      if (battleState === 'active' && battleConfig.mode !== 'socratic' && battleConfig.mode !== 'numericals' && timeLeft > 0) {
          interval = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
      } else if (battleState === 'active' && battleConfig.mode !== 'socratic' && battleConfig.mode !== 'numericals' && timeLeft === 0) {
          submitAnswer(); // Auto submit
      }
      return () => clearInterval(interval);
  }, [battleState, timeLeft, battleConfig.mode]);

  const submitAnswer = async () => {
      if (battleState !== 'active') return;
      
      if (battleConfig.mode === 'socratic') {
          await submitSocraticAnswer();
      } else if (battleConfig.mode !== 'numericals') {
          await submitStandardAnswer();
      }
  };

  const submitStandardAnswer = async () => {
      setBattleState('judging');
      const userEntry = { user: currentUser.username, answer: userAnswer || "(No argument presented)" };
      
      const opponentEntries = await Promise.all(opponents.map(async (op) => {
          const ans = await simulateOpponentTurn(currentQuestion, op.name);
          return { user: op.name, answer: ans };
      }));
      
      const allAnswers = [userEntry, ...opponentEntries];
      setAnswers(allAnswers);

      const judgment = await judgeBattleRound(currentQuestion, allAnswers);
      
      const finalResults = allAnswers.map(a => {
          const j = judgment.find(res => res.user === a.user);
          return { ...a, score: j?.score || 50, feedback: j?.feedback || "Adequate." };
      });
      
      setAnswers(finalResults);
      setTotalScores(prev => {
          const next = { ...prev };
          finalResults.forEach(r => {
              next[r.user] = (next[r.user] || 0) + (r.score || 0);
          });
          return next;
      });
      setBattleState('results');
  };

  const submitSocraticAnswer = async () => {
      if (!userAnswer.trim()) return;
      
      const newHistory = [...socraticHistory, { role: 'user', text: userAnswer } as const];
      setSocraticHistory(newHistory);
      setUserAnswer('');
      setIsTyping(false);

      if (socraticTurn < 3) {
          // Skeptic Rebuttal
          const rebuttal = await simulateSkepticTurn(newHistory);
          setSocraticHistory([...newHistory, { role: 'skeptic', text: rebuttal }]);
          setSocraticTurn(prev => prev + 1);
      } else {
          // Final Judgment
          setBattleState('judging');
          const result = await judgeSocraticRound(battleConfig.topic, newHistory);
          setSocraticResult(result);
          setBattleState('results');
      }
  };
  
  const submitNumericalAnswer = (optionIdx: number) => {
      if (!mathProblem) return;
      setSelectedOption(optionIdx);
      if (optionIdx === mathProblem.correctIndex) {
          setMathFeedback('correct');
      } else {
          setMathFeedback('wrong');
      }
  };

  if (loading && courses.length === 0) {
      return (
        <div className="w-full h-full flex items-center justify-center bg-da-bg">
          <div className="text-da-gold animate-pulse font-display tracking-widest uppercase">Connecting to Common Room...</div>
        </div>
      );
  }

  return (
    <div className="w-full h-full overflow-y-auto p-4 md:p-8 bg-da-bg pb-24 md:pb-8">
        
        {/* Header */}
        <div className="flex flex-col items-center mb-8 border-b border-da-gold/20 pb-6">
            <h2 className="text-3xl md:text-5xl font-display text-da-gold mb-2">Common Room</h2>
            <p className="font-serif italic text-da-text/60 text-sm">A gathering place for scholars to exchange wisdom.</p>
        </div>

        {/* Tabs */}
        <div className="flex justify-center mb-6 sticky top-0 bg-da-bg/95 backdrop-blur z-20 py-2 border-b border-da-accent/10">
            <button 
              onClick={() => { setActiveTab('commons'); setSearchQuery(''); }} 
              className={`px-4 md:px-6 py-2 uppercase text-[9px] md:text-[10px] tracking-[0.2em] transition-all ${activeTab === 'commons' ? 'text-da-gold border-b border-da-gold' : 'text-da-text/40'}`}
            >
              Public Library
            </button>
            <button 
              onClick={() => { setActiveTab('debate'); setSearchQuery(''); }} 
              className={`px-4 md:px-6 py-2 uppercase text-[9px] md:text-[10px] tracking-[0.2em] transition-all ${activeTab === 'debate' ? 'text-da-gold border-b border-da-gold' : 'text-da-text/40'}`}
            >
              Debate Hall
            </button>
            <button 
              onClick={() => { setActiveTab('scholars'); setSearchQuery(''); }} 
              className={`px-4 md:px-6 py-2 uppercase text-[9px] md:text-[10px] tracking-[0.2em] transition-all ${activeTab === 'scholars' ? 'text-da-gold border-b border-da-gold' : 'text-da-text/40'}`}
            >
              Scholars Directory
            </button>
        </div>

        {/* SEARCH BAR (Hidden in Debate Mode) */}
        {activeTab !== 'debate' && (
            <div className="max-w-md mx-auto mb-10 relative group px-2">
                <input 
                   type="text" 
                   placeholder={`Search ${activeTab === 'commons' ? 'public works' : 'scholars'}...`}
                   value={searchQuery}
                   onChange={(e) => setSearchQuery(e.target.value)}
                   className="w-full bg-da-bg border border-da-gold/20 rounded-full py-2.5 pl-10 pr-4 text-da-text placeholder-da-text/30 focus:border-da-gold focus:ring-1 focus:ring-da-gold/20 outline-none text-sm font-serif shadow-inner transition-all"
                />
                <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-da-gold/40 group-focus-within:text-da-gold transition-colors text-xs"></i>
            </div>
        )}

        {/* FEED VIEW */}
        {activeTab === 'commons' && (
            <div className="max-w-2xl mx-auto space-y-8">
                {filteredCourses.length === 0 ? (
                    <div className="text-center py-12 opacity-40 font-serif italic">
                        {searchQuery ? `No manuscripts found matching "${searchQuery}".` : "The public shelves are empty."}
                    </div>
                ) : filteredCourses.map(course => (
                    <div key={course.id} className="bg-da-paper/30 border border-da-gold/10 rounded overflow-hidden shadow-lg group hover:border-da-gold/30 transition-all">
                        {/* Course Card Content */}
                        <div className="p-6 cursor-pointer" onClick={() => onSelectCourse(course)}>
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-da-bg border border-da-gold/20 flex items-center justify-center text-[10px] font-bold text-da-gold uppercase">
                                        {course.author.substring(0,2)}
                                    </div>
                                    <div>
                                        <div className="text-xs text-da-gold/80 font-bold uppercase tracking-wide">{course.author}</div>
                                        <div className="text-[9px] text-da-text/40 uppercase tracking-wider">{course.level} • {course.subject}</div>
                                    </div>
                                </div>
                                {course.type === 'video' ? <i className="fas fa-video text-da-text/20"></i> : <i className="fas fa-clone text-da-text/20"></i>}
                            </div>
                            
                            <h3 className="text-xl font-display text-da-text mb-2 group-hover:text-da-gold transition-colors">{course.title}</h3>
                            <p className="text-sm font-serif italic text-da-text/60 line-clamp-2">{course.description}</p>
                        </div>

                        {/* Social Actions */}
                        <div className="bg-black/20 p-3 flex items-center justify-between border-t border-da-gold/5">
                             <div className="flex gap-4">
                                 <button 
                                   onClick={() => handleLike(course.id)} 
                                   className={`flex items-center gap-2 text-xs transition-colors ${course.likes?.includes(currentUser.username) ? 'text-da-red' : 'text-da-text/40 hover:text-da-red'}`}
                                 >
                                     <i className={`${course.likes?.includes(currentUser.username) ? 'fas' : 'far'} fa-heart`}></i>
                                     <span>{course.likes?.length || 0}</span>
                                 </button>
                                 
                                 <button 
                                   onClick={() => setCommentingId(commentingId === course.id ? null : course.id)}
                                   className="flex items-center gap-2 text-xs text-da-text/40 hover:text-da-gold transition-colors"
                                 >
                                     <i className="far fa-comment-alt"></i>
                                     <span>{course.comments?.length || 0}</span>
                                 </button>
                             </div>
                             
                             <button onClick={() => onSelectCourse(course)} className="text-[9px] uppercase tracking-widest text-da-gold/60 hover:text-da-gold">
                                 Read
                             </button>
                        </div>

                        {/* Comments Section */}
                        {commentingId === course.id && (
                            <div className="bg-da-bg/50 p-4 border-t border-da-gold/10 animate-[fadeIn_0.3s_ease]">
                                {/* List */}
                                <div className="max-h-40 overflow-y-auto space-y-3 mb-4 custom-scrollbar">
                                    {(course.comments || []).length === 0 && <p className="text-[10px] italic opacity-30 text-center">Be the first to critique this work.</p>}
                                    {course.comments?.map(c => (
                                        <div key={c.id} className="text-sm">
                                            <span className="text-da-gold text-[10px] font-bold uppercase tracking-wider mr-2">{c.author}</span>
                                            <span className="text-da-text/80 font-serif">{c.text}</span>
                                        </div>
                                    ))}
                                </div>
                                {/* Input */}
                                <div className="flex gap-2">
                                    <input 
                                       value={commentText}
                                       onChange={(e) => setCommentText(e.target.value)}
                                       className="flex-1 bg-da-paper border border-da-accent/20 rounded-sm px-3 py-1 text-xs text-da-text outline-none focus:border-da-gold"
                                       placeholder="Add your marginalia..."
                                    />
                                    <button 
                                      onClick={() => submitComment(course.id)}
                                      className="text-da-gold hover:text-white px-3 py-1 text-[10px] uppercase tracking-wider border border-da-gold/30 rounded-sm hover:bg-da-gold/20"
                                    >
                                        Post
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        )}

        {/* BATTLE ARENA VIEW */}
        {activeTab === 'debate' && (
            <div className="max-w-4xl mx-auto min-h-[550px] bg-da-paper/10 border border-da-gold/10 rounded-lg overflow-hidden relative">
                
                {/* LOBBY */}
                {battleState === 'lobby' && (
                    <div className="flex flex-col items-center justify-center h-full py-12 px-6 text-center animate-[fadeIn_0.5s]">
                        <div className="w-16 h-16 rounded-full bg-da-gold/20 flex items-center justify-center mb-6">
                            <i className="fas fa-gavel text-da-gold text-3xl"></i>
                        </div>
                        <h3 className="text-3xl font-display text-da-text mb-2">The Debate Hall</h3>
                        <p className="font-serif italic text-da-text/60 mb-8 max-w-md">Challenge fellow scholars to a battle of wits, or defend mathematical truths against the Skeptic.</p>
                        
                        <div className="w-full max-w-md space-y-6 text-left">
                            
                            {/* Mode Selection */}
                            <div className="flex p-1 bg-da-bg border border-da-gold/20 rounded-sm">
                                <button 
                                    onClick={() => setBattleConfig({...battleConfig, mode: 'friendly', topic: ''})}
                                    className={`flex-1 py-2 text-[10px] uppercase tracking-wider transition-all ${battleConfig.mode === 'friendly' || battleConfig.mode === 'rapid' ? 'bg-da-gold text-black shadow-sm' : 'text-da-text/50 hover:text-da-text'}`}
                                >
                                    Debate
                                </button>
                                <button 
                                    onClick={() => setBattleConfig({...battleConfig, mode: 'socratic', topic: SOCRATIC_TOPICS[0]})}
                                    className={`flex-1 py-2 text-[10px] uppercase tracking-wider transition-all ${battleConfig.mode === 'socratic' ? 'bg-da-gold text-black shadow-sm' : 'text-da-text/50 hover:text-da-text'}`}
                                >
                                    Socratic
                                </button>
                                <button 
                                    onClick={() => setBattleConfig({...battleConfig, mode: 'numericals', topic: NUMERICAL_TOPICS[0]})}
                                    className={`flex-1 py-2 text-[10px] uppercase tracking-wider transition-all ${battleConfig.mode === 'numericals' ? 'bg-da-gold text-black shadow-sm' : 'text-da-text/50 hover:text-da-text'}`}
                                >
                                    Numericals
                                </button>
                            </div>

                            {/* Standard Debate Options */}
                            {(battleConfig.mode === 'friendly' || battleConfig.mode === 'rapid') && (
                                <div className="space-y-6 animate-[fadeIn_0.3s]">
                                    <div>
                                        <label className="text-[10px] uppercase tracking-widest text-da-gold opacity-80 mb-2 block">Topic of Discourse</label>
                                        <input 
                                            className="w-full bg-da-bg border border-da-gold/20 p-3 text-da-text focus:border-da-gold outline-none rounded-sm"
                                            placeholder="e.g. Artificial Intelligence Ethics..."
                                            value={battleConfig.topic}
                                            onChange={(e) => setBattleConfig({...battleConfig, topic: e.target.value})}
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-[10px] uppercase tracking-widest text-da-gold opacity-80 mb-2 block">Intensity</label>
                                            <div className="flex gap-2">
                                                <button 
                                                    onClick={() => setBattleConfig({...battleConfig, mode: 'friendly'})}
                                                    className={`flex-1 py-2 text-[10px] uppercase border ${battleConfig.mode === 'friendly' ? 'bg-da-gold text-black border-da-gold' : 'border-da-accent/20 text-da-text/60'}`}
                                                >
                                                    Deep
                                                </button>
                                                <button 
                                                    onClick={() => setBattleConfig({...battleConfig, mode: 'rapid'})}
                                                    className={`flex-1 py-2 text-[10px] uppercase border ${battleConfig.mode === 'rapid' ? 'bg-da-red text-white border-da-red' : 'border-da-accent/20 text-da-text/60'}`}
                                                >
                                                    Rapid
                                                </button>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-[10px] uppercase tracking-widest text-da-gold opacity-80 mb-2 block">Scholars</label>
                                            <div className="flex gap-2">
                                                {[2,3,4].map(n => (
                                                    <button 
                                                        key={n}
                                                        onClick={() => setBattleConfig({...battleConfig, playerCount: n})}
                                                        className={`flex-1 py-2 text-[10px] uppercase border ${battleConfig.playerCount === n ? 'bg-da-gold text-black border-da-gold' : 'border-da-accent/20 text-da-text/60'}`}
                                                    >
                                                        {n}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Socratic Defense Options */}
                            {battleConfig.mode === 'socratic' && (
                                <div className="space-y-6 animate-[fadeIn_0.3s]">
                                    <div>
                                        <label className="text-[10px] uppercase tracking-widest text-da-gold opacity-80 mb-2 block">Concept to Defend</label>
                                        <select
                                            className="w-full bg-da-bg border border-da-gold/20 p-3 text-da-text focus:border-da-gold outline-none rounded-sm appearance-none"
                                            value={battleConfig.topic}
                                            onChange={(e) => setBattleConfig({...battleConfig, topic: e.target.value})}
                                        >
                                            {SOCRATIC_TOPICS.map(t => <option key={t} value={t}>{t}</option>)}
                                        </select>
                                    </div>
                                    <div className="bg-da-gold/10 p-4 border border-da-gold/30 rounded-sm">
                                        <p className="text-xs text-da-text/80 font-serif italic mb-2">
                                            "You must articulate the logic behind the symbols. The Skeptic will not accept vague definitions."
                                        </p>
                                        <div className="text-[10px] uppercase tracking-widest text-da-gold">
                                            <i className="fas fa-hourglass-half mr-2"></i> 3 Turns to Win
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Numericals Mode Options */}
                            {battleConfig.mode === 'numericals' && (
                                <div className="space-y-6 animate-[fadeIn_0.3s]">
                                    <div>
                                        <label className="text-[10px] uppercase tracking-widest text-da-gold opacity-80 mb-2 block">Mathematical Field</label>
                                        <select
                                            className="w-full bg-da-bg border border-da-gold/20 p-3 text-da-text focus:border-da-gold outline-none rounded-sm appearance-none"
                                            value={battleConfig.topic}
                                            onChange={(e) => setBattleConfig({...battleConfig, topic: e.target.value})}
                                        >
                                            {NUMERICAL_TOPICS.map(t => <option key={t} value={t}>{t}</option>)}
                                        </select>
                                    </div>
                                    <div className="bg-da-gold/10 p-4 border border-da-gold/30 rounded-sm">
                                        <p className="text-xs text-da-text/80 font-serif italic mb-2">
                                            "A test of raw calculation and accuracy. Solve the generated arcane problems."
                                        </p>
                                    </div>
                                </div>
                            )}

                            <button 
                                onClick={startMatchmaking}
                                className="w-full py-4 mt-4 bg-da-gold text-black font-display text-lg uppercase tracking-widest hover:bg-white transition-colors shadow-lg"
                            >
                                {battleConfig.mode === 'socratic' ? 'Face The Skeptic' : battleConfig.mode === 'numericals' ? 'Start Testing Yourself' : 'Initiate Debate'}
                            </button>
                        </div>
                    </div>
                )}

                {/* MATCHMAKING */}
                {battleState === 'matchmaking' && (
                    <div className="flex flex-col items-center justify-center h-[500px]">
                        <div className="relative w-20 h-20 mb-6">
                            <div className="absolute inset-0 border-4 border-da-gold/20 rounded-full"></div>
                            <div className="absolute inset-0 border-t-4 border-da-gold rounded-full animate-spin"></div>
                            <i className="fas fa-users absolute inset-0 flex items-center justify-center text-da-gold text-xl"></i>
                        </div>
                        <h3 className="text-xl font-display text-da-gold animate-pulse">
                            {battleConfig.mode === 'socratic' ? 'Summoning The Skeptic...' : battleConfig.mode === 'numericals' ? 'Generating Problem...' : 'Summoning Scholars...'}
                        </h3>
                    </div>
                )}

                {/* ACTIVE ARENA (Standard/Rapid) */}
                {(battleState === 'active' || battleState === 'judging' || battleState === 'results') && battleConfig.mode !== 'socratic' && battleConfig.mode !== 'numericals' && (
                    <div className="flex flex-col h-[600px]">
                        {/* Arena Header */}
                        <div className="p-4 border-b border-da-gold/10 bg-black/20 flex justify-between items-center">
                            <div>
                                <span className="text-[9px] uppercase tracking-widest text-da-gold/60">Topic</span>
                                <div className="text-sm font-bold text-da-text">{battleConfig.topic}</div>
                            </div>
                            <div className="text-center">
                                <div className={`text-2xl font-display font-bold ${timeLeft < 10 ? 'text-da-red animate-pulse' : 'text-da-gold'}`}>
                                    {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}
                                </div>
                                <span className="text-[9px] uppercase tracking-widest text-da-text/40">Time Remaining</span>
                            </div>
                            <div className="text-right">
                                <button onClick={() => setBattleState('lobby')} className="text-xs text-da-red hover:underline">Forfeit</button>
                            </div>
                        </div>

                        {/* Question Area */}
                        <div className="p-6 bg-da-paper/40 text-center border-b border-da-gold/5">
                            <h2 className="text-xl md:text-2xl font-serif italic text-da-text leading-relaxed">"{currentQuestion}"</h2>
                        </div>

                        {/* Middle: Opponents Visuals */}
                        <div className="flex-1 p-4 flex items-center justify-center gap-4 md:gap-12 relative">
                            {/* Opponents */}
                            {opponents.map((op, i) => (
                                <div key={i} className="flex flex-col items-center gap-2">
                                    <div className="relative">
                                        <img src={op.avatar} className="w-12 h-12 md:w-16 md:h-16 rounded-full border-2 border-da-gold/30" />
                                        {(battleState === 'active' || battleState === 'judging') && (
                                            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-da-bg rounded-full flex items-center justify-center">
                                                <div className="w-2 h-2 bg-da-gold rounded-full animate-bounce"></div>
                                            </div>
                                        )}
                                    </div>
                                    <span className="text-[10px] uppercase font-bold text-da-text/60">{op.name}</span>
                                    <span className="text-[9px] text-da-gold">{totalScores[op.name] || 0} pts</span>
                                    
                                    {/* Speech Bubble for Result */}
                                    {battleState === 'results' && (
                                        <div className="absolute -top-24 w-48 bg-da-paper p-3 text-xs text-da-text rounded shadow-xl border border-da-gold/20 z-10 text-center">
                                            "{answers.find(a => a.user === op.name)?.answer}"
                                            <div className="mt-1 text-[9px] text-da-gold font-bold border-t border-da-gold/10 pt-1">
                                                {answers.find(a => a.user === op.name)?.score}pts • {answers.find(a => a.user === op.name)?.feedback}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>

                        {/* Bottom: User Input or Result */}
                        <div className="p-4 bg-da-bg border-t border-da-gold/20">
                            {battleState === 'active' ? (
                                <div className="flex gap-2">
                                    <div className="relative w-12 h-12 flex-shrink-0">
                                         <img src={currentUser.avatarUrl} className="w-full h-full rounded-full border-2 border-da-gold" />
                                    </div>
                                    <div className="flex-1 flex gap-2">
                                        <input 
                                            value={userAnswer}
                                            onChange={(e) => { setUserAnswer(e.target.value); setIsTyping(true); }}
                                            onBlur={() => setIsTyping(false)}
                                            onKeyDown={(e) => e.key === 'Enter' && submitAnswer()}
                                            className="flex-1 bg-da-paper border border-da-accent/20 p-3 rounded-sm text-sm focus:border-da-gold outline-none"
                                            placeholder="Type your argument here..."
                                            autoFocus
                                        />
                                        <button 
                                            onClick={submitAnswer}
                                            className="bg-da-gold text-black px-6 font-bold uppercase tracking-wider rounded-sm hover:bg-white transition-colors"
                                        >
                                            Submit
                                        </button>
                                    </div>
                                </div>
                            ) : battleState === 'judging' ? (
                                <div className="text-center py-4">
                                    <i className="fas fa-balance-scale fa-bounce text-da-gold text-2xl mb-2"></i>
                                    <p className="text-sm uppercase tracking-widest text-da-text/60">The Grand Arbiter is weighing the arguments...</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                     <div className="bg-da-gold/10 p-3 rounded border border-da-gold/30">
                                         <div className="flex justify-between items-start mb-1">
                                             <span className="text-[10px] uppercase font-bold text-da-gold">Your Argument</span>
                                             <span className="text-sm font-bold text-da-gold">{answers.find(a => a.user === currentUser.username)?.score} pts</span>
                                         </div>
                                         <p className="text-sm italic text-da-text/90 mb-2">"{answers.find(a => a.user === currentUser.username)?.answer}"</p>
                                         <p className="text-[10px] text-da-accent uppercase tracking-wider">
                                             <i className="fas fa-gavel mr-1"></i> 
                                             Judge: {answers.find(a => a.user === currentUser.username)?.feedback}
                                         </p>
                                     </div>
                                     <button 
                                         onClick={startRound}
                                         className="w-full py-3 bg-da-gold text-black font-bold uppercase tracking-widest hover:bg-white transition-colors"
                                     >
                                         Next Round
                                     </button>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* ACTIVE ARENA (Socratic Defense) */}
                {(battleState === 'active' || battleState === 'judging' || battleState === 'results') && battleConfig.mode === 'socratic' && (
                     <div className="flex flex-col h-[600px] bg-black/20">
                         {/* Socratic Header */}
                         <div className="p-4 border-b border-da-gold/10 flex justify-between items-center bg-da-paper/30">
                             <div>
                                 <div className="text-[9px] uppercase tracking-widest text-da-gold opacity-60">Defense Of</div>
                                 <div className="text-sm font-bold text-da-text">{battleConfig.topic}</div>
                             </div>
                             <div className="flex gap-1">
                                 {[1,2,3].map(t => (
                                     <div key={t} className={`w-3 h-3 rounded-full border border-da-gold/30 ${t <= socraticTurn ? 'bg-da-gold' : 'bg-transparent'}`}></div>
                                 ))}
                             </div>
                             <button onClick={() => setBattleState('lobby')} className="text-xs text-da-red hover:underline">Abandon</button>
                         </div>

                         {/* Chat Log */}
                         <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                             {socraticHistory.map((msg, i) => (
                                 <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                     <div className={`max-w-[80%] p-4 rounded-lg relative ${msg.role === 'user' ? 'bg-da-gold/10 border border-da-gold/20' : 'bg-da-paper border border-da-accent/20'}`}>
                                         <div className="absolute -top-3 left-2 text-[9px] uppercase tracking-widest bg-da-bg px-2 border border-da-gold/10 text-da-gold">
                                             {msg.role === 'user' ? currentUser.username : 'The Skeptic'}
                                         </div>
                                         <p className="font-serif text-sm leading-relaxed">{msg.text}</p>
                                     </div>
                                 </div>
                             ))}
                             {battleState === 'judging' && (
                                 <div className="flex justify-center py-4">
                                     <div className="bg-da-gold/5 px-4 py-2 rounded-full border border-da-gold/20 flex items-center gap-2">
                                         <i className="fas fa-balance-scale fa-spin text-da-gold"></i>
                                         <span className="text-[10px] uppercase tracking-widest text-da-gold">Judgment Pending...</span>
                                     </div>
                                 </div>
                             )}
                             {battleState === 'results' && socraticResult && (
                                 <div className="flex justify-center animate-[fadeIn_0.5s]">
                                     <div className={`max-w-md w-full p-6 border-2 ${socraticResult.pass ? 'border-da-gold bg-da-gold/10' : 'border-da-red bg-da-red/10'} rounded-sm text-center shadow-2xl`}>
                                         <i className={`fas ${socraticResult.pass ? 'fa-crown text-da-gold' : 'fa-skull text-da-red'} text-3xl mb-3`}></i>
                                         <h3 className="text-xl font-display uppercase tracking-widest mb-1">{socraticResult.pass ? 'Defense Successful' : 'Defense Failed'}</h3>
                                         <div className="text-4xl font-bold mb-4 opacity-80">{socraticResult.score}/100</div>
                                         <p className="font-serif italic text-sm mb-6">"{socraticResult.feedback}"</p>
                                         <button 
                                            onClick={() => setBattleState('lobby')}
                                            className={`w-full py-2 uppercase tracking-widest text-xs font-bold border ${socraticResult.pass ? 'border-da-gold text-da-gold hover:bg-da-gold hover:text-black' : 'border-da-red text-da-red hover:bg-da-red hover:text-white'} transition-colors`}
                                         >
                                             Return to Lobby
                                         </button>
                                     </div>
                                 </div>
                             )}
                         </div>

                         {/* Input Area */}
                         {battleState === 'active' && (
                             <div className="p-4 bg-da-bg border-t border-da-gold/20 flex gap-3">
                                 <input 
                                     value={userAnswer}
                                     onChange={(e) => setUserAnswer(e.target.value)}
                                     onKeyDown={(e) => e.key === 'Enter' && submitSocraticAnswer()}
                                     className="flex-1 bg-da-paper border border-da-accent/20 p-3 rounded-sm text-sm focus:border-da-gold outline-none font-serif"
                                     placeholder="Defend your logic..."
                                     autoFocus
                                 />
                                 <button 
                                     onClick={submitSocraticAnswer}
                                     className="bg-da-gold text-black px-6 font-bold uppercase tracking-wider rounded-sm hover:bg-white transition-colors"
                                 >
                                     Speak
                                 </button>
                             </div>
                         )}
                     </div>
                )}
                
                {/* ACTIVE ARENA (Numericals) */}
                {battleConfig.mode === 'numericals' && battleState === 'active' && mathProblem && (
                    <div className="flex flex-col h-[600px] bg-black/20">
                         {/* Header */}
                         <div className="p-4 border-b border-da-gold/10 flex justify-between items-center bg-da-paper/30">
                             <div>
                                 <div className="text-[9px] uppercase tracking-widest text-da-gold opacity-60">Arcane Exam</div>
                                 <div className="text-sm font-bold text-da-text">{battleConfig.topic}</div>
                             </div>
                             <button onClick={() => setBattleState('lobby')} className="text-xs text-da-red hover:underline">Abandon</button>
                         </div>
                         
                         <div className="flex-1 flex flex-col items-center justify-center p-8 overflow-y-auto">
                            <div className="max-w-2xl w-full bg-da-paper border border-da-gold/20 p-8 rounded-sm shadow-2xl">
                                <h3 className="text-xl font-display text-da-gold mb-6 border-b border-da-gold/10 pb-4">
                                    Solve the following:
                                </h3>
                                
                                <div className="text-2xl text-da-text font-serif mb-8 text-center p-6 bg-da-bg/50 rounded border border-da-gold/5">
                                    <MathRenderer latex={mathProblem.question} />
                                </div>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {mathProblem.options.map((opt, i) => {
                                        let btnClass = "bg-da-bg border-da-accent/20 hover:border-da-gold text-da-text";
                                        if (mathFeedback) {
                                            if (i === mathProblem.correctIndex) btnClass = "bg-green-900/20 border-green-500 text-green-400";
                                            else if (i === selectedOption) btnClass = "bg-red-900/20 border-red-500 text-red-400 opacity-60";
                                            else btnClass = "bg-da-bg border-da-accent/10 opacity-30";
                                        }
                                        
                                        return (
                                            <button 
                                                key={i}
                                                onClick={() => submitNumericalAnswer(i)}
                                                disabled={mathFeedback !== null}
                                                className={`p-4 border rounded transition-all text-lg font-serif flex items-center justify-center min-h-[60px] ${btnClass}`}
                                            >
                                                <MathRenderer latex={opt} inline />
                                            </button>
                                        )
                                    })}
                                </div>
                                
                                {mathFeedback && (
                                    <div className="mt-8 pt-6 border-t border-da-gold/10 animate-[fadeIn_0.5s]">
                                        <div className={`p-4 rounded mb-4 text-center ${mathFeedback === 'correct' ? 'bg-da-gold/10 text-da-gold' : 'bg-da-red/10 text-da-red'}`}>
                                            <i className={`fas ${mathFeedback === 'correct' ? 'fa-check' : 'fa-times'} mr-2`}></i>
                                            <span className="font-bold uppercase tracking-wider">{mathFeedback === 'correct' ? 'Correct' : 'Incorrect'}</span>
                                        </div>
                                        <p className="text-sm italic text-da-text/70 mb-6 text-center">
                                            {mathProblem.explanation}
                                        </p>
                                        <button 
                                            onClick={startNumericalRound}
                                            className="w-full py-3 bg-da-gold text-black font-bold uppercase tracking-widest hover:bg-white transition-colors"
                                        >
                                            Next Problem
                                        </button>
                                    </div>
                                )}
                            </div>
                         </div>
                    </div>
                )}

            </div>
        )}

        {/* SCHOLARS VIEW */}
        {activeTab === 'scholars' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
                {filteredScholars.length === 0 ? (
                    <div className="col-span-full text-center py-12 opacity-40 font-serif italic">
                        {searchQuery ? `No scholars found matching "${searchQuery}".` : "The directory is empty."}
                    </div>
                ) : filteredScholars.filter(u => u.username !== currentUser.username).map(scholar => (
                    <div key={scholar.username} className="bg-da-paper/20 border border-da-gold/10 p-6 flex flex-col items-center text-center rounded hover:border-da-gold/30 transition-all">
                        <div className="w-20 h-20 rounded-full p-1 bg-da-gold/20 mb-4">
                            <img src={scholar.avatarUrl} alt={scholar.username} className="w-full h-full rounded-full object-cover" />
                        </div>
                        <h4 className="text-lg font-display text-da-gold mb-1">{scholar.username}</h4>
                        <p className="text-xs font-serif italic text-da-text/60 mb-4 line-clamp-2 h-10">{scholar.bio}</p>
                        
                        <div className="flex gap-4 text-[9px] uppercase tracking-widest text-da-text/40 mb-6">
                            <span>{scholar.followers} Followers</span>
                            <span>{scholar.streak} Day Streak</span>
                        </div>

                        <button 
                           onClick={() => handleFollow(scholar.username)}
                           className={`w-full py-2 text-[10px] uppercase tracking-[0.2em] border transition-all ${following.includes(scholar.username) ? 'bg-da-gold text-black border-da-gold' : 'border-da-gold text-da-gold hover:bg-da-gold hover:text-black'}`}
                        >
                            {following.includes(scholar.username) ? 'Following' : 'Follow'}
                        </button>
                    </div>
                ))}
            </div>
        )}

    </div>
  );
};

export default SocialPage;
