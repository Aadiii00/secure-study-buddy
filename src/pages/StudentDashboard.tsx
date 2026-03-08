import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Shield, BookOpen, Clock, Play, BarChart3, LogOut, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

const StudentDashboard = () => {
  const { user, role, signOut } = useAuth();
  const navigate = useNavigate();
  const [exams, setExams] = useState<any[]>([]);
  const [attempts, setAttempts] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);

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

  const startExam = (examId: string) => {
    navigate(`/exam/${examId}`);
  };

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
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Welcome, {profile?.full_name || 'Student'}
          </h1>
          <p className="text-muted-foreground">Your exam dashboard — take exams and view your results.</p>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {[
            { label: 'Available Exams', value: exams.length, icon: BookOpen, color: 'text-primary' },
            { label: 'Completed', value: attempts.filter(a => a.status === 'completed').length, icon: BarChart3, color: 'text-success' },
            { label: 'Average Score', value: `${Math.round(attempts.filter(a => a.score !== null).reduce((acc, a) => acc + (a.score || 0), 0) / (attempts.filter(a => a.score !== null).length || 1))}%`, icon: BarChart3, color: 'text-warning' },
          ].map((stat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="glass-card p-5"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className={`text-2xl font-bold mt-1 ${stat.color}`}>{stat.value}</p>
                </div>
                <stat.icon className={`w-8 h-8 ${stat.color} opacity-50`} />
              </div>
            </motion.div>
          ))}
        </div>

        {/* Available Exams */}
        <h2 className="text-xl font-semibold text-foreground mb-4">Available Exams</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          {exams.map((exam, i) => (
            <motion.div
              key={exam.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="glass-card p-6 hover:glow-primary transition-shadow"
            >
              <h3 className="text-lg font-semibold text-foreground mb-2">{exam.title}</h3>
              <p className="text-sm text-muted-foreground mb-4">{exam.description}</p>
              <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                <span className="flex items-center gap-1"><Clock className="w-4 h-4" /> {exam.duration_minutes} min</span>
                <span className="flex items-center gap-1"><BookOpen className="w-4 h-4" /> {exam.total_questions} questions</span>
              </div>
              <Button
                onClick={() => startExam(exam.id)}
                className="gradient-primary text-primary-foreground w-full"
              >
                <Play className="w-4 h-4 mr-2" /> Start Exam
              </Button>
            </motion.div>
          ))}
          {exams.length === 0 && (
            <div className="glass-card p-8 text-center col-span-2">
              <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No exams available right now.</p>
            </div>
          )}
        </div>

        {/* Past Attempts */}
        <h2 className="text-xl font-semibold text-foreground mb-4">Your Results</h2>
        <div className="space-y-3">
          {attempts.map((attempt, i) => (
            <motion.div
              key={attempt.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="glass-card p-4 flex items-center justify-between cursor-pointer hover:glow-primary transition-shadow"
              onClick={() => navigate(`/results/${attempt.id}`)}
            >
              <div>
                <h4 className="font-medium text-foreground">{(attempt as any).exams?.title || 'Exam'}</h4>
                <p className="text-sm text-muted-foreground">
                  {new Date(attempt.started_at).toLocaleDateString()} • Status: {attempt.status}
                </p>
              </div>
              <div className="text-right">
                {attempt.score !== null && (
                  <span className={`text-lg font-bold ${attempt.score >= 70 ? 'text-success' : attempt.score >= 50 ? 'text-warning' : 'text-danger'}`}>
                    {attempt.score}%
                  </span>
                )}
                {attempt.risk_level && (
                  <p className={`text-xs font-mono ${attempt.risk_level === 'low' ? 'text-success' : attempt.risk_level === 'medium' ? 'text-warning' : 'text-danger'}`}>
                    Risk: {attempt.risk_level.toUpperCase()}
                  </p>
                )}
              </div>
            </motion.div>
          ))}
          {attempts.length === 0 && (
            <div className="glass-card p-8 text-center">
              <BarChart3 className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No exam attempts yet. Start an exam to see results here.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default StudentDashboard;
