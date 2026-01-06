'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Mic, MicOff, Send, Check, Loader2 } from 'lucide-react';
import type { DailyCheckin, CheckinResponseMethod } from '@/types';

interface DailyCheckinFormProps {
  existingCheckin?: DailyCheckin | null;
  onSubmitSuccess?: (checkin: DailyCheckin) => void;
}

interface SpeechRecognitionResult {
  transcript: string;
  isFinal: boolean;
}

const QUESTIONS = [
  {
    id: 'outcomesToday',
    label: 'What outcomes were reached today?',
    placeholder: 'Describe what you accomplished today...',
  },
  {
    id: 'challenges',
    label: 'Any challenges or blockages you faced?',
    placeholder: 'Share any difficulties or obstacles...',
  },
  {
    id: 'learnings',
    label: 'What was something you learnt?',
    placeholder: 'Share a key learning or insight...',
  },
  {
    id: 'nextDayOutcomes',
    label: 'Next work day outcomes:',
    placeholder: 'What do you plan to achieve tomorrow?',
  },
];

export function DailyCheckinForm({ existingCheckin, onSubmitSuccess }: DailyCheckinFormProps) {
  const [formData, setFormData] = useState({
    outcomesToday: existingCheckin?.outcomesToday || '',
    challenges: existingCheckin?.challenges || '',
    learnings: existingCheckin?.learnings || '',
    nextDayOutcomes: existingCheckin?.nextDayOutcomes || '',
  });
  const [responseMethod, setResponseMethod] = useState<CheckinResponseMethod>('Typed');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(existingCheckin?.completed || false);
  const [activeRecording, setActiveRecording] = useState<string | null>(null);
  const [speechSupported, setSpeechSupported] = useState(false);

  const recognitionRef = useRef<any>(null);

  // Check for speech recognition support
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      setSpeechSupported(!!SpeechRecognition);
    }
  }, []);

  // Initialize speech recognition
  const startRecording = (fieldId: string) => {
    if (!speechSupported) return;

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-AU';

    recognition.onresult = (event: any) => {
      let transcript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }

      // Append to existing text
      setFormData(prev => ({
        ...prev,
        [fieldId]: prev[fieldId as keyof typeof prev] + (prev[fieldId as keyof typeof prev] ? ' ' : '') + transcript,
      }));
    };

    recognition.onend = () => {
      setActiveRecording(null);
      setResponseMethod('Speech');
    };

    recognition.onerror = (event: any) => {
      // Ignore 'aborted' errors - they occur normally when stopping recording
      if (event.error !== 'aborted') {
        console.error('Speech recognition error:', event.error);
      }
      setActiveRecording(null);
    };

    recognition.start();
    recognitionRef.current = recognition;
    setActiveRecording(fieldId);
  };

  const stopRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setActiveRecording(null);
  };

  const toggleRecording = (fieldId: string) => {
    if (activeRecording === fieldId) {
      stopRecording();
    } else {
      if (activeRecording) {
        stopRecording();
      }
      startRecording(fieldId);
    }
  };

  const handleChange = (fieldId: string, value: string) => {
    setFormData(prev => ({ ...prev, [fieldId]: value }));
    if (responseMethod === 'Speech') {
      setResponseMethod('Typed');
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/checkins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          responseMethod,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save check-in');
      }

      const data = await response.json();
      setSubmitted(true);

      if (onSubmitSuccess && data.checkin) {
        onSubmitSuccess(data.checkin);
      }
    } catch (error) {
      console.error('Error submitting check-in:', error);
      alert('Failed to save check-in. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Check if form has content
  const hasContent = Object.values(formData).some(v => v.trim());

  if (submitted && existingCheckin?.completed) {
    return (
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-green-500/20 rounded-full flex items-center justify-center">
              <Check className="w-5 h-5 text-green-500" />
            </div>
            <div>
              <CardTitle className="text-white">Check-in Complete</CardTitle>
              <CardDescription className="text-zinc-400">
                You've already completed your check-in for today
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {QUESTIONS.map(q => (
            <div key={q.id} className="space-y-1">
              <Label className="text-zinc-400 text-sm">{q.label}</Label>
              <p className="text-white text-sm whitespace-pre-wrap">
                {formData[q.id as keyof typeof formData] || '-'}
              </p>
            </div>
          ))}
          {existingCheckin?.qualityScore && (
            <div className="flex items-center gap-2 pt-2 border-t border-zinc-800">
              <Badge variant="outline" className="text-zinc-400">
                Quality: {existingCheckin.qualityScore}/10
              </Badge>
              {existingCheckin.sentiment && (
                <Badge
                  variant="outline"
                  className={
                    existingCheckin.sentiment === 'positive' ? 'text-green-400 border-green-400/30' :
                    existingCheckin.sentiment === 'negative' ? 'text-red-400 border-red-400/30' :
                    'text-zinc-400'
                  }
                >
                  {existingCheckin.sentiment}
                </Badge>
              )}
            </div>
          )}
        </CardContent>
        <CardFooter>
          <Button
            variant="outline"
            onClick={() => setSubmitted(false)}
            className="w-full"
          >
            Edit Check-in
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader>
        <CardTitle className="text-white">Daily Check-in</CardTitle>
        <CardDescription className="text-zinc-400">
          Answer 4 quick questions about your day
          {speechSupported && (
            <span className="ml-2 text-xs">(Speech-to-text available)</span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {QUESTIONS.map(q => (
          <div key={q.id} className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor={q.id} className="text-white">
                {q.label}
              </Label>
              {speechSupported && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleRecording(q.id)}
                  className={activeRecording === q.id ? 'text-red-400 hover:text-red-300' : 'text-zinc-400 hover:text-white'}
                >
                  {activeRecording === q.id ? (
                    <>
                      <MicOff className="w-4 h-4 mr-1" />
                      Stop
                    </>
                  ) : (
                    <>
                      <Mic className="w-4 h-4 mr-1" />
                      Speak
                    </>
                  )}
                </Button>
              )}
            </div>
            <div className="relative">
              <Textarea
                id={q.id}
                value={formData[q.id as keyof typeof formData]}
                onChange={(e) => handleChange(q.id, e.target.value)}
                placeholder={q.placeholder}
                className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 min-h-[80px]"
                disabled={activeRecording === q.id}
              />
              {activeRecording === q.id && (
                <div className="absolute top-2 right-2">
                  <span className="flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                  </span>
                </div>
              )}
            </div>
          </div>
        ))}
      </CardContent>
      <CardFooter className="flex justify-between">
        <Badge variant="outline" className="text-zinc-500">
          {responseMethod === 'Speech' ? 'Using voice input' : 'Typing'}
        </Badge>
        <Button
          onClick={handleSubmit}
          disabled={isSubmitting || !hasContent}
          className="gap-2"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Send className="w-4 h-4" />
              Submit Check-in
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}
