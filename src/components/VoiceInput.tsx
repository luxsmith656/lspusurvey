import { useState, useRef } from "react";
import { Mic, MicOff, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface VoiceInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

interface SpeechRecognitionResultItem {
  0: {
    transcript: string;
  };
}

interface SpeechRecognitionResultListLike {
  length: number;
  [index: number]: SpeechRecognitionResultItem;
}

interface SpeechRecognitionEventLike {
  results: SpeechRecognitionResultListLike;
}

interface SpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

interface WindowWithSpeechRecognition extends Window {
  SpeechRecognition?: SpeechRecognitionConstructor;
  webkitSpeechRecognition?: SpeechRecognitionConstructor;
}

const VoiceInput = ({ value, onChange, placeholder }: VoiceInputProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  const toggleRecording = () => {
    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
      return;
    }

    const browserWindow = window as WindowWithSpeechRecognition;
    const SpeechRecognition =
      browserWindow.SpeechRecognition || browserWindow.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("Speech recognition is not supported in this browser. Please type your response instead.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event) => {
      let transcript = "";
      for (let i = 0; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      onChange(transcript);
    };

    recognition.onerror = () => setIsRecording(false);
    recognition.onend = () => setIsRecording(false);

    recognitionRef.current = recognition;
    recognition.start();
    setIsRecording(true);
  };

  return (
    <div className="w-full space-y-3">
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder || "Type your suggestions here or use the microphone..."}
        className="min-h-[120px] text-base font-body bg-card border-border resize-none"
        rows={4}
      />
      <Button
        type="button"
        variant={isRecording ? "destructive" : "outline"}
        onClick={toggleRecording}
        className={`gap-2 ${isRecording ? "animate-pulse-ring" : ""}`}
      >
        {isRecording ? (
          <>
            <Square size={16} /> Stop Recording
          </>
        ) : (
          <>
            <Mic size={16} /> Voice Input
          </>
        )}
      </Button>
    </div>
  );
};

export default VoiceInput;
