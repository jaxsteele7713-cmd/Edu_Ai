
import React, { useState, useEffect } from 'react';
import { User, Course, Page, AppMode } from './types';
import BookLayout from './components/BookLayout';
import TurnTransition from './components/TurnTransition';
import CoverPage from './components/CoverPage';
import ProfilePage from './components/ProfilePage';
import CreateCourse from './components/CreateCourse';
import CourseViewer from './components/CourseViewer';
import AuthPage from './components/AuthPage';
import LiveTutor from './components/LiveTutor';
import SocialPage from './components/SocialPage';
import CalculusPage from './components/CalculusPage';
import { getCourses, addToHistory, getCurrentUser, logoutUser } from './services/mockBackend';

const THEME_STORAGE_KEY = 'lumi_preferred_mode';

const App: React.FC = () => {
  const [mode, setMode] = useState<AppMode>(() => {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    return (saved as AppMode) || AppMode.DARK_ACADEMIA;
  });
  
  const [currentPage, setCurrentPage] = useState<Page>(Page.COVER);
  const [user, setUser] = useState<User | null>(null);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  // Check for existing session on mount
  useEffect(() => {
    const initAuth = async () => {
      try {
        const currentUser = await getCurrentUser();
        if (currentUser) {
          setUser(currentUser);
          setCurrentPage(Page.PROFILE);
        }
      } catch (err) {
        console.error("Auth initialization failed:", err);
      } finally {
        setIsInitializing(false);
      }
    };
    initAuth();
  }, []);

  useEffect(() => {
    localStorage.setItem(THEME_STORAGE_KEY, mode);
    const root = document.documentElement;
    if (mode === AppMode.DARK_ACADEMIA) {
      root.classList.remove('la-theme');
      root.classList.add('da-theme');
    } else {
      root.classList.remove('da-theme');
      root.classList.add('la-theme');
    }
  }, [mode]);

  const handleLogin = (u: User) => {
    setUser(u);
    setCurrentPage(Page.PROFILE);
  };

  const handleLogout = () => {
    logoutUser();
    setUser(null);
    setCurrentPage(Page.AUTH);
  };

  const navigateTo = (page: Page) => {
    setCurrentPage(page);
  };

  const handleOpenCourse = (course: Course) => {
    // Intercept specific system courses to route to custom pages if needed
    // For now, we manually route via the nav/profile buttons, but this is a placeholder
    if (user) {
      addToHistory(user.username, course.id, 'viewed');
    }
    setSelectedCourse(course);
    navigateTo(Page.COURSE_VIEW);
  };

  const toggleMode = () => {
    setMode(prev => prev === AppMode.DARK_ACADEMIA ? AppMode.LIGHT_ACADEMIA : AppMode.DARK_ACADEMIA);
  };

  const renderPage = () => {
    if (isInitializing) {
      return (
        <div className="w-full h-full flex items-center justify-center bg-da-bg">
          <div className="text-da-gold animate-pulse font-display tracking-widest uppercase">Consulting Records...</div>
        </div>
      );
    }

    switch (currentPage) {
      case Page.COVER:
        return <CoverPage onOpen={() => navigateTo(Page.AUTH)} />;
      case Page.AUTH:
        return <AuthPage onLogin={handleLogin} />;
      case Page.PROFILE:
        return user ? (
          <ProfilePage 
            user={user} 
            onSelectCourse={handleOpenCourse}
            onToggleTheme={toggleMode}
            isDarkMode={mode === AppMode.DARK_ACADEMIA}
            onOpenCalculus={() => navigateTo(Page.CALCULUS_TOME)}
          />
        ) : null;
      case Page.CREATE_COURSE:
        return user ? <CreateCourse currentUser={user.username} onSuccess={() => navigateTo(Page.PROFILE)} /> : null;
      case Page.COURSE_VIEW:
        return selectedCourse ? (
            <CourseViewer 
                course={selectedCourse} 
                onBack={() => navigateTo(Page.PROFILE)}
                currentUser={user?.username} // Pass user for tracking completion
            />
        ) : null;
      case Page.LIVE_TUTOR:
        return <LiveTutor />;
      case Page.SOCIAL:
        return user ? <SocialPage currentUser={user} onSelectCourse={handleOpenCourse} /> : null;
      case Page.CALCULUS_TOME:
        return <CalculusPage onBack={() => navigateTo(Page.PROFILE)} />;
      default:
        return <div>Unknown Page</div>;
    }
  };

  const isHome = currentPage === Page.COVER || currentPage === Page.AUTH;

  return (
    <div className={`w-full min-h-screen ${mode === AppMode.LIGHT_ACADEMIA ? 'bg-da-bg' : 'bg-black'} transition-colors duration-500`}>
      {!isHome && (
        <>
          <div className="hidden md:flex fixed top-0 left-0 right-0 h-20 z-50 justify-between items-center px-12 pointer-events-none">
             <div className="font-display font-bold text-2xl pointer-events-auto cursor-pointer text-da-gold drop-shadow-sm" onClick={() => navigateTo(Page.PROFILE)}>LUMI</div>
             <div className="flex gap-10 pointer-events-auto bg-da-paper/60 backdrop-blur-md px-8 py-3 rounded-full border border-da-gold/20 shadow-xl">
                <button onClick={() => navigateTo(Page.PROFILE)} title="Profile" className={`hover:text-da-gold transition-colors ${currentPage === Page.PROFILE ? 'text-da-gold' : ''}`}><i className="fas fa-user-graduate"></i></button>
                <button onClick={() => navigateTo(Page.SOCIAL)} title="Community" className={`hover:text-da-gold transition-colors ${currentPage === Page.SOCIAL ? 'text-da-gold' : ''}`}><i className="fas fa-users"></i></button>
                <button onClick={() => navigateTo(Page.CREATE_COURSE)} title="Create" className={`hover:text-da-gold transition-colors ${currentPage === Page.CREATE_COURSE ? 'text-da-gold' : ''}`}><i className="fas fa-feather-alt"></i></button>
                <button onClick={() => navigateTo(Page.LIVE_TUTOR)} title="Live Tutor" className={`hover:text-da-gold transition-colors ${currentPage === Page.LIVE_TUTOR ? 'text-da-gold' : ''}`}><i className="fas fa-magic"></i></button>
                <button onClick={toggleMode} title="Toggle Theme" className="hover:text-da-gold transition-colors">
                  <i className={`fas ${mode === AppMode.DARK_ACADEMIA ? 'fa-moon' : 'fa-sun'}`}></i>
                </button>
                <button onClick={handleLogout} title="Logout" className="hover:text-da-red transition-colors opacity-60"><i className="fas fa-sign-out-alt"></i></button>
             </div>
          </div>

          <div className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-da-paper border-t border-da-gold/20 z-50 flex justify-around items-center px-4 shadow-[0_-5px_20px_rgba(0,0,0,0.3)]">
              <button onClick={() => navigateTo(Page.PROFILE)} className={`text-xl ${currentPage === Page.PROFILE ? 'text-da-gold' : 'text-da-text/60'}`}><i className="fas fa-user-graduate"></i></button>
              <button onClick={() => navigateTo(Page.SOCIAL)} className={`text-xl ${currentPage === Page.SOCIAL ? 'text-da-gold' : 'text-da-text/60'}`}><i className="fas fa-users"></i></button>
              <div className="w-12 h-12 bg-da-gold rounded-full flex items-center justify-center -mt-8 shadow-lg border-4 border-da-bg" onClick={() => navigateTo(Page.LIVE_TUTOR)}>
                <i className="fas fa-microphone text-da-bg"></i>
              </div>
              <button onClick={() => navigateTo(Page.CREATE_COURSE)} className={`text-xl ${currentPage === Page.CREATE_COURSE ? 'text-da-gold' : 'text-da-text/60'}`}><i className="fas fa-plus-circle"></i></button>
              <button onClick={handleLogout} className="text-xl text-da-red/60"><i className="fas fa-sign-out-alt"></i></button>
          </div>
        </>
      )}

      {currentPage === Page.COVER ? (
          <CoverPage onOpen={() => navigateTo(Page.AUTH)} />
      ) : (
          <BookLayout currentPage={1}>
             <TurnTransition pageKey={currentPage}>
               <div className={`${!isHome ? 'pb-20 md:pb-0' : ''} h-full w-full`}>
                 {renderPage()}
               </div>
             </TurnTransition>
          </BookLayout>
      )}
    </div>
  );
};

export default App;
