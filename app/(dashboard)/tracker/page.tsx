"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Play, Square, Timer, Target, CheckCircle2, TrendingUp, Briefcase } from "lucide-react";
import { toast } from "sonner";

export default function TrackerPage() {
    const [status, setStatus] = useState<"idle" | "running" | "paused">("idle");
    const [time, setTime] = useState(0);
    const [reflection, setReflection] = useState("");
    const [sessionsToday, setSessionsToday] = useState(0);
    const [totalMinutesToday, setTotalMinutesToday] = useState(0);
    const [weeklyDays, setWeeklyDays] = useState<{ day: string; minutes: number }[]>([]);
    const [weeklyTotal, setWeeklyTotal] = useState(0);
    const [weeklyGoal, setWeeklyGoal] = useState(0);

    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (status === "running") {
            interval = setInterval(() => {
                setTime((prev) => prev + 1);
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [status]);

    const fetchTodayStats = useCallback(async () => {
        try {
            const res = await fetch("/api/sessions");
            if (res.ok) {
                const data = await res.json();
                setSessionsToday(data.sessionsCount);
                setTotalMinutesToday(data.todayMinutes);
            }
            const weeklyRes = await fetch("/api/sessions/weekly");
            if (weeklyRes.ok) {
                const weeklyData = await weeklyRes.json();
                setWeeklyDays(weeklyData.days);
                setWeeklyTotal(weeklyData.totalMinutes);
                setWeeklyGoal(weeklyData.goalMinutes);
            }
        } catch (_error) {
            console.error("Failed to fetch distance stats");
        }
    }, []);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        fetchTodayStats();
    }, [fetchTodayStats]);

    const handleStart = () => {
        setStatus("running");
        toast.info("Focus session started. Elite performance mode active.");
    };

    const handleStop = async () => {
        const durationMinutes = Math.floor(time / 60);
        setStatus("idle");

        if (durationMinutes < 1) {
            toast.warning("Session too short to log. Minimum 1 minute required.");
            setTime(0);
            return;
        }

        try {
            const res = await fetch("/api/sessions", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    durationMinutes,
                    reflection: reflection || "Focused deep work session."
                }),
            });

            if (res.ok) {
                toast.success(`Session logged: ${durationMinutes} minutes saved to registry.`);
                setTime(0);
                setReflection("");
                fetchTodayStats();
            }
        } catch (_error) {
            toast.error("Critical failure: Failed to log session to the network.");
        }
    };

    const formatTime = (seconds: number) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
    };

    return (
        <div className="max-w-4xl mx-auto space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-1000">
            <div className="pb-2 border-b border-border/10">
                <h1 className="text-5xl font-black tracking-tight text-gradient">Focus Engine</h1>
                <p className="text-muted-foreground mt-2 text-xl font-medium flex items-center gap-2">
                    <Target className="h-4 w-4 text-primary animate-pulse" />
                    Deep work synchronization and performance tracking.
                </p>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
                <Card className="border-none glass-card rounded-3xl overflow-hidden p-6">
                    <div className="flex items-center gap-4">
                        <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
                            <TrendingUp className="h-5 w-5" />
                        </div>
                        <div>
                            <div className="text-2xl font-black">{Math.round((weeklyTotal / 60) * 10) / 10}h</div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Weekly Learning</p>
                        </div>
                    </div>
                </Card>
                <Card className="border-none glass-card rounded-3xl overflow-hidden p-6">
                    <div className="flex items-center gap-4">
                        <div className="p-2.5 rounded-xl bg-accent/10 text-accent">
                            <Briefcase className="h-5 w-5" />
                        </div>
                        <div>
                            <div className="text-2xl font-black">{Math.max(0, 42 - Math.round((weeklyTotal / 60) * 10) / 10)}h</div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Weekly Work</p>
                        </div>
                    </div>
                </Card>
                <Card className="border-none glass-card rounded-3xl overflow-hidden p-6">
                    <div className="flex items-center gap-4">
                        <div className="p-2.5 rounded-xl bg-secondary/20 text-foreground">
                            <CheckCircle2 className="h-5 w-5" />
                        </div>
                        <div>
                            <div className="text-2xl font-black">
                                {weeklyGoal ? Math.round((weeklyTotal / weeklyGoal) * 100) : 0}%
                            </div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Learning Goal</p>
                        </div>
                    </div>
                </Card>
            </div>

            <div className="grid gap-10 md:grid-cols-12">
                <div className="md:col-span-8 space-y-8">
                    <Card className="border-none glass-card rounded-[3rem] overflow-hidden shadow-3xl">
                        <CardHeader className="p-10 pb-2 text-center">
                            <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Time Dilatation Active</CardTitle>
                        </CardHeader>
                        <CardContent className="p-10 flex flex-col items-center">
                            <div className="text-8xl font-black tracking-tighter mb-10 font-mono text-gradient drop-shadow-2xl">
                                {formatTime(time)}
                            </div>

                            <div className="flex gap-6 w-full">
                                {status === "idle" ? (
                                    <Button
                                        onClick={handleStart}
                                        className="flex-1 h-16 rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground font-black uppercase tracking-widest text-sm shadow-xl shadow-primary/20 transition-all active:scale-95"
                                    >
                                        <Play className="mr-3 h-6 w-6 fill-current" /> Engage Session
                                    </Button>
                                ) : (
                                    <Button
                                        onClick={handleStop}
                                        variant="destructive"
                                        className="flex-1 h-16 rounded-2xl font-black uppercase tracking-widest text-sm shadow-xl shadow-destructive/20 transition-all active:scale-95"
                                    >
                                        <Square className="mr-3 h-6 w-6 fill-current" /> Terminate & Log
                                    </Button>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {status === "running" && (
                        <Card className="border-none bg-secondary/20 p-8 rounded-[2.5rem] animate-in zoom-in duration-500">
                            <textarea
                                value={reflection}
                                onChange={(e) => setReflection(e.target.value)}
                                placeholder="Capture your strategic reflections here..."
                                className="w-full bg-transparent border-none outline-none resize-none h-32 font-medium text-lg placeholder:text-muted-foreground/30 italic"
                            />
                        </Card>
                    )}
                </div>

                <div className="md:col-span-4 space-y-6">
                    <Card className="border-none glass-card rounded-3xl overflow-hidden p-8">
                        <div className="space-y-6">
                            <div className="flex items-center gap-4">
                                <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
                                    <Timer className="h-5 w-5" />
                                </div>
                                <div>
                                    <div className="text-2xl font-black">{totalMinutesToday}m</div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Today&apos;s Total</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="p-2.5 rounded-xl bg-accent/10 text-accent">
                                    <CheckCircle2 className="h-5 w-5" />
                                </div>
                                <div>
                                    <div className="text-2xl font-black">{sessionsToday}</div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Completed Links</p>
                                </div>
                            </div>
                        </div>
                    </Card>

                    <Card className="border-none glass-card rounded-3xl overflow-hidden p-8">
                        <CardHeader className="p-0 pb-4">
                            <CardTitle className="text-sm font-black uppercase tracking-widest text-muted-foreground">Weekly Breakdown</CardTitle>
                        </CardHeader>
                        <CardContent className="p-0 space-y-3">
                            {weeklyDays.length === 0 ? (
                                <div className="text-sm text-muted-foreground">No sessions logged this week.</div>
                            ) : (
                                weeklyDays.map((day) => (
                                    <div key={day.day} className="flex items-center justify-between text-xs font-bold">
                                        <span>{day.day}</span>
                                        <span>{Math.round((day.minutes / 60) * 10) / 10}h</span>
                                    </div>
                                ))
                            )}
                        </CardContent>
                    </Card>

                    <Card className="border-none bg-gradient-to-br from-primary/10 to-accent/10 p-8 rounded-3xl">
                        <h4 className="font-black text-xs uppercase tracking-widest mb-4">Elite Rule 01</h4>
                        <p className="text-sm font-medium leading-relaxed italic opacity-80">
                            &quot;Deep work is the ability to focus without distraction on a cognitively demanding task.&quot;
                        </p>
                    </Card>
                </div>
            </div>
        </div>
    );
}
