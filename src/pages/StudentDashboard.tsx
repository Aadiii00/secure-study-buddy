import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Shield, BookOpen, Clock, Play, BarChart3, LogOut, User, Trophy, AlertTriangle, TrendingUp, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import ExamStartModal from '@/components/exam/ExamStartModal';

const fadeUp = (i: number) => ({
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  transition: { delay: i * 0.05 },
});

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

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  return (
    <div className="min-h-screen security-grid">
      {/* Header */}
      <header className="border-b border-border bg-card/80 backdrop-blur-xl sticky top-0 z-30">
        <div className="container mx-auto flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg gradient-primary">
              <Shield className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-bold text-lg text-foreground">Exam Guardrail</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <User className="w-4 h-4" />
              <span>{profile?.full_name || user?.email}</span>
            </div>
            <Button variant="ghost" size="sm" onClick={handleSignOut} className="text-muted-foreground hover:text-foreground">
              <LogOut className="w-4 h-4 mr-2" /> Sign Out
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        {/* Welcome */}
        <motion.div {...fadeUp(0)} className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Welcome back, {profile?.full_name || 'Student'} 👋
          </h1>
          <p className="text-muted-foreground">Your exam dashboard — take exams, view results, and track your credibility.</p>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Available Exams', value: exams.length, icon: BookOpen, color: 'text-primary' },
            { label: 'Completed', value: completedAttempts.length, icon: Trophy, color: 'text-success' },
            { label: 'Avg Score', value: `${avgScore}%`, icon: TrendingUp, color: 'text-warning' },
            { label: 'Avg Credibility', value: `${avgCredibility}%`, icon: Shield, color: avgCredibility >= 75 ? 'text-success' : avgCredibility >= 50 ? 'text-warning' : 'text-danger' },
          ].map((stat, i) => (
            <motion.div key={i} {...fadeUp(i + 1)} className="glass-card p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                  <p className={`text-2xl font-bold mt-1 ${stat.color}`}>{stat.value}</p>
                </div>
                <stat.icon className={`w-8 h-8 ${stat.color} opacity-30`} />
              </div>
            </motion.div>
          ))}
        </div>

        {/* Available Exams */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-foreground">Available Exams</h2>
          <span className="text-sm text-muted-foreground">{exams.length} exam(s)</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
          {exams.map((exam, i) => (
            <motion.div key={exam.id} {...fadeUp(i)} className="glass-card p-6 hover:glow-primary transition-all duration-300 hover:-translate-y-0.5">
              <div className="flex items-start justify-between mb-3">
                <h3 className="text-lg font-semibold text-foreground">{exam.title}</h3>
                <span className="text-xs font-mono px-2 py-1 rounded bg-success/10 text-success">ACTIVE</span>
              </div>
              <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{exam.description || 'No description provided.'}</p>
              <div className="flex items-center gap-4 text-sm text-muted-foreground mb-5">
                <span className="flex items-center gap-1"><Clock className="w-4 h-4" /> {exam.duration_minutes} min</span>
                <span className="flex items-center gap-1"><BookOpen className="w-4 h-4" /> {exam.total_questions} questions</span>
              </div>
              <Button onClick={() => setExamToStart(exam)} className="gradient-primary text-primary-foreground w-full glow-primary">
                <Play className="w-4 h-4 mr-2" /> Start Exam
              </Button>
            </motion.div>
          ))}
          {exams.length === 0 && (
            <div className="glass-card p-10 text-center col-span-2">
              <BookOpen className="w-14 h-14 text-muted-foreground mx-auto mb-4 opacity-50" />
              <p className="text-muted-foreground text-lg">No exams available right now.</p>
              <p className="text-sm text-muted-foreground mt-1">Check back later or contact your instructor.</p>
            </div>
          )}
        </div>

        {/* Past Attempts */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-foreground">Your Results</h2>
          <span className="text-sm text-muted-foreground">{attempts.length} attempt(s)</span>
        </div>
        <div className="space-y-3">
          {attempts.map((attempt, i) => (
            <motion.div key={attempt.id} {...fadeUp(i)}
              className="glass-card p-4 flex items-center justify-between cursor-pointer hover:glow-primary transition-all duration-300 group"
              onClick={() => navigate(`/results/${attempt.id}`)}>
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  attempt.status === 'auto_submitted' ? 'bg-danger/10' : 'bg-primary/10'
                }`}>
                  {attempt.status === 'auto_submitted' ? (
                    <AlertTriangle className="w-5 h-5 text-danger" />
                  ) : (
                    <BarChart3 className="w-5 h-5 text-primary" />
                  )}
                </div>
                <div>
                  <h4 className="font-medium text-foreground group-hover:text-primary transition-colors">
                    {(attempt as any).exams?.title || 'Exam'}
                  </h4>
                  <p className="text-xs text-muted-foreground flex items-center gap-2">
                    <Calendar className="w-3 h-3" />
                    {new Date(attempt.started_at).toLocaleDateString()} at {new Date(attempt.started_at).toLocaleTimeString()}
                    <span className={`px-1.5 py-0.5 rounded text-xs ${
                      attempt.status === 'completed' ? 'bg-success/10 text-success' :
                      attempt.status === 'auto_submitted' ? 'bg-danger/10 text-danger' :
                      'bg-warning/10 text-warning'
                    }`}>{attempt.status.replace('_', ' ')}</span>
                  </p>
                </div>
              </div>
              <div className="text-right flex items-center gap-6">
                {attempt.score !== null && (
                  <div>
                    <span className={`text-lg font-bold ${attempt.score >= 70 ? 'text-success' : attempt.score >= 50 ? 'text-warning' : 'text-danger'}`}>
                      {attempt.score}%
                    </span>
                    <p className="text-xs text-muted-foreground">Score</p>
                  </div>
                )}
                {attempt.credibility_score !== null && (
                  <div>
                    <span className={`text-lg font-bold ${
                      attempt.credibility_score >= 75 ? 'text-success' : attempt.credibility_score >= 50 ? 'text-warning' : 'text-danger'
                    }`}>
                      {attempt.credibility_score}
                    </span>
                    <p className="text-xs text-muted-foreground">Credibility</p>
                  </div>
                )}
                {attempt.risk_level && (
                  <div className={`px-2 py-1 rounded text-xs font-mono ${
                    attempt.risk_level === 'low' ? 'bg-success/10 text-success' :
                    attempt.risk_level === 'medium' ? 'bg-warning/10 text-warning' :
                    'bg-danger/10 text-danger'
                  }`}>
                    {attempt.risk_level.toUpperCase()}
                  </div>
                )}
              </div>
            </motion.div>
          ))}
          {attempts.length === 0 && (
            <div className="glass-card p-10 text-center">
              <BarChart3 className="w-14 h-14 text-muted-foreground mx-auto mb-4 opacity-50" />
              <p className="text-muted-foreground text-lg">No exam attempts yet.</p>
              <p className="text-sm text-muted-foreground mt-1">Start an exam above to see results here.</p>
            </div>
          )}
        </div>
      </main>

      {/* Exam Start Modal */}
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
