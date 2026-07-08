import { useState, useEffect, type CSSProperties } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Award, ClipboardList, ShieldCheck } from "lucide-react";
import { APP_NAME, getPermanentEventPath, isPermanentGawadEvent } from "@/lib/eventSettings";
import lspuLogo from "@/assets/lspu-logo.jpg";
import gawadPubmat from "@/assets/gawad-pubmat.png";

interface EventSummary {
  id: string;
  title: string;
  description: string | null;
  created_at: string;
}

const Index = () => {
  const navigate = useNavigate();
  const [events, setEvents] = useState<EventSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEvents = async () => {
      const { data } = await supabase
        .from("events")
        .select("id, title, description, created_at")
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      if (data) setEvents(data);
      setLoading(false);
    };
    fetchEvents();
  }, []);

  return (
    <div className="gawad-page" style={{ "--gawad-bg": `url(${gawadPubmat})` } as CSSProperties}>
      <main className="min-h-screen flex items-center justify-center px-4 py-8">
        <section className="gawad-panel gawad-grand-panel animate-slide-up w-full max-w-3xl p-6 sm:p-8 text-center">
          <div className="mx-auto mb-5 flex items-center justify-center gap-3">
            <img src={lspuLogo} alt="LSPU Logo" className="w-16 h-16 rounded-full object-cover shadow-lg ring-2 ring-secondary/50" />
            <div className="text-left">
              <p className="text-xs uppercase tracking-[0.25em] text-primary font-semibold font-body">{APP_NAME}</p>
              <p className="text-sm text-muted-foreground font-body">Laguna State Polytechnic University - Los Banos</p>
            </div>
          </div>

          <Award size={44} className="mx-auto text-secondary mb-3" />
          <p className="text-sm uppercase tracking-[0.32em] text-secondary font-bold font-body">2026 Event Survey</p>
          <h1 className="gawad-title mt-2 text-5xl sm:text-6xl leading-none">5th Gawad Parangal</h1>
          <p className="gawad-script mt-2 text-2xl text-secondary">Monitoring and Evaluation</p>

          <div className="mt-8">
            {loading ? (
              <div className="animate-pulse text-muted-foreground font-body text-sm">Loading events...</div>
            ) : events.length === 0 ? (
              <p className="text-muted-foreground font-body">No active surveys at the moment.</p>
            ) : (
              <div className="w-full space-y-3">
                <p className="text-sm font-body text-muted-foreground mb-2">Select an event or use the fixed QR link for Gawad Parangal:</p>
                {events.map((event) => (
                  <button
                    key={event.id}
                    onClick={() => navigate(isPermanentGawadEvent(event) ? getPermanentEventPath() : `/survey/${event.id}`)}
                    className="w-full bg-white/75 border border-secondary/35 rounded-lg p-4 text-left hover:border-secondary hover:bg-white transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground shrink-0">
                        <ClipboardList size={20} />
                      </span>
                      <div className="min-w-0">
                        <p className="font-display font-semibold text-foreground group-hover:text-primary transition-colors truncate">{event.title}</p>
                        <p className="text-xs text-muted-foreground font-body">
                          {new Date(event.created_at).toLocaleDateString()}
                          {isPermanentGawadEvent(event) ? " - Fixed QR link" : ""}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <Button variant="ghost" size="sm" onClick={() => navigate("/admin")} className="gap-2 text-primary hover:text-primary hover:bg-primary/10 font-body text-xs mt-6">
            <ShieldCheck size={14} /> Admin
          </Button>
        </section>
      </main>
    </div>
  );
};

export default Index;
