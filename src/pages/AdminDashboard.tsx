import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Shield, Users, BookOpen, AlertTriangle, Eye, Download, Filter, LogOut, Plus, Trash2, Bell, Activity, Clock, BarChart3, ToggleLeft, ToggleRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { motion, AnimatePresence } from 'framer-motion';
import { getRiskColor, getRiskBg } from '@/lib/credibilityEngine';
import { toast } from 'sonner';
import jsPDF from 'jspdf';

const fadeUp = (i: number) => ({
  initial: { opacity: 0, y: 5 },
  animate: { opacity: 1, y: 0 },
  transition: { delay: i * 0.03 },
});

const AdminDashboard = () => {
  const { user, role, signOut } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'overview' | 'attempts' | 'exams' | 'create' | 'students' | 'live'>('overview');
  const [attempts, setAttempts] = useState<any[]>([]);
  const [exams, setExams] = useState<any[]>([]);
  const [violations, setViolations] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [riskFilter, setRiskFilter] = useState<string>('all');
  const [snapshots, setSnapshots] = useState<any[]>([]);
  const [selectedAttempt, setSelectedAttempt] = useState<string | null>(null);
  const [liveViolations, setLiveViolations] = useState<any[]>([]);

  // New exam form
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

  // Real-time violation feed
  const setupRealtime = useCallback(() => {
    const channel = supabase
      .channel('admin-live')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'violations' }, (payload) => {
        setLiveViolations(prev => [payload.new as any, ...prev].slice(0, 50));
        setViolations(prev => [payload.new as any, ...prev]);
        toast.warning(`New violation: ${(payload.new as any).type}`, { duration: 3000 });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'exam_attempts' }, () => {
        fetchData();
      })
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

  const filteredAttempts = riskFilter === 'all'
    ? attempts
    : attempts.filter((a) => a.risk_level === riskFilter);

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
        validQuestions.map((q, i) => ({
          exam_id: exam.id,
          question_text: q.question_text,
          options: q.options,
          correct_option: q.correct_option,
          order_index: i,
        }))
      );
    }

    toast.success('Exam created successfully!');
    setNewExam({ title: '', description: '', duration_minutes: 60 });
    setNewQuestions([{ question_text: '', options: ['', '', '', ''], correct_option: 0 }]);
    setActiveTab('exams');
    fetchData();
  };

  const tabs = [
    { key: 'overview', label: 'Overview', icon: BarChart3 },
    { key: 'live', label: 'Live Feed', icon: Activity },
    { key: 'attempts', label: 'Attempts', icon: Eye },
    { key: 'exams', label: 'Exams', icon: BookOpen },
    { key: 'create', label: 'Create', icon: Plus },
    { key: 'students', label: 'Students', icon: Users },
  ] as const;

  // Overview stats
  const totalStudents = profiles.length;
  const totalAttempts = attempts.length;
  const highRiskCount = attempts.filter(a => a.risk_level === 'high').length;
  const inProgressCount = attempts.filter(a => a.status === 'in_progress').length;

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
            <span className="text-xs font-mono px-2 py-1 rounded bg-primary/10 text-primary">ADMIN</span>
          </div>
          <div className="flex items-center gap-3">
            {liveViolations.length > 0 && (
              <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-danger/10 text-danger text-xs animate-pulse">
                <Bell className="w-3 h-3" /> {liveViolations.length} new
              </div>
            )}
            <Button variant="ghost" size="sm" onClick={async () => { await signOut(); navigate('/auth'); }} className="text-muted-foreground">
              <LogOut className="w-4 h-4 mr-2" /> Sign Out
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        <h1 className="text-3xl font-bold text-foreground mb-6">Admin Dashboard</h1>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.key ? 'gradient-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              {[
                { label: 'Total Students', value: totalStudents, icon: Users, color: 'text-primary' },
                { label: 'Total Attempts', value: totalAttempts, icon: BookOpen, color: 'text-foreground' },
                { label: 'High Risk', value: highRiskCount, icon: AlertTriangle, color: 'text-danger' },
                { label: 'In Progress', value: inProgressCount, icon: Clock, color: 'text-warning' },
              ].map((stat, i) => (
                <motion.div key={i} {...fadeUp(i)} className="glass-card p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">{stat.label}</p>
                      <p className={`text-3xl font-bold mt-1 ${stat.color}`}>{stat.value}</p>
                    </div>
                    <stat.icon className={`w-8 h-8 ${stat.color} opacity-30`} />
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Recent high-risk attempts */}
            <h3 className="text-lg font-semibold text-foreground mb-3">Recent High-Risk Attempts</h3>
            <div className="space-y-2 mb-8">
              {attempts.filter(a => a.risk_level === 'high').slice(0, 5).map((attempt, i) => {
                const profile = profiles.find(p => p.user_id === attempt.user_id);
                return (
                  <motion.div key={attempt.id} {...fadeUp(i)} className="glass-card p-4 flex items-center justify-between border border-danger/20">
                    <div>
                      <p className="font-medium text-foreground">{profile?.full_name || 'Unknown'}</p>
                      <p className="text-xs text-muted-foreground">{(attempt as any).exams?.title} • {new Date(attempt.started_at).toLocaleString()}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-danger font-bold">{attempt.credibility_score ?? '—'}/100</span>
                      <Button size="sm" variant="outline" onClick={() => { setActiveTab('attempts'); viewAttemptDetails(attempt.id); }}>
                        <Eye className="w-4 h-4" />
                      </Button>
                    </div>
                  </motion.div>
                );
              })}
              {attempts.filter(a => a.risk_level === 'high').length === 0 && (
                <div className="glass-card p-6 text-center text-muted-foreground">No high-risk attempts yet.</div>
              )}
            </div>

            {/* Recent violations */}
            <h3 className="text-lg font-semibold text-foreground mb-3">Recent Violations</h3>
            <div className="glass-card p-4 max-h-64 overflow-y-auto">
              {violations.slice(0, 20).map((v, i) => (
                <div key={v.id} className="flex items-center gap-3 py-2 border-b border-border/30 last:border-0 text-sm">
                  <span className="font-mono text-xs text-muted-foreground w-20">{new Date(v.created_at).toLocaleTimeString()}</span>
                  <span className={`px-1.5 py-0.5 rounded text-xs ${
                    v.severity === 'critical' ? 'bg-danger/20 text-danger' :
                    v.severity === 'high' ? 'bg-warning/20 text-warning' :
                    'bg-secondary text-secondary-foreground'
                  }`}>{v.severity}</span>
                  <span className="text-foreground">{v.type}</span>
                  <span className="text-muted-foreground truncate">{v.details}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Live Feed Tab */}
        {activeTab === 'live' && (
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-3 h-3 rounded-full bg-danger animate-pulse" />
              <h3 className="text-lg font-semibold text-foreground">Live Violation Feed</h3>
              <span className="text-sm text-muted-foreground">({liveViolations.length} events this session)</span>
            </div>
            <div className="glass-card p-4 max-h-[600px] overflow-y-auto space-y-2">
              {liveViolations.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  <Activity className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>Waiting for live violations...</p>
                  <p className="text-xs mt-1">Violations will appear here in real-time.</p>
                </div>
              )}
              <AnimatePresence>
                {liveViolations.map((v: any, i) => (
                  <motion.div
                    key={v.id || i}
                    initial={{ opacity: 0, x: -20, height: 0 }}
                    animate={{ opacity: 1, x: 0, height: 'auto' }}
                    className={`flex items-center gap-3 p-3 rounded-lg border ${
                      v.severity === 'critical' ? 'bg-danger/5 border-danger/30' :
                      v.severity === 'high' ? 'bg-warning/5 border-warning/30' :
                      'bg-secondary/30 border-border/30'
                    }`}
                  >
                    <AlertTriangle className={`w-4 h-4 shrink-0 ${
                      v.severity === 'critical' ? 'text-danger' : v.severity === 'high' ? 'text-warning' : 'text-muted-foreground'
                    }`} />
                    <span className="font-mono text-xs text-muted-foreground">{new Date(v.created_at).toLocaleTimeString()}</span>
                    <span className="font-medium text-foreground text-sm">{v.type}</span>
                    <span className="text-sm text-muted-foreground truncate">{v.details}</span>
                    <span className={`ml-auto px-2 py-0.5 rounded text-xs ${
                      v.severity === 'critical' ? 'bg-danger/20 text-danger' :
                      v.severity === 'high' ? 'bg-warning/20 text-warning' :
                      'bg-secondary text-secondary-foreground'
                    }`}>{v.severity}</span>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        )}

        {/* Attempts Tab */}
        {activeTab === 'attempts' && (
          <div>
            <div className="flex gap-2 mb-4 items-center">
              <Filter className="w-5 h-5 text-muted-foreground" />
              {['all', 'low', 'medium', 'high'].map((level) => (
                <button
                  key={level}
                  onClick={() => setRiskFilter(level)}
                  className={`px-3 py-1 rounded-lg text-sm transition-all ${
                    riskFilter === level ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'
                  }`}
                >
                  {level.charAt(0).toUpperCase() + level.slice(1)}
                </button>
              ))}
              <span className="ml-auto text-sm text-muted-foreground">{filteredAttempts.length} result(s)</span>
            </div>

            <div className="space-y-3">
              {filteredAttempts.map((attempt, i) => {
                const profile = profiles.find(p => p.user_id === attempt.user_id);
                return (
                  <motion.div key={attempt.id} {...fadeUp(i)}
                    className={`glass-card p-5 border ${attempt.risk_level ? getRiskBg(attempt.risk_level) : 'border-border/50'}`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-foreground">{profile?.full_name || attempt.user_id?.slice(0, 8) + '...'}</h4>
                        <p className="text-sm text-muted-foreground">
                          {profile?.email && <span className="mr-2">{profile.email}</span>}
                          {(attempt as any).exams?.title} • {new Date(attempt.started_at).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="font-bold text-foreground">{attempt.score ?? '—'}%</p>
                          <p className="text-xs text-muted-foreground">Cred: {attempt.credibility_score ?? '—'}</p>
                        </div>
                        {attempt.risk_level && (
                          <span className={`px-2 py-1 rounded text-xs font-mono ${getRiskColor(attempt.risk_level)} ${getRiskBg(attempt.risk_level)}`}>
                            {attempt.risk_level.toUpperCase()}
                          </span>
                        )}
                        <Button size="sm" variant="outline" onClick={() => viewAttemptDetails(attempt.id)}>
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => exportPDF(attempt)}>
                          <Download className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Expanded details */}
                    <AnimatePresence>
                      {selectedAttempt === attempt.id && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="mt-4 pt-4 border-t border-border overflow-hidden"
                        >
                          <h5 className="font-semibold text-foreground mb-3">Proctoring Snapshots</h5>
                          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2 mb-4">
                            {snapshots.map((snap) => (
                              <div key={snap.id} className={`rounded-lg overflow-hidden border-2 ${snap.anomaly_detected ? 'border-danger' : 'border-border'}`}>
                                <img src={snap.image_data} alt="Snapshot" className="w-full h-20 object-cover" />
                                <div className="p-1 text-xs text-center bg-card">
                                  <span className={snap.anomaly_detected ? 'text-danger' : 'text-success'}>
                                    {snap.face_count} face(s) {!snap.is_centered && '⚠️'}
                                  </span>
                                </div>
                              </div>
                            ))}
                            {snapshots.length === 0 && <p className="text-sm text-muted-foreground col-span-6">No snapshots captured</p>}
                          </div>

                          <h5 className="font-semibold text-foreground mb-2">Violation Log</h5>
                          <div className="space-y-1 max-h-48 overflow-y-auto">
                            {violations.filter((v) => v.attempt_id === attempt.id).map((v) => (
                              <div key={v.id} className="flex items-center gap-2 text-xs py-1">
                                <span className="font-mono text-muted-foreground w-20">{new Date(v.created_at).toLocaleTimeString()}</span>
                                <span className={`px-1.5 py-0.5 rounded text-xs ${
                                  v.severity === 'critical' ? 'bg-danger/20 text-danger' :
                                  v.severity === 'high' ? 'bg-warning/20 text-warning' :
                                  'bg-secondary text-secondary-foreground'
                                }`}>{v.severity}</span>
                                <span className="text-foreground">{v.type}: {v.details}</span>
                              </div>
                            ))}
                            {violations.filter((v) => v.attempt_id === attempt.id).length === 0 && (
                              <p className="text-sm text-muted-foreground">No violations recorded</p>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
              {filteredAttempts.length === 0 && (
                <div className="glass-card p-8 text-center text-muted-foreground">No attempts match the current filter.</div>
              )}
            </div>
          </div>
        )}

        {/* Exams Tab */}
        {activeTab === 'exams' && (
          <div className="space-y-3">
            {exams.map((exam, i) => (
              <motion.div key={exam.id} {...fadeUp(i)} className="glass-card p-5 flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-foreground">{exam.title}</h4>
                  <p className="text-sm text-muted-foreground">{exam.description}</p>
                  <p className="text-xs text-muted-foreground mt-1">{exam.total_questions} questions • {exam.duration_minutes} min • Created {new Date(exam.created_at).toLocaleDateString()}</p>
                </div>
                <div className="flex items-center gap-3">
                  <button onClick={() => toggleExamActive(exam.id, exam.is_active)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-all ${
                      exam.is_active ? 'bg-success/10 text-success hover:bg-success/20' : 'bg-muted text-muted-foreground hover:bg-muted/80'
                    }`}>
                    {exam.is_active ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                    {exam.is_active ? 'Active' : 'Inactive'}
                  </button>
                  <Button size="sm" variant="outline" className="text-danger border-danger/30 hover:bg-danger/10" onClick={() => deleteExam(exam.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </motion.div>
            ))}
            {exams.length === 0 && (
              <div className="glass-card p-8 text-center text-muted-foreground">
                No exams created yet. Go to the Create tab to add one.
              </div>
            )}
          </div>
        )}

        {/* Create Exam Tab */}
        {activeTab === 'create' && (
          <div className="glass-card p-6 max-w-2xl">
            <h3 className="text-xl font-semibold text-foreground mb-6">Create New Exam</h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Exam Title *</label>
                <Input
                  placeholder="e.g. Data Structures Final Exam"
                  value={newExam.title}
                  onChange={(e) => setNewExam({ ...newExam, title: e.target.value })}
                  className="bg-secondary/30 border-border"
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Description</label>
                <Textarea
                  placeholder="Brief description of the exam..."
                  value={newExam.description}
                  onChange={(e) => setNewExam({ ...newExam, description: e.target.value })}
                  className="bg-secondary/30 border-border"
                  rows={3}
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Duration (minutes)</label>
                <Input
                  type="number"
                  value={newExam.duration_minutes}
                  onChange={(e) => setNewExam({ ...newExam, duration_minutes: parseInt(e.target.value) || 60 })}
                  className="bg-secondary/30 border-border w-32"
                />
              </div>

              <div className="pt-4 border-t border-border">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-semibold text-foreground">Questions ({newQuestions.length})</h4>
                </div>
                {newQuestions.map((q, qi) => (
                  <div key={qi} className="p-4 rounded-lg bg-secondary/20 border border-border space-y-3 mb-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-mono text-muted-foreground">Q{qi + 1}</span>
                      {newQuestions.length > 1 && (
                        <button onClick={() => setNewQuestions(newQuestions.filter((_, i) => i !== qi))} className="text-danger hover:text-danger/80">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    <Input
                      placeholder="Question text"
                      value={q.question_text}
                      onChange={(e) => {
                        const updated = [...newQuestions];
                        updated[qi].question_text = e.target.value;
                        setNewQuestions(updated);
                      }}
                      className="bg-secondary/30 border-border"
                    />
                    {q.options.map((opt, oi) => (
                      <div key={oi} className="flex items-center gap-2">
                        <input
                          type="radio"
                          name={`correct-${qi}`}
                          checked={q.correct_option === oi}
                          onChange={() => {
                            const updated = [...newQuestions];
                            updated[qi].correct_option = oi;
                            setNewQuestions(updated);
                          }}
                          className="accent-primary"
                        />
                        <Input
                          placeholder={`Option ${String.fromCharCode(65 + oi)}`}
                          value={opt}
                          onChange={(e) => {
                            const updated = [...newQuestions];
                            updated[qi].options[oi] = e.target.value;
                            setNewQuestions(updated);
                          }}
                          className="bg-secondary/30 border-border flex-1"
                        />
                      </div>
                    ))}
                  </div>
                ))}

                <Button
                  variant="outline"
                  onClick={() => setNewQuestions([...newQuestions, { question_text: '', options: ['', '', '', ''], correct_option: 0 }])}
                  className="w-full border-dashed border-border"
                >
                  <Plus className="w-4 h-4 mr-2" /> Add Question
                </Button>
              </div>

              <Button onClick={createExam} className="w-full gradient-primary text-primary-foreground mt-4 h-12 text-base">
                Create Exam
              </Button>
            </div>
          </div>
        )}

        {/* Students Tab */}
        {activeTab === 'students' && (
          <div>
            <h3 className="text-lg font-semibold text-foreground mb-4">Registered Students ({profiles.length})</h3>
            <div className="space-y-2">
              {profiles.map((p, i) => {
                const studentAttempts = attempts.filter(a => a.user_id === p.user_id);
                const avgScore = studentAttempts.length > 0
                  ? Math.round(studentAttempts.filter(a => a.score != null).reduce((s, a) => s + (a.score || 0), 0) / (studentAttempts.filter(a => a.score != null).length || 1))
                  : 0;
                return (
                  <motion.div key={p.id} {...fadeUp(i)} className="glass-card p-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center text-primary-foreground font-bold">
                        {(p.full_name || 'S')[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{p.full_name || 'Unknown'}</p>
                        <p className="text-xs text-muted-foreground">{p.email} • Joined {new Date(p.created_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <div className="text-right">
                        <p className="font-medium text-foreground">{studentAttempts.length}</p>
                        <p className="text-xs text-muted-foreground">Attempts</p>
                      </div>
                      <div className="text-right">
                        <p className={`font-medium ${avgScore >= 70 ? 'text-success' : avgScore >= 50 ? 'text-warning' : 'text-danger'}`}>
                          {studentAttempts.length > 0 ? `${avgScore}%` : '—'}
                        </p>
                        <p className="text-xs text-muted-foreground">Avg Score</p>
                      </div>
                    </div>
                  </motion.div>
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
