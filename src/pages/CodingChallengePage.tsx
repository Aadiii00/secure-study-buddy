import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import Editor from '@monaco-editor/react';
import { Play, Send, ArrowLeft, Clock, CheckCircle2, XCircle, Loader2, ChevronDown, ChevronUp, History } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';

const LANGUAGES = [
  { value: 'python', label: 'Python', monacoId: 'python' },
  { value: 'javascript', label: 'JavaScript', monacoId: 'javascript' },
  { value: 'java', label: 'Java', monacoId: 'java' },
  { value: 'cpp', label: 'C++', monacoId: 'cpp' },
];

const DEFAULT_CODE: Record<string, string> = {
  python: '# Write your solution here\n\ndef solve():\n    pass\n\nsolve()',
  javascript: '// Write your solution here\n\nfunction solve() {\n  \n}\n\nsolve();',
  java: '// Write your solution here\n\nimport java.util.*;\n\npublic class Solution {\n    public static void main(String[] args) {\n        \n    }\n}',
  cpp: '// Write your solution here\n\n#include <iostream>\nusing namespace std;\n\nint main() {\n    \n    return 0;\n}',
};

const difficultyColors: Record<string, string> = {
  easy: 'text-success',
  medium: 'text-warning',
  hard: 'text-danger',
};

const CodingChallengePage = () => {
  const { problemId } = useParams<{ problemId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [problem, setProblem] = useState<any>(null);
  const [testCases, setTestCases] = useState<any[]>([]);
  const [language, setLanguage] = useState('python');
  const [code, setCode] = useState(DEFAULT_CODE.python);
  const [running, setRunning] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [consoleOutput, setConsoleOutput] = useState<any>(null);
  const [consoleOpen, setConsoleOpen] = useState(false);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [activeConsoleTab, setActiveConsoleTab] = useState<'results' | 'history'>('results');

  useEffect(() => {
    if (!user || !problemId) return;
    fetchProblem();
    fetchSubmissions();
  }, [user, problemId]);

  const fetchProblem = async () => {
    const [{ data: prob }, { data: tcs }] = await Promise.all([
      supabase.from('coding_problems').select('*').eq('id', problemId!).single(),
      supabase.from('test_cases').select('*').eq('problem_id', problemId!).order('order_index'),
    ]);
    setProblem(prob);
    setTestCases(tcs || []);
  };

  const fetchSubmissions = async () => {
    const { data } = await supabase
      .from('code_submissions')
      .select('*')
      .eq('problem_id', problemId!)
      .eq('user_id', user!.id)
      .order('created_at', { ascending: false })
      .limit(20);
    setSubmissions(data || []);
  };

  const handleLanguageChange = (lang: string) => {
    setLanguage(lang);
    setCode(DEFAULT_CODE[lang] || '');
  };

  const runCode = async () => {
    setRunning(true);
    setConsoleOpen(true);
    setActiveConsoleTab('results');
    setConsoleOutput(null);
    try {
      const resp = await supabase.functions.invoke('evaluate-code', {
        body: { code, language, problemId, mode: 'run' },
      });
      if (resp.error) throw new Error(resp.error.message);
      setConsoleOutput(resp.data);
    } catch (err: any) {
      toast.error(err.message || 'Failed to run code');
      setConsoleOutput({ error: err.message });
    }
    setRunning(false);
  };

  const submitCode = async () => {
    setSubmitting(true);
    setConsoleOpen(true);
    setActiveConsoleTab('results');
    setConsoleOutput(null);
    try {
      // Create submission record first
      const { data: sub, error: subErr } = await supabase
        .from('code_submissions')
        .insert({ user_id: user!.id, problem_id: problemId!, language, code, status: 'pending' })
        .select()
        .single();
      if (subErr) throw subErr;

      const resp = await supabase.functions.invoke('evaluate-code', {
        body: { code, language, problemId, submissionId: sub.id, mode: 'submit' },
      });
      if (resp.error) throw new Error(resp.error.message);
      setConsoleOutput(resp.data);
      fetchSubmissions();
      if (resp.data.overall_status === 'accepted') {
        toast.success('All test cases passed! 🎉');
      } else {
        toast.error(`${resp.data.passed_count}/${resp.data.total_count} test cases passed`);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit');
      setConsoleOutput({ error: err.message });
    }
    setSubmitting(false);
  };

  if (!problem) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-muted/30 shrink-0">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate('/coding')}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h1 className="font-semibold text-sm">{problem.title}</h1>
          <span className={`text-xs font-medium capitalize ${difficultyColors[problem.difficulty]}`}>
            {problem.difficulty}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Select value={language} onValueChange={handleLanguageChange}>
            <SelectTrigger className="w-[140px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LANGUAGES.map(l => (
                <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={runCode} disabled={running || submitting}>
            {running ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Play className="w-4 h-4 mr-1" />}
            Run
          </Button>
          <Button size="sm" onClick={submitCode} disabled={running || submitting}>
            {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Send className="w-4 h-4 mr-1" />}
            Submit
          </Button>
        </div>
      </div>

      {/* Main content */}
      <ResizablePanelGroup direction="horizontal" className="flex-1">
        {/* Left: Problem description */}
        <ResizablePanel defaultSize={40} minSize={25}>
          <div className="h-full overflow-y-auto p-6">
            <h2 className="text-lg font-semibold mb-2">{problem.title}</h2>
            <span className={`text-xs font-medium capitalize px-2 py-0.5 rounded-full border ${
              problem.difficulty === 'easy' ? 'border-success/20 bg-success/10 text-success' :
              problem.difficulty === 'medium' ? 'border-warning/20 bg-warning/10 text-warning' :
              'border-danger/20 bg-destructive/10 text-danger'
            }`}>{problem.difficulty}</span>

            <div className="mt-4 prose prose-sm max-w-none">
              <div className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{problem.description}</div>
            </div>

            {problem.constraints && (
              <div className="mt-6">
                <h3 className="text-sm font-semibold mb-2">Constraints</h3>
                <div className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-3 font-mono whitespace-pre-wrap">
                  {problem.constraints}
                </div>
              </div>
            )}

            {/* Sample test cases */}
            {testCases.length > 0 && (
              <div className="mt-6">
                <h3 className="text-sm font-semibold mb-3">Examples</h3>
                {testCases.map((tc, i) => (
                  <div key={tc.id} className="mb-4 border border-border rounded-lg overflow-hidden">
                    <div className="bg-muted/50 px-3 py-1.5 text-xs font-medium text-muted-foreground">Example {i + 1}</div>
                    <div className="p-3 space-y-2">
                      <div>
                        <span className="text-xs font-medium text-muted-foreground">Input:</span>
                        <pre className="mt-1 text-sm font-mono bg-muted/30 rounded p-2 overflow-x-auto">{tc.input}</pre>
                      </div>
                      <div>
                        <span className="text-xs font-medium text-muted-foreground">Output:</span>
                        <pre className="mt-1 text-sm font-mono bg-muted/30 rounded p-2 overflow-x-auto">{tc.expected_output}</pre>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* Right: Editor + Console */}
        <ResizablePanel defaultSize={60} minSize={35}>
          <ResizablePanelGroup direction="vertical">
            {/* Code editor */}
            <ResizablePanel defaultSize={consoleOpen ? 60 : 100} minSize={30}>
              <Editor
                height="100%"
                language={LANGUAGES.find(l => l.value === language)?.monacoId || 'python'}
                value={code}
                onChange={(val) => setCode(val || '')}
                theme="vs-dark"
                options={{
                  minimap: { enabled: false },
                  fontSize: 14,
                  fontFamily: "'JetBrains Mono', monospace",
                  padding: { top: 16 },
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                }}
              />
            </ResizablePanel>

            {consoleOpen && (
              <>
                <ResizableHandle withHandle />
                {/* Console output */}
                <ResizablePanel defaultSize={40} minSize={15}>
                  <div className="h-full flex flex-col bg-[hsl(220,20%,6%)]">
                    <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/30">
                      <div className="flex gap-1">
                        <button
                          onClick={() => setActiveConsoleTab('results')}
                          className={`text-xs px-2 py-1 rounded ${activeConsoleTab === 'results' ? 'bg-primary/20 text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                        >Test Results</button>
                        <button
                          onClick={() => setActiveConsoleTab('history')}
                          className={`text-xs px-2 py-1 rounded flex items-center gap-1 ${activeConsoleTab === 'history' ? 'bg-primary/20 text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                        ><History className="w-3 h-3" /> History</button>
                      </div>
                      <button onClick={() => setConsoleOpen(false)} className="text-muted-foreground hover:text-foreground">
                        <ChevronDown className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-3 text-sm font-mono">
                      {activeConsoleTab === 'results' && (
                        <>
                          {!consoleOutput && (
                            <p className="text-muted-foreground text-xs">Run or submit your code to see results...</p>
                          )}
                          {consoleOutput?.error && (
                            <div className="text-danger text-xs">{consoleOutput.error}</div>
                          )}
                          {consoleOutput?.results && (
                            <div className="space-y-2">
                              <div className="flex items-center gap-2 mb-3">
                                <span className={`text-sm font-medium ${
                                  consoleOutput.overall_status === 'accepted' ? 'text-success' : 'text-danger'
                                }`}>
                                  {consoleOutput.overall_status === 'accepted' ? 'Accepted' : consoleOutput.overall_status?.replace('_', ' ')}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {consoleOutput.passed_count}/{consoleOutput.total_count} passed
                                </span>
                                {consoleOutput.execution_time_ms > 0 && (
                                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                                    <Clock className="w-3 h-3" /> {consoleOutput.execution_time_ms}ms
                                  </span>
                                )}
                              </div>
                              {consoleOutput.results.map((r: any, i: number) => (
                                <div key={i} className={`border rounded-lg p-2 ${
                                  r.passed ? 'border-success/30 bg-success/5' : 'border-danger/30 bg-destructive/5'
                                }`}>
                                  <div className="flex items-center gap-2 mb-1">
                                    {r.passed ? <CheckCircle2 className="w-3.5 h-3.5 text-success" /> : <XCircle className="w-3.5 h-3.5 text-danger" />}
                                    <span className="text-xs font-medium text-foreground">
                                      {r.is_hidden ? `Hidden Test ${i + 1}` : `Test ${i + 1}`}
                                    </span>
                                    <span className={`text-xs ${r.passed ? 'text-success' : 'text-danger'}`}>
                                      {r.status?.replace('_', ' ')}
                                    </span>
                                  </div>
                                  {!r.is_hidden && (
                                    <div className="mt-1 space-y-1 text-xs">
                                      <div><span className="text-muted-foreground">Input: </span><span className="text-foreground">{r.input}</span></div>
                                      <div><span className="text-muted-foreground">Expected: </span><span className="text-foreground">{r.expected_output}</span></div>
                                      <div><span className="text-muted-foreground">Output: </span><span className={r.passed ? 'text-success' : 'text-danger'}>{r.actual_output}</span></div>
                                      {r.error && <div className="text-danger">Error: {r.error}</div>}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </>
                      )}

                      {activeConsoleTab === 'history' && (
                        <div className="space-y-2">
                          {submissions.length === 0 && (
                            <p className="text-muted-foreground text-xs">No submissions yet.</p>
                          )}
                          {submissions.map((sub) => (
                            <div key={sub.id} className="border border-border/30 rounded-lg p-2 flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                {sub.status === 'accepted' ? (
                                  <CheckCircle2 className="w-3.5 h-3.5 text-success" />
                                ) : (
                                  <XCircle className="w-3.5 h-3.5 text-danger" />
                                )}
                                <span className="text-xs text-foreground capitalize">{sub.status?.replace('_', ' ')}</span>
                                <span className="text-xs text-muted-foreground">{sub.language}</span>
                              </div>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <span>{sub.passed_count}/{sub.total_count}</span>
                                <span>{new Date(sub.created_at).toLocaleString()}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </ResizablePanel>
              </>
            )}
          </ResizablePanelGroup>
          {!consoleOpen && (
            <button
              onClick={() => setConsoleOpen(true)}
              className="absolute bottom-0 right-0 left-[40%] flex items-center justify-center gap-1 py-1.5 text-xs text-muted-foreground hover:text-foreground bg-muted/50 border-t border-border"
            >
              <ChevronUp className="w-3 h-3" /> Console
            </button>
          )}
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
};

export default CodingChallengePage;
