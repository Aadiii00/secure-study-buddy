export interface Exam {
  id: string;
  title: string;
  description: string;
  duration_minutes: number;
  total_questions: number;
  created_by: string;
  created_at: string;
  is_active: boolean;
}

export interface Question {
  id: string;
  exam_id: string;
  question_text: string;
  options: string[];
  correct_option: number;
  order_index: number;
}

export interface ExamAttempt {
  id: string;
  exam_id: string;
  user_id: string;
  started_at: string;
  ended_at: string | null;
  answers: Record<string, number>;
  score: number | null;
  credibility_score: number | null;
  risk_level: 'low' | 'medium' | 'high' | null;
  status: 'in_progress' | 'completed' | 'auto_submitted' | 'flagged';
}

export interface Violation {
  id: string;
  attempt_id: string;
  type: ViolationType;
  timestamp: string;
  details: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export type ViolationType =
  | 'tab_switch'
  | 'window_blur'
  | 'copy_attempt'
  | 'paste_attempt'
  | 'cut_attempt'
  | 'right_click'
  | 'devtools_open'
  | 'fullscreen_exit'
  | 'print_screen'
  | 'keyboard_shortcut'
  | 'no_face'
  | 'multiple_faces'
  | 'face_not_centered'
  | 'camera_disabled'
  | 'window_resize';

export interface ProctoringSnapshot {
  id: string;
  attempt_id: string;
  image_url: string;
  timestamp: string;
  face_count: number;
  is_centered: boolean;
  anomaly_detected: boolean;
}

export interface CredibilityReport {
  attemptId: string;
  score: number;
  riskLevel: 'low' | 'medium' | 'high';
  totalViolations: number;
  tabSwitches: number;
  timeOutsideWindow: number;
  copyAttempts: number;
  faceAnomalies: number;
  devtoolsAttempts: number;
  fullscreenExits: number;
  violations: Violation[];
  timeline: { time: string; event: string; severity: string }[];
}

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: 'student' | 'admin';
}
