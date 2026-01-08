
export enum AppMode {
  DARK_ACADEMIA = 'DARK',
  LIGHT_ACADEMIA = 'LIGHT'
}

export enum Page {
  COVER = 'COVER',
  AUTH = 'AUTH',
  PROFILE = 'PROFILE',
  CREATE_COURSE = 'CREATE_COURSE',
  COURSE_VIEW = 'COURSE_VIEW',
  SOCIAL = 'SOCIAL',
  LIVE_TUTOR = 'LIVE_TUTOR',
  CALCULUS_TOME = 'CALCULUS_TOME'
}

export interface BadgeDef {
  id: string;
  label: string;
  icon: string;
  desc: string;
}

export interface User {
  username: string;
  email: string;
  avatarUrl: string;
  bio: string;
  badges: string[]; // List of earned badge IDs
  badgeDefinitions?: BadgeDef[]; // Custom definitions for the slots
  streak: number;
  followers: number;
  following: number;
  profileBackground?: string; // New field for custom profile background
}

export interface Flashcard {
  front: string;
  back: string;
  frontImage?: string;
  backImage?: string;
  videoUrl?: string;
  audioUrl?: string;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  answer: number;
}

export interface Comment {
  id: string;
  author: string;
  text: string;
  timestamp: number;
}

export interface Course {
  id: string;
  title: string;
  subject: string;
  description: string;
  type: 'flashcard' | 'video' | 'mixed';
  cardStyle?: 'aesthetic' | 'anki-minimal'; 
  level: string;
  duration?: string;
  speed?: string;
  content: Flashcard[];
  quiz?: QuizQuestion[];
  roadmap?: string[];
  videoIntroUrl?: string;
  author: string;
  // Social Fields
  isPublic?: boolean;
  likes?: string[]; // Array of usernames who liked
  comments?: Comment[];
}

export interface HistoryRecord {
  courseId: string;
  timestamp: number;
  action: 'viewed' | 'completed';
}

export interface Post {
  id: string;
  author: string;
  content: string;
  likes: number;
}
