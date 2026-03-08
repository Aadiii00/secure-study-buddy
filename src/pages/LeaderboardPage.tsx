import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Shield, Trophy, Medal, ArrowLeft, Crown, TrendingUp, Award, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

interface LeaderboardEntry {
  user_id: string;
  full_name: string;
  email: string;
  totalAttempts: number;
  avgScore: number;
  avgCredibility: number;
  bestScore: number;
  rank: number;
}

const LeaderboardPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [sortBy, setSortBy] = useState<'score' | 'credibility'>('score');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const fetchLeaderboard = async () => {
    const [{ data: attempts }, { data: profiles }] = await Promise.all([
      supabase.from('exam_attempts').select('user_id, score, credibility_score, status').in('status', ['completed', 'auto_submitted']),
      supabase.from('profiles').select('user_id, full_name, email'),
    ]);

    if (!attempts || !profiles) { setLoading(false); return; }

    const grouped: Record<string, { scores: number[]; credibilities: number[] }> = {};
    attempts.forEach((a) => {
      if (!grouped[a.user_id]) grouped[a.user_id] = { scores: [], credibilities: [] };
      if (a.score != null) grouped[a.user_id].scores.push(a.score);
      if (a.credibility_score != null) grouped[a.user_id].credibilities.push(a.credibility_score);
    });

    const board: LeaderboardEntry[] = Object.entries(grouped).map(([uid, data]) => {
      const profile = profiles.find((p) => p.user_id === uid);
      const avgScore = data.scores.length > 0 ? Math.round(data.scores.reduce((a, b) => a + b, 0) / data.scores.length) : 0;
      const avgCred = data.credibilities.length > 0 ? Math.round(data.credibilities.reduce((a, b) => a + b, 0) / data.credibilities.length) : 0;
      return {
        user_id: uid,
        full_name: profile?.full_name || 'Anonymous',
        email: profile?.email || '',
        totalAttempts: data.scores.length,
        avgScore,
        avgCredibility: avgCred,
        bestScore: data.scores.length > 0 ? Math.max(...data.scores) : 0,
        rank: 0,
      };
    });

    setEntries(board);
    setLoading(false);
  };

  const sorted = [...entries].sort((a, b) =>
    sortBy === 'score' ? b.avgScore - a.avgScore : b.avgCredibility - a.avgCredibility
  ).map((e, i) => ({ ...e, rank: i + 1 }));

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Crown className="w-6 h-6 text-yellow-400" />;
    if (rank === 2) return <Medal className="w-6 h-6 text-gray-300" />;
    if (rank === 3) return <Medal className="w-6 h-6 text-amber-600" />;
    return <span className="w-6 h-6 flex items-center justify-center text-sm font-bold text-muted-foreground">#{rank}</span>;
  };

  const getRankBg = (rank: number) => {
    if (rank === 1) return 'border-yellow-400/30 bg-yellow-400/5';
    if (rank === 2) return 'border-gray-300/30 bg-gray-300/5';
    if (rank === 3) return 'border-amber-600/30 bg-amber-600/5';
    return 'border-border/50';
  };

  return (
    <div className="min-h-screen security-grid">
      <header className="border-b border-border bg-card/80 backdrop-blur-xl sticky top-0 z-30">
        <div className="container mx-auto flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')}>
              <ArrowLeft className="w-4 h-4 mr-2" /> Back
            </Button>
            <Trophy className="w-5 h-5 text-primary" />
            <span className="font-bold text-lg text-foreground">Leaderboard</span>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8 max-w-3xl">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-mono mb-4">
            <Award className="w-4 h-4" /> TOP PERFORMERS
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Student Leaderboard</h1>
          <p className="text-muted-foreground">Ranked by exam performance and integrity.</p>
        </motion.div>

        {/* Sort toggle */}
        <div className="flex justify-center gap-2 mb-8">
          {[
            { key: 'score' as const, label: 'By Score', icon: TrendingUp },
            { key: 'credibility' as const, label: 'By Credibility', icon: Shield },
          ].map((s) => (
            <button
              key={s.key}
              onClick={() => setSortBy(s.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                sortBy === s.key ? 'gradient-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
              }`}
            >
              <s.icon className="w-4 h-4" /> {s.label}
            </button>
          ))}
        </div>

        {/* Top 3 podium */}
        {sorted.length >= 3 && (
          <div className="grid grid-cols-3 gap-3 mb-8">
            {[sorted[1], sorted[0], sorted[2]].map((entry, i) => {
              const isFirst = i === 1;
              return (
                <motion.div
                  key={entry.user_id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className={`glass-card p-4 text-center ${isFirst ? 'border-2 border-yellow-400/30 -mt-4 pb-6' : ''} ${
                    entry.user_id === user?.id ? 'ring-2 ring-primary/50' : ''
                  }`}
                >
                  <div className="flex justify-center mb-2">{getRankIcon(entry.rank)}</div>
                  <div className={`w-12 h-12 rounded-full mx-auto mb-2 flex items-center justify-center font-bold text-lg ${
                    isFirst ? 'gradient-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'
                  }`}>
                    {entry.full_name[0]?.toUpperCase() || '?'}
                  </div>
                  <p className="font-semibold text-foreground text-sm truncate">{entry.full_name}</p>
                  <p className={`text-2xl font-black mt-1 ${
                    sortBy === 'score'
                      ? entry.avgScore >= 70 ? 'text-success' : entry.avgScore >= 50 ? 'text-warning' : 'text-danger'
                      : entry.avgCredibility >= 75 ? 'text-success' : entry.avgCredibility >= 50 ? 'text-warning' : 'text-danger'
                  }`}>
                    {sortBy === 'score' ? `${entry.avgScore}%` : entry.avgCredibility}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">{entry.totalAttempts} exam(s)</p>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Full list */}
        <div className="space-y-2">
          {sorted.map((entry, i) => (
            <motion.div
              key={entry.user_id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.03 }}
              className={`glass-card p-4 flex items-center gap-4 border ${getRankBg(entry.rank)} ${
                entry.user_id === user?.id ? 'ring-2 ring-primary/40' : ''
              }`}
            >
              <div className="w-8 flex justify-center">{getRankIcon(entry.rank)}</div>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold shrink-0 ${
                entry.rank <= 3 ? 'gradient-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'
              }`}>
                {entry.full_name[0]?.toUpperCase() || '?'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground truncate">
                  {entry.full_name}
                  {entry.user_id === user?.id && <span className="ml-2 text-xs text-primary">(You)</span>}
                </p>
                <p className="text-xs text-muted-foreground">{entry.totalAttempts} attempt(s) • Best: {entry.bestScore}%</p>
              </div>
              <div className="text-right shrink-0">
                <p className={`text-lg font-bold ${
                  entry.avgScore >= 70 ? 'text-success' : entry.avgScore >= 50 ? 'text-warning' : 'text-danger'
                }`}>{entry.avgScore}%</p>
                <p className="text-xs text-muted-foreground">Score</p>
              </div>
              <div className="text-right shrink-0">
                <p className={`text-lg font-bold ${
                  entry.avgCredibility >= 75 ? 'text-success' : entry.avgCredibility >= 50 ? 'text-warning' : 'text-danger'
                }`}>{entry.avgCredibility}</p>
                <p className="text-xs text-muted-foreground">Credibility</p>
              </div>
            </motion.div>
          ))}
        </div>

        {loading && (
          <div className="text-center py-12">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-muted-foreground">Loading leaderboard...</p>
          </div>
        )}

        {!loading && sorted.length === 0 && (
          <div className="glass-card p-12 text-center">
            <Trophy className="w-14 h-14 text-muted-foreground mx-auto mb-4 opacity-50" />
            <p className="text-lg text-muted-foreground">No exam results yet.</p>
            <p className="text-sm text-muted-foreground mt-1">Complete an exam to appear on the leaderboard!</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default LeaderboardPage;
