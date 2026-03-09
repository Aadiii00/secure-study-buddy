import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Shield, BookOpen, Clock, Play, BarChart3, LogOut, User, Trophy, Calendar, Medal, Code2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import ExamStartModal from '@/components/exam/ExamStartModal';

const StudentDashboard = () => {
  const { user, role, signOut } = useAuth();
  const navigate = useNavigate();
  const [exams, setExams] = useState<any[]>([]);
  const [attempts, setAttempts] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [examToStart, setExamToStart] = useState<any>(null);

  useEffect(() => {
    if (!user) { navigate('/auth'); return; }
    if (role === 'admin') { navigate('/admin'); return; }
    fetchData();
  }, [user, role]);

  const fetchData = async () => {
    const [{ data: examsData }, { data: attemptsData }, { data: profileData }] = await Promise.all([
      supabase.from('exams').select('*').eq('is_active', true).order('created_at', { ascending: false }),
      supabase.from('exam_attempts').select('*, exams(title)').eq('user_id', user!.id).order('created_at', { ascending: false }),
      supabase.from('profiles').select('*').eq('user_id', user!.id).single(),
    ]);
    setExams(examsData || []);
    setAttempts(attemptsData || []);
    setProfile(profileData);
  };

  const completedAttempts = attempts.filter(a => a.status === 'completed' || a.status === 'auto_submitted');
  const avgScore = completedAttempts.length > 0
    ? Math.round(completedAttempts.filter(a => a.score !== null).reduce((acc, a) => acc + (a.score || 0), 0) / (completedAttempts.filter(a => a.score !== null).length || 1))
    : 0;
  const avgCredibility = completedAttempts.length > 0
    ? Math.round(completedAttempts.filter(a => a.credibility_score !== null).reduce((acc, a) => acc + (a.credibility_score || 0), 0) / (completedAttempts.filter(a => a.credibility_score !== null).length || 1))
    : 100;

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-border sticky top-0 z-30 bg-background">
        <div className="container mx-auto flex items-center justify-between px-6 py-3">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            <span className="font-semibold">Exam Guardrail</span>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate('/coding')}>
              <Code2 className="w-4 h-4 mr-1" /> Coding
            </Button>
            <Button variant="ghost" size="sm" onClick={() => navigate('/leaderboard')}>
              <Medal className="w-4 h-4 mr-1" /> Leaderboard
            </Button>
            <span className="text-sm text-muted-foreground">{profile?.full_name || user?.email}</span>
            <Button variant="ghost" size="sm" onClick={async () => { await signOut(); navigate('/auth'); }}>
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8 max-w-4xl">
        <h1 className="text-2xl font-semibold mb-1">Welcome, {profile?.full_name || 'Student'}</h1>
        <p className="text-muted-foreground text-sm mb-8">Take exams, view results, track your credibility.</p>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          {[
            { label: 'Available', value: exams.length },
            { label: 'Completed', value: completedAttempts.length },
            { label: 'Avg Score', value: `${avgScore}%` },
            { label: 'Credibility', value: `${avgCredibility}%` },
          ].map((stat, i) => (
            <div key={i} className="border border-border rounded-lg p-4">
              <p className="text-xs text-muted-foreground">{stat.label}</p>
              <p className="text-2xl font-semibold mt-1">{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Available Exams */}
        <h2 className="text-lg font-medium mb-3">Available Exams</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
          {exams.map((exam) => (
            <div key={exam.id} className="border border-border rounded-lg p-5">
              <h3 className="font-medium mb-1">{exam.title}</h3>
              <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{exam.description || 'No description.'}</p>
              <div className="flex items-center gap-3 text-sm text-muted-foreground mb-4">
                <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {exam.duration_minutes} min</span>
                <span className="flex items-center gap-1"><BookOpen className="w-3.5 h-3.5" /> {exam.total_questions} questions</span>
              </div>
              <Button onClick={() => setExamToStart(exam)} className="w-full" size="sm">
                <Play className="w-4 h-4 mr-1" /> Start Exam
              </Button>
            </div>
          ))}
          {exams.length === 0 && (
            <div className="border border-border rounded-lg p-8 text-center col-span-2 text-muted-foreground">
              No exams available right now.
            </div>
          )}
        </div>

        {/* Past Attempts */}
        <h2 className="text-lg font-medium mb-3">Your Results</h2>
        <div className="space-y-2">
          {attempts.map((attempt) => (
            <div key={attempt.id}
              className="border border-border rounded-lg p-4 flex items-center justify-between cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => navigate(`/results/${attempt.id}`)}>
              <div>
                <p className="font-medium text-sm">{(attempt as any).exams?.title || 'Exam'}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(attempt.started_at).toLocaleDateString()} · {attempt.status.replace('_', ' ')}
                </p>
              </div>
              <div className="flex items-center gap-4 text-sm">
                {attempt.score !== null && <span className="font-medium">{attempt.score}%</span>}
                {attempt.credibility_score !== null && (
                  <span className="text-muted-foreground">Cred: {attempt.credibility_score}</span>
                )}
                {attempt.risk_level && (
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${
                    attempt.risk_level === 'low' ? 'border-success/30 text-success' :
                    attempt.risk_level === 'medium' ? 'border-warning/30 text-warning' :
                    'border-danger/30 text-danger'
                  }`}>{attempt.risk_level}</span>
                )}
              </div>
            </div>
          ))}
          {attempts.length === 0 && (
            <div className="border border-border rounded-lg p-8 text-center text-muted-foreground">
              No exam attempts yet.
            </div>
          )}
        </div>
      </main>

      {examToStart && (
        <ExamStartModal
          open={!!examToStart}
          examTitle={examToStart.title}
          duration={examToStart.duration_minutes}
          totalQuestions={examToStart.total_questions}
          onStart={() => { navigate(`/exam/${examToStart.id}`); setExamToStart(null); }}
          onCancel={() => setExamToStart(null)}
        />
      )}
    </div>
  );
};

export default StudentDashboard;
