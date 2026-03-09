import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Trash2, Save, ToggleLeft, ToggleRight, Eye, Code2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

const CodingProblemsAdmin = () => {
  const { user } = useAuth();
  const [problems, setProblems] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [view, setView] = useState<'list' | 'create' | 'detail'>('list');
  const [selectedProblem, setSelectedProblem] = useState<any>(null);
  const [newProblem, setNewProblem] = useState({ title: '', description: '', constraints: '', difficulty: 'easy' });
  const [newTestCases, setNewTestCases] = useState<{ input: string; expected_output: string; is_hidden: boolean }[]>([
    { input: '', expected_output: '', is_hidden: false },
  ]);
  const [problemTestCases, setProblemTestCases] = useState<any[]>([]);

  useEffect(() => { fetchProblems(); }, []);

  const fetchProblems = async () => {
    const { data } = await supabase.from('coding_problems').select('*').order('created_at', { ascending: false });
    setProblems(data || []);
  };

  const fetchProblemDetail = async (problem: any) => {
    setSelectedProblem(problem);
    const [{ data: tcs }, { data: subs }] = await Promise.all([
      supabase.from('test_cases').select('*').eq('problem_id', problem.id).order('order_index'),
      supabase.from('code_submissions').select('*, profiles:user_id(full_name, email)').eq('problem_id', problem.id).order('created_at', { ascending: false }).limit(50),
    ]);
    setProblemTestCases(tcs || []);
    setSubmissions(subs || []);
    setView('detail');
  };

  const createProblem = async () => {
    if (!newProblem.title.trim()) { toast.error('Title is required'); return; }
    if (!newProblem.description.trim()) { toast.error('Description is required'); return; }

    const { data: prob, error } = await supabase
      .from('coding_problems')
      .insert({ ...newProblem, created_by: user!.id })
      .select()
      .single();
    if (error) { toast.error('Failed to create problem'); return; }

    const validTCs = newTestCases.filter(tc => tc.input.trim() || tc.expected_output.trim());
    if (validTCs.length > 0) {
      await supabase.from('test_cases').insert(
        validTCs.map((tc, i) => ({ problem_id: prob.id, input: tc.input, expected_output: tc.expected_output, is_hidden: tc.is_hidden, order_index: i }))
      );
    }

    toast.success('Problem created!');
    setNewProblem({ title: '', description: '', constraints: '', difficulty: 'easy' });
    setNewTestCases([{ input: '', expected_output: '', is_hidden: false }]);
    setView('list');
    fetchProblems();
  };

  const toggleProblemActive = async (id: string, current: boolean) => {
    await supabase.from('coding_problems').update({ is_active: !current }).eq('id', id);
    toast.success(current ? 'Problem deactivated' : 'Problem activated');
    fetchProblems();
  };

  const deleteProblem = async (id: string) => {
    await supabase.from('test_cases').delete().eq('problem_id', id);
    await supabase.from('code_submissions').delete().eq('problem_id', id);
    await supabase.from('coding_problems').delete().eq('id', id);
    toast.success('Problem deleted');
    fetchProblems();
    if (selectedProblem?.id === id) setView('list');
  };

  if (view === 'create') {
    return (
      <div className="max-w-2xl">
        <div className="flex items-center gap-2 mb-4">
          <Button variant="ghost" size="sm" onClick={() => setView('list')}>← Back</Button>
          <h3 className="text-lg font-medium">Create Coding Problem</h3>
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-sm text-muted-foreground mb-1 block">Title *</label>
            <Input placeholder="e.g. Two Sum" value={newProblem.title} onChange={e => setNewProblem({ ...newProblem, title: e.target.value })} />
          </div>
          <div>
            <label className="text-sm text-muted-foreground mb-1 block">Description *</label>
            <Textarea placeholder="Problem description..." value={newProblem.description} onChange={e => setNewProblem({ ...newProblem, description: e.target.value })} rows={6} />
          </div>
          <div>
            <label className="text-sm text-muted-foreground mb-1 block">Constraints</label>
            <Textarea placeholder="e.g. 1 ≤ n ≤ 10^5" value={newProblem.constraints} onChange={e => setNewProblem({ ...newProblem, constraints: e.target.value })} rows={2} />
          </div>
          <div>
            <label className="text-sm text-muted-foreground mb-1 block">Difficulty</label>
            <Select value={newProblem.difficulty} onValueChange={v => setNewProblem({ ...newProblem, difficulty: v })}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="easy">Easy</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="hard">Hard</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="pt-4 border-t border-border">
            <p className="text-sm font-medium mb-3">Test Cases ({newTestCases.length})</p>
            {newTestCases.map((tc, i) => (
              <div key={i} className="border border-border rounded-lg p-3 mb-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Test Case {i + 1}</span>
                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-1 text-xs text-muted-foreground cursor-pointer">
                      <input type="checkbox" checked={tc.is_hidden} onChange={e => {
                        const u = [...newTestCases]; u[i].is_hidden = e.target.checked; setNewTestCases(u);
                      }} className="accent-foreground" />
                      Hidden
                    </label>
                    {newTestCases.length > 1 && (
                      <button onClick={() => setNewTestCases(newTestCases.filter((_, idx) => idx !== i))} className="text-danger">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Input</label>
                  <Textarea placeholder="Input..." value={tc.input} onChange={e => { const u = [...newTestCases]; u[i].input = e.target.value; setNewTestCases(u); }} rows={2} className="font-mono text-sm" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Expected Output</label>
                  <Textarea placeholder="Expected output..." value={tc.expected_output} onChange={e => { const u = [...newTestCases]; u[i].expected_output = e.target.value; setNewTestCases(u); }} rows={2} className="font-mono text-sm" />
                </div>
              </div>
            ))}
            <Button variant="outline" onClick={() => setNewTestCases([...newTestCases, { input: '', expected_output: '', is_hidden: false }])} className="w-full border-dashed">
              <Plus className="w-4 h-4 mr-1" /> Add Test Case
            </Button>
          </div>
          <Button onClick={createProblem} className="w-full mt-4">
            <Save className="w-4 h-4 mr-1" /> Create Problem
          </Button>
        </div>
      </div>
    );
  }

  if (view === 'detail' && selectedProblem) {
    return (
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Button variant="ghost" size="sm" onClick={() => setView('list')}>← Back</Button>
          <h3 className="text-lg font-medium">{selectedProblem.title}</h3>
          <span className="text-xs capitalize text-muted-foreground">{selectedProblem.difficulty}</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Test Cases */}
          <div>
            <h4 className="text-sm font-medium mb-2">Test Cases ({problemTestCases.length})</h4>
            <div className="space-y-2">
              {problemTestCases.map((tc, i) => (
                <div key={tc.id} className="border border-border rounded-lg p-3 text-sm">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-muted-foreground">Test {i + 1}</span>
                    {tc.is_hidden && <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground">Hidden</span>}
                  </div>
                  <div className="font-mono text-xs space-y-1">
                    <div><span className="text-muted-foreground">In: </span>{tc.input}</div>
                    <div><span className="text-muted-foreground">Out: </span>{tc.expected_output}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Submissions */}
          <div>
            <h4 className="text-sm font-medium mb-2">Submissions ({submissions.length})</h4>
            <div className="space-y-2">
              {submissions.map((sub) => (
                <div key={sub.id} className="border border-border rounded-lg p-3 text-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-1.5 py-0.5 rounded ${
                        sub.status === 'accepted' ? 'bg-success/10 text-success' : 'bg-destructive/10 text-danger'
                      }`}>{sub.status}</span>
                      <span className="text-xs text-muted-foreground">{sub.language}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">{sub.passed_count}/{sub.total_count} · {new Date(sub.created_at).toLocaleString()}</span>
                  </div>
                </div>
              ))}
              {submissions.length === 0 && <p className="text-xs text-muted-foreground">No submissions yet.</p>}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-medium">Coding Problems</h3>
          <p className="text-sm text-muted-foreground">{problems.length} problems</p>
        </div>
        <Button size="sm" onClick={() => setView('create')}>
          <Plus className="w-4 h-4 mr-1" /> New Problem
        </Button>
      </div>

      <div className="space-y-2">
        {problems.map((problem) => (
          <div key={problem.id} className="border border-border rounded-lg p-4 flex items-center justify-between">
            <div className="cursor-pointer flex-1" onClick={() => fetchProblemDetail(problem)}>
              <p className="font-medium text-sm">{problem.title}</p>
              <p className="text-xs text-muted-foreground capitalize">{problem.difficulty} · {problem.is_active ? 'Active' : 'Inactive'}</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => toggleProblemActive(problem.id, problem.is_active)}
                className={`flex items-center gap-1 px-2 py-1 rounded text-xs ${problem.is_active ? 'text-success' : 'text-muted-foreground'}`}>
                {problem.is_active ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
              </button>
              <Button size="sm" variant="ghost" onClick={() => fetchProblemDetail(problem)}>
                <Eye className="w-3.5 h-3.5" />
              </Button>
              <Button size="sm" variant="ghost" onClick={() => deleteProblem(problem.id)}>
                <Trash2 className="w-3.5 h-3.5 text-danger" />
              </Button>
            </div>
          </div>
        ))}
        {problems.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No coding problems yet.</p>}
      </div>
    </div>
  );
};

export default CodingProblemsAdmin;
