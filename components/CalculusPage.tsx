
import React, { useState, useEffect, useRef } from 'react';
import { CALCULUS_CURRICULUM, Chapter, Step, VisualType } from './curriculumData';

// --- MATH RENDERER HELPER ---
const MathBlock: React.FC<{ latex: string }> = ({ latex }) => {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (containerRef.current && (window as any).katex) {
            (window as any).katex.render(latex, containerRef.current, {
                throwOnError: false,
                displayMode: true,
                output: 'html' // Use HTML output for no-build environments
            });
        }
    }, [latex]);

    return <div ref={containerRef} className="text-da-gold text-lg md:text-xl my-4" />;
};

// --- VISUALIZER COMPONENT ---
// Renders SVG based on type and slider value
const Visualizer: React.FC<{ type: VisualType, value: number }> = ({ type, value }) => {
    // Coordinate System: 0-100 x 0-100. Center roughly at 50,80 (since y is down in SVG)
    // Scale: 1 unit = 20 pixels.
    // Origin (0,0) at (50, 80)
    
    const toScreen = (x: number, y: number) => ({
        cx: 50 + (x * 20),
        cy: 80 - (y * 20)
    });

    // Generate Path for f(x) = x^2 / 4 (Scaled down to fit)
    const generateParabola = () => {
        let d = "M ";
        for(let x = -2.5; x <= 2.5; x += 0.1) {
            const { cx, cy } = toScreen(x, (x*x));
            d += `${cx} ${cy} L `;
        }
        return d.substring(0, d.length - 2);
    };

    const renderContents = () => {
        const { cx: originX, cy: originY } = toScreen(0,0);

        if (type === 'secant_slope') {
            // value = h (distance)
            const x1 = 1;
            const x2 = 1 + value;
            const y1 = x1*x1;
            const y2 = x2*x2;
            
            const p1 = toScreen(x1, y1);
            const p2 = toScreen(x2, y2);
            
            // Calculate extended line coordinates
            const slope = (y2-y1)/(x2-x1);
            const pStart = toScreen(0, y1 - slope * x1); // y-intercept approach approx
            const pEnd = toScreen(2.5, y1 + slope * (2.5 - x1));

            return (
                <>
                    {/* Secant Line */}
                    <line x1={pStart.cx} y1={pStart.cy} x2={pEnd.cx} y2={pEnd.cy} stroke="#7f9c96" strokeWidth="0.5" strokeDasharray="4" opacity="0.7" />
                    {/* Connection Line */}
                    <line x1={p1.cx} y1={p1.cy} x2={p2.cx} y2={p2.cy} stroke="#cfaa6e" strokeWidth="1" />
                    {/* Points */}
                    <circle cx={p1.cx} cy={p1.cy} r="2" fill="#cfaa6e" />
                    <circle cx={p2.cx} cy={p2.cy} r="2" fill="#7f9c96" />
                    {/* Labels */}
                    <text x={p1.cx} y={p1.cy + 10} fill="#cfaa6e" fontSize="4" textAnchor="middle">P</text>
                    <text x={p2.cx} y={p2.cy - 5} fill="#7f9c96" fontSize="4" textAnchor="middle">Q</text>
                </>
            );
        }

        if (type === 'tangent_slope') {
            // value = x position
            const x = value;
            const y = x*x;
            const slope = 2*x;
            
            const p = toScreen(x, y);
            // Draw small tangent segment
            const xLeft = x - 1;
            const yLeft = y - slope;
            const xRight = x + 1;
            const yRight = y + slope;
            const pL = toScreen(xLeft, yLeft);
            const pR = toScreen(xRight, yRight);

            return (
                <>
                    <line x1={pL.cx} y1={pL.cy} x2={pR.cx} y2={pR.cy} stroke="#cfaa6e" strokeWidth="1" />
                    <circle cx={p.cx} cy={p.cy} r="2" fill="#cfaa6e" />
                    <text x={p.cx} y={p.cy + 10} fill="#cfaa6e" fontSize="4" textAnchor="middle">Slope = {slope.toFixed(1)}</text>
                </>
            );
        }

        if (type === 'area_under_curve') {
             // value = N (number of rects) between x=0 and x=2
             const N = Math.floor(value);
             const start = 0;
             const end = 2;
             const width = (end - start) / N;
             const rects = [];

             for(let i=0; i<N; i++) {
                 const xLeft = start + i*width;
                 const height = xLeft * xLeft; // Left Riemann Sum
                 const p = toScreen(xLeft, height);
                 const pBase = toScreen(xLeft, 0);
                 const wPx = width * 20; // 20px per unit
                 const hPx = height * 20;
                 
                 rects.push(
                     <rect 
                        key={i} 
                        x={p.cx} 
                        y={p.cy} 
                        width={wPx - 0.5} 
                        height={hPx} 
                        fill="#cfaa6e" 
                        opacity="0.3" 
                        stroke="none"
                     />
                 );
             }
             return <>{rects}</>;
        }
        return null;
    };

    return (
        <svg viewBox="0 0 100 100" className="w-full h-full bg-da-leather/50 rounded border border-da-gold/20 shadow-inner">
            {/* Grid / Axes */}
            <line x1="50" y1="0" x2="50" y2="100" stroke="#ffffff" strokeOpacity="0.1" strokeWidth="0.5" />
            <line x1="0" y1="80" x2="100" y2="80" stroke="#ffffff" strokeOpacity="0.1" strokeWidth="0.5" />
            
            {/* Main Function Curve */}
            <path d={generateParabola()} fill="none" stroke="#d3c6aa" strokeWidth="1" opacity="0.5" />
            
            {/* Dynamic Content */}
            {renderContents()}
        </svg>
    );
};

// --- MAIN PAGE COMPONENT ---
interface CalculusPageProps {
  onBack: () => void;
}

const CalculusPage: React.FC<CalculusPageProps> = ({ onBack }) => {
    const [currentChapterIndex, setCurrentChapterIndex] = useState(0);
    const [currentStepIndex, setCurrentStepIndex] = useState(0);
    
    // State driven by current step
    const chapter = CALCULUS_CURRICULUM[currentChapterIndex];
    const step = chapter.steps[currentStepIndex];
    
    // Interactive State
    const [sliderValue, setSliderValue] = useState(0);
    const [userInput, setUserInput] = useState('');
    const [feedback, setFeedback] = useState<'neutral' | 'correct' | 'wrong'>('neutral');

    // Reset state when step changes
    useEffect(() => {
        if (step.sliderConfig) setSliderValue(step.sliderConfig.default);
        setUserInput('');
        setFeedback('neutral');
    }, [currentStepIndex, currentChapterIndex]);

    const handleNext = () => {
        if (currentStepIndex < chapter.steps.length - 1) {
            setCurrentStepIndex(prev => prev + 1);
        } else if (currentChapterIndex < CALCULUS_CURRICULUM.length - 1) {
            // Next Chapter
            setCurrentChapterIndex(prev => prev + 1);
            setCurrentStepIndex(0);
        } else {
            alert("You have mastered the introductory tome.");
            onBack();
        }
    };

    const handlePrev = () => {
        if (currentStepIndex > 0) {
            setCurrentStepIndex(prev => prev - 1);
        } else if (currentChapterIndex > 0) {
             setCurrentChapterIndex(prev => prev - 1);
             setCurrentStepIndex(CALCULUS_CURRICULUM[currentChapterIndex - 1].steps.length - 1);
        }
    };

    const checkAnswer = () => {
        if (!step.correctAnswer) return;
        if (userInput.trim() === step.correctAnswer) {
            setFeedback('correct');
        } else {
            setFeedback('wrong');
        }
    };

    return (
        <div className="w-full h-full flex flex-col bg-da-bg text-da-text relative overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-da-gold/20 bg-da-paper/90 backdrop-blur z-20">
                <button onClick={onBack} className="text-xs uppercase tracking-widest text-da-text/50 hover:text-da-gold">
                    <i className="fas fa-arrow-left mr-2"></i> Library
                </button>
                <div className="text-center">
                    <h2 className="font-display text-da-gold text-lg md:text-xl">{chapter.title}</h2>
                    <div className="flex justify-center gap-1 mt-1">
                        {CALCULUS_CURRICULUM.map((_, i) => (
                            <div key={i} className={`h-1 w-4 rounded-full ${i === currentChapterIndex ? 'bg-da-gold' : 'bg-da-gold/20'}`} />
                        ))}
                    </div>
                </div>
                <div className="w-16"></div> {/* Spacer for center alignment */}
            </div>

            <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
                {/* LEFT: VISUALIZER */}
                <div className="flex-1 p-4 md:p-8 flex flex-col bg-black/20">
                    <div className="flex-1 w-full max-w-lg mx-auto aspect-square md:aspect-auto">
                        {step.visual ? (
                            <Visualizer type={step.visual} value={sliderValue} />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center border border-da-gold/10 rounded text-da-text/30 italic">
                                No visualization required.
                            </div>
                        )}
                    </div>
                    
                    {/* Controls */}
                    {step.sliderConfig && (
                        <div className="mt-6 max-w-md mx-auto w-full bg-da-paper p-4 rounded border border-da-gold/10">
                            <div className="flex justify-between text-[10px] uppercase tracking-widest text-da-gold mb-2">
                                <span>{step.sliderConfig.label}</span>
                                <span>{sliderValue.toFixed(2)}</span>
                            </div>
                            <input 
                                type="range" 
                                min={step.sliderConfig.min}
                                max={step.sliderConfig.max}
                                step={step.sliderConfig.step}
                                value={sliderValue}
                                onChange={(e) => setSliderValue(parseFloat(e.target.value))}
                                className="w-full h-1 bg-da-bg rounded-lg appearance-none cursor-pointer accent-da-gold"
                            />
                        </div>
                    )}
                </div>

                {/* RIGHT: BLACKBOARD (Teaching) */}
                <div className="flex-1 bg-da-paper border-l border-da-gold/10 p-6 md:p-10 flex flex-col overflow-y-auto">
                    <div className="flex-1 max-w-lg mx-auto w-full">
                        <div className="mb-2 text-xs uppercase tracking-[0.2em] text-da-gold/50">
                            {step.type === 'observation' && "Step I: Observation"}
                            {step.type === 'incantation' && "Step II: Notation"}
                            {step.type === 'casting' && "Step III: Practice"}
                        </div>

                        <h3 className="text-xl md:text-2xl font-serif text-da-text mb-6 leading-relaxed">
                            {step.text}
                        </h3>

                        {step.latex && (
                            <div className="bg-da-bg/50 p-6 rounded border border-da-gold/10 text-center shadow-inner">
                                <MathBlock latex={step.latex} />
                            </div>
                        )}

                        {step.question && (
                            <div className="mt-8 space-y-4 animate-[fadeIn_0.5s]">
                                <div className="text-sm font-bold text-da-gold">{step.question}</div>
                                <div className="flex gap-2">
                                    <input 
                                        value={userInput}
                                        onChange={(e) => setUserInput(e.target.value)}
                                        className="flex-1 bg-da-bg border border-da-accent/20 p-3 rounded-sm outline-none focus:border-da-gold text-sm"
                                        placeholder="Enter value..."
                                        disabled={feedback === 'correct'}
                                    />
                                    <button 
                                        onClick={checkAnswer}
                                        disabled={feedback === 'correct'}
                                        className="bg-da-gold text-black px-4 font-bold uppercase text-xs tracking-wider rounded-sm hover:bg-white transition-colors"
                                    >
                                        Check
                                    </button>
                                </div>
                                
                                {feedback === 'wrong' && (
                                    <div className="text-xs text-da-red bg-da-red/10 p-2 rounded border border-da-red/30">
                                        <i className="fas fa-exclamation-circle mr-2"></i>
                                        {step.hint || "Try again. Observe the visual closely."}
                                    </div>
                                )}
                                {feedback === 'correct' && (
                                    <div className="text-xs text-green-400 bg-green-900/20 p-2 rounded border border-green-500/30">
                                        <i className="fas fa-check-circle mr-2"></i>
                                        Correct. You may proceed.
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="mt-8 flex justify-between pt-6 border-t border-da-gold/10">
                        <button 
                            onClick={handlePrev}
                            disabled={currentChapterIndex === 0 && currentStepIndex === 0}
                            className="px-6 py-3 text-xs uppercase tracking-widest text-da-text/60 hover:text-da-gold disabled:opacity-20"
                        >
                            <i className="fas fa-chevron-left mr-2"></i> Previous
                        </button>

                        <button 
                            onClick={handleNext}
                            disabled={step.question !== undefined && feedback !== 'correct'}
                            className={`
                                px-8 py-3 bg-da-gold text-black font-bold uppercase text-xs tracking-widest rounded-sm transition-all
                                ${step.question !== undefined && feedback !== 'correct' ? 'opacity-50 cursor-not-allowed bg-da-text/20' : 'hover:bg-white shadow-lg'}
                            `}
                        >
                            {currentChapterIndex === CALCULUS_CURRICULUM.length - 1 && currentStepIndex === chapter.steps.length - 1 ? 'Complete Tome' : 'Next'} <i className="fas fa-chevron-right ml-2"></i>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CalculusPage;
