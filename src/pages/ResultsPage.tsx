import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { calculateCredibilityScore, getRiskColor } from '@/lib/credibilityEngine';
import { CredibilityReport, Violation } from '@/types/exam';
import { ArrowLeft, Download, CheckCircle, XCircle, CheckCircle2, Circle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import jsPDF from 'jspdf';

const ResultsPage = () => {
  const { attemptId } = useParams<{ attemptId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [attempt, setAttempt] = useState<any>(null);
  const [report, setReport] = useState<CredibilityReport | null>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [answers, setAnswers] = useState<Record<string, number>>({});

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
    const userAnswers = (attemptData?.answers as Record<string, number>) || {};
    setAnswers(userAnswers);

    // Fetch questions with correct answers
    if (attemptData?.exam_id) {
      const { data: questionsData } = await supabase
        .from('questions')
        .select('*')
        .eq('exam_id', attemptData.exam_id)
        .order('order_index');
      setQuestions(questionsData || []);

      // Recalculate score from questions if score is 0 or null
      if (questionsData && questionsData.length > 0) {
        let correct = 0;
        questionsData.forEach((q: any) => {
          if (userAnswers[q.id] === q.correct_option) correct++;
        });
        const calculatedScore = Math.round((correct / questionsData.length) * 100);
        // Update if different from stored
        if (attemptData.score !== calculatedScore) {
          await supabase.from('exam_attempts').update({ score: calculatedScore }).eq('id', attemptId!);
          attemptData.score = calculatedScore;
          setAttempt({ ...attemptData, score: calculatedScore });
        }
      }
    }

    const typedViolations: Violation[] = (violationsData || []).map((v: any) => ({ ...v, timestamp: v.created_at }));
    const tabSwitches = typedViolations.filter((v) => v.type === 'tab_switch').length;
    const timeOutside = tabSwitches * 5;
    const faceAnomalies = typedViolations.filter((v) => ['no_face', 'multiple_faces', 'face_not_centered'].includes(v.type)).length;
    const fullscreenExits = typedViolations.filter((v) => v.type === 'fullscreen_exit').length;
    const credReport = calculateCredibilityScore(typedViolations, tabSwitches, timeOutside, faceAnomalies, fullscreenExits);
    credReport.attemptId = attemptId!;
    setReport(credReport);
    await supabase.from('exam_attempts').update({ credibility_score: credReport.score, risk_level: credReport.riskLevel }).eq('id', attemptId!);

    // Send results email to student
    try {
      const { data: profileData } = await supabase.from('profiles').select('email, full_name').eq('user_id', user!.id).single();
      if (profileData?.email) {
        await supabase.functions.invoke('send-results-email', {
          body: {
            to: profileData.email,
            studentName: profileData.full_name || 'Student',
            examTitle: attemptData?.exams?.title || 'Exam',
            score: attemptData?.score,
            credibilityScore: credReport.score,
            riskLevel: credReport.riskLevel,
            totalViolations: credReport.totalViolations,
          },
        });
      }
    } catch (emailErr) {
      console.error('Failed to send results email:', emailErr);
    }
  };

  const exportPDF = () => {
    if (!report || !attempt) return;
    const doc = new jsPDF();
    doc.setFontSize(22);
    doc.text('Credibility Certificate', 20, 25);
    doc.setFontSize(11);
    doc.text(`Exam: ${(attempt as any).exams?.title}`, 20, 40);
    doc.text(`Score: ${attempt.score}%`, 20, 50);
    doc.text(`Credibility: ${report.score}/100`, 20, 60);
    doc.text(`Risk: ${report.riskLevel.toUpperCase()}`, 20, 70);
    doc.text(`Violations: ${report.totalViolations}`, 20, 85);
    doc.setFontSize(14);
    doc.text('Timeline', 20, 100);
    doc.setFontSize(9);
    report.timeline.slice(0, 15).forEach((item, i) => {
      doc.text(`${item.time} [${item.severity}] ${item.event}`, 20, 110 + i * 7);
    });
    doc.save(`credibility-${attemptId?.slice(0, 8)}.pdf`);
  };

  if (!attempt || !report) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading...</div>;
  }

  const correctCount = questions.filter((q) => answers[q.id] === q.correct_option).length;

  return (
    <div className="min-h-screen">
      <header className="border-b border-border sticky top-0 z-30 bg-background">
        <div className="container mx-auto flex items-center justify-between px-6 py-3">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')}>
              <ArrowLeft className="w-4 h-4 mr-1" /> Back
            </Button>
            <span className="font-medium">Results</span>
          </div>
          <Button onClick={exportPDF} size="sm" variant="outline">
            <Download className="w-4 h-4 mr-1" /> PDF
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8 max-w-3xl">
        {/* Score & Credibility Cards */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="border border-border rounded-lg p-6 text-center">
            <p className="text-xs text-muted-foreground mb-1">Score</p>
            <p className="text-4xl font-semibold">{attempt.score}%</p>
            <p className="text-xs text-muted-foreground mt-1">
              {correctCount}/{questions.length} correct · {(attempt as any).exams?.title}
            </p>
          </div>
          <div className="border border-border rounded-lg p-6 text-center">
            <p className="text-xs text-muted-foreground mb-1">Credibility</p>
            <p className={`text-4xl font-semibold ${getRiskColor(report.riskLevel)}`}>{report.score}</p>
            <p className="text-xs text-muted-foreground mt-1">Risk: {report.riskLevel}</p>
          </div>
        </div>

        {/* Questions Review */}
        {questions.length > 0 && (
          <>
            <h3 className="text-sm font-medium mb-3">Answer Review</h3>
            <div className="space-y-3 mb-8">
              {questions.map((q, i) => {
                const userAnswer = answers[q.id];
                const isCorrect = userAnswer === q.correct_option;
                const isUnanswered = userAnswer === undefined;
                const options = (q.options as string[]) || [];

                return (
                  <div key={q.id} className={`border rounded-lg p-4 ${
                    isCorrect ? 'border-success/30 bg-success/5' :
                    isUnanswered ? 'border-border bg-muted/30' :
                    'border-danger/30 bg-danger/5'
                  }`}>
                    <div className="flex items-start gap-2 mb-3">
                      <span className="text-xs font-mono text-muted-foreground mt-0.5">Q{i + 1}</span>
                      <p className="text-sm font-medium flex-1">{q.question_text}</p>
                      {isCorrect ? (
                        <CheckCircle2 className="w-5 h-5 text-success flex-shrink-0" />
                      ) : isUnanswered ? (
                        <Circle className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                      ) : (
                        <XCircle className="w-5 h-5 text-danger flex-shrink-0" />
                      )}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 ml-5">
                      {options.map((opt: string, oi: number) => {
                        const isCorrectOption = oi === q.correct_option;
                        const isUserPick = oi === userAnswer;
                        return (
                          <div key={oi} className={`flex items-center gap-2 text-xs rounded-md px-2.5 py-1.5 border ${
                            isCorrectOption
                              ? 'border-success/40 bg-success/10 text-success font-medium'
                              : isUserPick
                              ? 'border-danger/40 bg-danger/10 text-danger'
                              : 'border-border text-muted-foreground'
                          }`}>
                            <span className="font-semibold w-4">{String.fromCharCode(65 + oi)}</span>
                            <span className="flex-1">{opt}</span>
                            {isCorrectOption && <CheckCircle className="w-3.5 h-3.5 text-success" />}
                            {isUserPick && !isCorrectOption && <XCircle className="w-3.5 h-3.5 text-danger" />}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* Violation Breakdown */}
        <h3 className="text-sm font-medium mb-3">Violation Breakdown</h3>
        <div className="grid grid-cols-3 gap-3 mb-8">
          {[
            { label: 'Tab Switches', value: report.tabSwitches },
            { label: 'Copy Attempts', value: report.copyAttempts },
            { label: 'Face Anomalies', value: report.faceAnomalies },
            { label: 'DevTools', value: report.devtoolsAttempts },
            { label: 'Fullscreen Exits', value: report.fullscreenExits },
            { label: 'Total', value: report.totalViolations },
          ].map((item, i) => (
            <div key={i} className="border border-border rounded-lg p-3">
              <p className="text-xs text-muted-foreground">{item.label}</p>
              <p className={`text-xl font-semibold ${item.value > 0 ? 'text-danger' : ''}`}>{item.value}</p>
            </div>
          ))}
        </div>

        {/* Timeline */}
        <h3 className="text-sm font-medium mb-3">Timeline</h3>
        <div className="border border-border rounded-lg divide-y divide-border max-h-80 overflow-y-auto">
          {report.timeline.length === 0 ? (
            <div className="flex items-center gap-2 text-success py-6 justify-center text-sm">
              <CheckCircle className="w-4 h-4" /> Clean session
            </div>
          ) : (
            report.timeline.map((item, i) => (
              <div key={i} className="flex items-center gap-3 px-3 py-2 text-sm">
                <span className="text-xs text-muted-foreground w-16 shrink-0">{item.time}</span>
                <span className={`text-xs px-1.5 py-0.5 rounded ${
                  item.severity === 'critical' ? 'bg-destructive/10 text-danger' :
                  item.severity === 'high' ? 'bg-warning/10 text-warning' :
                  'bg-muted text-muted-foreground'
                }`}>{item.severity}</span>
                <span>{item.event}</span>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
};

export default ResultsPage;
