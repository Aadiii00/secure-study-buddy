import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Shield, Users, BookOpen, AlertTriangle, Eye, Download, Filter, LogOut, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { motion } from 'framer-motion';
import { getRiskColor, getRiskBg } from '@/lib/credibilityEngine';
import { toast } from 'sonner';
import jsPDF from 'jspdf';

const AdminDashboard = () => {
  const { user, role, signOut } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'attempts' | 'exams' | 'create'>('attempts');
  const [attempts, setAttempts] = useState<any[]>([]);
  const [exams, setExams] = useState<any[]>([]);
  const [violations, setViolations] = useState<any[]>([]);
  const [riskFilter, setRiskFilter] = useState<string>('all');
  const [snapshots, setSnapshots] = useState<any[]>([]);
  const [selectedAttempt, setSelectedAttempt] = useState<string | null>(null);

  // New exam form
  const [newExam, setNewExam] = useState({ title: '', description: '', duration_minutes: 60 });
  const [newQuestions, setNewQuestions] = useState<{ question_text: string; options: string[]; correct_option: number }[]>([
    { question_text: '', options: ['', '', '', ''], correct_option: 0 },
  ]);

  useEffect(() => {
    if (!user) { navigate('/auth'); return; }
    if (role !== 'admin') { navigate('/dashboard'); return; }
    fetchData();
  }, [user, role]);

  const fetchData = async () => {
    const [{ data: attemptsData }, { data: examsData }, { data: violationsData }] = await Promise.all([
      supabase.from('exam_attempts').select('*, exams(title)').order('created_at', { ascending: false }),
      supabase.from('exams').select('*').order('created_at', { ascending: false }),
      supabase.from('violations').select('*').order('created_at', { ascending: false }).limit(100),
    ]);
    setAttempts(attemptsData || []);
    setExams(examsData || []);
    setViolations(violationsData || []);
  };

  const viewAttemptDetails = async (attemptId: string) => {
    setSelectedAttempt(attemptId);
    const { data } = await supabase.from('proctoring_snapshots').select('*').eq('attempt_id', attemptId).order('created_at');
    setSnapshots(data || []);
  };

  const filteredAttempts = riskFilter === 'all'
    ? attempts
    : attempts.filter((a) => a.risk_level === riskFilter);

  const exportPDF = (attempt: any) => {
    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.text('Credibility Report', 20, 20);
    doc.setFontSize(12);
    doc.text(`Student: ${attempt.user_id?.slice(0, 8)}`, 20, 35);
    doc.text(`Exam: ${(attempt as any).exams?.title || 'Unknown'}`, 20, 45);
    doc.text(`Score: ${attempt.score ?? 'N/A'}%`, 20, 55);
    doc.text(`Credibility: ${attempt.credibility_score ?? 'N/A'}/100`, 20, 65);
    doc.text(`Risk Level: ${attempt.risk_level ?? 'N/A'}`, 20, 75);
    doc.text(`Status: ${attempt.status}`, 20, 85);
    doc.text(`Date: ${new Date(attempt.started_at).toLocaleString()}`, 20, 95);

    const attemptViolations = violations.filter((v) => v.attempt_id === attempt.id);
    doc.text(`Total Violations: ${attemptViolations.length}`, 20, 110);
    attemptViolations.forEach((v, i) => {
      if (125 + i * 10 > 280) return;
      doc.setFontSize(9);
      doc.text(`${new Date(v.created_at).toLocaleTimeString()} - [${v.severity}] ${v.type}: ${v.details}`, 20, 125 + i * 10);
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

    toast.success('Exam created!');
    setNewExam({ title: '', description: '', duration_minutes: 60 });
    setNewQuestions([{ question_text: '', options: ['', '', '', ''], correct_option: 0 }]);
    setActiveTab('exams');
    fetchData();
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
            <span className="text-xs font-mono px-2 py-1 rounded bg-primary/10 text-primary">ADMIN</span>
          </div>
          <Button variant="ghost" size="sm" onClick={async () => { await signOut(); navigate('/auth'); }} className="text-muted-foreground">
            <LogOut className="w-4 h-4 mr-2" /> Sign Out
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        <h1 className="text-3xl font-bold text-foreground mb-6">Admin Dashboard</h1>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {(['attempts', 'exams', 'create'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab ? 'gradient-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
              }`}
            >
              {tab === 'attempts' ? 'Exam Attempts' : tab === 'exams' ? 'Manage Exams' : 'Create Exam'}
            </button>
          ))}
        </div>

        {/* Attempts Tab */}
        {activeTab === 'attempts' && (
          <div>
            {/* Filter */}
            <div className="flex gap-2 mb-4">
              <Filter className="w-5 h-5 text-muted-foreground mt-2" />
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
            </div>

            <div className="space-y-3">
              {filteredAttempts.map((attempt, i) => (
                <motion.div
                  key={attempt.id}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className={`glass-card p-5 border ${attempt.risk_level ? getRiskBg(attempt.risk_level) : ''}`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-foreground">{attempt.user_id?.slice(0, 8)}...</h4>
                      <p className="text-sm text-muted-foreground">
                        {(attempt as any).exams?.title} • {new Date(attempt.started_at).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="font-bold text-foreground">{attempt.score ?? '—'}%</p>
                        {attempt.risk_level && (
                          <p className={`text-xs font-mono ${getRiskColor(attempt.risk_level)}`}>
                            {attempt.risk_level.toUpperCase()}
                          </p>
                        )}
                      </div>
                      <Button size="sm" variant="outline" onClick={() => viewAttemptDetails(attempt.id)}>
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => exportPDF(attempt)}>
                        <Download className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Expanded details */}
                  {selectedAttempt === attempt.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      className="mt-4 pt-4 border-t border-border"
                    >
                      <h5 className="font-semibold text-foreground mb-3">Proctoring Snapshots</h5>
                      <div className="grid grid-cols-4 gap-2 mb-4">
                        {snapshots.map((snap) => (
                          <div key={snap.id} className={`rounded-lg overflow-hidden border-2 ${snap.anomaly_detected ? 'border-danger' : 'border-border'}`}>
                            <img src={snap.image_data} alt="Snapshot" className="w-full h-20 object-cover" />
                            <div className="p-1 text-xs text-center">
                              <span className={snap.anomaly_detected ? 'text-danger' : 'text-success'}>
                                {snap.face_count} face(s)
                              </span>
                            </div>
                          </div>
                        ))}
                        {snapshots.length === 0 && <p className="text-sm text-muted-foreground col-span-4">No snapshots</p>}
                      </div>

                      <h5 className="font-semibold text-foreground mb-2">Violation Log</h5>
                      <div className="space-y-1 max-h-48 overflow-y-auto">
                        {violations.filter((v) => v.attempt_id === attempt.id).map((v) => (
                          <div key={v.id} className="flex items-center gap-2 text-xs py-1">
                            <span className="font-mono text-muted-foreground">{new Date(v.created_at).toLocaleTimeString()}</span>
                            <span className={`px-1.5 py-0.5 rounded text-xs ${
                              v.severity === 'critical' ? 'bg-danger/20 text-danger' :
                              v.severity === 'high' ? 'bg-warning/20 text-warning' :
                              'bg-secondary text-secondary-foreground'
                            }`}>{v.severity}</span>
                            <span className="text-foreground">{v.type}: {v.details}</span>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Exams Tab */}
        {activeTab === 'exams' && (
          <div className="space-y-3">
            {exams.map((exam) => (
              <div key={exam.id} className="glass-card p-5 flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-foreground">{exam.title}</h4>
                  <p className="text-sm text-muted-foreground">{exam.total_questions} questions • {exam.duration_minutes} min</p>
                </div>
                <div className={`px-3 py-1 rounded-lg text-sm ${exam.is_active ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'}`}>
                  {exam.is_active ? 'Active' : 'Inactive'}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Create Exam Tab */}
        {activeTab === 'create' && (
          <div className="glass-card p-6 max-w-2xl">
            <h3 className="text-xl font-semibold text-foreground mb-4">Create New Exam</h3>
            <div className="space-y-4">
              <Input
                placeholder="Exam Title"
                value={newExam.title}
                onChange={(e) => setNewExam({ ...newExam, title: e.target.value })}
                className="bg-secondary/30 border-border"
              />
              <Input
                placeholder="Description"
                value={newExam.description}
                onChange={(e) => setNewExam({ ...newExam, description: e.target.value })}
                className="bg-secondary/30 border-border"
              />
              <Input
                type="number"
                placeholder="Duration (minutes)"
                value={newExam.duration_minutes}
                onChange={(e) => setNewExam({ ...newExam, duration_minutes: parseInt(e.target.value) || 60 })}
                className="bg-secondary/30 border-border"
              />

              <h4 className="font-semibold text-foreground mt-6">Questions</h4>
              {newQuestions.map((q, qi) => (
                <div key={qi} className="p-4 rounded-lg bg-secondary/20 border border-border space-y-3">
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

              <Button onClick={createExam} className="w-full gradient-primary text-primary-foreground mt-4">
                Create Exam
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminDashboard;
