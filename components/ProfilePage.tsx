
import React, { useState, useEffect, useMemo } from 'react';
import { User, Course, HistoryRecord, BadgeDef } from '../types';
import { getCourses, getUserHistory, getUserArchives, toggleArchive, updateUser, saveCourse, ENGINEERING_FOLDER, getFollowers, getFollowing, toggleFollowUser, removeFollower } from '../services/mockBackend';
import { personalizeFlashcards } from '../services/geminiService';

interface ProfilePageProps {
  user: User;
  onSelectCourse: (course: Course) => void;
  onToggleTheme: () => void;
  isDarkMode: boolean;
  onOpenCalculus?: () => void; // New prop
}

type Tab = 'library' | 'history' | 'archive';
type NetworkTab = 'following' | 'followers';

const DEFAULT_BADGE_SLOTS: BadgeDef[] = [
    { id: 'b1', label: 'Initiate', icon: 'fa-scroll', desc: 'First Steps' },
    { id: 'b2', label: 'Scholar', icon: 'fa-atom', desc: 'Pursuit of Truth' },
    { id: 'b3', label: 'Polymath', icon: 'fa-globe-europe', desc: 'Universal Wisdom' }
];

const ProfilePage: React.FC<ProfilePageProps> = ({ user: initialUser, onSelectCourse, onToggleTheme, isDarkMode, onOpenCalculus }) => {
  const [user, setUser] = useState(initialUser); // Local user state for immediate updates
  const [activeTab, setActiveTab] = useState<Tab>('library');
  const [allCourses, setAllCourses] = useState<Course[]>([]);
  const [userArchives, setUserArchives] = useState<string[]>([]);
  const [userHistory, setUserHistory] = useState<HistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshSeed, setRefreshSeed] = useState(0);

  // Search State
  const [searchQuery, setSearchQuery] = useState('');

  // Edit Mode State
  const [isEditing, setIsEditing] = useState(false);
  const [badgeDefs, setBadgeDefs] = useState<BadgeDef[]>(initialUser.badgeDefinitions || DEFAULT_BADGE_SLOTS);
  
  const [editForm, setEditForm] = useState({
      email: initialUser.email,
      bio: initialUser.bio,
      avatarUrl: initialUser.avatarUrl,
      profileBackground: initialUser.profileBackground || ''
  });
  const [isSaving, setIsSaving] = useState(false);

  // Network Management State
  const [showNetworkModal, setShowNetworkModal] = useState(false);
  const [networkTab, setNetworkTab] = useState<NetworkTab>('following');
  const [networkList, setNetworkList] = useState<User[]>([]);
  const [newFollowInput, setNewFollowInput] = useState('');

  // Folder State
  const [expandedFolder, setExpandedFolder] = useState<string | null>(null);

  // Customization State
  const [customizingCourse, setCustomizingCourse] = useState<Course | null>(null);
  const [customizationPrompt, setCustomizationPrompt] = useState('');
  const [isProcessingCustomization, setIsProcessingCustomization] = useState(false);

  useEffect(() => {
    setUser(initialUser);
    setEditForm({
      email: initialUser.email,
      bio: initialUser.bio,
      avatarUrl: initialUser.avatarUrl,
      profileBackground: initialUser.profileBackground || ''
    });
    setBadgeDefs(initialUser.badgeDefinitions || DEFAULT_BADGE_SLOTS);
  }, [initialUser]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [courses, archives, history] = await Promise.all([
          getCourses(),
          getUserArchives(user.username),
          getUserHistory(user.username)
        ]);
        setAllCourses(courses);
        setUserArchives(archives);
        setUserHistory(history);
      } catch (err) {
        console.error("Failed to fetch archives:", err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [user.username, refreshSeed]);

  // Network Data Loader
  useEffect(() => {
      if (showNetworkModal) {
          const fetchNetwork = async () => {
              if (networkTab === 'following') {
                  const list = await getFollowing(user.username);
                  setNetworkList(list);
              } else {
                  const list = await getFollowers(user.username);
                  setNetworkList(list);
              }
          };
          fetchNetwork();
      }
  }, [showNetworkModal, networkTab, user.username, refreshSeed]);

  // Search Logic Helper
  const filterBySearch = (title: string, subject: string) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return title.toLowerCase().includes(q) || subject.toLowerCase().includes(q);
  };

  const libraryCourses = useMemo(() => 
    allCourses.filter(c => 
      (c.author === user.username || c.author === 'LUMI AI') && 
      !userArchives.includes(c.id) &&
      filterBySearch(c.title, c.subject)
    ),
    [allCourses, user.username, userArchives, searchQuery]
  );

  const archivedCourses = useMemo(() => 
    allCourses.filter(c => 
      userArchives.includes(c.id) &&
      filterBySearch(c.title, c.subject)
    ),
    [allCourses, userArchives, searchQuery]
  );

  const historyDisplay = useMemo(() => {
    return userHistory.map(h => {
        const course = allCourses.find(c => c.id === h.courseId);
        return { ...h, course };
    }).filter(h => h.course && filterBySearch(h.course.title, h.course.subject));
  }, [userHistory, allCourses, searchQuery]);

  // Badge Logic: Uses editable definitions
  const earnedBadges = useMemo(() => {
      // Filter completed unique courses
      const completed = userHistory.filter(h => h.action === 'completed');
      const uniqueCompleted = Array.from(new Set(completed.map(h => h.courseId)))
          .map(id => completed.find(h => h.courseId === id)!);
      
      return badgeDefs.map((slot, i) => {
          const record = uniqueCompleted[i];
          const course = record ? allCourses.find(c => c.id === record.courseId) : null;
          return {
              ...slot,
              isEarned: !!record,
              courseTitle: course?.title,
              date: record ? new Date(record.timestamp).toLocaleDateString() : null
          };
      });
  }, [userHistory, allCourses, badgeDefs]);

  const handleArchive = async (e: React.MouseEvent, courseId: string) => {
    e.stopPropagation();
    await toggleArchive(user.username, courseId);
    setRefreshSeed(s => s + 1);
  };

  const handleSaveProfile = async () => {
      setIsSaving(true);
      try {
          const updatedUser = await updateUser(user.username, {
              ...editForm,
              badgeDefinitions: badgeDefs
          });
          setUser(updatedUser);
          setIsEditing(false);
      } catch (e) {
          console.error("Failed to update profile", e);
          alert("Could not update profile. The archives are temporarily locked.");
      } finally {
          setIsSaving(false);
      }
  };

  const handleBadgeEdit = (index: number, field: keyof BadgeDef, value: string) => {
      const newDefs = [...badgeDefs];
      newDefs[index] = { ...newDefs[index], [field]: value };
      setBadgeDefs(newDefs);
  };

  const handleNetworkAction = async (targetUser: string) => {
      if (networkTab === 'following') {
          // Unfollow
          await toggleFollowUser(user.username, targetUser);
      } else {
          // Remove Follower
          await removeFollower(user.username, targetUser);
      }
      setRefreshSeed(s => s + 1);
      // Refresh list immediately
      const list = networkTab === 'following' 
        ? await getFollowing(user.username) 
        : await getFollowers(user.username);
      setNetworkList(list);
  };

  const handleQuickFollow = async () => {
      if(!newFollowInput) return;
      await toggleFollowUser(user.username, newFollowInput);
      setNewFollowInput('');
      setRefreshSeed(s => s + 1);
      const list = await getFollowing(user.username);
      setNetworkList(list);
  };

  // Customization Handlers
  const handleOpenCustomize = (e: React.MouseEvent, course: Course) => {
      e.stopPropagation();
      setCustomizingCourse(course);
      setCustomizationPrompt('');
  };

  const submitCustomization = async () => {
      if (!customizingCourse || !customizationPrompt) return;
      setIsProcessingCustomization(true);
      try {
          const newContent = await personalizeFlashcards(customizingCourse.content, customizationPrompt);
          if (newContent) {
              const updatedCourse: Course = {
                  ...customizingCourse,
                  content: newContent,
                  description: `${customizingCourse.description} (Rewritten for: ${customizationPrompt})`,
              };
              await saveCourse(updatedCourse);
              setAllCourses(prev => prev.map(c => c.id === updatedCourse.id ? updatedCourse : c));
              setCustomizingCourse(null);
          }
      } catch (e) {
          console.error(e);
          alert("The transmutation failed. Please try a different prompt.");
      } finally {
          setIsProcessingCustomization(false);
      }
  };

  const launchModule = (module: typeof ENGINEERING_FOLDER[0], index: number) => {
      const course: Course = {
          id: `lumi-sys-eng-mod${index+1}`,
          title: module.title,
          subject: 'Engineering',
          description: module.description,
          type: 'flashcard',
          level: 'Undergraduate',
          content: module.cards,
          author: 'LUMI AI',
          cardStyle: 'anki-minimal',
          duration: '45 Min',
          speed: 'Intensive'
      };
      onSelectCourse(course);
  };

  if (loading && allCourses.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-da-bg">
        <div className="text-da-gold animate-pulse font-display tracking-widest uppercase">Consulting Archives...</div>
      </div>
    );
  }

  return (
    <div className="w-full h-full overflow-y-auto bg-da-bg text-da-text pb-24 md:pb-8 relative">
        
        {/* Theme Toggle (Top Left) */}
        <button 
           onClick={onToggleTheme}
           className="absolute top-4 left-4 z-20 w-8 h-8 flex items-center justify-center rounded-full bg-da-paper border border-da-gold/20 text-da-gold hover:bg-da-gold hover:text-da-bg transition-all shadow-md md:hidden"
           title="Toggle Theme"
        >
            <i className={`fas ${isDarkMode ? 'fa-moon' : 'fa-sun'}`}></i>
        </button>

        {/* Dynamic Background Container */}
        <div className="relative">
             {/* Background Image / Overlay */}
             <div className="absolute inset-0 z-0 overflow-hidden">
                 {user.profileBackground ? (
                    <img src={user.profileBackground} alt="Background" className="w-full h-full object-cover opacity-20 blur-sm" />
                 ) : (
                    <div className="w-full h-full bg-gradient-to-b from-da-gold/5 to-da-bg"></div>
                 )}
                 <div className="absolute inset-0 bg-gradient-to-t from-da-bg via-da-bg/80 to-transparent"></div>
             </div>

             {/* Profile Header Content */}
             <div className="relative z-10 px-4 md:px-8 pt-8 md:pt-12 pb-8">
                <div className="flex flex-col md:flex-row items-center md:items-start gap-6 md:gap-8">
                    <div className="relative group">
                        <div className="w-24 h-24 md:w-40 md:h-40 rounded-full p-1 bg-gradient-to-tr from-da-gold to-da-accent">
                            <img 
                            src={isEditing ? editForm.avatarUrl : user.avatarUrl} 
                            alt="Avatar" 
                            className="w-full h-full rounded-full object-cover border-4 border-da-bg shadow-2xl bg-da-paper" 
                            onError={(e) => (e.currentTarget.src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`)}
                            />
                        </div>
                        {isEditing && (
                            <div className="absolute -bottom-2 -right-2 bg-da-bg border border-da-gold p-2 rounded shadow-lg w-full max-w-[200px] z-10">
                                <label className="text-[8px] uppercase tracking-widest text-da-gold mb-1 block">Image URL</label>
                                <input 
                                    value={editForm.avatarUrl}
                                    onChange={(e) => setEditForm({...editForm, avatarUrl: e.target.value})}
                                    className="w-full bg-da-paper/50 text-[10px] p-1 border border-da-accent/30 text-da-text rounded-sm focus:border-da-gold outline-none"
                                    placeholder="https://..."
                                />
                            </div>
                        )}
                    </div>

                    <div className="flex-1 flex flex-col items-center md:items-start text-center md:text-left w-full">
                        <div className="flex flex-wrap justify-center md:justify-start items-center gap-3 md:gap-4 mb-4 w-full">
                            <h2 className="text-2xl md:text-4xl font-display font-bold text-da-gold drop-shadow-md">{user.username}</h2>
                            
                            <div className="flex items-center gap-2">
                                <span className="px-3 py-1 md:px-4 md:py-1.5 bg-da-paper/30 border border-da-gold/30 rounded-sm text-[10px] md:text-xs font-display uppercase tracking-widest backdrop-blur-sm">
                                    Academic Profile
                                </span>
                                
                                {!isEditing ? (
                                    <button 
                                        onClick={() => setIsEditing(true)}
                                        className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-da-gold/10 text-da-text/50 hover:text-da-gold transition-colors"
                                        title="Edit Profile"
                                    >
                                        <i className="fas fa-pencil-alt text-xs"></i>
                                    </button>
                                ) : (
                                    <div className="flex gap-2">
                                        <button 
                                            onClick={handleSaveProfile}
                                            disabled={isSaving}
                                            className="px-3 py-1 bg-da-gold text-black text-[10px] uppercase tracking-wider font-bold rounded-sm hover:bg-white transition-colors flex items-center gap-2"
                                        >
                                            {isSaving ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-save"></i>} Save
                                        </button>
                                        <button 
                                            onClick={() => { setIsEditing(false); setEditForm({ email: user.email, bio: user.bio, avatarUrl: user.avatarUrl, profileBackground: user.profileBackground || '' }); setBadgeDefs(user.badgeDefinitions || DEFAULT_BADGE_SLOTS); }}
                                            className="px-3 py-1 border border-da-red/50 text-da-red text-[10px] uppercase tracking-wider rounded-sm hover:bg-da-red hover:text-white transition-colors"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex gap-6 md:gap-8 mb-6 font-sans text-xs md:text-sm tracking-widest uppercase opacity-80 text-da-text/80">
                            <span><strong className="text-da-gold">{libraryCourses.length}</strong> ACTIVE</span>
                            <span><strong className="text-da-gold">{user.followers}</strong> FOLLOWERS</span>
                            <span><strong className="text-da-gold">{user.following}</strong> FOLLOWING</span>
                        </div>
                        
                        {/* Manage Network Button (Visible in Edit Mode) */}
                        {isEditing && (
                             <button 
                                 onClick={() => setShowNetworkModal(true)}
                                 className="mb-6 px-4 py-2 border border-da-accent/30 hover:border-da-gold text-da-text hover:text-da-gold text-[10px] uppercase tracking-widest transition-colors flex items-center gap-2"
                             >
                                 <i className="fas fa-users-cog"></i> Manage Connections
                             </button>
                        )}

                        <div className="w-full max-w-xl">
                            {isEditing ? (
                                <div className="space-y-4 bg-da-paper/90 backdrop-blur p-4 rounded border border-da-gold/10 shadow-xl">
                                    <div className="space-y-1">
                                        <label className="text-[9px] uppercase tracking-widest text-da-gold/70">Bio / Thesis</label>
                                        <textarea 
                                            value={editForm.bio}
                                            onChange={(e) => setEditForm({...editForm, bio: e.target.value})}
                                            className="w-full bg-da-bg border border-da-accent/20 p-2 text-sm text-da-text focus:border-da-gold outline-none rounded-sm min-h-[80px] font-serif"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[9px] uppercase tracking-widest text-da-gold/70">Communication (Email)</label>
                                        <input 
                                            value={editForm.email}
                                            onChange={(e) => setEditForm({...editForm, email: e.target.value})}
                                            className="w-full bg-da-bg border border-da-accent/20 p-2 text-sm text-da-text focus:border-da-gold outline-none rounded-sm"
                                        />
                                    </div>
                                    <div className="space-y-1 border-t border-da-accent/10 pt-2 mt-2">
                                        <label className="text-[9px] uppercase tracking-widest text-da-gold/70 flex items-center gap-2">
                                            <i className="fas fa-image"></i> Profile Background (URL)
                                        </label>
                                        <input 
                                            value={editForm.profileBackground}
                                            onChange={(e) => setEditForm({...editForm, profileBackground: e.target.value})}
                                            placeholder="https://..."
                                            className="w-full bg-da-bg border border-da-accent/20 p-2 text-sm text-da-text focus:border-da-gold outline-none rounded-sm font-mono text-xs"
                                        />
                                    </div>
                                </div>
                            ) : (
                                <div className="max-w-lg">
                                    <p className="text-sm italic font-serif opacity-90 leading-relaxed mb-2 text-shadow-sm">"{user.bio}"</p>
                                    <p className="text-[10px] text-da-accent/70 uppercase tracking-widest"><i className="fas fa-envelope mr-2"></i> {user.email}</p>
                                </div>
                            )}
                        </div>

                        {/* ACADEMIC HONORS / BADGES DISPLAY */}
                        {!isEditing ? (
                            <div className="mt-8 pt-6 border-t border-da-gold/20 w-full max-w-2xl">
                                <h4 className="text-[10px] uppercase tracking-[0.2em] text-da-gold mb-4 opacity-80">Academic Honors</h4>
                                <div className="flex gap-6 justify-center md:justify-start">
                                    {earnedBadges.map((badge, i) => (
                                        <div key={i} className="group relative flex flex-col items-center">
                                            <div className={`w-12 h-12 md:w-16 md:h-16 rounded-full flex items-center justify-center border-2 transition-all duration-500
                                                ${badge.isEarned 
                                                    ? 'bg-da-gold/10 border-da-gold text-da-gold shadow-[0_0_15px_rgba(207,170,110,0.2)]' 
                                                    : 'bg-da-bg/50 border-da-text/20 text-da-text/20 border-dashed'
                                                }
                                            `}>
                                                <i className={`fas ${badge.icon} text-lg md:text-2xl`}></i>
                                            </div>
                                            <div className={`mt-2 text-[8px] uppercase tracking-widest font-bold ${badge.isEarned ? 'text-da-gold' : 'text-da-text/30'}`}>
                                                {badge.label}
                                            </div>
                                            <div className="absolute top-full mt-2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/90 text-da-gold text-[10px] px-2 py-1 rounded whitespace-nowrap border border-da-gold/20 z-20 pointer-events-none min-w-[100px] text-center">
                                                {badge.isEarned ? (
                                                    <>
                                                        <div className="font-bold uppercase tracking-wider">{badge.courseTitle || 'Mastery Unlocked'}</div>
                                                        <div className="text-da-text/60 italic">Earned: {badge.date}</div>
                                                    </>
                                                ) : (
                                                    <div className="text-da-text/50 italic">{badge.desc}</div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            // BADGE EDITING INTERFACE
                            <div className="mt-8 pt-6 border-t border-da-gold/20 w-full max-w-2xl">
                                <h4 className="text-[10px] uppercase tracking-[0.2em] text-da-gold mb-4 opacity-80">Customize Honors</h4>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    {badgeDefs.map((badge, i) => (
                                        <div key={i} className="bg-da-paper/50 p-3 rounded border border-da-gold/10 relative">
                                            <div className="absolute top-2 right-2 text-da-gold/30 text-[9px] font-bold">SLOT {i+1}</div>
                                            
                                            <div className="mb-2">
                                                <label className="text-[8px] uppercase tracking-widest text-da-gold/60">Title</label>
                                                <input 
                                                    value={badge.label}
                                                    onChange={(e) => handleBadgeEdit(i, 'label', e.target.value)}
                                                    className="w-full bg-da-bg border border-da-accent/10 p-1 text-xs text-da-text focus:border-da-gold outline-none"
                                                />
                                            </div>
                                            <div className="mb-2">
                                                <label className="text-[8px] uppercase tracking-widest text-da-gold/60">Description</label>
                                                <input 
                                                    value={badge.desc}
                                                    onChange={(e) => handleBadgeEdit(i, 'desc', e.target.value)}
                                                    className="w-full bg-da-bg border border-da-accent/10 p-1 text-[10px] text-da-text focus:border-da-gold outline-none"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[8px] uppercase tracking-widest text-da-gold/60">Icon (FontAwesome)</label>
                                                <div className="flex gap-2 items-center">
                                                    <div className="w-6 h-6 flex items-center justify-center bg-da-bg border border-da-gold/20 rounded-full">
                                                        <i className={`fas ${badge.icon} text-da-gold text-xs`}></i>
                                                    </div>
                                                    <select 
                                                        value={badge.icon} 
                                                        onChange={(e) => handleBadgeEdit(i, 'icon', e.target.value)}
                                                        className="flex-1 bg-da-bg border border-da-accent/10 p-1 text-[10px] text-da-text focus:border-da-gold outline-none"
                                                    >
                                                        <option value="fa-scroll">Scroll</option>
                                                        <option value="fa-atom">Atom</option>
                                                        <option value="fa-globe-europe">Globe</option>
                                                        <option value="fa-feather">Feather</option>
                                                        <option value="fa-crown">Crown</option>
                                                        <option value="fa-dragon">Dragon</option>
                                                        <option value="fa-chess-king">King</option>
                                                        <option value="fa-book-open">Book</option>
                                                    </select>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
             </div>
        </div>

        {/* Content Tabs */}
        <div className="flex justify-center border-t border-da-accent/10 mb-6 sticky top-0 bg-da-bg/95 backdrop-blur-md z-20 shadow-lg">
            {[
              { id: 'library', label: 'Library', icon: 'fa-book' },
              { id: 'history', label: 'History', icon: 'fa-history' },
              { id: 'archive', label: 'Vault', icon: 'fa-box-archive' }
            ].map(tab => (
              <button 
                key={tab.id}
                onClick={() => { setActiveTab(tab.id as Tab); setSearchQuery(''); }}
                className={`flex items-center gap-2 px-6 py-4 border-t-2 transition-all uppercase text-[9px] md:text-[11px] tracking-[0.2em]
                  ${activeTab === tab.id ? 'border-da-gold text-da-gold' : 'border-transparent text-da-text/40 hover:text-da-text'}
                `}
              >
                <i className={`fas ${tab.icon}`}></i> {tab.label}
              </button>
            ))}
        </div>

        {/* SEARCH BAR */}
        <div className="max-w-md mx-auto mb-8 relative group px-2">
            <input 
               type="text" 
               placeholder={`Search ${activeTab}...`}
               value={searchQuery}
               onChange={(e) => setSearchQuery(e.target.value)}
               className="w-full bg-da-bg border border-da-gold/20 rounded-full py-2.5 pl-10 pr-4 text-da-text placeholder-da-text/30 focus:border-da-gold focus:ring-1 focus:ring-da-gold/20 outline-none text-sm font-serif shadow-inner transition-all"
            />
            <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-da-gold/40 group-focus-within:text-da-gold transition-colors text-xs"></i>
        </div>

        {/* Dynamic Content Views */}
        <div className="px-4 md:px-8">
            {activeTab === 'library' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                
                {/* NEW CALCULUS TOME ENTRY POINT */}
                {onOpenCalculus && (
                    <div 
                        onClick={onOpenCalculus}
                        className="aspect-square bg-da-paper relative group overflow-hidden border border-da-gold/20 hover:border-da-gold transition-all cursor-pointer shadow-2xl flex flex-col items-center justify-center text-center p-6"
                    >
                         <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5"></div>
                         <i className="fas fa-square-root-alt text-4xl text-da-gold mb-4 group-hover:scale-110 transition-transform"></i>
                         <h4 className="font-display text-xl text-da-gold leading-tight mb-2">The Calculus Tome</h4>
                         <p className="text-xs font-serif italic opacity-60">Interactive Visualizations of the Infinite.</p>
                         <div className="mt-4 px-4 py-1 border border-da-gold/30 text-[9px] uppercase tracking-widest text-da-gold group-hover:bg-da-gold group-hover:text-black transition-colors">
                             Open Tome
                         </div>
                    </div>
                )}

                {libraryCourses.length === 0 ? (
                    <div className="col-span-full text-center py-12 opacity-40 font-serif italic">
                        {searchQuery ? `No manuscripts found for "${searchQuery}".` : "The library shelves are waiting to be filled."}
                    </div>
                ) : libraryCourses.map(course => (
                    <div 
                        key={course.id} 
                        onClick={() => onSelectCourse(course)}
                        className="aspect-square bg-da-paper relative group overflow-hidden border border-da-gold/10 hover:border-da-gold/40 transition-all cursor-pointer shadow-lg"
                    >
                        {/* CUSTOMIZE OPTION (Top Left Corner) */}
                        <div className="absolute top-0 left-0 p-4 z-20">
                             <button 
                                 onClick={(e) => handleOpenCustomize(e, course)}
                                 className="opacity-0 group-hover:opacity-100 transition-all text-da-gold hover:text-white hover:scale-110 bg-black/50 rounded-full w-8 h-8 flex items-center justify-center backdrop-blur-sm border border-da-gold/30"
                                 title="Customize Content"
                             >
                                 <i className="fas fa-magic text-xs"></i>
                             </button>
                        </div>

                        <div className="absolute inset-0 p-6 flex flex-col justify-between">
                            <div>
                                <div className="flex justify-between items-start mb-2 pl-8"> {/* Added pl-8 to avoid overlap with customize button if visible */}
                                    <span className="text-[8px] uppercase tracking-widest text-da-accent font-bold">{course.subject}</span>
                                    <button 
                                        onClick={(e) => handleArchive(e, course.id)}
                                        className="opacity-0 group-hover:opacity-100 transition-opacity p-2 hover:text-da-gold"
                                        title="Move to Archive"
                                    >
                                        <i className="fas fa-archive text-xs"></i>
                                    </button>
                                </div>
                                <h4 className="font-display text-lg md:text-xl text-da-gold leading-tight mb-2">{course.title}</h4>
                                <p className="text-xs font-serif italic opacity-60 line-clamp-3">{course.description}</p>
                            </div>
                            <div className="flex justify-between items-end">
                                <span className="text-[9px] uppercase tracking-wider bg-da-bg/50 px-2 py-1 border border-da-accent/20">{course.level}</span>
                                <div className="flex gap-3 text-da-gold/40 text-sm">
                                    <i className={course.type === 'video' ? "fas fa-video" : "fas fa-clone"}></i>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
            )}

            {activeTab === 'archive' && (
            <div className="space-y-8">
                {/* Unit 1 Folder Section */}
                <div className="border border-da-gold/20 rounded bg-da-paper/10 overflow-hidden">
                    <div 
                        className="p-4 flex items-center justify-between cursor-pointer hover:bg-da-gold/5 transition-colors"
                        onClick={() => setExpandedFolder(expandedFolder === 'unit1' ? null : 'unit1')}
                    >
                            <div className="flex items-center gap-4">
                                <i className={`fas fa-folder${expandedFolder === 'unit1' ? '-open' : ''} text-xl text-da-gold`}></i>
                                <div>
                                    <h4 className="font-display text-lg text-da-text">Unit 1: Partial Derivatives</h4>
                                    <p className="text-[10px] uppercase tracking-wider opacity-50">4 Modules • Engineering Calculus</p>
                                </div>
                            </div>
                            <i className={`fas fa-chevron-down transition-transform ${expandedFolder === 'unit1' ? 'rotate-180' : ''} text-da-gold/50`}></i>
                    </div>

                    {/* Folder Content */}
                    {expandedFolder === 'unit1' && (
                        <div className="bg-black/20 p-4 grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-da-gold/10">
                            {ENGINEERING_FOLDER
                                .filter(m => filterBySearch(m.title, m.description))
                                .map((mod, i) => (
                                <div 
                                    key={i} 
                                    onClick={() => launchModule(mod, i)}
                                    className="bg-da-paper p-4 rounded border border-da-accent/10 hover:border-da-gold/50 cursor-pointer transition-all flex items-center gap-4 group"
                                >
                                    <div className="w-8 h-8 rounded-full bg-da-bg border border-da-gold/20 flex items-center justify-center text-da-gold font-display text-sm group-hover:bg-da-gold group-hover:text-black transition-colors">
                                        {i+1}
                                    </div>
                                    <div>
                                        <h5 className="text-sm font-medium text-da-text">{mod.title}</h5>
                                        <p className="text-[10px] opacity-40 italic">{mod.description.substring(0, 40)}...</p>
                                    </div>
                                </div>
                            ))}
                            {ENGINEERING_FOLDER.filter(m => filterBySearch(m.title, m.description)).length === 0 && (
                                <p className="col-span-full text-center text-[10px] opacity-40 italic py-2">No matching modules in this unit.</p>
                            )}
                        </div>
                    )}
                </div>

                {/* Archived Courses Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 opacity-80">
                    {archivedCourses.length === 0 && !expandedFolder ? (
                        <div className="col-span-full py-20 text-center opacity-30 italic font-serif">
                        {searchQuery ? `No archived scrolls found for "${searchQuery}".` : "The vault is currently empty. Stow away finished scrolls here."}
                        </div>
                    ) : archivedCourses.map(course => (
                        <div 
                        key={course.id} 
                        className="aspect-square bg-da-bg border border-da-text/10 p-6 flex flex-col justify-between relative grayscale hover:grayscale-0 transition-all cursor-pointer"
                        onClick={() => onSelectCourse(course)}
                        >
                            <div className="absolute top-0 right-0 p-4">
                                <button onClick={(e) => handleArchive(e, course.id)} className="text-da-gold hover:scale-110 transition">
                                    <i className="fas fa-folder-open"></i>
                                </button>
                            </div>
                            <div>
                                <h4 className="text-da-text/70 font-display text-lg mb-2">{course.title}</h4>
                                <div className="h-px w-8 bg-da-text/20 mb-2"></div>
                                <p className="text-[10px] opacity-40 uppercase tracking-widest">Archived Insight</p>
                            </div>
                            <i className="fas fa-box-open text-3xl opacity-10 absolute bottom-6 right-6"></i>
                        </div>
                    ))}
                </div>
            </div>
            )}

            {activeTab === 'history' && (
            <div className="max-w-2xl mx-auto space-y-12 py-4 relative">
                <div className="absolute left-[15px] md:left-[27px] top-8 bottom-8 w-px bg-da-gold/10"></div>
                {historyDisplay.length === 0 ? (
                <div className="text-center py-20 opacity-30 italic font-serif">
                    {searchQuery ? `No history records match "${searchQuery}".` : "No recent activity logged in the archives."}
                </div>
                ) : historyDisplay.map((h, i) => (
                <div key={i} className="flex gap-6 relative group">
                    <div className="w-8 h-8 md:w-14 md:h-14 rounded-full bg-da-bg border border-da-gold/30 flex items-center justify-center text-da-gold z-10 group-hover:bg-da-gold group-hover:text-black transition-colors">
                        <i className={`fas ${h.action === 'viewed' ? 'fa-eye' : 'fa-check-circle'} text-xs md:text-base`}></i>
                    </div>
                    <div 
                        className="flex-1 bg-da-paper/30 p-4 md:p-6 border border-da-gold/5 hover:border-da-gold/20 transition-all cursor-pointer rounded-sm"
                        onClick={() => h.course && onSelectCourse(h.course)}
                    >
                        <div className="flex justify-between items-start mb-2">
                            <span className="text-[9px] uppercase tracking-tighter text-da-gold/60">{new Date(h.timestamp).toLocaleDateString()} @ {new Date(h.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                            <span className="text-[8px] uppercase tracking-widest px-2 py-0.5 border border-da-accent/30 text-da-accent">{h.action}</span>
                        </div>
                        <h5 className="font-display text-base md:text-lg text-da-text/90">{h.course?.title}</h5>
                        <p className="text-[10px] md:text-xs opacity-50 mt-1">{h.course?.subject} • {h.course?.level}</p>
                    </div>
                </div>
                ))}
            </div>
            )}
        </div>

        {/* CUSTOMIZATION MODAL */}
        {customizingCourse && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-[fadeIn_0.3s]">
                <div className="bg-da-paper border border-da-gold/30 p-6 md:p-8 rounded max-w-md w-full shadow-2xl relative">
                    <h3 className="font-display text-2xl text-da-gold mb-2">Transmute Course</h3>
                    <p className="font-serif italic text-da-text/60 text-sm mb-6">
                        Rewrite "{customizingCourse.title}" through the lens of another subject.
                    </p>
                    
                    <label className="text-[10px] uppercase tracking-widest text-da-gold opacity-80 mb-2 block">New Perspective / Analogy</label>
                    <input 
                        value={customizationPrompt}
                        onChange={(e) => setCustomizationPrompt(e.target.value)}
                        placeholder="e.g. Harry Potter, Cyberpunk, Cooking..."
                        className="w-full bg-da-bg border border-da-accent/20 p-3 text-da-text focus:border-da-gold outline-none rounded-sm mb-6"
                        autoFocus
                    />
                    
                    <div className="flex gap-4">
                        <button 
                            onClick={() => setCustomizingCourse(null)}
                            disabled={isProcessingCustomization}
                            className="flex-1 py-3 border border-da-red/30 text-da-red hover:bg-da-red/10 uppercase text-xs tracking-widest rounded-sm transition-colors"
                        >
                            Cancel
                        </button>
                        <button 
                            onClick={submitCustomization}
                            disabled={isProcessingCustomization || !customizationPrompt}
                            className="flex-1 py-3 bg-da-gold text-black hover:bg-white uppercase text-xs tracking-widest font-bold rounded-sm transition-colors flex items-center justify-center gap-2"
                        >
                            {isProcessingCustomization ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-wand-magic-sparkles"></i>}
                            Transmute
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* MANAGE NETWORK MODAL */}
        {showNetworkModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-[fadeIn_0.3s]">
                <div className="bg-da-paper border border-da-gold/30 p-6 rounded max-w-lg w-full shadow-2xl relative flex flex-col max-h-[80vh]">
                    <button onClick={() => setShowNetworkModal(false)} className="absolute top-4 right-4 text-da-text/50 hover:text-da-gold"><i className="fas fa-times"></i></button>
                    
                    <h3 className="font-display text-xl text-da-gold mb-6">Manage Connections</h3>
                    
                    {/* Tabs */}
                    <div className="flex border-b border-da-accent/10 mb-4">
                        <button 
                            onClick={() => setNetworkTab('following')}
                            className={`flex-1 py-2 text-xs uppercase tracking-widest transition-colors ${networkTab === 'following' ? 'text-da-gold border-b-2 border-da-gold' : 'text-da-text/40 hover:text-da-text'}`}
                        >
                            Following
                        </button>
                        <button 
                            onClick={() => setNetworkTab('followers')}
                            className={`flex-1 py-2 text-xs uppercase tracking-widest transition-colors ${networkTab === 'followers' ? 'text-da-gold border-b-2 border-da-gold' : 'text-da-text/40 hover:text-da-text'}`}
                        >
                            Followers
                        </button>
                    </div>

                    {/* Quick Add (Only for Following) */}
                    {networkTab === 'following' && (
                        <div className="flex gap-2 mb-4">
                             <input 
                                value={newFollowInput}
                                onChange={(e) => setNewFollowInput(e.target.value)}
                                className="flex-1 bg-da-bg/50 border border-da-accent/20 p-2 text-xs text-da-text focus:border-da-gold outline-none rounded-sm"
                                placeholder="Add scholar by username..."
                             />
                             <button onClick={handleQuickFollow} className="px-3 bg-da-gold/10 text-da-gold border border-da-gold/20 hover:bg-da-gold hover:text-black transition-colors text-xs uppercase tracking-wider rounded-sm">
                                 Add
                             </button>
                        </div>
                    )}

                    {/* List */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-2">
                        {networkList.length === 0 ? (
                            <div className="text-center py-8 text-da-text/30 italic text-xs">
                                {networkTab === 'following' ? "You are not following anyone." : "You have no followers yet."}
                            </div>
                        ) : networkList.map(u => (
                            <div key={u.username} className="flex items-center justify-between bg-da-bg/30 p-3 rounded border border-da-accent/5">
                                <div className="flex items-center gap-3">
                                    <img src={u.avatarUrl} className="w-8 h-8 rounded-full border border-da-gold/20" />
                                    <div>
                                        <div className="text-xs font-bold text-da-text">{u.username}</div>
                                        <div className="text-[9px] text-da-text/50">{u.followers} followers</div>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => handleNetworkAction(u.username)}
                                    className="text-[9px] uppercase tracking-widest text-da-red/60 hover:text-da-red border border-da-red/20 hover:border-da-red/60 px-2 py-1 rounded-sm transition-colors"
                                >
                                    {networkTab === 'following' ? 'Unfollow' : 'Remove'}
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};

export default ProfilePage;
