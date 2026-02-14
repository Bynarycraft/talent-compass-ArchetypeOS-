"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import {
    ChevronLeft,
    ChevronRight,
    Clock,
    AlertCircle,
    Send,
    ArrowLeft
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface Question {
    q: string;
    options: string[];
}

interface Test {
    id: string;
    title: string;
    description: string | null;
    questions: Question[];
    timeLimitMinutes: number | null;
}

export default function TestPage({ params }: { params: Promise<{ courseId: string, testId: string }> }) {
    const { courseId, testId } = use(params);
    const router = useRouter();
    const [test, setTest] = useState<Test | null>(null);
    const [loading, setLoading] = useState(true);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [answers, setAnswers] = useState<Record<number, number>>({});
    const [timeLeft, setTimeLeft] = useState<number | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [startedAt, setStartedAt] = useState<string | null>(null);
    const [attemptsRemaining, setAttemptsRemaining] = useState<number | null>(null);
    const [attemptLimit, setAttemptLimit] = useState<number | null>(null);

    useEffect(() => {
        async function fetchTest() {
            try {
                const enrollRes = await fetch(`/api/courses/${courseId}/enroll-status`);
                if (!enrollRes.ok) {
                    router.push(`/courses/${courseId}`);
                    return;
                }
                const enrollment = await enrollRes.json();
                if (!enrollment) {
                    router.push(`/courses/${courseId}`);
                    return;
                }

                const res = await fetch(`/api/tests/${testId}`);
                if (!res.ok) {
                    router.push(`/courses/${courseId}`);
                    return;
                }
                const data = await res.json();
                setTest(data);
                if (data.timeLimitMinutes) {
                    setTimeLeft(data.timeLimitMinutes * 60);
                }

                const attemptsRes = await fetch(`/api/tests/${testId}/attempts`);
                if (attemptsRes.ok) {
                    const attemptsData = await attemptsRes.json();
                    setAttemptLimit(attemptsData.attemptLimit);
                    setAttemptsRemaining(attemptsData.attemptsRemaining);
                    if (attemptsData.attemptsRemaining <= 0) {
                        toast.error("No attempts remaining for this assessment.");
                    }
                }
                const startRes = await fetch(`/api/tests/${testId}/start`, { method: "POST" });
                if (startRes.ok) {
                    const startData = await startRes.json();
                    if (startData?.startedAt) {
                        setStartedAt(new Date(startData.startedAt).toISOString());
                    } else {
                        setStartedAt(new Date().toISOString());
                    }
                } else {
                    setStartedAt(new Date().toISOString());
                }
            } catch (error) {
                console.error("Failed to fetch test:", error);
            } finally {
                setLoading(false);
            }
        }
        fetchTest();
    }, [testId, courseId, router]);

    useEffect(() => {
        if (timeLeft === null || timeLeft <= 0 || submitting) return;
        const timer = setInterval(() => {
            setTimeLeft(prev => (prev !== null ? prev - 1 : null));
        }, 1000);
        return () => clearInterval(timer);
    }, [timeLeft, submitting]);

    const handleAnswer = (optionIndex: number) => {
        setAnswers(prev => ({ ...prev, [currentIndex]: optionIndex }));
    };

    const handleSubmit = async () => {
        if (!test) return;
        const unanswered = test.questions.length - Object.keys(answers).length;
        if (unanswered > 0) {
            if (!window.confirm(`You have ${unanswered} unanswered questions. Submit anyway?`)) return;
        }

        setSubmitting(true);
        try {
            const res = await fetch(`/api/tests/${testId}/submit`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ answers, startedAt })
            });

            if (res.ok) {
                const result = await res.json();
                toast.success(`Module assessment submitted! Score: ${result.score}%`);
                router.push(`/courses/${courseId}`);
            } else {
                toast.error("Failed to submit assessment.");
            }
        } catch (_error) {
            toast.error("Error submitting assessment.");
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <div className="flex items-center justify-center h-96"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div></div>;
    if (!test) return null;
    if (attemptsRemaining === 0) {
        return (
            <div className="max-w-3xl mx-auto space-y-6 py-10">
                <div className="p-8 rounded-3xl bg-amber-500/5 border border-amber-500/20">
                    <h2 className="text-2xl font-black">Attempt Limit Reached</h2>
                    <p className="text-sm text-muted-foreground mt-2">
                        You have used all available attempts for this assessment.
                    </p>
                </div>
                <Link href={`/courses/${courseId}`} className="inline-flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-primary transition-all">
                    <ArrowLeft className="h-4 w-4" /> Return to Course
                </Link>
            </div>
        );
    }

    const currentQuestion = test.questions[currentIndex];
    const progress = ((currentIndex + 1) / test.questions.length) * 100;

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8 py-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
            <div className="flex items-center justify-between">
                <Link href={`/courses/${courseId}`} className="inline-flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-primary transition-all">
                    <ArrowLeft className="h-4 w-4" /> Exit Without Saving
                </Link>
                <div className="flex items-center gap-3">
                    {attemptsRemaining !== null && (
                        <Badge variant="outline" className="px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest">
                            Attempts: {attemptsRemaining}/{attemptLimit ?? "-"}
                        </Badge>
                    )}
                    {timeLeft !== null && (
                        <Badge variant={timeLeft < 60 ? "destructive" : "outline"} className="px-4 py-1.5 rounded-full font-mono text-lg shadow-sm border-2">
                            <Clock className="mr-2 h-4 w-4" /> {formatTime(timeLeft)}
                        </Badge>
                    )}
                </div>
            </div>

            <div className="space-y-2">
                <div className="flex justify-between items-end">
                    <h1 className="text-4xl font-black tracking-tighter text-gradient">{test.title}</h1>
                    <span className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                        Question {currentIndex + 1} of {test.questions.length}
                    </span>
                </div>
                <Progress value={progress} className="h-2 rounded-full border border-white/5" />
            </div>

            <Card className="border-none glass-card shadow-3xl rounded-[3rem] overflow-hidden">
                <CardHeader className="p-10 pb-6 border-b border-border/10 bg-muted/20">
                    <CardTitle className="text-2xl font-black leading-tight tracking-tight">
                        {currentQuestion.q}
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-10">
                    <RadioGroup
                        value={answers[currentIndex]?.toString()}
                        onValueChange={(val) => handleAnswer(parseInt(val))}
                        className="space-y-4"
                    >
                        {currentQuestion.options.map((option, idx) => (
                            <div
                                key={idx}
                                onClick={() => handleAnswer(idx)}
                                className={`flex items-center space-x-4 p-6 rounded-2xl border-2 transition-all cursor-pointer group ${answers[currentIndex] === idx
                                    ? 'bg-primary/5 border-primary shadow-lg ring-1 ring-primary/20'
                                    : 'border-transparent hover:bg-muted/50 hover:border-border/50'
                                    }`}
                            >
                                <RadioGroupItem value={idx.toString()} id={`opt-${idx}`} className="h-5 w-5 border-2" />
                                <Label htmlFor={`opt-${idx}`} className="flex-1 cursor-pointer text-base font-bold leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                    {option}
                                </Label>
                            </div>
                        ))}
                    </RadioGroup>
                </CardContent>
                <CardFooter className="p-10 pt-0 flex justify-between gap-4">
                    <Button
                        variant="outline"
                        onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
                        disabled={currentIndex === 0}
                        className="h-14 px-8 rounded-2xl font-black uppercase tracking-widest text-[10px]"
                    >
                        <ChevronLeft className="mr-2 h-4 w-4" /> Previous
                    </Button>

                    {currentIndex < test.questions.length - 1 ? (
                        <Button
                            onClick={() => setCurrentIndex(prev => Math.min(test.questions.length - 1, prev + 1))}
                            disabled={answers[currentIndex] === undefined}
                            className="h-14 px-8 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl shadow-primary/20"
                        >
                            Next Question <ChevronRight className="ml-2 h-4 w-4" />
                        </Button>
                    ) : (
                        <Button
                            onClick={handleSubmit}
                            disabled={submitting || Object.keys(answers).length === 0}
                            className="h-14 px-10 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl shadow-primary/30 bg-primary hover:bg-primary/90"
                        >
                            {submitting ? "Processing..." : <><Send className="mr-2 h-4 w-4" /> Submit assessment</>}
                        </Button>
                    )}
                </CardFooter>
            </Card>

            <div className="flex items-center gap-3 p-6 rounded-3xl bg-amber-500/5 border border-amber-500/10">
                <AlertCircle className="h-5 w-5 text-amber-500 shrink-0" />
                <p className="text-xs text-amber-500 font-bold uppercase tracking-tight">
                    This is an high-stakes assessment module. Your score will directly impact your <strong>{test.title.split(' ')[0]} Mastery</strong> skill calibration.
                </p>
            </div>
        </div>
    );
}
