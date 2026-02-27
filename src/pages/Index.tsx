import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ClipboardList, ShieldCheck } from "lucide-react";
import lspuLogo from "@/assets/lspu-logo.jpg";

const Index = () => {
  const navigate = useNavigate();
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEvents = async () => {
      const { data } = await supabase
        .from("events")
        .select("id, title, created_at")
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      if (data) setEvents(data);
      setLoading(false);
    };
    fetchEvents();
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4">
      <div className="animate-slide-up flex flex-col items-center text-center max-w-lg w-full">
        <img src={lspuLogo} alt="LSPU Logo" className="w-20 h-20 rounded-full object-cover mb-6 shadow-lg" />
        <h1 className="text-3xl sm:text-4xl font-display font-bold text-foreground mb-2">
          M&E Survey
        </h1>
        <p className="text-muted-foreground font-body mb-8 text-sm">
          Laguna State Polytechnic University · OSAS
        </p>

        {loading ? (
          <div className="animate-pulse text-muted-foreground font-body text-sm">Loading events...</div>
        ) : events.length === 0 ? (
          <p className="text-muted-foreground font-body">No active surveys at the moment.</p>
        ) : (
          <div className="w-full space-y-3 mb-8">
            <p className="text-sm font-body text-muted-foreground mb-2">Select an event to evaluate:</p>
            {events.map(event => (
              <button
                key={event.id}
                onClick={() => navigate(`/survey/${event.id}`)}
                className="w-full bg-card border border-border rounded-lg p-4 text-left hover:border-primary/50 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <ClipboardList size={20} className="text-primary shrink-0" />
                  <div>
                    <p className="font-display font-semibold text-foreground group-hover:text-primary transition-colors">{event.title}</p>
                    <p className="text-xs text-muted-foreground font-body">{new Date(event.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        <Button variant="ghost" size="sm" onClick={() => navigate("/admin")} className="gap-2 text-muted-foreground font-body text-xs mt-4">
          <ShieldCheck size={14} /> Admin
        </Button>
      </div>
    </div>
  );
};

export default Index;
