import { useCallback, useEffect, useState, type CSSProperties } from "react";
import { useNavigate, useParams } from "react-router-dom";
import StarRating from "@/components/StarRating";
import VoiceInput from "@/components/VoiceInput";
import {
  PRE_EVENT_COMMENT_KEY,
  PRE_EVENT_RATING_KEY,
  RESPONSE_FORM_KEY,
  preSurveyPrompt,
  surveyQuestions,
  type SurveyFormType,
} from "@/data/surveyQuestions";
import {
  APP_NAME,
  GAWAD_EVENT_SLUG,
  getEventSettingsWithDefaults,
  isPermanentGawadEvent,
  type EventSettings,
} from "@/lib/eventSettings";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Send,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import {
  cacheSurveyEvent,
  createResponseId,
  getCachedSurveyEvent,
  getPendingResponseCount,
  submitSurveyResponse,
  syncPendingSurveyResponses,
} from "@/lib/offlineSurvey";
import lspuLogo from "@/assets/lspu-logo.jpg";
import gawadPubmat from "@/assets/gawad-pubmat.png";

type Ratings = Record<string, number>;
type SurveyPhase = "welcome" | "pre_event" | "pre_event_complete" | "evaluation_intro" | "evaluation" | "complete";

interface EventRecord {
  id: string;
  title: string;
  description: string | null;
}

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const LspuLogoMark = ({ className = "" }: { className?: string }) => (
  <div className={`lspu-logo-mark ${className}`}>
    <img src={lspuLogo} alt="LSPU Logo" className="h-full w-full rounded-full object-cover" />
  </div>
);

const SurveyPage = () => {
  const { eventId, eventSlug } = useParams<{ eventId?: string; eventSlug?: string }>();
  const eventKey = eventId || eventSlug || GAWAD_EVENT_SLUG;
  const navigate = useNavigate();
  const [resolvedEventId, setResolvedEventId] = useState("");
  const [eventTitle, setEventTitle] = useState("");
  const [eventSettings, setEventSettings] = useState<EventSettings>({});
  const [loading, setLoading] = useState(true);
  const [phase, setPhase] = useState<SurveyPhase>("welcome");
  const [preRating, setPreRating] = useState(0);
  const [preComment, setPreComment] = useState("");
  const [currentStep, setCurrentStep] = useState(0);
  const [ratings, setRatings] = useState<Ratings>({});
  const [suggestion, setSuggestion] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [lastSubmitQueued, setLastSubmitQueued] = useState(false);
  const [pendingResponses, setPendingResponses] = useState(0);

  const preSubmittedKey = resolvedEventId ? `${APP_NAME}:pre-event:${resolvedEventId}` : "";
  const isMainFormOpen = eventSettings.mainFormOpen === true;

  const loadEvent = useCallback(async (syncPhase = true) => {
    if (!eventKey) return;

    let event: EventRecord | null = null;

    try {
      if (uuidPattern.test(eventKey)) {
        const { data, error } = await supabase
          .from("events")
          .select("id, title, description")
          .eq("id", eventKey)
          .eq("is_active", true)
          .single();
        if (error) throw error;
        event = data;
      } else {
        const { data: directEvent, error: directError } = await supabase
          .from("events")
          .select("id, title, description")
          .eq("is_active", true)
          .ilike("description", `%${eventKey}%`)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (directError) throw directError;
        event = directEvent;

        if (!event && eventKey === GAWAD_EVENT_SLUG) {
          const { data, error } = await supabase
            .from("events")
            .select("id, title, description")
            .eq("is_active", true)
            .ilike("title", "%Gawad%")
            .order("created_at", { ascending: false })
            .limit(10);

          if (error) throw error;
          event = (data || []).find(isPermanentGawadEvent) || null;
        }
      }
    } catch {
      event = getCachedSurveyEvent(eventKey);
    }

    if (!event) {
      navigate("/", { replace: true });
      return;
    }

    cacheSurveyEvent(eventKey, event);
    const settings = getEventSettingsWithDefaults(event);
    const storedPreSubmitted = window.localStorage.getItem(`${APP_NAME}:pre-event:${event.id}`) === "true";

    setResolvedEventId(event.id);
    setEventTitle(event.title);
    setEventSettings(settings);

    if (syncPhase) {
      setPhase(settings.mainFormOpen ? "evaluation_intro" : storedPreSubmitted ? "pre_event_complete" : "welcome");
    }

    setLoading(false);
  }, [eventKey, navigate]);

  useEffect(() => {
    loadEvent();
  }, [loadEvent]);

  useEffect(() => {
    let mounted = true;

    const syncQueue = async () => {
      const remaining = await syncPendingSurveyResponses();
      if (mounted) setPendingResponses(remaining);
    };

    setPendingResponses(getPendingResponseCount());
    syncQueue();
    window.addEventListener("online", syncQueue);

    return () => {
      mounted = false;
      window.removeEventListener("online", syncQueue);
    };
  }, []);

  const evaluationSteps = surveyQuestions.length + 1;
  const isSuggestionStep = currentStep === surveyQuestions.length;
  const progress = phase === "evaluation" ? ((currentStep + 1) / evaluationSteps) * 100 : 100;

  const currentQuestion = currentStep >= 0 && currentStep < surveyQuestions.length
    ? surveyQuestions[currentStep]
    : null;
  const currentRating = currentQuestion ? ratings[currentQuestion.id] || 0 : 0;

  const startPreSurvey = () => {
    setPhase("pre_event");
    setPreRating(0);
    setPreComment("");
  };

  const submitPreSurvey = async () => {
    if (!resolvedEventId || preRating === 0) return;
    setSubmitting(true);

    const payload = {
      [RESPONSE_FORM_KEY]: "pre_event" satisfies SurveyFormType,
      [PRE_EVENT_RATING_KEY]: preRating,
    };

    const result = await submitSurveyResponse({
      id: createResponseId(),
      created_at: new Date().toISOString(),
      event_id: resolvedEventId,
      ratings: payload as Json,
      suggestion: JSON.stringify({
        [PRE_EVENT_RATING_KEY]: preRating,
        [PRE_EVENT_COMMENT_KEY]: preComment.trim(),
      }),
    });

    setSubmitting(false);

    setLastSubmitQueued(result.queued);
    setPendingResponses(getPendingResponseCount());
    if (preSubmittedKey) window.localStorage.setItem(preSubmittedKey, "true");
    setPhase(isMainFormOpen ? "evaluation_intro" : "pre_event_complete");
    setCurrentStep(0);
    setRatings({});
    setSuggestion("");
  };

  const handleRate = (value: number) => {
    if (!currentQuestion) return;
    setRatings((prev) => ({ ...prev, [currentQuestion.id]: value }));
    setTimeout(() => {
      if (currentStep < evaluationSteps - 1) {
        setCurrentStep((s) => s + 1);
      }
    }, 400);
  };

  const handleEvaluationSubmit = async () => {
    if (!resolvedEventId) return;
    setSubmitting(true);

    const evaluationRatings = {
      ...ratings,
      [RESPONSE_FORM_KEY]: "evaluation" satisfies SurveyFormType,
    };

    const result = await submitSurveyResponse({
      id: createResponseId(),
      created_at: new Date().toISOString(),
      event_id: resolvedEventId,
      ratings: evaluationRatings as Json,
      suggestion: suggestion || null,
    });

    setSubmitting(false);
    setLastSubmitQueued(result.queued);
    setPendingResponses(getPendingResponseCount());
    setPhase("complete");
  };

  const resetFlow = () => {
    setPhase(isMainFormOpen ? "evaluation_intro" : "welcome");
    setPreRating(0);
    setPreComment("");
    setCurrentStep(0);
    setRatings({});
    setSuggestion("");
    setLastSubmitQueued(false);
  };

  const pageStyle = { "--gawad-bg": `url(${gawadPubmat})` } as CSSProperties;
  const organizationPageStyle = { "--gawad-bg": "none" } as CSSProperties;

  if (loading) {
    return (
      <div className="gawad-page" style={pageStyle}>
        <div className="min-h-screen flex items-center justify-center px-4">
          <div className="gawad-panel px-8 py-6 text-center">
            <div className="animate-pulse text-primary font-body">Loading survey...</div>
          </div>
        </div>
      </div>
    );
  }

  if (phase === "welcome") {
    return (
      <div className="gawad-page" style={pageStyle}>
        <main className="min-h-[100svh] flex items-center justify-center px-3 py-4 sm:px-4 sm:py-6">
          <section className="gawad-panel gawad-grand-panel animate-slide-up w-full max-w-4xl overflow-hidden">
            <div className="grid lg:grid-cols-[1fr_0.74fr]">
              <div className="p-5 sm:p-6 lg:p-8 flex flex-col justify-center text-center lg:text-left">
                <div className="flex justify-center lg:justify-start items-center gap-3 mb-4">
                  <img src={lspuLogo} alt="LSPU Logo" className="h-14 w-14 rounded-full object-cover shadow-lg ring-2 ring-secondary/50" />
                  <div className="text-left">
                    <p className="text-xs uppercase tracking-[0.25em] text-primary font-semibold font-body">{APP_NAME}</p>
                    <p className="text-sm text-muted-foreground font-body">Laguna State Polytechnic University - Los Banos</p>
                  </div>
                </div>

                <p className="text-xs uppercase tracking-[0.28em] text-secondary font-bold font-body">2026 Event Survey</p>
                <h1 className="gawad-title mt-2 text-4xl sm:text-6xl leading-none">
                  5th Gawad Parangal
                </h1>
                <p className="gawad-script mt-1 text-xl sm:text-3xl text-secondary">
                  Pagkilala at Pagpupugay sa Kahusayan ng Serbisyong Ka-PiYu
                </p>

                <div className="gawad-ribbon mt-5">
                  <p className="text-xs uppercase tracking-[0.22em] text-secondary font-body">Event</p>
                  <p className="font-display text-lg font-bold">{eventTitle}</p>
                  <p className="mt-2 text-xs text-white/70 font-body">Organization M&E form is locked until the admin opens it.</p>
                </div>

                <p className="mt-4 text-sm sm:text-base text-foreground/80 font-body leading-relaxed">
                  Rate your first impression now. This event page will show the Organization M&E form once the admin opens it.
                </p>

                <Button
                  size="lg"
                  onClick={startPreSurvey}
                  className="mt-5 gap-2 self-center lg:self-start bg-primary text-primary-foreground hover:bg-primary/90 px-7 font-display"
                >
                  Begin Rating <ChevronRight size={20} />
                </Button>
              </div>

              <div className="relative hidden lg:block min-h-full">
                <img src={gawadPubmat} alt="5th Gawad Parangal pubmat" className="absolute inset-0 h-full w-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#061535]/75 via-transparent to-transparent" />
              </div>
            </div>
          </section>
        </main>
      </div>
    );
  }

  if (phase === "pre_event") {
    return (
      <div className="gawad-page" style={pageStyle}>
        <div className="w-full h-1.5 bg-[#061535]/50">
          <div className="h-full bg-secondary transition-all duration-500 ease-out" style={{ width: `${progress}%` }} />
        </div>

        <header className="gawad-header">
          <div className="flex items-center gap-3 min-w-0">
            <img src={lspuLogo} alt="LSPU" className="w-9 h-9 rounded-full object-cover ring-1 ring-secondary/60" />
            <div className="min-w-0">
              <span className="font-display font-semibold text-sm text-white block leading-tight">Pre-Event First Impression</span>
              <span className="text-xs font-body text-white/70 truncate block">{eventTitle}</span>
            </div>
          </div>
          <span className="text-xs font-body text-white/75">1 / 1</span>
        </header>

        <main className="min-h-[calc(100vh-56px)] flex items-center justify-center px-4 py-8">
          <section className="gawad-panel gawad-grand-panel animate-slide-up w-full max-w-2xl p-6 sm:p-8 text-center">
            <LspuLogoMark className="mx-auto mb-5" />
            <span className="text-xs font-body uppercase tracking-[0.3em] text-secondary font-bold">{preSurveyPrompt.category}</span>
            <h2 className="mt-3 text-2xl sm:text-3xl font-display font-bold text-foreground leading-tight">{preSurveyPrompt.question}</h2>
            <p className="mt-3 text-sm text-muted-foreground font-body">
              Choose 1 to 5 stars. Your written comment below is optional.
            </p>

            <div className="mt-8 flex justify-center">
              <StarRating value={preRating} onChange={setPreRating} />
            </div>

            <div className="mt-8 text-left">
              <VoiceInput
                value={preComment}
                onChange={setPreComment}
                placeholder={preSurveyPrompt.placeholder}
              />
            </div>

            <div className="mt-8 flex justify-between items-center gap-3">
              <Button
                variant="ghost"
                onClick={() => setPhase("welcome")}
                className="gap-1 font-display text-primary hover:text-primary"
              >
                <ChevronLeft size={18} /> Back
              </Button>

              <Button
                onClick={submitPreSurvey}
                disabled={preRating === 0 || submitting}
                className="gap-2 font-display bg-secondary text-secondary-foreground hover:bg-secondary/90 px-6"
              >
                {submitting ? "Submitting..." : "Submit Pre-Event"} <Send size={16} />
              </Button>
            </div>
          </section>
        </main>
      </div>
    );
  }

  if (phase === "pre_event_complete") {
    return (
      <div className="gawad-page" style={pageStyle}>
        <main className="min-h-screen flex items-center justify-center px-4 py-8">
          <section className="gawad-panel animate-slide-up w-full max-w-lg p-6 sm:p-8 text-center">
            <LspuLogoMark className="mx-auto mb-5" />
            <p className="text-xs uppercase tracking-[0.3em] text-secondary font-bold font-body">Pre-Event Recorded</p>
            <h1 className="gawad-title mt-3 text-4xl leading-none">Organization M&E Not Yet Open</h1>
            <p className="mt-4 text-sm text-muted-foreground font-body leading-relaxed">
              Thank you. The Organization M&E form will appear on this same QR link once the admin opens it.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row justify-center gap-3">
              <Button
                onClick={() => loadEvent(true)}
                className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90 font-display"
              >
                <RefreshCw size={16} /> Refresh Status
              </Button>
              <Button variant="outline" onClick={resetFlow} className="font-display border-primary/40 text-primary hover:bg-primary hover:text-primary-foreground">
                Submit Another Pre-Event Rating
              </Button>
            </div>
          </section>
        </main>
      </div>
    );
  }

  if (phase === "evaluation_intro") {
    return (
      <div className="organization-page" style={organizationPageStyle}>
        <main className="min-h-[100svh] flex items-center justify-center px-4 py-6">
          <section className="organization-card animate-slide-up w-full max-w-xl p-6 sm:p-8 text-center">
            <LspuLogoMark className="mx-auto mb-5" />
            <p className="text-xs uppercase tracking-[0.3em] text-secondary font-bold font-body">Organization M&E Open</p>
            <h1 className="mt-3 text-3xl sm:text-4xl font-display font-bold text-primary leading-tight">ORGANIZATION M&E Survey</h1>
            <p className="mt-4 text-sm text-muted-foreground font-body leading-relaxed">
              The admin has opened the Organization M&E form. This response will be stored separately from the pre-event rating.
            </p>
            {pendingResponses > 0 && (
              <p className="offline-pill mx-auto mt-5">{pendingResponses} response{pendingResponses === 1 ? "" : "s"} waiting to sync</p>
            )}
            <Button
              size="lg"
              onClick={() => {
                setPhase("evaluation");
                setCurrentStep(0);
              }}
              className="mt-8 gap-2 bg-primary text-primary-foreground hover:bg-primary/90 font-display"
            >
              Start Organization M&E Form <ChevronRight size={18} />
            </Button>
          </section>
        </main>
      </div>
    );
  }

  if (phase === "complete") {
    return (
      <div className="organization-page" style={organizationPageStyle}>
        <main className="min-h-[100svh] flex items-center justify-center px-4 py-6">
          <section className="organization-card animate-slide-up w-full max-w-md p-6 sm:p-8 text-center">
            <LspuLogoMark className="mx-auto mb-6" />
            <p className="text-xs uppercase tracking-[0.3em] text-secondary font-bold font-body">Completed</p>
            <h1 className="gawad-title mt-3 text-5xl leading-none">Salamat!</h1>
            <p className="text-muted-foreground font-body mt-4 mb-8 leading-relaxed">
              {lastSubmitQueued
                ? "Your response is saved on this device and will sync when the connection returns."
                : <>Your Organization M&E response for <strong>{eventTitle}</strong> has been recorded separately.</>}
            </p>
            {pendingResponses > 0 && <p className="offline-pill mx-auto mb-5">{pendingResponses} pending sync</p>}
            <Button variant="outline" onClick={resetFlow} className="font-display border-primary/40 text-primary hover:bg-primary hover:text-primary-foreground">
              Submit Another Response
            </Button>
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className="organization-page" style={organizationPageStyle}>
      <div className="w-full h-1.5 bg-primary/10">
        <div className="h-full bg-secondary transition-all duration-500 ease-out" style={{ width: `${progress}%` }} />
      </div>

      <header className="organization-header">
        <div className="flex items-center gap-3 min-w-0">
          <img src={lspuLogo} alt="LSPU" className="w-9 h-9 rounded-full object-cover ring-1 ring-secondary/60 bg-white" />
          <div className="min-w-0">
            <span className="font-display font-semibold text-sm text-white block leading-tight">ORGANIZATION M&E Survey</span>
            <span className="text-xs font-body text-white/75 truncate block">{eventTitle}</span>
          </div>
        </div>
        <span className="text-xs font-body text-white/75">{currentStep + 1} / {evaluationSteps}</span>
      </header>

      <main className="min-h-[calc(100svh-112px)] flex flex-col items-center justify-center px-4 py-6">
        <section key={currentStep} className="organization-card animate-slide-up w-full max-w-2xl p-6 sm:p-8 flex flex-col items-center text-center">
          {!isSuggestionStep && currentQuestion ? (
            <>
              <LspuLogoMark className="mb-5 h-14 w-14" />
              <span className="text-xs font-body uppercase tracking-[0.3em] text-secondary font-bold">{currentQuestion.category}</span>
              <h2 className="text-2xl sm:text-3xl font-display font-bold text-foreground mt-3 mb-10 leading-snug max-w-xl">{currentQuestion.question}</h2>
              <StarRating value={currentRating} onChange={handleRate} />
            </>
          ) : (
            <>
              <span className="text-xs font-body uppercase tracking-[0.3em] text-secondary font-bold mb-3">Almost Done</span>
              <h2 className="text-2xl sm:text-3xl font-display font-bold text-foreground mb-3 leading-snug max-w-md">Any suggestions for improvement?</h2>
              <p className="text-muted-foreground font-body text-sm mb-8">Type or use voice input to share your thoughts.</p>
              <div className="w-full max-w-md">
                <VoiceInput value={suggestion} onChange={setSuggestion} placeholder="What can be improved for future activities?" />
              </div>
            </>
          )}
        </section>
      </main>

      <footer className="organization-footer">
        <Button
          variant="ghost"
          onClick={() => (currentStep === 0 ? setPhase("evaluation_intro") : setCurrentStep((s) => Math.max(0, s - 1)))}
          className="gap-1 font-display text-white/75 hover:text-white hover:bg-white/10"
        >
          <ChevronLeft size={18} /> Back
        </Button>
        {isSuggestionStep ? (
          <Button onClick={handleEvaluationSubmit} disabled={submitting} className="gap-2 font-display bg-secondary text-secondary-foreground hover:bg-secondary/90 px-6">
            {submitting ? "Submitting..." : "Submit Organization M&E"} <Send size={16} />
          </Button>
        ) : (
          <Button variant="ghost" onClick={() => setCurrentStep((s) => s + 1)} disabled={!currentRating} className="gap-1 font-display text-white/75 hover:text-white hover:bg-white/10">
            Skip <ChevronRight size={18} />
          </Button>
        )}
      </footer>
    </div>
  );
};

export default SurveyPage;
