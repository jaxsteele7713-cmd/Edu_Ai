
import React from 'react';

interface CoverPageProps {
  onOpen: () => void;
}

const CoverPage: React.FC<CoverPageProps> = ({ onOpen }) => {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-8 relative bg-da-bg overflow-hidden">
       {/* Background Elements */}
       <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/black-linen.png')] opacity-40 pointer-events-none"></div>
       
       {/* Ambient Floating Orbs */}
       <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-da-gold/10 rounded-full blur-3xl animate-float pointer-events-none"></div>
       <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-da-accent/5 rounded-full blur-3xl animate-float pointer-events-none" style={{ animationDelay: '2s' }}></div>

       <div className="z-10 flex flex-col items-center max-w-2xl text-center">
         <div className="mb-8 border-b border-da-gold/50 pb-8 px-12 relative">
            <h1 className="text-9xl font-display text-da-gold tracking-widest drop-shadow-[0_0_15px_rgba(207,170,110,0.3)]">LUMI</h1>
         </div>
         
         <p className="text-2xl font-serif italic mb-12 text-da-text/80 tracking-wider font-light">
           Illuminate the path to learning
         </p>
         
         <button 
            onClick={onOpen}
            className="px-12 py-4 border border-da-gold text-da-gold font-display text-xl tracking-[0.3em] uppercase hover:bg-da-gold hover:text-black transition-all duration-500 rounded-sm hover:shadow-[0_0_30px_rgba(207,170,110,0.4)]"
         >
            Enter
         </button>
       </div>
       
       <div className="absolute bottom-12 text-da-gold/20 text-[10px] tracking-[0.5em] uppercase font-sans select-none">
          Est. 2025 • The Archive
       </div>
    </div>
  );
};

export default CoverPage;
