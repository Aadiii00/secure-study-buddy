import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { code, language, problemId, submissionId, mode } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch test cases - for "run" mode only visible, for "submit" mode all
    let query = supabase.from("test_cases").select("*").eq("problem_id", problemId).order("order_index");
    if (mode === "run") {
      query = query.eq("is_hidden", false);
    }
    const { data: testCases, error: tcError } = await query;
    if (tcError) throw tcError;
    if (!testCases || testCases.length === 0) {
      return new Response(JSON.stringify({ error: "No test cases found for this problem" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build prompt for AI evaluation
    const testCaseDescriptions = testCases.map((tc: any, i: number) => 
      `Test Case ${i + 1}:\nInput: ${tc.input}\nExpected Output: ${tc.expected_output}`
    ).join("\n\n");

    const prompt = `You are a code execution engine. Evaluate the following ${language} code against the given test cases.

For each test case, mentally execute the code with the given input and determine:
1. What the code would output
2. Whether it matches the expected output (compare trimmed strings)
3. If there are any runtime errors

Code (${language}):
\`\`\`${language}
${code}
\`\`\`

${testCaseDescriptions}

IMPORTANT: You must respond with ONLY a valid JSON object (no markdown, no code blocks, no explanation) in this exact format:
{
  "results": [
    {
      "test_case_index": 0,
      "passed": true/false,
      "actual_output": "what the code would output",
      "error": null or "error message if runtime error",
      "status": "passed" or "wrong_answer" or "runtime_error" or "time_limit_exceeded"
    }
  ],
  "overall_status": "accepted" or "wrong_answer" or "runtime_error" or "compilation_error",
  "execution_time_ms": estimated_time_in_ms
}

Be precise and accurate in your evaluation. Treat the code as if you are running it in a real environment.`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You are a precise code execution engine. Output only valid JSON." },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded, please try again later." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "Service quota exceeded." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, t);
      throw new Error("AI evaluation failed");
    }

    const aiData = await aiResponse.json();
    let content = aiData.choices?.[0]?.message?.content || "";
    
    // Strip markdown code blocks if present
    content = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    
    let evaluation;
    try {
      evaluation = JSON.parse(content);
    } catch {
      console.error("Failed to parse AI response:", content);
      throw new Error("Failed to parse evaluation results");
    }

    const results = evaluation.results || [];
    const passedCount = results.filter((r: any) => r.passed).length;
    const totalCount = results.length;
    const allPassed = passedCount === totalCount;
    const score = allPassed ? 100 : 0;

    // Map results back with test case info
    const detailedResults = results.map((r: any, i: number) => ({
      ...r,
      input: testCases[i]?.input || "",
      expected_output: testCases[i]?.expected_output || "",
      is_hidden: testCases[i]?.is_hidden || false,
    }));

    // Update submission if submissionId provided (submit mode)
    if (submissionId && mode === "submit") {
      await supabase.from("code_submissions").update({
        status: evaluation.overall_status || (allPassed ? "accepted" : "wrong_answer"),
        passed_count: passedCount,
        total_count: totalCount,
        score,
        result_details: detailedResults,
        execution_time_ms: evaluation.execution_time_ms || 0,
      }).eq("id", submissionId);
    }

    return new Response(JSON.stringify({
      results: detailedResults,
      passed_count: passedCount,
      total_count: totalCount,
      overall_status: evaluation.overall_status || (allPassed ? "accepted" : "wrong_answer"),
      score,
      execution_time_ms: evaluation.execution_time_ms || 0,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("evaluate-code error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
