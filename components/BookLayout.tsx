
import React from 'react';

interface BookLayoutProps {
  children: React.ReactNode;
  currentPage: number;
}

const BookLayout: React.FC<BookLayoutProps> = ({ children, currentPage }) => {
  return (
    <div className="relative w-full h-screen bg-da-leather flex justify-center items-center perspective-1000 overflow-hidden transition-colors duration-500">
      {/* Background Texture/Desk - Hidden on small mobile to focus on content */}
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/wood-pattern.png')] opacity-20 pointer-events-none hidden md:block mix-blend-overlay"></div>
      
      {/* Content Area - On mobile it fills the screen, on desktop it looks like a book */}
      <div className="relative w-full h-full md:h-[90vh] md:max-w-6xl flex shadow-2xl transition-all duration-700 transform-style-3d">
        <div className="w-full h-full bg-da-bg flex relative overflow-hidden md:rounded-lg md:border-8 border-da-paper shadow-2xl">
            {children}
        </div>
      </div>
    </div>
  );
};

export default BookLayout;
