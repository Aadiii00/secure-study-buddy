import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { calculateCredibilityScore, getRiskColor, getRiskBg } from '@/lib/credibilityEngine';
import { CredibilityReport, Violation } from '@/types/exam';
import { Shield, ArrowLeft, Download, CheckCircle, XCircle, AlertTriangle, Clock, Eye, Camera, Keyboard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import jsPDF from 'jspdf';

const ResultsPage = () => {
  const { attemptId } = useParams<{ attemptId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [attempt, setAttempt] = useState<any>(null);
  const [report, setReport] = useState<CredibilityReport | null>(null);
  const [violations, setViolations] = useState<Violation[]>([]);

  useEffect(() => {
    if (!attemptId || !user) return;
    fetchResults();
  }, [attemptId, user]);

  const fetchResults = async () => {
    const [{ data: attemptData }, { data: violationsData }] = await Promise.all([
      supabase.from('exam_attempts').select('*, exams(title, total_questions)').eq('id', attemptId!).single(),
      supabase.from('violations').select('*').eq('attempt_id', attemptId!).order('created_at'),
    ]);

    setAttempt(attemptData);
    const typedViolations: Violation[] = (violationsData || []).map((v: any) => ({
      ...v,
      timestamp: v.created_at,
    }));
    setViolations(typedViolations);

    // Calculate credibility
    const tabSwitches = typedViolations.filter((v) => v.type === 'tab_switch').length;
    const timeOutside = tabSwitches * 5; // estimate
    const faceAnomalies = typedViolations.filter((v) => ['no_face', 'multiple_faces', 'face_not_centered'].includes(v.type)).length;
    const fullscreenExits = typedViolations.filter((v) => v.type === 'fullscreen_exit').length;

    const credReport = calculateCredibilityScore(typedViolations, tabSwitches, timeOutside, faceAnomalies, fullscreenExits);
    credReport.attemptId = attemptId!;
    setReport(credReport);

    // Update attempt with credibility score
    await supabase.from('exam_attempts').update({
      credibility_score: credReport.score,
      risk_level: credReport.riskLevel,
    }).eq('id', attemptId!);
  };

  const exportPDF = () => {
    if (!report || !attempt) return;
    const doc = new jsPDF();
    doc.setFontSize(22);
    doc.text('Credibility Certificate', 20, 25);
    doc.setFontSize(11);
    doc.text(`Exam: ${(attempt as any).exams?.title}`, 20, 40);
    doc.text(`Date: ${new Date(attempt.started_at).toLocaleString()}`, 20, 50);
    doc.text(`Score: ${attempt.score}%`, 20, 60);
    doc.text(`Credibility Score: ${report.score}/100`, 20, 70);
    doc.text(`Risk Level: ${report.riskLevel.toUpperCase()}`, 20, 80);
    doc.text(`Total Violations: ${report.totalViolations}`, 20, 95);
    doc.text(`Tab Switches: ${report.tabSwitches}`, 20, 105);
    doc.text(`Copy Attempts: ${report.copyAttempts}`, 20, 115);
    doc.text(`Face Anomalies: ${report.faceAnomalies}`, 20, 125);
    doc.text(`DevTools Attempts: ${report.devtoolsAttempts}`, 20, 135);
    doc.text(`Fullscreen Exits: ${report.fullscreenExits}`, 20, 145);

    doc.setFontSize(14);
    doc.text('Violation Timeline', 20, 165);
    doc.setFontSize(9);
    report.timeline.slice(0, 15).forEach((item, i) => {
      doc.text(`${item.time} [${item.severity}] ${item.event}`, 20, 175 + i * 7);
    });

    doc.save(`credibility-certificate-${attemptId?.slice(0, 8)}.pdf`);
  };

  if (!attempt || !report) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-muted-foreground">Loading results...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen security-grid">
      <header className="border-b border-border bg-card/80 backdrop-blur-xl sticky top-0 z-30">
        <div className="container mx-auto flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')}>
              <ArrowLeft className="w-4 h-4 mr-2" /> Back
            </Button>
            <Shield className="w-5 h-5 text-primary" />
            <span className="font-bold text-foreground">Exam Results</span>
          </div>
          <Button onClick={exportPDF} className="gradient-primary text-primary-foreground" size="sm">
            <Download className="w-4 h-4 mr-2" /> Export PDF
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8 max-w-4xl">
        {/* Score cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6 text-center">
            <p className="text-sm text-muted-foreground mb-2">Exam Score</p>
            <p className={`text-5xl font-bold ${attempt.score >= 70 ? 'text-success' : attempt.score >= 50 ? 'text-warning' : 'text-danger'}`}>
              {attempt.score}%
            </p>
            <p className="text-sm text-muted-foreground mt-2">{(attempt as any).exams?.title}</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className={`glass-card p-6 text-center border-2 ${getRiskBg(report.riskLevel)}`}
          >
            <p className="text-sm text-muted-foreground mb-2">Credibility Score</p>
            <p className={`text-5xl font-bold ${getRiskColor(report.riskLevel)}`}>
              {report.score}
            </p>
            <p className={`text-sm font-mono mt-2 ${getRiskColor(report.riskLevel)}`}>
              Risk: {report.riskLevel.toUpperCase()}
            </p>
          </motion.div>
        </div>

        {/* Violation breakdown */}
        <h3 className="text-lg font-semibold text-foreground mb-4">Violation Breakdown</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-8">
          {[
            { label: 'Tab Switches', value: report.tabSwitches, icon: Eye },
            { label: 'Copy Attempts', value: report.copyAttempts, icon: Keyboard },
            { label: 'Face Anomalies', value: report.faceAnomalies, icon: Camera },
            { label: 'DevTools', value: report.devtoolsAttempts, icon: AlertTriangle },
            { label: 'Fullscreen Exits', value: report.fullscreenExits, icon: XCircle },
            { label: 'Total Violations', value: report.totalViolations, icon: AlertTriangle },
          ].map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.05 }}
              className="glass-card p-4"
            >
              <div className="flex items-center gap-2 mb-2">
                <item.icon className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">{item.label}</span>
              </div>
              <p className={`text-2xl font-bold ${item.value > 0 ? 'text-danger' : 'text-success'}`}>{item.value}</p>
            </motion.div>
          ))}
        </div>

        {/* Timeline */}
        <h3 className="text-lg font-semibold text-foreground mb-4">Event Timeline</h3>
        <div className="glass-card p-4 max-h-96 overflow-y-auto">
          {report.timeline.length === 0 ? (
            <div className="flex items-center gap-2 text-success py-4 justify-center">
              <CheckCircle className="w-5 h-5" />
              <span>No violations recorded — clean exam session!</span>
            </div>
          ) : (
            <div className="space-y-2">
              {report.timeline.map((item, i) => (
                <div key={i} className="flex items-start gap-3 py-2 border-b border-border/50 last:border-0">
                  <span className="font-mono text-xs text-muted-foreground w-20 shrink-0">{item.time}</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded shrink-0 ${
                    item.severity === 'critical' ? 'bg-danger/20 text-danger' :
                    item.severity === 'high' ? 'bg-warning/20 text-warning' :
                    'bg-secondary text-secondary-foreground'
                  }`}>{item.severity}</span>
                  <span className="text-sm text-foreground">{item.event}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default ResultsPage;
