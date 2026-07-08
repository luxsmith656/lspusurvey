import { useState, useEffect, type CSSProperties } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Download, MessageSquareText, Star, WandSparkles } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import {
  PRE_EVENT_COMMENT_KEY,
  PRE_EVENT_RATING_KEY,
  RESPONSE_FORM_KEY,
  surveyQuestions,
  type SurveyFormType,
} from "@/data/surveyQuestions";
import { APP_NAME } from "@/lib/eventSettings";
import lspuLogo from "@/assets/lspu-logo.jpg";
import gawadPubmat from "@/assets/gawad-pubmat.png";

interface SurveyResponse {
  id: string;
  created_at: string;
  ratings: Record<string, unknown> | null;
  suggestion: string | null;
}

interface PreSurveyAnswer {
  firstImpressionRating: number;
  comment: string;
  legacyFirstImpression: string;
  legacyRecommendation: string;
}

const getFormType = (response: SurveyResponse): SurveyFormType => {
  return response.ratings?.[RESPONSE_FORM_KEY] === "pre_event" ? "pre_event" : "evaluation";
};

const parsePreSurveyAnswer = (response: SurveyResponse): PreSurveyAnswer => {
  const rating = Number(response.ratings?.[PRE_EVENT_RATING_KEY] || 0);

  try {
    const parsed = response.suggestion
      ? JSON.parse(response.suggestion) as Record<string, string | number | undefined>
      : {};

    return {
      firstImpressionRating: rating || Number(parsed[PRE_EVENT_RATING_KEY] || 0),
      comment: String(parsed[PRE_EVENT_COMMENT_KEY] || ""),
      legacyFirstImpression: String(parsed.firstImpression || ""),
      legacyRecommendation: String(parsed.improvementRecommendation || ""),
    };
  } catch {
    return {
      firstImpressionRating: rating,
      comment: response.suggestion || "",
      legacyFirstImpression: "",
      legacyRecommendation: "",
    };
  }
};

const quoteCSVCell = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`;

const ResultsPage = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const [eventTitle, setEventTitle] = useState("");
  const [responses, setResponses] = useState<SurveyResponse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!eventId) return;

      const [eventRes, responsesRes] = await Promise.all([
        supabase.from("events").select("title").eq("id", eventId).single(),
        supabase.from("survey_responses").select("*").eq("event_id", eventId).order("created_at", { ascending: false }),
      ]);

      if (eventRes.data) setEventTitle(eventRes.data.title);
      if (responsesRes.data) setResponses(responsesRes.data as SurveyResponse[]);
      setLoading(false);
    };
    fetchData();
  }, [eventId]);

  const preResponses = responses.filter((response) => getFormType(response) === "pre_event");
  const evaluationResponses = responses.filter((response) => getFormType(response) === "evaluation");

  const chartData = surveyQuestions.map((q) => {
    const total = evaluationResponses.reduce((sum, r) => {
      const val = Number(r.ratings?.[q.id] || 0);
      return sum + val;
    }, 0);
    const count = evaluationResponses.filter((r) => Number(r.ratings?.[q.id] || 0) > 0).length;
    return {
      name: q.id.toUpperCase(),
      label: q.question,
      category: q.category,
      average: count > 0 ? Math.round((total / count) * 100) / 100 : 0,
    };
  });

  const overallAvg = chartData.length > 0
    ? Math.round((chartData.reduce((s, d) => s + d.average, 0) / chartData.length) * 100) / 100
    : 0;

  const suggestions = evaluationResponses.filter((r) => r.suggestion).map((r) => ({
    text: r.suggestion || "",
    date: new Date(r.created_at).toLocaleDateString(),
  }));

  const preAnswers = preResponses.map((r) => ({
    ...parsePreSurveyAnswer(r),
    date: new Date(r.created_at).toLocaleDateString(),
  }));

  const ratedPreAnswers = preAnswers.filter((answer) => answer.firstImpressionRating > 0);
  const preAverage = ratedPreAnswers.length > 0
    ? Math.round((ratedPreAnswers.reduce((sum, answer) => sum + answer.firstImpressionRating, 0) / ratedPreAnswers.length) * 100) / 100
    : 0;

  const exportEvaluationCSV = () => {
    const headers = ["Response #", "Date", ...surveyQuestions.map((q) => q.question), "Suggestion"];
    const rows = evaluationResponses.map((r, i) => [
      i + 1,
      new Date(r.created_at).toLocaleDateString(),
      ...surveyQuestions.map((q) => Number(r.ratings?.[q.id] || "") || ""),
      r.suggestion || "",
    ]);

    const csv = [headers, ...rows].map((row) => row.map(quoteCSVCell).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${eventTitle.replace(/\s+/g, "_")}_evaluation_responses.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportPreEventCSV = () => {
    const headers = ["Response #", "Date", "First Impression Rating", "Optional Comment", "Legacy First Impression", "Legacy Recommendation"];
    const rows = preAnswers.map((answer, i) => [
      i + 1,
      answer.date,
      answer.firstImpressionRating || "",
      answer.comment,
      answer.legacyFirstImpression,
      answer.legacyRecommendation,
    ]);

    const csv = [headers, ...rows].map((row) => row.map(quoteCSVCell).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${eventTitle.replace(/\s+/g, "_")}_pre_event_responses.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const barColors = ["#08245a", "#b77a1b", "#0d3c76", "#d5a33f", "#123c63", "#8f6018", "#1f5c8d", "#c9902f", "#061535", "#e0b65b"];

  if (loading) {
    return (
      <div className="gawad-page" style={{ "--gawad-bg": `url(${gawadPubmat})` } as CSSProperties}>
        <div className="min-h-screen flex items-center justify-center px-4">
          <div className="gawad-panel px-8 py-6 text-center">
            <div className="animate-pulse text-primary">Loading results...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="gawad-page" style={{ "--gawad-bg": `url(${gawadPubmat})` } as CSSProperties}>
      <header className="gawad-header">
        <div className="flex items-center gap-3 min-w-0">
          <Button variant="ghost" size="sm" onClick={() => navigate("/admin")} className="text-white/80 hover:text-white hover:bg-white/10">
            <ArrowLeft size={18} />
          </Button>
          <img src={lspuLogo} alt="LSPU" className="w-9 h-9 rounded-full object-cover ring-1 ring-secondary/60" />
          <div className="min-w-0">
            <h1 className="font-display font-bold text-white text-sm leading-tight">{APP_NAME}</h1>
            <p className="text-xs text-white/70 font-body truncate">Gawad Parangal Results - {eventTitle}</p>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        <section className="gawad-panel p-5 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-secondary font-bold font-body">5th Gawad Parangal 2026</p>
              <h2 className="gawad-title text-4xl leading-tight mt-1">Separated Survey Results</h2>
            </div>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="gawad-stat">
                <p>{responses.length}</p>
                <span>Total</span>
              </div>
              <div className="gawad-stat">
                <p>{preResponses.length}</p>
                <span>Pre-Event</span>
              </div>
              <div className="gawad-stat">
                <p>{evaluationResponses.length}</p>
                <span>Org M&E</span>
              </div>
            </div>
          </div>
        </section>

        <Tabs defaultValue="pre-event" className="space-y-5">
          <TabsList className="gawad-tabs">
            <TabsTrigger value="pre-event">Pre-Event Survey</TabsTrigger>
            <TabsTrigger value="evaluation">Organization M&E Survey</TabsTrigger>
          </TabsList>

          <TabsContent value="pre-event" className="space-y-5">
            <section className="gawad-panel p-5 sm:p-6">
              <div className="flex items-center justify-between gap-3 mb-5">
                <div>
                  <h2 className="font-display font-bold text-foreground text-xl">Pre-Event First Impression Ratings</h2>
                  <p className="text-sm text-muted-foreground font-body">
                    {preResponses.length} responses - average {preAverage || 0} / 5
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={exportPreEventCSV} className="gap-1 text-xs font-body border-primary/40 text-primary hover:bg-primary hover:text-primary-foreground">
                  <Download size={14} /> Export CSV
                </Button>
              </div>

              {preAnswers.length === 0 ? (
                <p className="text-muted-foreground font-body text-sm text-center py-8">No pre-event responses yet.</p>
              ) : (
                <div className="space-y-4 max-h-[520px] overflow-y-auto pr-1">
                  {preAnswers.map((answer, i) => (
                    <article key={`${answer.date}-${i}`} className="border border-secondary/30 bg-white/70 rounded-lg p-4">
                      <div className="flex items-center gap-2 text-secondary font-body text-xs uppercase tracking-[0.18em] font-bold">
                        <MessageSquareText size={15} />
                        Response {i + 1} - {answer.date}
                      </div>
                      <div className="grid md:grid-cols-[0.45fr_1fr] gap-4 mt-4">
                        <div>
                          <p className="text-xs text-primary uppercase tracking-[0.18em] font-bold font-body mb-1">Rating</p>
                          <p className="text-2xl font-display font-bold text-foreground leading-relaxed">
                            {answer.firstImpressionRating ? `${answer.firstImpressionRating} / 5` : "Legacy"}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-primary uppercase tracking-[0.18em] font-bold font-body mb-1">Optional Comment</p>
                          <p className="text-sm font-body text-foreground leading-relaxed">
                            {answer.comment || answer.legacyFirstImpression || answer.legacyRecommendation || "No comment provided."}
                          </p>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </TabsContent>

          <TabsContent value="evaluation" className="space-y-5">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div className="gawad-panel p-4 text-center">
                <p className="text-3xl font-display font-bold text-foreground">{evaluationResponses.length}</p>
                <p className="text-xs text-muted-foreground font-body">Organization M&E Responses</p>
              </div>
              <div className="gawad-panel p-4 text-center">
                <div className="flex items-center justify-center gap-1">
                  <p className="text-3xl font-display font-bold text-foreground">{overallAvg}</p>
                  <Star size={20} className="fill-star-filled text-star-filled" />
                </div>
                <p className="text-xs text-muted-foreground font-body">Overall Average</p>
              </div>
              <div className="gawad-panel p-4 text-center col-span-2 sm:col-span-1">
                <p className="text-3xl font-display font-bold text-foreground">{suggestions.length}</p>
                <p className="text-xs text-muted-foreground font-body">Suggestions</p>
              </div>
            </div>

            <section className="gawad-panel p-5 sm:p-6">
              <div className="flex items-center justify-between gap-3 mb-5">
                <h2 className="font-display font-bold text-foreground text-xl">Average Rating per Question</h2>
                <Button variant="outline" size="sm" onClick={exportEvaluationCSV} className="gap-1 text-xs font-body border-primary/40 text-primary hover:bg-primary hover:text-primary-foreground">
                  <Download size={14} /> Export CSV
                </Button>
              </div>
              {evaluationResponses.length === 0 ? (
                <p className="text-muted-foreground font-body text-sm text-center py-8">No Organization M&E responses yet.</p>
              ) : (
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fontFamily: "Inter" }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis domain={[0, 5]} tick={{ fontSize: 11, fontFamily: "Inter" }} stroke="hsl(var(--muted-foreground))" />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const d = payload[0].payload;
                        return (
                          <div className="bg-card border border-border rounded-lg p-3 shadow-lg text-left">
                            <p className="text-xs text-muted-foreground font-body mb-1">{d.category}</p>
                            <p className="text-sm font-display font-semibold text-foreground mb-1">{d.label}</p>
                            <p className="text-lg font-display font-bold text-primary">{d.average} / 5</p>
                          </div>
                        );
                      }}
                    />
                    <Bar dataKey="average" radius={[4, 4, 0, 0]}>
                      {chartData.map((_, idx) => (
                        <Cell key={idx} fill={barColors[idx % barColors.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </section>

            <section className="gawad-panel p-5 sm:p-6">
              <h2 className="font-display font-bold text-foreground text-xl mb-4 flex items-center gap-2">
                <WandSparkles size={18} className="text-secondary" />
                Suggestions and Comments ({suggestions.length})
              </h2>
              {suggestions.length === 0 ? (
                <p className="text-muted-foreground font-body text-sm text-center py-4">No suggestions yet.</p>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {suggestions.map((s, i) => (
                    <div key={`${s.date}-${i}`} className="border-l-2 border-secondary pl-3 py-1">
                      <p className="text-sm font-body text-foreground">{s.text}</p>
                      <p className="text-xs text-muted-foreground font-body mt-1">{s.date}</p>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default ResultsPage;
