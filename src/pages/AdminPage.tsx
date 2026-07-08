import { useEffect, useMemo, useState, type CSSProperties, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import QRCode from "qrcode";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Award,
  BarChart3,
  Check,
  Copy,
  Download,
  KeyRound,
  Link2,
  LockKeyhole,
  LogIn,
  Plus,
  QrCode,
  ShieldCheck,
  Trash2,
  UnlockKeyhole,
} from "lucide-react";
import {
  APP_NAME,
  GAWAD_EVENT_SLUG,
  getEventSettingsWithDefaults,
  getPermanentEventPath,
  getPermanentEventUrl,
  isPermanentGawadEvent,
  serializeEventDescription,
} from "@/lib/eventSettings";
import lspuLogo from "@/assets/lspu-logo.jpg";
import gawadPubmat from "@/assets/gawad-pubmat.png";
import type { Session } from "@supabase/supabase-js";

interface EventRecord {
  id: string;
  title: string;
  description: string | null;
  created_at: string;
}

const ADMIN_PIN = "246859713";
const PIN_STORAGE_KEY = "lspu-admin-pin-verified";

const AdminPage = () => {
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [pinVerified, setPinVerified] = useState(false);
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [newEventTitle, setNewEventTitle] = useState("5th Gawad Parangal 2026");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState("");

  const permanentUrl = useMemo(() => getPermanentEventUrl(window.location.origin), []);
  const pinnedEvent = events.find(isPermanentGawadEvent);

  useEffect(() => {
    setPinVerified(window.sessionStorage.getItem(PIN_STORAGE_KEY) === "true");
  }, []);

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

  useEffect(() => {
    QRCode.toDataURL(permanentUrl, {
      width: 280,
      margin: 2,
      color: {
        dark: "#061535",
        light: "#fff8eb",
      },
    }).then(setQrDataUrl);
  }, [permanentUrl]);

  const fetchEvents = async () => {
    const { data } = await supabase.from("events").select("*").order("created_at", { ascending: false });
    if (data) setEvents(data as EventRecord[]);
  };

  const handleLogin = async (e: FormEvent) => {
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

  const updateEventSettings = async (event: EventRecord, patch: { mainFormOpen?: boolean; slug?: string }) => {
    const currentSettings = getEventSettingsWithDefaults(event);
    const nextSettings = {
      ...currentSettings,
      ...patch,
    };

    await supabase
      .from("events")
      .update({ description: serializeEventDescription(nextSettings, event.description) })
      .eq("id", event.id);

    fetchEvents();
  };

  const copyText = (id: string, value: string) => {
    navigator.clipboard.writeText(value);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const eventLink = (event: EventRecord) => {
    return isPermanentGawadEvent(event)
      ? permanentUrl
      : `${window.location.origin}/survey/${event.id}`;
  };

  const handlePinSubmit = (e: FormEvent) => {
    e.preventDefault();

    if (pin.trim() !== ADMIN_PIN) {
      setPinError("Incorrect admin PIN.");
      return;
    }

    window.sessionStorage.setItem(PIN_STORAGE_KEY, "true");
    setPinVerified(true);
    setPin("");
    setPinError("");
  };

  if (loading) {
    return (
      <div className="gawad-page" style={{ "--gawad-bg": `url(${gawadPubmat})` } as CSSProperties}>
        <div className="min-h-screen flex items-center justify-center px-4">
          <div className="gawad-panel px-8 py-6 text-center">
            <div className="animate-pulse text-primary">Loading admin...</div>
          </div>
        </div>
      </div>
    );
  }

  if (!pinVerified) {
    return (
      <div className="gawad-page" style={{ "--gawad-bg": `url(${gawadPubmat})` } as CSSProperties}>
        <main className="min-h-[100svh] flex items-center justify-center px-4 py-4">
          <section className="gawad-panel w-full max-w-sm animate-slide-up p-5 sm:p-6">
            <div className="flex flex-col items-center mb-6 text-center">
              <img src={lspuLogo} alt="LSPU" className="w-14 h-14 rounded-full object-cover mb-3 shadow-md ring-2 ring-secondary/50" />
              <p className="text-xs uppercase tracking-[0.24em] text-secondary font-bold font-body">{APP_NAME}</p>
              <h1 className="text-2xl font-display font-bold text-foreground mt-2">Admin Access</h1>
              <p className="text-sm text-muted-foreground font-body">Enter the event admin PIN to continue.</p>
            </div>

            <form onSubmit={handlePinSubmit} className="space-y-4">
              <Input
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="Admin PIN"
                value={pin}
                onChange={(e) => {
                  setPin(e.target.value);
                  setPinError("");
                }}
                required
                className="font-body bg-white/80 text-center tracking-[0.25em]"
              />
              {pinError && <p className="text-sm text-destructive font-body text-center">{pinError}</p>}
              <Button type="submit" className="w-full gap-2 bg-primary text-primary-foreground font-display">
                <KeyRound size={16} /> Continue
              </Button>
            </form>
          </section>
        </main>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="gawad-page" style={{ "--gawad-bg": `url(${gawadPubmat})` } as CSSProperties}>
        <main className="min-h-[100svh] flex items-center justify-center px-4 py-4">
          <section className="gawad-panel w-full max-w-sm animate-slide-up p-5 sm:p-6">
            <div className="flex flex-col items-center mb-6 text-center">
              <img src={lspuLogo} alt="LSPU" className="w-14 h-14 rounded-full object-cover mb-3 shadow-md ring-2 ring-secondary/50" />
              <p className="text-xs uppercase tracking-[0.24em] text-secondary font-bold font-body">{APP_NAME}</p>
              <h1 className="text-2xl font-display font-bold text-foreground mt-2">Admin Login</h1>
              <p className="text-sm text-muted-foreground font-body">Manage the fixed QR and separated survey results</p>
            </div>
            <form onSubmit={handleLogin} className="space-y-4">
              <Input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required className="font-body bg-white/80" />
              <Input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required className="font-body bg-white/80" />
              {authError && <p className="text-sm text-destructive font-body">{authError}</p>}
              <Button type="submit" className="w-full gap-2 bg-primary text-primary-foreground font-display">
                <LogIn size={16} /> Sign In
              </Button>
              <Button type="button" variant="ghost" onClick={handleSignup} className="w-full text-sm text-primary hover:text-primary hover:bg-primary/10 font-body">
                Create Admin Account
              </Button>
            </form>
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className="gawad-page" style={{ "--gawad-bg": `url(${gawadPubmat})` } as CSSProperties}>
      <header className="gawad-header">
        <div className="flex items-center gap-3">
          <img src={lspuLogo} alt="LSPU" className="w-9 h-9 rounded-full object-cover ring-1 ring-secondary/60" />
          <div>
            <h1 className="font-display font-bold text-white leading-tight">{APP_NAME}</h1>
            <p className="text-xs text-white/70 font-body">Fixed QR and form gate control</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={() => supabase.auth.signOut()} className="text-white/75 hover:text-white hover:bg-white/10 font-body text-sm">
          Sign Out
        </Button>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        <section className="gawad-panel gawad-grand-panel p-5 sm:p-6">
          <div className="grid lg:grid-cols-[1fr_260px] gap-6 items-center">
            <div>
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg">
                  <QrCode size={24} />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.28em] text-secondary font-bold font-body">Fixed QR</p>
                  <h2 className="text-2xl font-display font-bold text-foreground">Fixed 5th Gawad Parangal Link</h2>
                  <p className="text-sm text-muted-foreground font-body mt-1">
                    The QR always points to <span className="font-semibold text-primary">{getPermanentEventPath()}</span>. Admin controls decide whether it shows pre-event or the Organization M&E form.
                  </p>
                </div>
              </div>

              <div className="gawad-ribbon mt-5">
                <p className="text-xs uppercase tracking-[0.22em] text-secondary font-body">Current QR Target</p>
                <p className="font-body text-sm break-all">{permanentUrl}</p>
                <p className="mt-2 text-xs text-white/70 font-body">
                  Linked event: {pinnedEvent ? pinnedEvent.title : "Not pinned yet"}
                </p>
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                <Button onClick={() => copyText("permanent", permanentUrl)} className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90 font-display">
                  {copiedId === "permanent" ? <Check size={16} /> : <Copy size={16} />}
                  {copiedId === "permanent" ? "Copied" : "Copy Fixed Link"}
                </Button>
                <Button variant="outline" onClick={() => navigate(getPermanentEventPath())} className="gap-2 border-primary/40 text-primary hover:bg-primary hover:text-primary-foreground font-display">
                  <Link2 size={16} /> Open Fixed Link
                </Button>
                {qrDataUrl && (
                  <Button asChild variant="outline" className="gap-2 border-secondary/50 text-foreground hover:bg-secondary hover:text-secondary-foreground font-display">
                    <a href={qrDataUrl} download={`${APP_NAME.replace(/\s+/g, "-").toLowerCase()}-${GAWAD_EVENT_SLUG}-qr.png`}>
                      <Download size={16} /> Download QR
                    </a>
                  </Button>
                )}
              </div>
            </div>

            <div className="gawad-qr-frame">
              {qrDataUrl ? <img src={qrDataUrl} alt="Fixed QR for 5th Gawad Parangal" /> : <div className="animate-pulse text-sm text-muted-foreground">Generating QR...</div>}
            </div>
          </div>
        </section>

        <section className="gawad-panel p-5 sm:p-6">
          <div className="flex items-start gap-4 mb-5">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg">
              <Award size={24} />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-secondary font-bold font-body">Create Event</p>
              <h2 className="text-2xl font-display font-bold text-foreground">Survey Event</h2>
              <p className="text-sm text-muted-foreground font-body">Pin the Gawad event to the fixed QR, then open the Organization M&E form when ready.</p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <Input
              placeholder="Event title"
              value={newEventTitle}
              onChange={(e) => setNewEventTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && createEvent()}
              className="font-body bg-white/80"
            />
            <Button onClick={createEvent} className="gap-2 bg-primary text-primary-foreground font-display shrink-0">
              <Plus size={16} /> Create
            </Button>
          </div>
        </section>

        <section className="gawad-panel p-5 sm:p-6">
          <h2 className="text-lg font-display font-semibold text-foreground mb-3">Events</h2>
          {events.length === 0 ? (
            <p className="text-muted-foreground font-body text-sm">No events yet. Create one above.</p>
          ) : (
            <div className="space-y-3">
              {events.map((event) => {
                const settings = getEventSettingsWithDefaults(event);
                const pinned = isPermanentGawadEvent(event);
                const mainOpen = settings.mainFormOpen === true;

                return (
                  <div key={event.id} className="bg-white/75 border border-secondary/30 rounded-lg p-4 flex flex-col gap-3">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-display font-semibold text-foreground truncate">{event.title}</p>
                        <p className="text-xs text-muted-foreground font-body">
                          Created {new Date(event.created_at).toLocaleDateString()} - {pinned ? "Fixed QR pinned" : "Regular event link"}
                        </p>
                      </div>
                      <div className={`gawad-status ${mainOpen ? "gawad-status-open" : ""}`}>
                        {mainOpen ? <UnlockKeyhole size={14} /> : <LockKeyhole size={14} />}
                        {mainOpen ? "Organization M&E Open" : "Pre-Event Only"}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 shrink-0">
                      {!pinned && event.title.toLowerCase().includes("gawad") && (
                        <Button variant="outline" size="sm" onClick={() => updateEventSettings(event, { slug: GAWAD_EVENT_SLUG, mainFormOpen: false })} className="gap-1 text-xs font-body border-secondary/50 text-foreground hover:bg-secondary hover:text-secondary-foreground">
                          <QrCode size={14} /> Pin QR
                        </Button>
                      )}
                      <Button variant="outline" size="sm" onClick={() => copyText(event.id, eventLink(event))} className="gap-1 text-xs font-body border-primary/40 text-primary hover:bg-primary hover:text-primary-foreground">
                        {copiedId === event.id ? <Check size={14} /> : <Copy size={14} />}
                        {copiedId === event.id ? "Copied" : pinned ? "Fixed Link" : "Survey Link"}
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => navigate(pinned ? getPermanentEventPath() : `/survey/${event.id}`)} className="gap-1 text-xs font-body border-secondary/50 text-foreground hover:bg-secondary hover:text-secondary-foreground">
                        <Link2 size={14} /> Open
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => updateEventSettings(event, { mainFormOpen: !mainOpen, slug: pinned ? GAWAD_EVENT_SLUG : settings.slug })} className="gap-1 text-xs font-body border-primary/40 text-primary hover:bg-primary hover:text-primary-foreground">
                        {mainOpen ? <LockKeyhole size={14} /> : <ShieldCheck size={14} />}
                        {mainOpen ? "Close Organization M&E" : "Open Organization M&E"}
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => navigate(`/admin/results/${event.id}`)} className="gap-1 text-xs font-body border-primary/40 text-primary hover:bg-primary hover:text-primary-foreground">
                        <BarChart3 size={14} /> Results
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => deleteEvent(event.id)} className="text-destructive hover:text-destructive hover:bg-destructive/10">
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

export default AdminPage;
