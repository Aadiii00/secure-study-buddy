import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Trophy, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface LeaderboardEntry {
  user_id: string;
  full_name: string;
  totalAttempts: number;
  avgScore: number;
  avgCredibility: number;
  bestScore: number;
  rank: number;
}

const DEMO_DATA: LeaderboardEntry[] = [
  { user_id: 'demo-1', full_name: 'Aditya', totalAttempts: 2, bestScore: 10, avgScore: 5, avgCredibility: 94, rank: 0 },
  { user_id: 'demo-2', full_name: 'Bharat Raj', totalAttempts: 3, bestScore: 35, avgScore: 32, avgCredibility: 91, rank: 0 },
  { user_id: 'demo-3', full_name: 'Rahul Sharma', totalAttempts: 4, bestScore: 78, avgScore: 75, avgCredibility: 96, rank: 0 },
  { user_id: 'demo-4', full_name: 'Sneha Patel', totalAttempts: 2, bestScore: 65, avgScore: 60, avgCredibility: 92, rank: 0 },
  { user_id: 'demo-5', full_name: 'Arjun Kumar', totalAttempts: 5, bestScore: 82, avgScore: 80, avgCredibility: 97, rank: 0 },
  { user_id: 'demo-6', full_name: 'Priya Singh', totalAttempts: 3, bestScore: 70, avgScore: 68, avgCredibility: 95, rank: 0 },
  { user_id: 'demo-7', full_name: 'Karan Mehta', totalAttempts: 2, bestScore: 55, avgScore: 50, avgCredibility: 89, rank: 0 },
  { user_id: 'demo-8', full_name: 'Neha Verma', totalAttempts: 4, bestScore: 73, avgScore: 70, avgCredibility: 94, rank: 0 }
];

const LeaderboardPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [sortBy, setSortBy] = useState<'score' | 'credibility'>('score');
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchLeaderboard(); }, []);

  const fetchLeaderboard = async () => {
    const [{ data: attempts }, { data: profiles }] = await Promise.all([
      supabase.from('exam_attempts').select('user_id, score, credibility_score, status').in('status', ['completed', 'auto_submitted']),
      supabase.from('profiles').select('user_id, full_name'),
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
      return {
        user_id: uid,
        full_name: profile?.full_name || 'Anonymous',
        totalAttempts: data.scores.length,
        avgScore: data.scores.length > 0 ? Math.round(data.scores.reduce((a, b) => a + b, 0) / data.scores.length) : 0,
        avgCredibility: data.credibilities.length > 0 ? Math.round(data.credibilities.reduce((a, b) => a + b, 0) / data.credibilities.length) : 0,
        bestScore: data.scores.length > 0 ? Math.max(...data.scores) : 0,
        rank: 0,
      };
    });
    
    
    // Always include DEMO_DATA so the leaderboard looks populated
    // Filter out any demo data that might have the same ID as a real user (just in case)
    const realUserIds = new Set(board.map(b => b.user_id));
    const filteredDemo = DEMO_DATA.filter(d => !realUserIds.has(d.user_id));
    
    setEntries([...board, ...filteredDemo]);
    
    setLoading(false);
  };

  const sorted = [...entries]
    .sort((a, b) => sortBy === 'score' ? b.avgScore - a.avgScore : b.avgCredibility - a.avgCredibility)
    .map((e, i) => ({ ...e, rank: i + 1 }));

  return (
    <div className="min-h-screen">
      <header className="border-b border-border sticky top-0 z-30 bg-background">
        <div className="container mx-auto flex items-center gap-3 px-6 py-3">
          <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="w-4 h-4 mr-1" /> Back
          </Button>
          <Trophy className="w-4 h-4" />
          <span className="font-medium">Leaderboard</span>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8 max-w-2xl">
        <div className="flex justify-center gap-2 mb-6">
          {(['score', 'credibility'] as const).map((s) => (
            <button key={s} onClick={() => setSortBy(s)}
              className={`px-4 py-1.5 rounded text-sm transition-colors ${
                sortBy === s ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'
              }`}>
              By {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>

        <div className="border border-border rounded-lg divide-y divide-border">
          {sorted.map((entry) => (
            <div key={entry.user_id} className={`flex items-center gap-4 px-4 py-3 ${entry.user_id === user?.id ? 'bg-muted/50' : ''}`}>
              <span className="w-8 text-center text-sm font-medium text-muted-foreground">#{entry.rank}</span>
              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm font-medium">
                {entry.full_name[0]?.toUpperCase() || '?'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate flex items-center gap-1.5">
                  {entry.full_name}
                  {/* Mark as (you) if same user OR if demo name matches logged in user */}
                  {(entry.user_id === user?.id || (user?.email && entry.full_name.toLowerCase() === user.email.split('@')[0].toLowerCase())) && (
                    <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">(you)</span>
                  )}
                </p>
                <p className="text-xs text-muted-foreground">{entry.totalAttempts} exams · Best: {entry.bestScore}%</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium">{entry.avgScore}%</p>
                <p className="text-xs text-muted-foreground">Score</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium">{entry.avgCredibility}</p>
                <p className="text-xs text-muted-foreground">Cred</p>
              </div>
            </div>
          ))}
        </div>

        {loading && <p className="text-center py-8 text-muted-foreground text-sm">Loading...</p>}
        {!loading && sorted.length === 0 && <p className="text-center py-8 text-muted-foreground text-sm">No results yet.</p>}
      </main>
    </div>
  );
};

export default LeaderboardPage;
