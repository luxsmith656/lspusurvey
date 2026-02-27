import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download, Star } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { surveyQuestions } from "@/data/surveyQuestions";
import lspuLogo from "@/assets/lspu-logo.jpg";

const ResultsPage = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const [eventTitle, setEventTitle] = useState("");
  const [responses, setResponses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!eventId) return;

      const [eventRes, responsesRes] = await Promise.all([
        supabase.from("events").select("title").eq("id", eventId).single(),
        supabase.from("survey_responses").select("*").eq("event_id", eventId).order("created_at", { ascending: false }),
      ]);

      if (eventRes.data) setEventTitle(eventRes.data.title);
      if (responsesRes.data) setResponses(responsesRes.data);
      setLoading(false);
    };
    fetchData();
  }, [eventId]);

  // Calculate average per question
  const chartData = surveyQuestions.map((q) => {
    const total = responses.reduce((sum, r) => {
      const val = (r.ratings as Record<string, number>)?.[q.id] || 0;
      return sum + val;
    }, 0);
    const count = responses.filter(r => (r.ratings as Record<string, number>)?.[q.id]).length;
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

  const suggestions = responses.filter(r => r.suggestion).map(r => ({
    text: r.suggestion,
    date: new Date(r.created_at).toLocaleDateString(),
  }));

  const exportCSV = () => {
    const headers = ["Response #", "Date", ...surveyQuestions.map(q => q.question), "Suggestion"];
    const rows = responses.map((r, i) => [
      i + 1,
      new Date(r.created_at).toLocaleDateString(),
      ...surveyQuestions.map(q => (r.ratings as Record<string, number>)?.[q.id] || ""),
      r.suggestion || "",
    ]);

    const csv = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${eventTitle.replace(/\s+/g, "_")}_responses.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const barColors = ["#2563eb", "#3b82f6", "#60a5fa", "#93c5fd", "#1d4ed8", "#1e40af", "#2563eb", "#3b82f6", "#60a5fa", "#93c5fd"];

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-background"><div className="animate-pulse text-muted-foreground">Loading...</div></div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate("/admin")} className="text-muted-foreground">
            <ArrowLeft size={18} />
          </Button>
          <img src={lspuLogo} alt="LSPU" className="w-8 h-8 rounded-full object-cover" />
          <div>
            <h1 className="font-display font-bold text-foreground text-sm leading-tight">Results</h1>
            <p className="text-xs text-muted-foreground font-body">{eventTitle}</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={exportCSV} className="gap-1 text-xs font-body">
          <Download size={14} /> Export CSV
        </Button>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div className="bg-card border border-border rounded-lg p-4 text-center">
            <p className="text-3xl font-display font-bold text-foreground">{responses.length}</p>
            <p className="text-xs text-muted-foreground font-body">Responses</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-4 text-center">
            <div className="flex items-center justify-center gap-1">
              <p className="text-3xl font-display font-bold text-foreground">{overallAvg}</p>
              <Star size={20} className="fill-star-filled text-star-filled" />
            </div>
            <p className="text-xs text-muted-foreground font-body">Overall Average</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-4 text-center col-span-2 sm:col-span-1">
            <p className="text-3xl font-display font-bold text-foreground">{suggestions.length}</p>
            <p className="text-xs text-muted-foreground font-body">Suggestions</p>
          </div>
        </div>

        {/* Chart */}
        <div className="bg-card border border-border rounded-lg p-4">
          <h2 className="font-display font-semibold text-foreground mb-4">Average Rating per Question</h2>
          {responses.length === 0 ? (
            <p className="text-muted-foreground font-body text-sm text-center py-8">No responses yet.</p>
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
        </div>

        {/* Suggestions */}
        <div className="bg-card border border-border rounded-lg p-4">
          <h2 className="font-display font-semibold text-foreground mb-4">
            Suggestions & Comments ({suggestions.length})
          </h2>
          {suggestions.length === 0 ? (
            <p className="text-muted-foreground font-body text-sm text-center py-4">No suggestions yet.</p>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {suggestions.map((s, i) => (
                <div key={i} className="border-l-2 border-primary/30 pl-3 py-1">
                  <p className="text-sm font-body text-foreground">{s.text}</p>
                  <p className="text-xs text-muted-foreground font-body mt-1">{s.date}</p>
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
