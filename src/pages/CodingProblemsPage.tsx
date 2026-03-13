import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Shield, Code2, LogOut, ArrowLeft, CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';

const difficultyColors: Record<string, string> = {
  easy: 'bg-success/10 text-success border-success/20',
  medium: 'bg-warning/10 text-warning border-warning/20',
  hard: 'bg-destructive/10 text-danger border-danger/20',
};

const CodingProblemsPage = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [problems, setProblems] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { navigate('/auth'); return; }
    fetchData();
  }, [user]);

  const fetchData = async () => {
    const [{ data: problemsData }, { data: subsData }] = await Promise.all([
      supabase.from('coding_problems').select('*').eq('is_active', true).order('created_at', { ascending: false }),
      supabase.from('code_submissions').select('*').eq('user_id', user!.id).order('created_at', { ascending: false }),
    ]);
    setProblems(problemsData || []);
    setSubmissions(subsData || []);
    setLoading(false);
  };

  const getSolvedStatus = (problemId: string) => {
    const subs = submissions.filter(s => s.problem_id === problemId);
    if (subs.some(s => s.status === 'accepted')) return 'solved';
    if (subs.length > 0) return 'attempted';
    return 'unsolved';
  };

  return (
    <div className="min-h-screen">
      <header className="border-b border-border sticky top-0 z-30 bg-background">
        <div className="container mx-auto flex items-center justify-between px-6 py-3">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            <span className="font-semibold">Tracxn<span className="text-red-500">Labs</span></span>
            <span className="text-xs px-2 py-0.5 rounded border border-border text-muted-foreground">Coding</span>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')}>
              <ArrowLeft className="w-4 h-4 mr-1" /> Dashboard
            </Button>
            <Button variant="ghost" size="sm" onClick={async () => { await signOut(); navigate('/auth'); }}>
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8 max-w-4xl">
        <h1 className="text-2xl font-semibold mb-1">Coding Challenges</h1>
        <p className="text-muted-foreground text-sm mb-8">Solve problems, sharpen your skills.</p>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { label: 'Total', value: problems.length },
            { label: 'Solved', value: problems.filter(p => getSolvedStatus(p.id) === 'solved').length },
            { label: 'Attempted', value: problems.filter(p => getSolvedStatus(p.id) === 'attempted').length },
          ].map((stat, i) => (
            <div key={i} className="border border-border rounded-lg p-4">
              <p className="text-xs text-muted-foreground">{stat.label}</p>
              <p className="text-2xl font-semibold mt-1">{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Problem List */}
        <div className="border border-border rounded-lg divide-y divide-border">
          <div className="grid grid-cols-[1fr_100px_100px_80px] px-4 py-2 text-xs text-muted-foreground font-medium bg-muted/50 rounded-t-lg">
            <span>Problem</span>
            <span>Difficulty</span>
            <span>Status</span>
            <span></span>
          </div>
          {problems.map((problem, i) => {
            const status = getSolvedStatus(problem.id);
            return (
              <motion.div
                key={problem.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.03 }}
                className="grid grid-cols-[1fr_100px_100px_80px] items-center px-4 py-3 hover:bg-muted/30 transition-colors cursor-pointer"
                onClick={() => navigate(`/coding/${problem.id}`)}
              >
                <div>
                  <p className="font-medium text-sm">{problem.title}</p>
                  <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{problem.description}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full border w-fit capitalize ${difficultyColors[problem.difficulty] || ''}`}>
                  {problem.difficulty}
                </span>
                <div className="flex items-center gap-1.5">
                  {status === 'solved' && <CheckCircle2 className="w-4 h-4 text-success" />}
                  {status === 'attempted' && <XCircle className="w-4 h-4 text-warning" />}
                  <span className="text-xs text-muted-foreground capitalize">{status}</span>
                </div>
                <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); navigate(`/coding/${problem.id}`); }}>
                  <Code2 className="w-3.5 h-3.5 mr-1" /> Solve
                </Button>
              </motion.div>
            );
          })}
          {problems.length === 0 && !loading && (
            <div className="py-12 text-center text-muted-foreground text-sm">No coding problems available.</div>
          )}
        </div>
      </main>
    </div>
  );
};

export default CodingProblemsPage;
