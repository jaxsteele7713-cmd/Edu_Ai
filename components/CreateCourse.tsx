
import React, { useState } from 'react';
import { generateCourseContent, generateVideoIntro, personalizeFlashcards } from '../services/geminiService';
import { saveCourse, ENGINEERING_FOLDER } from '../services/mockBackend';
import { Course, Flashcard } from '../types';

interface CreateCourseProps {
  currentUser: string;
  onSuccess: () => void;
}

type ViewMode = 'dashboard' | 'ai-generator' | 'editor';

const CreateCourse: React.FC<CreateCourseProps> = ({ currentUser, onSuccess }) => {
  const [view, setView] = useState<ViewMode>('dashboard');
  
  // --- AI Generator State ---
  const [formData, setFormData] = useState({
    title: '',
    subject: '',
    level: 'Undergraduate',
    type: 'mixed',
    durationValue: '3',
    durationUnit: 'Hours',
    speed: 'Standard',
    hasQuiz: true,
    refMaterial: '',
    interests: ''
  });
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');

  // --- Manual Editor State ---
  const [editorCourse, setEditorCourse] = useState<Partial<Course>>({
    title: '',
    subject: 'Engineering',
    level: 'Undergraduate',
    description: '',
    cardStyle: 'anki-minimal', // Default to Anki style global standard
    content: []
  });
  
  // --- Personalization State ---
  const [customInterest, setCustomInterest] = useState('');
  const [isPersonalizing, setIsPersonalizing] = useState(false);

  // --- Handlers ---

  const handleOpenModule = (module: typeof ENGINEERING_FOLDER[0]) => {
    setEditorCourse({
      title: module.title,
      subject: 'Engineering Calculus',
      level: 'Undergraduate',
      description: module.description,
      type: 'flashcard',
      cardStyle: 'anki-minimal',
      content: [...module.cards], // Clone to avoid mutation
      author: currentUser
    });
    setCustomInterest(''); // Reset custom interest
    setView('editor');
  };

  const handleEditorChange = (field: keyof Course, value: any) => {
    setEditorCourse(prev => ({ ...prev, [field]: value }));
  };

  const handleCardChange = (index: number, field: 'front' | 'back', value: string) => {
    const newContent = [...(editorCourse.content || [])];
    if (newContent[index]) {
      newContent[index] = { ...newContent[index], [field]: value };
      setEditorCourse(prev => ({ ...prev, content: newContent }));
    }
  };

  const handlePersonalize = async () => {
    if (!customInterest || !editorCourse.content?.length) return;
    setIsPersonalizing(true);
    try {
        const newContent = await personalizeFlashcards(editorCourse.content as Flashcard[], customInterest);
        if (newContent) {
            setEditorCourse(prev => ({
                ...prev,
                content: newContent,
                description: `${prev.description} (Customized for: ${customInterest})`
            }));
        }
    } catch (e) {
        console.error("Personalization failed", e);
        alert("The alchemical transmutation failed. Please try again.");
    } finally {
        setIsPersonalizing(false);
    }
  };

  const addCard = () => {
    setEditorCourse(prev => ({
      ...prev,
      content: [...(prev.content || []), { front: '', back: '' }]
    }));
  };

  const removeCard = (index: number) => {
    setEditorCourse(prev => ({
      ...prev,
      content: (prev.content || []).filter((_, i) => i !== index)
    }));
  };

  const saveEditorCourse = () => {
    if (!editorCourse.title || !editorCourse.content?.length) {
      alert("Please provide a title and at least one flashcard.");
      return;
    }
    const newCourse: Course = {
      id: `course-${Date.now()}`,
      title: editorCourse.title || 'Untitled',
      subject: editorCourse.subject || 'General',
      description: editorCourse.description || '',
      type: 'flashcard',
      level: editorCourse.level || 'Intermediate',
      cardStyle: 'anki-minimal',
      content: editorCourse.content,
      author: currentUser,
      roadmap: [],
      duration: 'Self-Paced',
      // Social Defaults
      isPublic: true,
      likes: [],
      comments: []
    };
    saveCourse(newCourse);
    onSuccess();
  };

  // --- AI Logic (New Course) ---
  const handleAIChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };

  const handleAISubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatus('Drafting syllabus...');

    try {
      const durationStr = `${formData.durationValue} ${formData.durationUnit}`;
      const promptContext = `Topic: ${formData.title}. \nInterests: ${formData.interests}. \nContext: ${formData.refMaterial}`;
      
      const content = await generateCourseContent(
        promptContext, 
        formData.level, 
        formData.type,
        durationStr,
        formData.speed
      );
      
      if (!content) throw new Error("AI failed to generate curriculum");

      let videoUrl = undefined;
      if (formData.type === 'video' || formData.type === 'mixed') {
          setStatus('Visualizing the path...');
          const videoPrompt = `Cinematic scholarly introduction for ${formData.title}. Atmospheric lighting, antique books, dark academia aesthetic, high quality 4k.`;
          const vid = await generateVideoIntro(videoPrompt);
          if (vid) videoUrl = vid;
          else {
            setStatus('Visuals unavailable (Check API Key). Saving course...');
            await new Promise(r => setTimeout(r, 2000));
          }
      }

      const newCourse: Course = {
        id: `course-${Date.now()}`,
        title: content.title || formData.title,
        subject: formData.subject,
        description: content.description || "A path illuminated by AI.",
        type: formData.type as any,
        level: formData.level,
        duration: durationStr,
        speed: formData.speed,
        content: content.flashcards || [],
        quiz: content.quiz || [],
        roadmap: content.roadmap || [],
        videoIntroUrl: videoUrl,
        author: currentUser,
        cardStyle: 'anki-minimal',
        // Social Defaults
        isPublic: true,
        likes: [],
        comments: []
      };

      saveCourse(newCourse);
      setStatus('Curriculum finalized!');
      setTimeout(onSuccess, 800);
    } catch (err) {
      console.error(err);
      setStatus('The archives are silent (Error).');
    } finally {
      setLoading(false);
    }
  };

  // --- RENDERERS ---

  if (view === 'dashboard') {
    return (
      <div className="w-full h-full p-8 bg-da-bg overflow-y-auto pb-24">
         <div className="max-w-4xl mx-auto">
            <h2 className="text-4xl font-display text-da-gold mb-8 border-b border-da-gold/20 pb-4">Creator Studio</h2>
            
            {/* AI Option */}
            <div 
              onClick={() => setView('ai-generator')}
              className="bg-da-paper/40 border border-da-gold/20 p-6 rounded mb-10 hover:border-da-gold transition-all cursor-pointer group flex justify-between items-center"
            >
               <div>
                  <h3 className="text-xl font-display text-da-text group-hover:text-da-gold transition-colors mb-2">
                    <i className="fas fa-magic mr-3"></i>AI Curriculum Architect
                  </h3>
                  <p className="text-sm font-serif italic opacity-60">Generate comprehensive courses from a simple prompt.</p>
               </div>
               <i className="fas fa-chevron-right text-da-gold/50 group-hover:translate-x-1 transition-transform"></i>
            </div>

            {/* Folder View - Specific for Engineering Calculus */}
            <div>
               <h3 className="text-xs uppercase tracking-[0.2em] text-da-gold/60 mb-4 flex items-center gap-2">
                 <i className="fas fa-folder-open"></i> Unit 1: Partial Derivatives
               </h3>
               
               <div className="bg-da-bg border border-da-accent/10 rounded-lg overflow-hidden">
                  <div className="bg-da-paper/20 p-3 border-b border-da-accent/10 flex items-center gap-2">
                      <i className="fas fa-book text-da-leather"></i>
                      <span className="text-sm font-serif font-bold text-da-text/80">Engineering Calculus (Extracted Modules)</span>
                  </div>
                  <div className="divide-y divide-da-accent/10">
                      {ENGINEERING_FOLDER.map((module, i) => (
                        <div 
                          key={i} 
                          onClick={() => handleOpenModule(module)}
                          className="p-4 hover:bg-da-paper/10 cursor-pointer flex justify-between items-center group transition-colors"
                        >
                           <div className="flex items-center gap-4">
                              <div className="text-da-text/30 group-hover:text-da-gold transition-colors font-display text-lg w-8 text-center">
                                 {i + 1}
                              </div>
                              <div>
                                 <h4 className="text-da-text text-sm font-medium">{module.title}</h4>
                                 <p className="text-[10px] opacity-40 uppercase tracking-wider">{module.description.substring(0, 60)}...</p>
                              </div>
                           </div>
                           <button className="text-[10px] border border-da-accent/20 px-3 py-1 rounded-full text-da-text/50 group-hover:border-da-gold group-hover:text-da-gold transition-all">
                              Customize & Study
                           </button>
                        </div>
                      ))}
                  </div>
               </div>
            </div>
         </div>
      </div>
    );
  }

  if (view === 'editor') {
    return (
      <div className="w-full h-full flex flex-col bg-da-bg pb-20">
         <div className="p-4 border-b border-da-gold/10 flex justify-between items-center bg-da-paper/50 backdrop-blur">
             <button onClick={() => setView('dashboard')} className="text-xs uppercase tracking-widest text-da-text/60 hover:text-da-gold">
               <i className="fas fa-arrow-left mr-2"></i> Unit 1 Folder
             </button>
             <h3 className="font-display text-da-gold hidden md:block">Course Editor</h3>
             <button 
               onClick={saveEditorCourse} 
               className="bg-da-gold text-black px-4 py-1.5 text-xs font-bold uppercase tracking-wider rounded-sm hover:bg-white transition-colors"
             >
               Save to Library
             </button>
         </div>

         <div className="flex-1 overflow-y-auto p-4 md:p-8">
            <div className="max-w-3xl mx-auto space-y-8">
                {/* Meta Settings */}
                <div className="bg-da-paper/20 p-6 rounded border border-da-accent/10">
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="block text-[9px] uppercase tracking-widest text-da-gold/60 mb-1">Title</label>
                        <input 
                          value={editorCourse.title}
                          onChange={(e) => handleEditorChange('title', e.target.value)}
                          className="w-full bg-da-bg p-2 text-sm border border-da-accent/20 rounded-sm focus:border-da-gold outline-none"
                        />
                      </div>
                      {/* Removed Style Selector - Enforced Global Standard */}
                   </div>
                   
                   {/* THEMATIC CUSTOMIZATION PANEL */}
                   <div className="mt-6 border-t border-da-gold/10 pt-4">
                      <label className="block text-[9px] uppercase tracking-widest text-da-gold mb-2">
                         <i className="fas fa-wand-magic-sparkles mr-1"></i> Thematic Personalization
                      </label>
                      <div className="flex gap-2">
                         <input 
                           value={customInterest}
                           onChange={(e) => setCustomInterest(e.target.value)}
                           className="flex-1 bg-da-bg p-2 text-sm border border-da-accent/20 rounded-sm focus:border-da-gold outline-none placeholder-da-text/30"
                           placeholder="Enter an interest (e.g. Football, Cooking, Harry Potter) to rewrite explanations..."
                         />
                         <button 
                            onClick={handlePersonalize}
                            disabled={isPersonalizing || !customInterest}
                            className={`
                              px-4 py-2 text-xs uppercase tracking-wider font-bold rounded-sm border transition-all
                              ${isPersonalizing 
                                ? 'bg-da-gold/10 text-da-gold/50 border-da-gold/10' 
                                : 'bg-da-paper border-da-gold text-da-gold hover:bg-da-gold hover:text-black'
                              }
                            `}
                         >
                            {isPersonalizing ? <i className="fas fa-spinner fa-spin"></i> : 'Transmute'}
                         </button>
                      </div>
                      <p className="text-[10px] text-da-text/40 mt-2 italic">
                         The AI will rewrite all card explanations to use analogies from your chosen interest.
                      </p>
                   </div>
                </div>

                {/* Card Editor */}
                <div className="space-y-4">
                   <div className="flex justify-between items-end border-b border-da-gold/20 pb-2">
                      <h4 className="text-lg font-serif italic text-da-text">Flashcards ({editorCourse.content?.length})</h4>
                      <button onClick={addCard} className="text-da-gold hover:text-white text-xs uppercase tracking-wider">
                         <i className="fas fa-plus mr-1"></i> Add Card
                      </button>
                   </div>
                   
                   {editorCourse.content?.map((card, i) => (
                     <div key={i} className="bg-da-paper/30 p-4 rounded border border-da-accent/10 relative group">
                        <span className="absolute top-2 left-2 text-[8px] text-da-text/20 uppercase">Card {i+1}</span>
                        <button 
                          onClick={() => removeCard(i)}
                          className="absolute top-2 right-2 text-da-text/20 hover:text-da-red transition-colors"
                        >
                           <i className="fas fa-times"></i>
                        </button>

                        <div className="mt-4 space-y-3">
                           <div>
                              <label className="block text-[8px] uppercase tracking-widest text-da-gold/40 mb-1">Front</label>
                              <input 
                                value={card.front}
                                onChange={(e) => handleCardChange(i, 'front', e.target.value)}
                                className="w-full bg-da-bg/50 p-2 text-sm border border-da-accent/10 rounded-sm focus:border-da-gold outline-none font-serif"
                              />
                           </div>
                           <div>
                              <label className="block text-[8px] uppercase tracking-widest text-da-gold/40 mb-1">Back</label>
                              <textarea 
                                value={card.back}
                                onChange={(e) => handleCardChange(i, 'back', e.target.value)}
                                className="w-full bg-da-bg/50 p-2 text-sm border border-da-accent/10 rounded-sm focus:border-da-gold outline-none min-h-[60px]"
                              />
                           </div>
                        </div>
                     </div>
                   ))}
                </div>
            </div>
         </div>
      </div>
    );
  }

  // --- AI GENERATOR VIEW (Original Form) ---
  return (
    <div className="w-full h-full p-4 md:p-8 bg-da-bg overflow-y-auto flex justify-center pb-24 md:pb-12">
      <div className="w-full max-w-2xl bg-da-paper/30 p-6 md:p-10 rounded-lg border border-da-gold/10 backdrop-blur-sm">
        <button onClick={() => setView('dashboard')} className="mb-6 text-xs text-da-text/50 hover:text-da-gold uppercase tracking-widest">
           <i className="fas fa-arrow-left mr-2"></i> Cancel
        </button>
        <div className="text-center mb-10">
          <h2 className="text-3xl md:text-5xl font-display text-da-gold mb-2 tracking-tight">Illumination Request</h2>
          <div className="h-px w-24 bg-da-gold/40 mx-auto"></div>
          <p className="font-serif italic text-da-text/60 mt-4">Define the boundaries of your next intellectual pursuit.</p>
        </div>
        
        <form onSubmit={handleAISubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
               <label className="text-[10px] uppercase tracking-widest text-da-gold opacity-80">Scientific Pursuit</label>
               <input 
                 name="title" 
                 value={formData.title} 
                 onChange={handleAIChange}
                 className="w-full bg-da-bg/40 border border-da-accent/20 p-3 text-da-text focus:border-da-gold outline-none rounded-sm transition text-sm" 
                 placeholder="e.g. Victorian Architecture" 
                 required
               />
            </div>
            <div className="space-y-2">
               <label className="text-[10px] uppercase tracking-widest text-da-gold opacity-80">Faculty / Field</label>
               <input 
                 name="subject" 
                 value={formData.subject} 
                 onChange={handleAIChange}
                 className="w-full bg-da-bg/40 border border-da-accent/20 p-3 text-da-text focus:border-da-gold outline-none rounded-sm text-sm" 
                 placeholder="History of Art" 
                 required
               />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
               <label className="text-[10px] uppercase tracking-widest text-da-gold opacity-80">Academic Rigor</label>
               <select 
                 name="level" 
                 value={formData.level} 
                 onChange={handleAIChange}
                 className="w-full bg-da-bg/40 border border-da-accent/20 p-3 text-da-text focus:border-da-gold outline-none rounded-sm text-sm appearance-none"
               >
                 <option>Novice</option>
                 <option>Intermediate</option>
                 <option>Undergraduate</option>
                 <option>Postgraduate</option>
                 <option>Master Scholar</option>
               </select>
            </div>
            <div className="space-y-2">
               <label className="text-[10px] uppercase tracking-widest text-da-gold opacity-80">Knowledge Density (Speed)</label>
               <select 
                 name="speed" 
                 value={formData.speed} 
                 onChange={handleAIChange}
                 className="w-full bg-da-bg/40 border border-da-accent/20 p-3 text-da-text focus:border-da-gold outline-none rounded-sm text-sm"
               >
                 <option>Accelerated (Breadth Focus)</option>
                 <option>Standard (Balanced)</option>
                 <option>Intensive (Deep Dive)</option>
                 <option>Socratic (Question-Led)</option>
               </select>
            </div>
          </div>

          <div className="space-y-2">
               <label className="text-[10px] uppercase tracking-widest text-da-gold opacity-80">Chronological Bound (Duration)</label>
               <div className="flex gap-4">
                  <input 
                    type="number"
                    name="durationValue"
                    value={formData.durationValue}
                    onChange={handleAIChange}
                    className="flex-1 bg-da-bg/40 border border-da-accent/20 p-3 text-da-text focus:border-da-gold outline-none rounded-sm text-sm"
                    min="1"
                  />
                  <select 
                    name="durationUnit"
                    value={formData.durationUnit}
                    onChange={handleAIChange}
                    className="flex-1 bg-da-bg/40 border border-da-accent/20 p-3 text-da-text focus:border-da-gold outline-none rounded-sm text-sm"
                  >
                    <option>Hours</option>
                    <option>Days</option>
                    <option>Weeks</option>
                  </select>
               </div>
          </div>

          <div className="space-y-2">
               <label className="text-[10px] uppercase tracking-widest text-da-gold opacity-80">Personal Context</label>
               <input 
                 name="interests" 
                 value={formData.interests} 
                 onChange={handleAIChange}
                 className="w-full bg-da-bg/40 border border-da-accent/20 p-3 text-da-text focus:border-da-gold outline-none rounded-sm text-sm" 
                 placeholder="Interests to weave into analogies..." 
               />
          </div>

          <div className="space-y-4">
             <label className="text-[10px] uppercase tracking-widest text-da-gold opacity-80">Pedagogical Tools</label>
             <div className="grid grid-cols-3 gap-2">
                {['flashcard', 'video', 'mixed'].map(t => (
                  <button 
                    key={t}
                    type="button"
                    onClick={() => setFormData(prev => ({...prev, type: t as any}))}
                    className={`
                      py-3 text-[10px] uppercase tracking-widest border transition-all rounded-sm flex flex-col items-center gap-1
                      ${formData.type === t ? 'bg-da-gold text-black border-da-gold' : 'border-da-accent/20 text-da-text/60 hover:border-da-gold/40'}
                    `}
                  >
                    <i className={`fas fa-${t === 'flashcard' ? 'clone' : t === 'video' ? 'video' : 'layer-group'}`}></i>
                    {t}
                  </button>
                ))}
             </div>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className={`
              w-full py-5 mt-4 font-display text-lg tracking-[0.3em] uppercase border transition-all relative overflow-hidden group
              ${loading ? 'bg-da-gold/10 text-da-gold/40 border-da-gold/20' : 'bg-da-gold text-black border-da-gold hover:bg-white hover:text-black shadow-lg'}
            `}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-3">
                <i className="fas fa-quill fa-bounce"></i>
                {status}
              </span>
            ) : (
              'Illuminate Path'
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default CreateCourse;
