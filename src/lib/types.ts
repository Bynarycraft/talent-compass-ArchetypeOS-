export type AppRole = 'candidate' | 'learner' | 'supervisor' | 'admin';

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  archetype: string | null;
  supervisor_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
  created_at: string;
}

export interface Roadmap {
  id: string;
  name: string;
  description: string | null;
  archetype: string;
  created_at: string;
  updated_at: string;
}

export interface Course {
  id: string;
  title: string;
  description: string | null;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  roadmap_id: string | null;
  content_url: string | null;
  content_type: 'video' | 'pdf' | 'link' | 'mixed';
  duration_minutes: number;
  created_at: string;
  updated_at: string;
  roadmap?: Roadmap;
}

export interface Question {
  id: string;
  type: 'mcq' | 'written' | 'coding';
  question: string;
  options?: string[];
  correctAnswer?: number | string;
  points: number;
}

// Helper to parse questions from JSON
export function parseQuestions(questions: unknown): Question[] {
  if (Array.isArray(questions)) return questions as Question[];
  if (typeof questions === 'string') return JSON.parse(questions) as Question[];
  return [];
}

export interface Test {
  id: string;
  course_id: string;
  title: string;
  type: 'mcq' | 'written' | 'coding' | 'mixed';
  time_limit_minutes: number;
  max_attempts: number;
  passing_score: number;
  questions: Question[];
  created_at: string;
  updated_at: string;
  course?: Course;
}

export interface TestResult {
  id: string;
  test_id: string;
  user_id: string;
  score: number | null;
  status: 'pending' | 'in_progress' | 'submitted' | 'passed' | 'failed' | 'needs_review';
  answers: Record<string, string | number>;
  feedback: string | null;
  graded_by: string | null;
  attempt_number: number;
  started_at: string | null;
  submitted_at: string | null;
  created_at: string;
  test?: Test;
  user?: Profile;
}

export interface CourseEnrollment {
  id: string;
  user_id: string;
  course_id: string;
  progress_percent: number;
  status: 'enrolled' | 'in_progress' | 'completed';
  enrolled_at: string;
  completed_at: string | null;
  course?: Course;
}

export interface LearningSession {
  id: string;
  user_id: string;
  start_time: string;
  end_time: string | null;
  duration_minutes: number | null;
  course_id: string | null;
  created_at: string;
  course?: Course;
}

export interface Reflection {
  id: string;
  user_id: string;
  session_id: string | null;
  course_id: string | null;
  content: string;
  mood: 'great' | 'good' | 'neutral' | 'challenging' | 'difficult' | null;
  created_at: string;
}

export interface Feedback {
  id: string;
  sender_id: string;
  receiver_id: string;
  course_id: string | null;
  content: string;
  created_at: string;
  sender?: Profile;
  receiver?: Profile;
}

export interface Skill {
  id: string;
  user_id: string;
  name: string;
  level: number;
  created_at: string;
  updated_at: string;
}

export interface DashboardStats {
  totalHours: number;
  coursesCompleted: number;
  averageScore: number;
  currentStreak: number;
  progressPercent: number;
}
