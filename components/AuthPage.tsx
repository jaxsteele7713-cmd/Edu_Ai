
import React, { useState } from 'react';
import { loginUser, saveUser } from '../services/mockBackend';
import { User } from '../types';

interface AuthPageProps {
  onLogin: (user: User) => void;
}

const AuthPage: React.FC<AuthPageProps> = ({ onLogin }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({ username: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (isLogin) {
        const result = await loginUser(formData.username, formData.password);
        if (result) {
          onLogin(result.user);
        } else {
          setError('Invalid credentials. The archives are silent.');
        }
      } else {
        const newUser: User = {
          username: formData.username,
          email: formData.email,
          avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${formData.username}`,
          bio: 'A scholar embarking on a journey of enlightenment.',
          badges: ['Novice'],
          streak: 1,
          followers: 0,
          following: 0
        };
        
        await saveUser(newUser, formData.password);
        // Automatically login after registration
        const result = await loginUser(formData.username, formData.password);
        if (result) onLogin(result.user);
      }
    } catch (err: any) {
      setError(err.message || 'The library is currently unreachable.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-4 md:p-8 bg-da-paper relative overflow-hidden transition-colors duration-500">
       {/* Aesthetic Overlay */}
       <div className="absolute inset-0 border-[8px] md:border-[12px] border-double border-da-gold/10 pointer-events-none m-2 md:m-6"></div>
       
       <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/aged-paper.png')] opacity-[0.07] pointer-events-none"></div>

       <div className="z-10 w-full max-w-[320px] sm:max-w-sm flex flex-col items-center">
          <div className="mb-4 md:mb-8 flex flex-col items-center text-center">
             <div className="w-14 h-14 md:w-20 md:h-20 border-2 border-da-gold rounded-full flex items-center justify-center mb-3 shadow-[0_0_20px_rgba(207,170,110,0.15)] bg-da-bg/20">
                <i className="fas fa-quill text-da-gold text-2xl md:text-3xl"></i>
             </div>
             <h2 className="text-3xl md:text-5xl font-display text-da-gold mb-1 tracking-tight">LUMI</h2>
             <p className="font-serif italic text-da-text/70 text-sm md:text-base">
                {isLogin ? "Welcome back, scholar" : "Enroll in the Great Archive"}
             </p>
          </div>
          
          <form onSubmit={handleSubmit} className="w-full flex flex-col gap-3 md:gap-4">
            <div className="relative group">
              <input 
                type="text" 
                placeholder="Username" 
                className="w-full bg-da-bg/30 border border-da-accent/20 rounded-sm py-2.5 md:py-4 pl-10 md:pl-12 pr-4 text-da-text placeholder-da-text/40 outline-none focus:border-da-gold focus:ring-1 focus:ring-da-gold/20 transition-all font-sans text-sm shadow-inner"
                value={formData.username}
                onChange={e => setFormData({...formData, username: e.target.value})}
                required
              />
              <i className="fas fa-user-graduate absolute left-3.5 md:left-4 top-1/2 -translate-y-1/2 text-da-accent/40 group-focus-within:text-da-gold transition-colors text-xs md:text-base"></i>
            </div>

            {!isLogin && (
               <div className="relative group">
                 <input 
                   type="email" 
                   placeholder="Email Address" 
                   className="w-full bg-da-bg/30 border border-da-accent/20 rounded-sm py-2.5 md:py-4 pl-10 md:pl-12 pr-4 text-da-text placeholder-da-text/40 outline-none focus:border-da-gold focus:ring-1 focus:ring-da-gold/20 transition-all font-sans text-sm shadow-inner"
                   value={formData.email}
                   onChange={e => setFormData({...formData, email: e.target.value})}
                   required
                 />
                 <i className="fas fa-envelope-open-text absolute left-3.5 md:left-4 top-1/2 -translate-y-1/2 text-da-accent/40 group-focus-within:text-da-gold transition-colors text-xs md:text-base"></i>
               </div>
            )}

            <div className="relative group">
              <input 
                type={showPassword ? "text" : "password"}
                placeholder="Password" 
                className="w-full bg-da-bg/30 border border-da-accent/20 rounded-sm py-2.5 md:py-4 pl-10 md:pl-12 pr-10 text-da-text placeholder-da-text/40 outline-none focus:border-da-gold focus:ring-1 focus:ring-da-gold/20 transition-all font-sans text-sm shadow-inner"
                value={formData.password}
                onChange={e => setFormData({...formData, password: e.target.value})}
                required
              />
              <i className="fas fa-key absolute left-3.5 md:left-4 top-1/2 -translate-y-1/2 text-da-accent/40 group-focus-within:text-da-gold transition-colors text-xs md:text-base"></i>
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-da-accent/40 hover:text-da-gold transition-colors outline-none"
                title={showPassword ? "Hide password" : "Show password"}
              >
                <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'} text-xs md:text-sm`}></i>
              </button>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-red-400 text-[10px] md:text-xs bg-red-900/30 p-2 md:p-3 border border-red-500/60 rounded-sm shadow-md animate-pulse">
                <i className="fas fa-exclamation-triangle"></i>
                <p className="font-serif italic font-semibold tracking-wide">{error}</p>
              </div>
            )}

            <button 
              type="submit" 
              className={`
                mt-2 md:mt-4 font-display py-3 md:py-4 tracking-[0.2em] md:tracking-[0.3em] transition-all duration-300 rounded-sm shadow-md flex items-center justify-center gap-3 border border-da-gold/20 text-xs md:text-sm
                ${loading 
                  ? 'bg-da-accent/20 text-da-text/40 cursor-not-allowed opacity-50' 
                  : 'bg-da-gold text-da-paper hover:bg-da-text hover:text-da-paper active:scale-[0.98]'
                }
              `}
              disabled={loading}
            >
              {loading ? (
                <>
                  <i className="fas fa-feather fa-spin"></i>
                  <span>VERIFYING...</span>
                </>
              ) : (
                <span>{isLogin ? 'ENTER LIBRARY' : 'JOIN THE ARCHIVE'}</span>
              )}
            </button>
          </form>

          <button 
            onClick={() => setIsLogin(!isLogin)}
            className="mt-6 md:mt-10 text-[10px] md:text-xs text-da-text/50 hover:text-da-gold transition-all uppercase tracking-[0.15em] md:tracking-[0.2em] font-sans group text-center"
          >
             <span className="opacity-60">{isLogin ? "No library card?" : "Already a member?"}</span>
             <br />
             <span className="inline-block mt-1 border-b border-transparent group-hover:border-da-gold transition-all">
                {isLogin ? "Register your name" : "Consult your credentials"}
             </span>
          </button>
       </div>

       <div className="absolute bottom-6 md:bottom-10 flex flex-col items-center gap-1 md:gap-2 pointer-events-none">
          <div className="h-px w-8 md:w-12 bg-da-gold/30"></div>
          <div className="text-[8px] md:text-[9px] uppercase tracking-[0.3em] md:tracking-[0.4em] text-da-gold/40 font-display">
             LUMI SECURE ARCHIVE • Est. 2025
          </div>
       </div>
    </div>
  );
};

export default AuthPage;
