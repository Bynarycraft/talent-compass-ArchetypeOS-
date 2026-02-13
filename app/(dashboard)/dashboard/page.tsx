import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    Activity,
    BookOpen,
    CheckCircle2,
    Clock,
    GraduationCap,
    PlayCircle,
    TrendingUp,
    UserCheck
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import type { Prisma } from "@prisma/client";

type DashboardUser = Prisma.UserGetPayload<{
    include: {
        courseEnrollments: { include: { course: true } };
        dailyLearningSessions: true;
        testResults: { include: { test: { include: { course: true } } } };
    };
}>;

export default async function DashboardPage() {
    const session = await getServerSession(authOptions);

    if (!session) {
        redirect("/auth/signin");
    }

    let user: DashboardUser | null = null;
    try {
        user = await prisma.user.findUnique({
            where: { id: session.user.id },
            include: {
                courseEnrollments: {
                    include: {
                        course: true
                    }
                },
                dailyLearningSessions: {
                    orderBy: { startTime: 'desc' },
                    take: 5
                },
                testResults: {
                    include: {
                        test: {
                            include: {
                                course: true
                            }
                        }
                    },
                    orderBy: { submittedAt: 'desc' },
                    take: 5
                }
            }
        }) as DashboardUser | null;
    } catch (err) {
        // If DB errors occur, show a graceful fallback UI instead of crashing
        console.error('[dashboard] prisma error:', err);
        return (
            <div className="p-12 text-center">
                <h2 className="text-2xl font-bold">Data currently unavailable</h2>
                <p className="mt-4 text-muted-foreground">We could not load your dashboard data right now — please try again later.</p>
            </div>
        );
    }

    if (!user) return <div>User not found</div>;

    const archetype = user.archetype;

    // Stats calculation
    const completedCourses = user.courseEnrollments.filter((e: typeof user.courseEnrollments[number]) => e.status === 'completed').length;
    const activeRoadmaps = await prisma.roadmap.count({
        where: { archetype: archetype || 'NONE' }
    });

    const totalLearningMinutes = user.dailyLearningSessions.reduce((acc: number, s: typeof user.dailyLearningSessions[number]) => acc + (s.durationMinutes || 0), 0);
    const totalLearningHours = (totalLearningMinutes / 60).toFixed(1);

    return (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-1000">
            {/* Welcome Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-2 border-b border-border/10">
                <div>
                    <h1 className="text-5xl font-black tracking-tight text-gradient">
                        Welcome back, {user.name?.split(' ')[0] || 'User'}
                    </h1>
                    <p className="text-muted-foreground mt-2 flex items-center gap-2 font-medium">
                        <Activity className="h-4 w-4 text-primary animate-pulse" />
                        You&apos;ve logged <span className="text-foreground font-bold">{totalLearningHours}h</span> in your current sessions. Keep it up!
                    </p>
                </div>
                <div className="flex items-center gap-4">
                    <Link href="/profile">
                        <Button variant="outline" className="rounded-2xl px-6 font-bold border-primary/20 hover:bg-primary/5 transition-all">View Profile</Button>
                    </Link>
                    <Link href="/courses">
                        <Button className="rounded-2xl px-8 bg-primary hover:bg-primary/90 shadow-xl shadow-primary/30 font-black text-primary-foreground group transition-all active:scale-95">
                            <PlayCircle className="mr-2 h-5 w-5 group-hover:scale-110 transition-transform" /> Start Learning
                        </Button>
                    </Link>
                </div>
            </div>

            {/* Stats Overview */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                {[
                    { label: "Archetype", value: archetype, icon: UserCheck, desc: "Your DNA profile", color: "from-blue-500/20 to-indigo-500/20" },
                    { label: "Learning Hours", value: `${totalLearningHours}h`, icon: Clock, desc: "Total time logged", color: "from-amber-500/20 to-orange-500/20" },
                    { label: "Courses Done", value: completedCourses, icon: CheckCircle2, desc: `Out of ${user.courseEnrollments.length} taken`, color: "from-emerald-500/20 to-teal-500/20" },
                    { label: "Active Roadmaps", value: activeRoadmaps, icon: GraduationCap, desc: "Paths unlocked", color: "from-fuchsia-500/20 to-purple-500/20" },
                ].map((stat, i) => (
                    <Card key={i} className="border-none bg-card/40 backdrop-blur-md shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group overflow-hidden">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{stat.label}</CardTitle>
                            <stat.icon className="h-4 w-4 text-primary group-hover:rotate-12 transition-transform" />
                        </CardHeader>
                        <CardContent className="relative">
                            <div className="text-3xl font-black">{stat.value}</div>
                            <p className="text-[10px] text-muted-foreground mt-1 font-bold">{stat.desc}</p>
                            <div className={`absolute -right-4 -bottom-4 w-16 h-16 rounded-full bg-gradient-to-br ${stat.color} blur-2xl group-hover:scale-150 transition-transform`} />
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-7">
                {/* Recent Activity Feed */}
                <Card className="lg:col-span-4 glass-card overflow-hidden rounded-3xl">
                    <CardHeader className="border-b border-border/10 bg-muted/20 pb-4 p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="text-xl font-extrabold uppercase tracking-tight">Recent Activity</CardTitle>
                                <CardDescription className="text-xs font-medium">Your latest technical achievements</CardDescription>
                            </div>
                            <Link href="/courses">
                                <Button variant="ghost" size="sm" className="text-xs font-bold hover:bg-primary/10 hover:text-primary transition-colors">
                                    View Library
                                </Button>
                            </Link>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="divide-y divide-border/10">
                            {user.testResults.length > 0 ? (
                                user.testResults.map((result: typeof user.testResults[number]) => (
                                    <Link
                                        href={`/courses/${result.test.course.id}`}
                                        key={result.id}
                                        className="p-6 flex items-center justify-between hover:bg-primary/5 transition-all group relative overflow-hidden"
                                    >
                                        <div className="flex items-center gap-5 relative z-10">
                                            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary border border-primary/10 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                                                <BookOpen className="h-6 w-6" />
                                            </div>
                                            <div>
                                                <h4 className="text-sm font-black group-hover:text-primary transition-colors">{result.test.course.title}</h4>
                                                <p className="text-[10px] text-muted-foreground mt-1 font-bold uppercase tracking-tight">Assessment Mastered</p>
                                            </div>
                                        </div>
                                        <div className="text-right relative z-10">
                                            <div className={`text-lg font-black ${result.score && result.score >= 80 ? 'text-emerald-500' : 'text-primary'}`}>
                                                {result.score ? `${result.score}%` : 'Pending'}
                                            </div>
                                            <p className="text-[10px] text-muted-foreground mt-1 font-bold" suppressHydrationWarning>
                                                {result.submittedAt ? new Date(result.submittedAt).toLocaleDateString() : 'Active'}
                                            </p>
                                        </div>
                                        <div className="absolute inset-0 bg-gradient-to-r from-primary/0 to-primary/0 group-hover:to-primary/[0.02] transition-all" />
                                    </Link>
                                ))
                            ) : (
                                <div className="p-16 text-center">
                                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-muted/30 text-muted-foreground mb-4 animate-float border border-border/10">
                                        <TrendingUp className="h-8 w-8" />
                                    </div>
                                    <p className="text-sm text-muted-foreground font-bold uppercase tracking-widest">No activity data</p>
                                    <Link href="/courses">
                                        <Button variant="link" className="text-xs mt-2 font-black text-primary hover:no-underline underline-offset-4 decoration-2">Start your first journey</Button>
                                    </Link>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Next Goals / Recommended */}
                <Card className="lg:col-span-3 border-none bg-gradient-to-b from-primary/10 to-transparent shadow-2xl shadow-primary/5 rounded-3xl p-1 group">
                    <div className="bg-card/80 backdrop-blur-xl h-full rounded-[calc(var(--radius)+12px)] p-6 border border-white/10">
                        <CardHeader className="px-0 pt-0">
                            <CardTitle className="text-xl font-extrabold uppercase tracking-tight">Recommended</CardTitle>
                            <CardDescription className="text-xs font-medium">Mapped to your {archetype} DNA</CardDescription>
                        </CardHeader>
                        <CardContent className="px-0 space-y-6">
                            <div className="p-6 rounded-3xl bg-background/50 border border-border/40 shadow-inner group/path cursor-pointer hover:border-primary/40 transition-all hover:scale-[1.02] duration-300">
                                <Badge className="mb-3 bg-primary/20 text-primary hover:bg-primary/30 border-none px-3 py-1 text-[10px] font-black tracking-widest uppercase">Next Path</Badge>
                                <h4 className="font-extrabold text-lg group-hover/path:text-primary transition-colors leading-tight">Advanced Systems for {archetype}s</h4>
                                <p className="text-xs text-muted-foreground mt-2 leading-relaxed font-medium">Elevate your technical impact through elite frameworks and high-performance execution patterns.</p>
                                <div className="flex items-center justify-between mt-6">
                                    <div className="flex -space-x-2">
                                        {[1, 2, 3].map((i) => (
                                            <div key={i} className="w-8 h-8 rounded-full border-2 border-background bg-secondary text-[10px] flex items-center justify-center font-black shadow-sm">U{i}</div>
                                        ))}
                                        <span className="text-[10px] text-muted-foreground ml-4 my-auto font-bold">+12 experts enrolled</span>
                                    </div>
                                    <Link href="/courses">
                                        <div className="p-3 rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20 hover:scale-110 active:scale-95 transition-all">
                                            <PlayCircle className="h-5 w-5 fill-current" />
                                        </div>
                                    </Link>
                                </div>
                            </div>

                            <div className="p-6 rounded-3xl bg-secondary/20 border-2 border-dashed border-border/60 flex flex-col items-center justify-center text-center group/market transition-colors hover:border-primary/40 hover:bg-primary/5">
                                <p className="text-xs text-muted-foreground font-bold px-4 leading-relaxed uppercase tracking-tight my-2">Find more paths that align with your professional goals.</p>
                                <Link href="/courses">
                                    <Button variant="outline" size="sm" className="mt-4 text-xs py-5 px-6 rounded-2xl font-black border-primary/20 hover:bg-primary hover:text-white transition-all shadow-sm">
                                        Explore Library
                                    </Button>
                                </Link>
                            </div>
                        </CardContent>
                    </div>
                </Card>
            </div>
        </div>
    );
}
