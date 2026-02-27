import { useState } from "react";
import StarRating from "@/components/StarRating";
import VoiceInput from "@/components/VoiceInput";
import { surveyQuestions } from "@/data/surveyQuestions";
import { Button } from "@/components/ui/button";
import { ChevronRight, ChevronLeft, Send, CheckCircle2 } from "lucide-react";
import lspuLogo from "@/assets/lspu-logo.jpg";

type Ratings = Record<string, number>;

const Index = () => {
  const [started, setStarted] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [ratings, setRatings] = useState<Ratings>({});
  const [suggestion, setSuggestion] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const totalSteps = surveyQuestions.length + 1; // +1 for suggestion
  const isLastRating = currentStep === surveyQuestions.length - 1;
  const isSuggestionStep = currentStep === surveyQuestions.length;
  const progress = ((currentStep + 1) / totalSteps) * 100;

  const currentQuestion = surveyQuestions[currentStep];
  const currentRating = currentQuestion ? ratings[currentQuestion.id] || 0 : 0;

  const handleRate = (value: number) => {
    if (!currentQuestion) return;
    setRatings((prev) => ({ ...prev, [currentQuestion.id]: value }));
    // Auto-advance after a brief delay
    setTimeout(() => {
      if (currentStep < totalSteps - 1) {
        setCurrentStep((s) => s + 1);
      }
    }, 400);
  };

  const handleSubmit = () => {
    console.log("Survey submitted:", { ratings, suggestion });
    setSubmitted(true);
  };

  // Welcome screen
  if (!started) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4">
        <div className="animate-slide-up flex flex-col items-center text-center max-w-lg">
          <img
            src={lspuLogo}
            alt="LSPU Logo"
            className="w-24 h-24 rounded-full object-cover mb-6 shadow-lg"
          />
          <h1 className="text-3xl sm:text-4xl font-display font-bold text-foreground mb-2">
            Monitoring & Evaluation
          </h1>
          <p className="text-muted-foreground font-body mb-1 text-sm">
            Office of Student Affairs and Services
          </p>
          <p className="text-muted-foreground font-body mb-8 text-sm">
            2nd Semester · A.Y. 2025–2026
          </p>
          <p className="text-foreground font-body mb-8 leading-relaxed">
            Rate each aspect of the activity from 1 to 5 stars.
            <br />
            It only takes a minute!
          </p>
          <Button
            size="lg"
            onClick={() => setStarted(true)}
            className="gap-2 text-lg px-8 py-6 font-display font-semibold bg-primary text-primary-foreground hover:bg-primary/90"
          >
            Start Survey <ChevronRight size={20} />
          </Button>
        </div>
      </div>
    );
  }

  // Thank you screen
  if (submitted) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4">
        <div className="animate-slide-up flex flex-col items-center text-center max-w-md">
          <CheckCircle2 size={80} className="text-accent mb-6" />
          <h1 className="text-3xl font-display font-bold text-foreground mb-3">
            Salamat!
          </h1>
          <p className="text-muted-foreground font-body mb-8 leading-relaxed">
            Your response has been recorded. Thank you for helping us improve our programs and services.
          </p>
          <Button
            variant="outline"
            onClick={() => {
              setStarted(false);
              setCurrentStep(0);
              setRatings({});
              setSuggestion("");
              setSubmitted(false);
            }}
            className="font-display"
          >
            Submit Another Response
          </Button>
        </div>
      </div>
    );
  }

  // Survey flow
  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Progress bar */}
      <div className="w-full h-1.5 bg-muted">
        <div
          className="h-full bg-survey-progress transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-3">
          <img
            src={lspuLogo}
            alt="LSPU"
            className="w-8 h-8 rounded-full object-cover"
          />
          <span className="font-display font-semibold text-sm text-foreground">
            M&E Survey
          </span>
        </div>
        <span className="text-xs font-body text-muted-foreground">
          {currentStep + 1} / {totalSteps}
        </span>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-8">
        <div key={currentStep} className="animate-slide-up w-full max-w-xl flex flex-col items-center text-center">
          {!isSuggestionStep && currentQuestion ? (
            <>
              <span className="text-xs font-body uppercase tracking-widest text-primary font-semibold mb-3">
                {currentQuestion.category}
              </span>
              <h2 className="text-xl sm:text-2xl font-display font-bold text-foreground mb-10 leading-snug max-w-md">
                {currentQuestion.question}
              </h2>
              <StarRating value={currentRating} onChange={handleRate} />
            </>
          ) : (
            <>
              <span className="text-xs font-body uppercase tracking-widest text-primary font-semibold mb-3">
                Almost Done
              </span>
              <h2 className="text-xl sm:text-2xl font-display font-bold text-foreground mb-3 leading-snug max-w-md">
                Any suggestions for improvement?
              </h2>
              <p className="text-muted-foreground font-body text-sm mb-8">
                Type or use voice input to share your thoughts.
              </p>
              <div className="w-full max-w-md">
                <VoiceInput
                  value={suggestion}
                  onChange={setSuggestion}
                  placeholder="What can be improved for future activities?"
                />
              </div>
            </>
          )}
        </div>
      </div>

      {/* Navigation */}
      <div className="px-4 py-4 border-t border-border flex justify-between items-center">
        <Button
          variant="ghost"
          onClick={() => setCurrentStep((s) => Math.max(0, s - 1))}
          disabled={currentStep === 0}
          className="gap-1 font-display text-muted-foreground"
        >
          <ChevronLeft size={18} /> Back
        </Button>

        {isSuggestionStep ? (
          <Button
            onClick={handleSubmit}
            className="gap-2 font-display bg-accent text-accent-foreground hover:bg-accent/90 px-6"
          >
            Submit <Send size={16} />
          </Button>
        ) : (
          <Button
            variant="ghost"
            onClick={() => setCurrentStep((s) => s + 1)}
            disabled={!currentRating}
            className="gap-1 font-display text-muted-foreground"
          >
            Skip <ChevronRight size={18} />
          </Button>
        )}
      </div>
    </div>
  );
};

export default Index;
