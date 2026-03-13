import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Shield, Users, BookOpen, AlertTriangle, Eye, Download, Filter, LogOut, Plus, Trash2, Activity, Clock, BarChart3, ToggleLeft, ToggleRight, Code2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { AnimatePresence, motion } from 'framer-motion';
import { getRiskColor, getRiskBg } from '@/lib/credibilityEngine';
import ViolationCharts from '@/components/admin/ViolationCharts';
import CodingProblemsAdmin from '@/components/admin/CodingProblemsAdmin';
import LiveProctoringGrid from '@/components/admin/LiveProctoringGrid';
import { toast } from 'sonner';
import jsPDF from 'jspdf';

const AdminDashboard = () => {
  const { user, role, signOut } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'overview' | 'attempts' | 'exams' | 'create' | 'students' | 'live' | 'coding'>('overview');
  const [attempts, setAttempts] = useState<any[]>([]);
  const [exams, setExams] = useState<any[]>([]);
  const [violations, setViolations] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [riskFilter, setRiskFilter] = useState<string>('all');
  const [snapshots, setSnapshots] = useState<any[]>([]);
  const [selectedAttempt, setSelectedAttempt] = useState<string | null>(null);
  const [liveViolations, setLiveViolations] = useState<any[]>([]);
  const [newExam, setNewExam] = useState({ title: '', description: '', duration_minutes: 60 });
  const [newQuestions, setNewQuestions] = useState<{ question_text: string; options: string[]; correct_option: number }[]>([
    { question_text: '', options: ['', '', '', ''], correct_option: 0 },
  ]);

  useEffect(() => {
    if (!user) { navigate('/auth'); return; }
    if (role !== 'admin') { navigate('/dashboard'); return; }
    fetchData();
    setupRealtime();
  }, [user, role]);

  const fetchData = async () => {
    const [{ data: attemptsData }, { data: examsData }, { data: violationsData }, { data: profilesData }] = await Promise.all([
      supabase.from('exam_attempts').select('*, exams(title)').order('created_at', { ascending: false }),
      supabase.from('exams').select('*').order('created_at', { ascending: false }),
      supabase.from('violations').select('*').order('created_at', { ascending: false }).limit(200),
      supabase.from('profiles').select('*').order('created_at', { ascending: false }),
    ]);
    setAttempts(attemptsData || []);
    setExams(examsData || []);
    setViolations(violationsData || []);
    setProfiles(profilesData || []);
  };

  const setupRealtime = useCallback(() => {
    const channel = supabase
      .channel('admin-live')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'violations' }, (payload) => {
        setLiveViolations(prev => [payload.new as any, ...prev].slice(0, 50));
        setViolations(prev => [payload.new as any, ...prev]);
        toast.warning(`New violation: ${(payload.new as any).type}`, { duration: 3000 });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'exam_attempts' }, () => { fetchData(); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const viewAttemptDetails = async (attemptId: string) => {
    setSelectedAttempt(selectedAttempt === attemptId ? null : attemptId);
    if (selectedAttempt !== attemptId) {
      const { data } = await supabase.from('proctoring_snapshots').select('*').eq('attempt_id', attemptId).order('created_at');
      setSnapshots(data || []);
    }
  };

  const toggleExamActive = async (examId: string, currentActive: boolean) => {
    await supabase.from('exams').update({ is_active: !currentActive }).eq('id', examId);
    toast.success(currentActive ? 'Exam deactivated' : 'Exam activated');
    fetchData();
  };

  const deleteExam = async (examId: string) => {
    await supabase.from('questions').delete().eq('exam_id', examId);
    await supabase.from('exams').delete().eq('id', examId);
    toast.success('Exam deleted');
    fetchData();
  };

  const filteredAttempts = riskFilter === 'all' ? attempts : attempts.filter((a) => a.risk_level === riskFilter);

  const exportPDF = (attempt: any) => {
    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.text('Credibility Report', 20, 20);
    doc.setFontSize(12);
    const profile = profiles.find(p => p.user_id === attempt.user_id);
    doc.text(`Student: ${profile?.full_name || attempt.user_id?.slice(0, 8)}`, 20, 35);
    doc.text(`Email: ${profile?.email || 'N/A'}`, 20, 45);
    doc.text(`Exam: ${(attempt as any).exams?.title || 'Unknown'}`, 20, 55);
    doc.text(`Score: ${attempt.score ?? 'N/A'}%`, 20, 65);
    doc.text(`Credibility: ${attempt.credibility_score ?? 'N/A'}/100`, 20, 75);
    doc.text(`Risk Level: ${attempt.risk_level ?? 'N/A'}`, 20, 85);
    doc.text(`Status: ${attempt.status}`, 20, 95);
    doc.text(`Date: ${new Date(attempt.started_at).toLocaleString()}`, 20, 105);
    const attemptViolations = violations.filter((v) => v.attempt_id === attempt.id);
    doc.text(`Total Violations: ${attemptViolations.length}`, 20, 120);
    doc.setFontSize(14);
    doc.text('Violation Log:', 20, 135);
    doc.setFontSize(9);
    attemptViolations.slice(0, 20).forEach((v, i) => {
      if (145 + i * 8 > 280) return;
      doc.text(`${new Date(v.created_at).toLocaleTimeString()} - [${v.severity}] ${v.type}: ${v.details || ''}`, 20, 145 + i * 8);
    });
    doc.save(`credibility-report-${attempt.id.slice(0, 8)}.pdf`);
    toast.success('PDF exported');
  };

  const createExam = async () => {
    if (!newExam.title.trim()) { toast.error('Title is required'); return; }
    const validQuestions = newQuestions.filter((q) => q.question_text.trim());
    const { data: exam, error } = await supabase
      .from('exams')
      .insert({ ...newExam, total_questions: validQuestions.length, created_by: user!.id })
      .select()
      .single();
    if (error) { toast.error('Failed to create exam'); return; }
    if (validQuestions.length > 0) {
      await supabase.from('questions').insert(
        validQuestions.map((q, i) => ({ exam_id: exam.id, question_text: q.question_text, options: q.options, correct_option: q.correct_option, order_index: i }))
      );
    }
    toast.success('Exam created!');
    setNewExam({ title: '', description: '', duration_minutes: 60 });
    setNewQuestions([{ question_text: '', options: ['', '', '', ''], correct_option: 0 }]);
    setActiveTab('exams');
    fetchData();
  };

  const tabs = [
    { key: 'overview', label: 'Overview', icon: BarChart3 },
    { key: 'live', label: 'Live', icon: Activity },
    { key: 'attempts', label: 'Attempts', icon: Eye },
    { key: 'exams', label: 'Exams', icon: BookOpen },
    { key: 'create', label: 'Create', icon: Plus },
    { key: 'students', label: 'Students', icon: Users },
    { key: 'coding', label: 'Coding', icon: Code2 },
  ] as const;

  const totalStudents = profiles.length;
  const totalAttempts = attempts.length;
  const highRiskCount = attempts.filter(a => a.risk_level === 'high').length;
  const inProgressCount = attempts.filter(a => a.status === 'in_progress').length;

  return (
    <div className="min-h-screen">
      <header className="border-b border-border sticky top-0 z-30 bg-background">
        <div className="container mx-auto flex items-center justify-between px-6 py-3">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            <span className="font-semibold">Tracxn<span className="text-red-500">Labs</span></span>
            <span className="text-xs px-2 py-0.5 rounded border border-border text-muted-foreground">Admin</span>
          </div>
          <div className="flex items-center gap-3">
            {liveViolations.length > 0 && (
              <span className="text-xs text-danger">{liveViolations.length} new violations</span>
            )}
            <Button variant="ghost" size="sm" onClick={async () => { await signOut(); navigate('/auth'); }}>
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        <h1 className="text-2xl font-semibold mb-6">Dashboard</h1>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 border-b border-border">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${activeTab === tab.key ? 'border-foreground text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Overview */}
        {activeTab === 'overview' && (
          <div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              {[
                { label: 'Students', value: totalStudents },
                { label: 'Attempts', value: totalAttempts },
                { label: 'High Risk', value: highRiskCount },
                { label: 'In Progress', value: inProgressCount },
              ].map((stat, i) => (
                <div key={i} className="border border-border rounded-lg p-4">
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                  <p className="text-2xl font-semibold mt-1">{stat.value}</p>
                </div>
              ))}
            </div>

            <h3 className="text-sm font-medium mb-3">Recent High-Risk Attempts</h3>
            <div className="space-y-2 mb-8">
              {attempts.filter(a => a.risk_level === 'high').slice(0, 5).map((attempt) => {
                const profile = profiles.find(p => p.user_id === attempt.user_id);
                return (
                  <div key={attempt.id} className="border border-border rounded-lg p-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{profile?.full_name || 'Unknown'}</p>
                      <p className="text-xs text-muted-foreground">{(attempt as any).exams?.title} · {new Date(attempt.started_at).toLocaleString()}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-danger">{attempt.credibility_score ?? '—'}/100</span>
                      <Button size="sm" variant="outline" onClick={() => { setActiveTab('attempts'); viewAttemptDetails(attempt.id); }}>
                        <Eye className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })}
              {attempts.filter(a => a.risk_level === 'high').length === 0 && (
                <p className="text-sm text-muted-foreground py-4 text-center">No high-risk attempts.</p>
              )}
            </div>

            <h3 className="text-sm font-medium mb-3">Recent Violations</h3>
            <div className="border border-border rounded-lg divide-y divide-border max-h-64 overflow-y-auto">
              {violations.slice(0, 20).map((v) => (
                <div key={v.id} className="flex items-center gap-3 px-3 py-2 text-sm">
                  <span className="text-xs text-muted-foreground w-16 shrink-0">{new Date(v.created_at).toLocaleTimeString()}</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded ${v.severity === 'critical' ? 'bg-destructive/10 text-danger' :
                      v.severity === 'high' ? 'bg-warning/10 text-warning' :
                        'bg-muted text-muted-foreground'
                    }`}>{v.severity}</span>
                  <span className="text-sm">{v.type}</span>
                  <span className="text-muted-foreground text-xs truncate">{v.details}</span>
                </div>
              ))}
            </div>

            {/* Charts */}
            <h3 className="text-sm font-medium mb-3 mt-8">Analytics</h3>
            <ViolationCharts violations={violations} attempts={attempts} />
          </div>
        )}

        {/* Live Proctoring */}
        {activeTab === 'live' && (
          <div className="space-y-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-2 h-2 rounded-full bg-danger animate-pulse" />
              <span className="text-sm font-medium">Live Proctoring</span>
              <span className="text-xs text-muted-foreground">({inProgressCount} active students)</span>
            </div>

            <LiveProctoringGrid
              activeAttempts={attempts.filter(a => a.status === 'in_progress')}
              profiles={profiles}
              liveViolations={liveViolations}
            />

            <div className="mt-8 pt-6 border-t border-border">
              <h3 className="text-sm font-medium mb-4">Recent Live Alerts</h3>
              <div className="border border-border rounded-lg divide-y divide-border max-h-[300px] overflow-y-auto">
                {liveViolations.length === 0 && (
                  <div className="text-center py-6 text-muted-foreground text-sm">No recent alerts...</div>
                )}
                {liveViolations.map((v: any, i) => (
                  <div key={v.id || i} className="flex items-center gap-3 px-3 py-2 text-sm">
                    <span className="text-xs text-muted-foreground">{new Date(v.created_at).toLocaleTimeString()}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded ${v.severity === 'critical' ? 'bg-destructive/10 text-danger' :
                        v.severity === 'high' ? 'bg-warning/10 text-warning' :
                          'bg-muted text-muted-foreground'
                      }`}>{v.severity}</span>
                    <span className="font-medium">{v.type}</span>
                    <span className="text-muted-foreground truncate">{v.details}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Attempts */}
        {activeTab === 'attempts' && (
          <div>
            <div className="flex gap-2 mb-4 items-center">
              <Filter className="w-4 h-4 text-muted-foreground" />
              {['all', 'low', 'medium', 'high'].map((level) => (
                <button key={level} onClick={() => setRiskFilter(level)}
                  className={`px-3 py-1 rounded text-sm transition-colors ${riskFilter === level ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'
                    }`}>{level.charAt(0).toUpperCase() + level.slice(1)}</button>
              ))}
              <span className="ml-auto text-xs text-muted-foreground">{filteredAttempts.length} results</span>
            </div>
            <div className="space-y-2">
              {filteredAttempts.map((attempt) => {
                const profile = profiles.find(p => p.user_id === attempt.user_id);
                return (
                  <div key={attempt.id} className="border border-border rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">{profile?.full_name || attempt.user_id?.slice(0, 8) + '...'}</p>
                        <p className="text-xs text-muted-foreground">
                          {profile?.email && <span className="mr-2">{profile.email}</span>}
                          {(attempt as any).exams?.title} · {new Date(attempt.started_at).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right text-sm">
                          <p className="font-medium">{attempt.score ?? '—'}%</p>
                          <p className="text-xs text-muted-foreground">Cred: {attempt.credibility_score ?? '—'}</p>
                        </div>
                        {attempt.risk_level && (
                          <span className={`text-xs px-2 py-0.5 rounded-full border ${attempt.risk_level === 'low' ? 'border-success/30 text-success' :
                              attempt.risk_level === 'medium' ? 'border-warning/30 text-warning' :
                                'border-danger/30 text-danger'
                            }`}>{attempt.risk_level}</span>
                        )}
                        <Button size="sm" variant="outline" onClick={() => viewAttemptDetails(attempt.id)}>
                          <Eye className="w-3.5 h-3.5" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => exportPDF(attempt)}>
                          <Download className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>

                    <AnimatePresence>
                      {selectedAttempt === attempt.id && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                          className="mt-4 pt-4 border-t border-border overflow-hidden">
                          <p className="text-sm font-medium mb-2">Snapshots</p>
                          <div className="grid grid-cols-3 md:grid-cols-6 gap-2 mb-4">
                            {snapshots.map((snap) => (
                              <div key={snap.id} className={`rounded overflow-hidden border ${snap.anomaly_detected ? 'border-danger' : 'border-border'}`}>
                                <img src={snap.image_data} alt="Snapshot" className="w-full h-16 object-cover" />
                                <p className={`text-[10px] text-center py-0.5 ${snap.anomaly_detected ? 'text-danger' : 'text-muted-foreground'}`}>
                                  {snap.face_count} face(s)
                                </p>
                              </div>
                            ))}
                            {snapshots.length === 0 && <p className="text-xs text-muted-foreground col-span-6">No snapshots</p>}
                          </div>
                          <p className="text-sm font-medium mb-2">Violations</p>
                          <div className="space-y-1 max-h-48 overflow-y-auto">
                            {violations.filter((v) => v.attempt_id === attempt.id).map((v) => (
                              <div key={v.id} className="flex items-center gap-2 text-xs py-1">
                                <span className="text-muted-foreground w-16">{new Date(v.created_at).toLocaleTimeString()}</span>
                                <span className={`px-1 py-0.5 rounded ${v.severity === 'critical' ? 'bg-destructive/10 text-danger' : v.severity === 'high' ? 'bg-warning/10 text-warning' : 'bg-muted text-muted-foreground'
                                  }`}>{v.severity}</span>
                                <span>{v.type}: {v.details}</span>
                              </div>
                            ))}
                            {violations.filter((v) => v.attempt_id === attempt.id).length === 0 && (
                              <p className="text-xs text-muted-foreground">No violations</p>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
              {filteredAttempts.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-8">No attempts match filter.</p>
              )}
            </div>
          </div>
        )}

        {/* Exams */}
        {activeTab === 'exams' && (
          <div className="space-y-2">
            {exams.map((exam) => (
              <div key={exam.id} className="border border-border rounded-lg p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">{exam.title}</p>
                  <p className="text-xs text-muted-foreground">{exam.total_questions} questions · {exam.duration_minutes} min</p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => toggleExamActive(exam.id, exam.is_active)}
                    className={`flex items-center gap-1 px-2 py-1 rounded text-xs ${exam.is_active ? 'text-success' : 'text-muted-foreground'
                      }`}>
                    {exam.is_active ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                    {exam.is_active ? 'Active' : 'Inactive'}
                  </button>
                  <Button size="sm" variant="ghost" onClick={() => deleteExam(exam.id)}>
                    <Trash2 className="w-3.5 h-3.5 text-danger" />
                  </Button>
                </div>
              </div>
            ))}
            {exams.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No exams yet.</p>}
          </div>
        )}

        {/* Create */}
        {activeTab === 'create' && (
          <div className="max-w-xl">
            <h3 className="text-lg font-medium mb-4">Create Exam</h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Title *</label>
                <Input placeholder="e.g. Data Structures Final" value={newExam.title} onChange={(e) => setNewExam({ ...newExam, title: e.target.value })} />
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Description</label>
                <Textarea placeholder="Brief description..." value={newExam.description} onChange={(e) => setNewExam({ ...newExam, description: e.target.value })} rows={2} />
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Duration (min)</label>
                <Input type="number" value={newExam.duration_minutes} onChange={(e) => setNewExam({ ...newExam, duration_minutes: parseInt(e.target.value) || 60 })} className="w-24" />
              </div>

              <div className="pt-4 border-t border-border">
                <p className="text-sm font-medium mb-3">Questions ({newQuestions.length})</p>
                {newQuestions.map((q, qi) => (
                  <div key={qi} className="border border-border rounded-lg p-4 space-y-3 mb-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Q{qi + 1}</span>
                      {newQuestions.length > 1 && (
                        <button onClick={() => setNewQuestions(newQuestions.filter((_, i) => i !== qi))} className="text-danger"><Trash2 className="w-3.5 h-3.5" /></button>
                      )}
                    </div>
                    <Input placeholder="Question text" value={q.question_text} onChange={(e) => { const u = [...newQuestions]; u[qi].question_text = e.target.value; setNewQuestions(u); }} />
                    {q.options.map((opt, oi) => (
                      <div key={oi} className="flex items-center gap-2">
                        <input type="radio" name={`correct-${qi}`} checked={q.correct_option === oi} onChange={() => { const u = [...newQuestions]; u[qi].correct_option = oi; setNewQuestions(u); }} className="accent-foreground" />
                        <Input placeholder={`Option ${String.fromCharCode(65 + oi)}`} value={opt} onChange={(e) => { const u = [...newQuestions]; u[qi].options[oi] = e.target.value; setNewQuestions(u); }} className="flex-1" />
                      </div>
                    ))}
                  </div>
                ))}
                <Button variant="outline" onClick={() => setNewQuestions([...newQuestions, { question_text: '', options: ['', '', '', ''], correct_option: 0 }])} className="w-full border-dashed">
                  <Plus className="w-4 h-4 mr-1" /> Add Question
                </Button>
              </div>
              <Button onClick={createExam} className="w-full mt-4">Create Exam</Button>
            </div>
          </div>
        )}

        {/* Coding Problems */}
        {activeTab === 'coding' && <CodingProblemsAdmin />}

        {/* Students */}
        {activeTab === 'students' && (
          <div>
            <p className="text-sm text-muted-foreground mb-4">{profiles.length} students</p>
            <div className="space-y-2">
              {profiles.map((p) => {
                const studentAttempts = attempts.filter(a => a.user_id === p.user_id);
                const avgScore = studentAttempts.length > 0
                  ? Math.round(studentAttempts.filter(a => a.score != null).reduce((s, a) => s + (a.score || 0), 0) / (studentAttempts.filter(a => a.score != null).length || 1))
                  : 0;
                return (
                  <div key={p.id} className="border border-border rounded-lg p-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm font-medium">
                        {(p.full_name || 'S')[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{p.full_name || 'Unknown'}</p>
                        <p className="text-xs text-muted-foreground">{p.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <div className="text-right">
                        <p className="font-medium">{studentAttempts.length}</p>
                        <p className="text-xs text-muted-foreground">Attempts</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{studentAttempts.length > 0 ? `${avgScore}%` : '—'}</p>
                        <p className="text-xs text-muted-foreground">Avg</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminDashboard;
