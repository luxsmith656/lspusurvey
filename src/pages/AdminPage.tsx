import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LogIn, Plus, BarChart3, Trash2, Link2, Copy, Check } from "lucide-react";
import lspuLogo from "@/assets/lspu-logo.jpg";
import type { Session } from "@supabase/supabase-js";

const AdminPage = () => {
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [events, setEvents] = useState<any[]>([]);
  const [newEventTitle, setNewEventTitle] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setLoading(false);
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session) fetchEvents();
  }, [session]);

  const fetchEvents = async () => {
    const { data } = await supabase.from("events").select("*").order("created_at", { ascending: false });
    if (data) setEvents(data);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setAuthError(error.message);
  };

  const handleSignup = async () => {
    setAuthError("");
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) setAuthError(error.message);
    else setAuthError("Check your email to confirm your account.");
  };

  const createEvent = async () => {
    if (!newEventTitle.trim()) return;
    await supabase.from("events").insert({ title: newEventTitle.trim(), created_by: session?.user.id });
    setNewEventTitle("");
    fetchEvents();
  };

  const deleteEvent = async (id: string) => {
    await supabase.from("events").delete().eq("id", id);
    fetchEvents();
  };

  const copyLink = (id: string) => {
    const url = `${window.location.origin}/survey/${id}`;
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-background"><div className="animate-pulse text-muted-foreground">Loading...</div></div>;
  }

  // Login form
  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="w-full max-w-sm animate-slide-up">
          <div className="flex flex-col items-center mb-8">
            <img src={lspuLogo} alt="LSPU" className="w-16 h-16 rounded-full object-cover mb-4 shadow-md" />
            <h1 className="text-2xl font-display font-bold text-foreground">Admin Login</h1>
            <p className="text-sm text-muted-foreground font-body">M&E Survey Management</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <Input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required className="font-body" />
            <Input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required className="font-body" />
            {authError && <p className="text-sm text-destructive font-body">{authError}</p>}
            <Button type="submit" className="w-full gap-2 bg-primary text-primary-foreground font-display">
              <LogIn size={16} /> Sign In
            </Button>
            <Button type="button" variant="ghost" onClick={handleSignup} className="w-full text-sm text-muted-foreground font-body">
              Create Admin Account
            </Button>
          </form>
        </div>
      </div>
    );
  }

  // Admin dashboard
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src={lspuLogo} alt="LSPU" className="w-8 h-8 rounded-full object-cover" />
          <h1 className="font-display font-bold text-foreground">M&E Admin</h1>
        </div>
        <Button variant="ghost" size="sm" onClick={() => supabase.auth.signOut()} className="text-muted-foreground font-body text-sm">
          Sign Out
        </Button>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        {/* Create event */}
        <div className="mb-8">
          <h2 className="text-lg font-display font-semibold text-foreground mb-3">Create Event</h2>
          <div className="flex gap-2">
            <Input
              placeholder="Event title (e.g. Leadership Seminar 2025)"
              value={newEventTitle}
              onChange={e => setNewEventTitle(e.target.value)}
              onKeyDown={e => e.key === "Enter" && createEvent()}
              className="font-body"
            />
            <Button onClick={createEvent} className="gap-2 bg-primary text-primary-foreground font-display shrink-0">
              <Plus size={16} /> Create
            </Button>
          </div>
        </div>

        {/* Event list */}
        <h2 className="text-lg font-display font-semibold text-foreground mb-3">Events</h2>
        {events.length === 0 ? (
          <p className="text-muted-foreground font-body text-sm">No events yet. Create one above.</p>
        ) : (
          <div className="space-y-3">
            {events.map(event => (
              <div key={event.id} className="bg-card border border-border rounded-lg p-4 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-display font-semibold text-foreground truncate">{event.title}</p>
                  <p className="text-xs text-muted-foreground font-body">
                    {new Date(event.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button variant="outline" size="sm" onClick={() => copyLink(event.id)} className="gap-1 text-xs font-body">
                    {copiedId === event.id ? <Check size={14} /> : <Copy size={14} />}
                    {copiedId === event.id ? "Copied" : "Link"}
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => navigate(`/admin/results/${event.id}`)} className="gap-1 text-xs font-body">
                    <BarChart3 size={14} /> Results
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => deleteEvent(event.id)} className="text-destructive hover:text-destructive">
                    <Trash2 size={14} />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminPage;
