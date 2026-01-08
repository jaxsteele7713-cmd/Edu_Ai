import React, { useState, useEffect } from 'react';

interface TurnTransitionProps {
  children: React.ReactNode;
  pageKey: string;
}

const TurnTransition: React.FC<TurnTransitionProps> = ({ children, pageKey }) => {
  const [displayChildren, setDisplayChildren] = useState(children);
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    if (pageKey) {
        setAnimating(true);
        const timer = setTimeout(() => {
            setDisplayChildren(children);
            setAnimating(false);
        }, 600); // Sync with CSS duration
        return () => clearTimeout(timer);
    }
  }, [children, pageKey]);

  return (
    <div className="w-full h-full relative overflow-hidden">
        {/* Old Page being turned */}
        {animating && (
             <div className="absolute inset-0 z-30 bg-da-paper origin-left animate-[pageTurn_0.8s_ease-in-out_forwards] shadow-2xl border-l border-gray-600 flex items-center justify-center">
                 <div className="text-da-text opacity-50 text-xl font-serif rotate-y-180">Turning...</div>
             </div>
        )}
        
        {/* New Page */}
        <div className="w-full h-full z-10">
            {displayChildren}
        </div>
    </div>
  );
};

export default TurnTransition;
