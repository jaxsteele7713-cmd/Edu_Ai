
import { User, Course, HistoryRecord, Comment } from '../types';

/**
 * LUMI HYBRID BACKEND SERVICE
 * Supports both LocalStorage (Mock) and Remote (Python FastAPI) backends.
 */

const USE_PYTHON_BACKEND = true; 
const API_BASE = "http://localhost:8000";

const STORAGE_KEYS = {
  USERS: 'lumi_db_users',
  COURSES: 'lumi_db_courses',
  HISTORY: 'lumi_db_history',
  ARCHIVES: 'lumi_db_archives',
  SESSIONS: 'lumi_db_sessions',
  FOLLOWS: 'lumi_db_follows' // New key for social graph
};

// --- Local Utils (Fallback) ---
const generateSalt = () => {
  const array = new Uint8Array(16);
  window.crypto.getRandomValues(array);
  return btoa(String.fromCharCode(...array));
};

const hashPassword = async (password: string, salt: string): Promise<string> => {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + salt + 'LUMI_PEPPER_2025');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

const db = {
  get: <T>(key: string): T | null => {
    const data = localStorage.getItem(key);
    try { return data ? JSON.parse(data) : null; } catch { return null; }
  },
  save: <T>(key: string, data: T): void => {
    localStorage.setItem(key, JSON.stringify(data));
  }
};

interface UserRecord {
  user: User;
  passwordHash: string;
  salt: string;
}

// --- SHARED DATA: ENGINEERING FOLDER ---
export const ENGINEERING_FOLDER = [
  {
    title: "Module 1: Partial Derivatives",
    description: "Definitions, physical meaning, notation, and engineering interpretation.",
    cards: [
      { front: "Define partial derivative.", back: "A partial derivative is the derivative of a multivariable function with respect to one variable while keeping all other variables constant." },
      { front: "Physical meaning of partial derivative.", back: "It represents the sensitivity of a system output to a single input parameter, assuming all other parameters remain unchanged." },
      { front: "Notation of partial derivatives.", back: "Common notations include ∂f/∂x, f_x, or D_x f." },
      { front: "Compute ∂/∂x (x²y + 3y²).", back: "Treat y as constant: ∂/∂x (x²y) = 2xy, ∂/∂x (3y²) = 0. Final answer: 2xy." },
      { front: "Engineering interpretation.", back: "Used in heat transfer, fluid mechanics, economics, and circuit analysis to isolate individual variable effects." }
    ]
  },
  {
    title: "Module 2: Chain Rule (Multivariable)",
    description: "Modeling systems where variables depend indirectly on other parameters.",
    cards: [
      { front: "State the multivariable chain rule.", back: "If z = f(x,y), where x = g(t) and y = h(t), then dz/dt = (∂z/∂x)(dx/dt) + (∂z/∂y)(dy/dt)." },
      { front: "Why is chain rule important?", back: "It models systems where variables depend indirectly on other parameters such as time or space." },
      { front: "Engineering relevance.", back: "Extensively used in control systems, robotics, thermodynamics, and machine learning backpropagation." }
    ]
  },
  {
    title: "Module 3: Extreme Values and Saddle Points",
    description: "Analysis of critical points and equilibrium in physical systems.",
    cards: [
      { front: "Define critical point.", back: "A point where all first-order partial derivatives of a function vanish." },
      { front: "Define saddle point.", back: "A point where the function has neither a maximum nor minimum but changes curvature direction." },
      { front: "Importance of saddle points.", back: "They represent unstable equilibrium points in physical and optimization systems." }
    ]
  },
  {
    title: "Module 4: Taylor’s Series",
    description: "Quadratic and Cubic Approximations for complex functions.",
    cards: [
      { front: "Purpose of Taylor series.", back: "To approximate complex functions locally using polynomials." },
      { front: "Quadratic Taylor approximation significance.", back: "Captures curvature and is crucial in optimization and stability analysis." },
      { front: "Cubic approximation advantage.", back: "Improves accuracy by capturing asymmetric behavior." }
    ]
  }
];

// --- SYSTEM DEFAULT COURSES ---
// Updated with social fields
const SYSTEM_COURSES: Course[] = [
    ...ENGINEERING_FOLDER.map((mod, i) => ({
        id: `lumi-sys-eng-mod${i+1}`,
        title: mod.title,
        subject: 'Engineering',
        description: mod.description,
        type: 'flashcard' as const,
        level: 'Undergraduate',
        duration: '45 Min',
        speed: 'Intensive',
        author: 'LUMI AI',
        cardStyle: 'anki-minimal' as const,
        content: mod.cards,
        isPublic: true,
        likes: ['scholar', 'curator'],
        comments: []
    })),
    {
      id: 'lumi-sys-calc-001',
      title: 'Calculus: Partial Differentiation',
      subject: 'Mathematics',
      description: 'A comprehensive, animated guide to multivariable calculus. Master the art of gradients, chain rules, and optimization in n-dimensional space through functional flashcards.',
      type: 'flashcard',
      level: 'Undergraduate',
      duration: '5 Hours',
      speed: 'Intensive',
      author: 'LUMI AI',
      roadmap: ['Functions of Several Variables', 'Partial Derivatives', 'Tangent Planes', 'The Chain Rule', 'Directional Derivatives', 'Gradient Vectors', 'Max/Min Problems', 'Lagrange Multipliers'],
      content: [
         { front: "Definition: ∂f/∂x", back: "The rate of change of f(x,y) with respect to x, while holding y constant. Geometrically, the slope of the trace curve on the plane y = constant." },
         { front: "The Gradient (∇f)", back: "A vector pointing in the direction of steepest ascent. ∇f = < f_x, f_y >. It is orthogonal to level curves." },
         { front: "Clairaut's Theorem", back: "Symmetry of second derivatives: If f_xy and f_yx are continuous, then f_xy = f_yx." },
         { front: "Total Differential (dz)", back: "dz = (∂f/∂x)dx + (∂f/∂y)dy. Approximates the change in z for small changes in x and y." },
         { front: "Chain Rule (Case 1)", back: "If z = f(x,y), x=g(t), y=h(t), then dz/dt = (∂f/∂x)(dx/dt) + (∂f/∂y)(dy/dt)." },
         { front: "Directional Derivative (D_u f)", back: "Rate of change in direction of unit vector u. D_u f = ∇f • u." },
         { front: "Tangent Plane Equation", back: "z - z0 = f_x(x0,y0)(x-x0) + f_y(x0,y0)(y-y0). The linear approximation of the surface." },
         { front: "Critical Point", back: "A point (a,b) where ∇f(a,b) = 0 or does not exist. Candidates for local extrema." },
         { front: "Second Derivative Test", back: "Let D = f_xx * f_yy - (f_xy)^2. If D>0 and f_xx>0 -> Min. If D>0 and f_xx<0 -> Max. If D<0 -> Saddle Point." },
         { front: "Lagrange Multipliers", back: "To maximize f(x,y) subject to g(x,y)=k, solve system: ∇f = λ∇g and g(x,y)=k." }
      ],
      isPublic: true,
      likes: ['scholar', 'novice'],
      comments: [
        { id: 'c1', author: 'scholar', text: 'The section on Gradients is particularly illuminating.', timestamp: Date.now() - 1000000 }
      ]
    },
    {
      id: 'lumi-sys-quant-002',
      title: 'Quantum Physics: Wave Mechanics',
      subject: 'Physics',
      description: 'A multimedia journey into the quantum realm. Features video visualizations, audio lecture notes, and deep theoretical texts.',
      type: 'mixed',
      level: 'Undergraduate',
      duration: '8 Hours',
      speed: 'Standard',
      author: 'LUMI AI',
      videoIntroUrl: 'https://storage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4', 
      roadmap: ["Video: The Ultraviolet Catastrophe", "Audio Ref: Heisenberg Uncertainty", "Text: The Schrödinger Equation", "Simulation: Double Slit Experiment"],
      content: [], 
      isPublic: true,
      likes: ['curator'],
      comments: []
    }
];

// Helper to seed default users if none exist
const initDefaultUsers = async (): Promise<Record<string, UserRecord>> => {
  const users: Record<string, UserRecord> = {};
  const defaults = [
    { u: 'scholar', p: 'password123', email: 'scholar@lumi.ai', bio: 'A dedicated researcher of the arcane arts.', bg: 'https://images.unsplash.com/photo-1507842217159-a289200b4f40?q=80&w=2000&auto=format&fit=crop' },
    { u: 'curator', p: 'museum2025', email: 'curator@lumi.ai', bio: 'Keeper of the ancient texts.' },
    { u: 'novice', p: 'learn', email: 'novice@lumi.ai', bio: 'Just beginning the journey.' }
  ];

  for (const d of defaults) {
    const salt = generateSalt();
    const passwordHash = await hashPassword(d.p, salt);
    users[d.u] = {
      user: {
        username: d.u,
        email: d.email,
        avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${d.u}`,
        bio: d.bio,
        badges: ['Founder'],
        streak: 10,
        followers: 42,
        following: 12,
        profileBackground: d.bg // Seed default background
      },
      passwordHash,
      salt
    };
  }
  db.save(STORAGE_KEYS.USERS, users);
  return users;
};

// --- Auth Operations (unchanged) ---
export const saveUser = async (user: User, passwordRaw: string): Promise<boolean> => {
  const users = db.get<Record<string, UserRecord>>(STORAGE_KEYS.USERS) || {};
  if (users[user.username]) throw new Error("Scholar already exists in the archives.");
  const salt = generateSalt();
  const passwordHash = await hashPassword(passwordRaw, salt);
  users[user.username] = { user, passwordHash, salt };
  db.save(STORAGE_KEYS.USERS, users);
  return true;
};

export const loginUser = async (username: string, passwordRaw: string): Promise<{ user: User, token: string } | null> => {
  await new Promise(res => setTimeout(res, 800));
  let users = db.get<Record<string, UserRecord>>(STORAGE_KEYS.USERS) || {};
  if (Object.keys(users).length === 0) users = await initDefaultUsers();

  const record = users[username];
  if (!record) return null;
  const challengeHash = await hashPassword(passwordRaw, record.salt);
  if (record.passwordHash === challengeHash) {
    const token = Math.random().toString(36).substring(2);
    const sessions = db.get<Record<string, string>>(STORAGE_KEYS.SESSIONS) || {};
    sessions[token] = username;
    db.save(STORAGE_KEYS.SESSIONS, sessions);
    sessionStorage.setItem('lumi_session_token', token);
    return { user: record.user, token };
  }
  return null;
};

export const updateUser = async (username: string, updates: Partial<User>): Promise<User> => {
    const users = db.get<Record<string, UserRecord>>(STORAGE_KEYS.USERS) || {};
    const record = users[username];
    if (!record) throw new Error("User record not found in local archives.");
    const updatedUser = { ...record.user, ...updates };
    users[username] = { ...record, user: updatedUser };
    db.save(STORAGE_KEYS.USERS, users);
    sessionStorage.setItem('lumi_session_user', JSON.stringify(updatedUser));
    return updatedUser;
};

export const logoutUser = () => {
  sessionStorage.removeItem('lumi_session_token');
  sessionStorage.removeItem('lumi_session_user');
};

export const getCurrentUser = async (): Promise<User | null> => {
  const token = sessionStorage.getItem('lumi_session_token');
  if (!token) return null;
  const sessions = db.get<Record<string, string>>(STORAGE_KEYS.SESSIONS) || {};
  const username = sessions[token];
  if (!username) return null;
  const users = db.get<Record<string, UserRecord>>(STORAGE_KEYS.USERS) || {};
  return users[username]?.user || null;
};

// --- Content Operations ---

export const getCourses = async (): Promise<Course[]> => {
  // Returns all courses (System + User Created)
  const userCourses = db.get<Course[]>(STORAGE_KEYS.COURSES) || [];
  const filteredUserCourses = userCourses.filter(c => !c.id.startsWith('lumi-sys-'));
  // Ensure system courses have social fields if legacy
  const normalizedSystem = SYSTEM_COURSES.map(c => ({
      ...c,
      likes: c.likes || [],
      comments: c.comments || [],
      isPublic: true
  }));
  return [...normalizedSystem, ...filteredUserCourses];
};

export const getPublicCourses = async (): Promise<Course[]> => {
    const all = await getCourses();
    return all.filter(c => c.isPublic);
};

export const saveCourse = async (course: Course) => {
  const courses = db.get<Course[]>(STORAGE_KEYS.COURSES) || [];
  const index = courses.findIndex(c => c.id === course.id);
  if (index >= 0) {
      courses[index] = course;
  } else {
      courses.push(course);
  }
  db.save(STORAGE_KEYS.COURSES, courses);
};

// --- Social Operations ---

export const getAllScholars = async (): Promise<User[]> => {
    const users = db.get<Record<string, UserRecord>>(STORAGE_KEYS.USERS) || {};
    if (Object.keys(users).length === 0) await initDefaultUsers(); // ensure seed
    return Object.values(users).map(u => u.user);
};

export const toggleLikeCourse = async (courseId: string, username: string) => {
    // Check local storage courses first
    const courses = db.get<Course[]>(STORAGE_KEYS.COURSES) || [];
    const courseIndex = courses.findIndex(c => c.id === courseId);
    
    // If it's a user course in DB
    if (courseIndex >= 0) {
        const course = courses[courseIndex];
        const likes = course.likes || [];
        if (likes.includes(username)) {
            course.likes = likes.filter(u => u !== username);
        } else {
            course.likes = [...likes, username];
        }
        courses[courseIndex] = course;
        db.save(STORAGE_KEYS.COURSES, courses);
        return;
    }

    // Handle System Course Edit (Copy on Write)
    const sysCourse = SYSTEM_COURSES.find(c => c.id === courseId);
    if (sysCourse) {
        const newCourse = { ...sysCourse, likes: [...(sysCourse.likes || [])] };
        if (newCourse.likes?.includes(username)) {
            newCourse.likes = newCourse.likes.filter(u => u !== username);
        } else {
            newCourse.likes = [...(newCourse.likes || []), username];
        }
        courses.push(newCourse);
        db.save(STORAGE_KEYS.COURSES, courses);
    }
};

export const addCommentToCourse = async (courseId: string, comment: Comment) => {
    const courses = db.get<Course[]>(STORAGE_KEYS.COURSES) || [];
    const courseIndex = courses.findIndex(c => c.id === courseId);

    if (courseIndex >= 0) {
        const course = courses[courseIndex];
        course.comments = [comment, ...(course.comments || [])];
        courses[courseIndex] = course;
        db.save(STORAGE_KEYS.COURSES, courses);
        return;
    }

    // Handle System Course Edit (Copy on Write)
    const sysCourse = SYSTEM_COURSES.find(c => c.id === courseId);
    if (sysCourse) {
        const newCourse = { ...sysCourse, comments: [comment, ...(sysCourse.comments || [])] };
        courses.push(newCourse);
        db.save(STORAGE_KEYS.COURSES, courses);
    }
};

export const getFollows = async (username: string): Promise<string[]> => {
    const follows = db.get<Record<string, string[]>>(STORAGE_KEYS.FOLLOWS) || {};
    return follows[username] || [];
};

export const getFollowing = async (username: string): Promise<User[]> => {
    const followingIds = await getFollows(username);
    const users = db.get<Record<string, UserRecord>>(STORAGE_KEYS.USERS) || {};
    return followingIds.map(id => users[id]?.user).filter(u => !!u);
};

export const getFollowers = async (username: string): Promise<User[]> => {
    const follows = db.get<Record<string, string[]>>(STORAGE_KEYS.FOLLOWS) || {};
    const followerIds: string[] = [];
    
    // Iterate over all follow entries to find who follows 'username'
    Object.keys(follows).forEach(follower => {
        if (follows[follower].includes(username)) {
            followerIds.push(follower);
        }
    });

    const users = db.get<Record<string, UserRecord>>(STORAGE_KEYS.USERS) || {};
    return followerIds.map(id => users[id]?.user).filter(u => !!u);
};

export const toggleFollowUser = async (follower: string, target: string) => {
    const follows = db.get<Record<string, string[]>>(STORAGE_KEYS.FOLLOWS) || {};
    const userFollows = follows[follower] || [];
    
    if (userFollows.includes(target)) {
        follows[follower] = userFollows.filter(u => u !== target);
        // Decrease stats mock
        await updateUser(target, { followers: (await getCurrentUser())?.followers! - 1 }); 
    } else {
        follows[follower] = [...userFollows, target];
        // Increase stats mock
        // Note: Realistically we'd fetch the target user and update them, simplifed here
    }
    db.save(STORAGE_KEYS.FOLLOWS, follows);
    
    // Update local user stat cache for UI
    await updateUser(follower, { following: follows[follower].length });
};

export const removeFollower = async (username: string, followerToRemove: string) => {
    const follows = db.get<Record<string, string[]>>(STORAGE_KEYS.FOLLOWS) || {};
    const followerList = follows[followerToRemove] || [];
    
    if (followerList.includes(username)) {
        follows[followerToRemove] = followerList.filter(u => u !== username);
        db.save(STORAGE_KEYS.FOLLOWS, follows);
        // Update counts
        const current = (await getCurrentUser());
        if(current) await updateUser(username, { followers: Math.max(0, current.followers - 1) });
        const followerUser = (db.get<Record<string, UserRecord>>(STORAGE_KEYS.USERS) || {})[followerToRemove]?.user;
        if(followerUser) await updateUser(followerToRemove, { following: Math.max(0, followerUser.following - 1) });
    }
};

// --- History & Archive ---

export const addToHistory = async (username: string, courseId: string, action: 'viewed' | 'completed' = 'viewed') => {
    const allHistory = db.get<Record<string, HistoryRecord[]>>(STORAGE_KEYS.HISTORY) || {};
    const userHistory = allHistory[username] || [];
    
    // If completing, we don't necessarily remove old 'viewed' records, but we might want to avoid duplicates of the same action.
    // For simplicity: remove any record of this course and add the new one at the top.
    const filtered = userHistory.filter(h => h.courseId !== courseId);
    
    filtered.unshift({ courseId, timestamp: Date.now(), action });
    allHistory[username] = filtered.slice(0, 30);
    db.save(STORAGE_KEYS.HISTORY, allHistory);
};

export const getUserHistory = async (username: string): Promise<HistoryRecord[]> => {
  const allHistory = db.get<Record<string, HistoryRecord[]>>(STORAGE_KEYS.HISTORY) || {};
  return allHistory[username] || [];
};

export const toggleArchive = async (username: string, courseId: string) => {
    const allArchives = db.get<Record<string, string[]>>(STORAGE_KEYS.ARCHIVES) || {};
    const userArchives = allArchives[username] || [];
    const index = userArchives.indexOf(courseId);
    if (index > -1) userArchives.splice(index, 1);
    else userArchives.push(courseId);
    allArchives[username] = userArchives;
    db.save(STORAGE_KEYS.ARCHIVES, allArchives);
};

export const getUserArchives = async (username: string): Promise<string[]> => {
  const allArchives = db.get<Record<string, string[]>>(STORAGE_KEYS.ARCHIVES) || {};
  return allArchives[username] || [];
};
