import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    if (!RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY is not configured');
    }

    const { to, studentName, examTitle, score, credibilityScore, riskLevel, totalViolations } = await req.json();

    if (!to || !examTitle) {
      throw new Error('Missing required fields: to, examTitle');
    }

    const riskColor = riskLevel === 'low' ? '#22c55e' : riskLevel === 'medium' ? '#f59e0b' : '#ef4444';
    const riskLabel = (riskLevel || 'unknown').toUpperCase();

    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:Arial,sans-serif;">
  <div style="max-width:520px;margin:40px auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;">
    <div style="background:#000000;padding:24px 32px;">
      <h1 style="margin:0;color:#ffffff;font-size:20px;font-weight:600;">🛡️ TracxnLabs Results</h1>
    </div>
    <div style="padding:32px;">
      <p style="color:#374151;font-size:15px;margin:0 0 8px;">Hi ${studentName || 'Student'},</p>
      <p style="color:#6b7280;font-size:14px;margin:0 0 24px;">Your exam results for <strong>${examTitle}</strong> are ready.</p>
      
      <div style="display:flex;gap:12px;margin-bottom:24px;">
        <div style="flex:1;background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:16px;text-align:center;">
          <p style="margin:0;color:#6b7280;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;">Score</p>
          <p style="margin:4px 0 0;font-size:28px;font-weight:700;color:#111827;">${score ?? 0}%</p>
        </div>
        <div style="flex:1;background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:16px;text-align:center;">
          <p style="margin:0;color:#6b7280;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;">Credibility</p>
          <p style="margin:4px 0 0;font-size:28px;font-weight:700;color:${riskColor};">${credibilityScore ?? 100}/100</p>
        </div>
      </div>
      
      <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
        <tr>
          <td style="padding:8px 0;color:#6b7280;font-size:13px;border-bottom:1px solid #f3f4f6;">Risk Level</td>
          <td style="padding:8px 0;text-align:right;border-bottom:1px solid #f3f4f6;">
            <span style="background:${riskColor}15;color:${riskColor};font-size:12px;padding:2px 10px;border-radius:20px;font-weight:600;">${riskLabel}</span>
          </td>
        </tr>
        <tr>
          <td style="padding:8px 0;color:#6b7280;font-size:13px;">Total Violations</td>
          <td style="padding:8px 0;text-align:right;font-weight:600;color:#111827;font-size:14px;">${totalViolations ?? 0}</td>
        </tr>
      </table>
      
      <p style="color:#9ca3af;font-size:12px;margin:0;text-align:center;">This is an automated message from ExamGuard.</p>
    </div>
  </div>
</body>
</html>`;

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'ExamGuard <noreply@studyhubpro.in>',
        to: [to],
        subject: `Your ${examTitle} Results — Score: ${score ?? 0}%`,
        html,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(`Resend API error [${res.status}]: ${JSON.stringify(data)}`);
    }

    return new Response(JSON.stringify({ success: true, id: data.id }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    console.error('Error sending results email:', error);
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ success: false, error: msg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
