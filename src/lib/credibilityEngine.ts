import { CredibilityReport, Violation } from '@/types/exam';

/**
 * Calculate credibility score based on violation data.
 * Score: 0-100 (100 = fully credible)
 */
export function calculateCredibilityScore(
  violations: Violation[],
  tabSwitches: number,
  timeOutside: number,
  faceAnomalies: number,
  fullscreenExits: number
): CredibilityReport {
  let score = 100;

  // Deductions
  const tabSwitchPenalty = Math.min(tabSwitches * 5, 25);
  const timeOutsidePenalty = Math.min(Math.floor(timeOutside / 10) * 3, 20);
  const copyAttempts = violations.filter((v) => ['copy_attempt', 'paste_attempt', 'cut_attempt'].includes(v.type)).length;
  const copyPenalty = Math.min(copyAttempts * 4, 16);
  const facePenalty = Math.min(faceAnomalies * 3, 20);
  const devtoolsAttempts = violations.filter((v) => v.type === 'devtools_open').length;
  const devtoolsPenalty = Math.min(devtoolsAttempts * 8, 24);
  const fullscreenPenalty = Math.min(fullscreenExits * 6, 18);

  score -= tabSwitchPenalty + timeOutsidePenalty + copyPenalty + facePenalty + devtoolsPenalty + fullscreenPenalty;
  score = Math.max(0, Math.min(100, score));

  let riskLevel: 'low' | 'medium' | 'high' = 'low';
  if (score < 50) riskLevel = 'high';
  else if (score < 75) riskLevel = 'medium';

  const timeline = violations.map((v) => ({
    time: new Date(v.timestamp).toLocaleTimeString(),
    event: `${v.type}: ${v.details}`,
    severity: v.severity,
  }));

  return {
    attemptId: violations[0]?.attempt_id || '',
    score,
    riskLevel,
    totalViolations: violations.length,
    tabSwitches,
    timeOutsideWindow: timeOutside,
    copyAttempts,
    faceAnomalies,
    devtoolsAttempts,
    fullscreenExits,
    violations,
    timeline,
  };
}

export function getRiskColor(risk: string): string {
  switch (risk) {
    case 'low': return 'text-success';
    case 'medium': return 'text-warning';
    case 'high': return 'text-danger';
    default: return 'text-muted-foreground';
  }
}

export function getRiskBg(risk: string): string {
  switch (risk) {
    case 'low': return 'bg-success/10 border-success/30';
    case 'medium': return 'bg-warning/10 border-warning/30';
    case 'high': return 'bg-danger/10 border-danger/30';
    default: return 'bg-muted';
  }
}
