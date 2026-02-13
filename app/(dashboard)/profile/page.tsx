import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { User, Mail, Shield, UserCircle, Calendar, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { Prisma } from "@prisma/client";

type ProfileUser = Prisma.UserGetPayload<{
    include: {
        courseEnrollments: { include: { course: true } };
        dailyLearningSessions: true;
        testResults: true;
    };
}>;

export default async function ProfilePage() {
    const session = await getServerSession(authOptions);

    if (!session) {
        redirect("/auth/signin");
    }

    let user: ProfileUser | null = null;
    try {
        user = await prisma.user.findUnique({
            where: { id: session.user.id },
            include: {
                courseEnrollments: { include: { course: true } },
                dailyLearningSessions: true,
                testResults: true,
            }
        }) as ProfileUser | null;
    } catch (err) {
        console.error('[profile] prisma error:', err);
        return (
            <div className="p-12 text-center">
                <h2 className="text-2xl font-bold">Data currently unavailable</h2>
                <p className="mt-4 text-muted-foreground">We could not load your profile data right now — please try again later.</p>
            </div>
        );
    }

    if (!user) return <div>User not found</div>;

    return (
        <div className="max-w-6xl mx-auto space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-1000">
            <div className="pb-2 border-b border-border/10">
                <h1 className="text-5xl font-black tracking-tight text-gradient">Your Profile</h1>
                <p className="text-muted-foreground mt-2 text-xl font-medium flex items-center gap-2">
                    <Shield className="h-4 w-4 text-primary" />
                    Secure identity portal for the <strong>{user.archetype}</strong> network.
                </p>
            </div>

            <div className="grid gap-10 lg:grid-cols-12">
                <div className="lg:col-span-4 space-y-8">
                    <Card className="border-none bg-gradient-to-b from-primary/10 to-transparent shadow-2xl shadow-primary/5 rounded-[3rem] p-1 group">
                        <CardContent className="pt-12 bg-card/80 backdrop-blur-xl rounded-[calc(3rem-4px)] flex flex-col items-center text-center relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-6 opacity-20 invisible group-hover:visible transition-all">
                                <UserCircle className="h-20 w-20 text-primary" />
                            </div>
                            <div className="w-36 h-36 rounded-[2.5rem] bg-primary/10 flex items-center justify-center border-4 border-white/5 mb-8 shadow-3xl relative group/avatar transition-transform cursor-pointer hover:rotate-3">
                                <span className="text-6xl font-black text-primary">{user.name?.[0] || user.email?.[0]}</span>
                                <div className="absolute inset-0 rounded-[2.5rem] bg-black/60 flex items-center justify-center opacity-0 group-hover/avatar:opacity-100 transition-opacity">
                                    <span className="text-white text-xs font-black uppercase tracking-widest">Update</span>
                                </div>
                            </div>
                            <h2 className="text-3xl font-black tracking-tighter">{user.name || "User"}</h2>
                            <div className="flex flex-col items-center gap-3 mt-4">
                                <Badge className="bg-primary/20 text-primary border-none font-black tracking-widest px-4 py-1.5 uppercase text-[10px]">{user.role}</Badge>
                                <Badge className="bg-accent/20 text-accent border-none font-black tracking-widest px-4 py-1.5 uppercase text-[10px] shadow-lg shadow-accent/10">{user.archetype} ARCHEOTYPE</Badge>
                            </div>
                            <div className="mt-8 pb-8 w-full px-8">
                                <Button className="w-full font-black uppercase text-[10px] tracking-widest h-11 rounded-2xl shadow-xl shadow-primary/20 transition-all active:scale-95">Update Identity</Button>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-none glass-card rounded-[2.5rem] overflow-hidden">
                        <CardHeader className="bg-muted/30 border-b border-border/10 p-6">
                            <CardTitle className="text-xs font-black uppercase tracking-widest text-muted-foreground">Quick Connectivity</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6 pt-6">
                            <div className="flex items-center gap-4 text-sm font-bold group cursor-pointer hover:text-primary transition-colors">
                                <div className="p-2.5 rounded-xl bg-secondary/50 group-hover:bg-primary/10 transition-colors">
                                    <Mail className="h-4 w-4" />
                                </div>
                                <span>{user.email}</span>
                            </div>
                            <div className="flex items-center gap-4 text-sm font-bold opacity-70">
                                <div className="p-2.5 rounded-xl bg-secondary/50">
                                    <Calendar className="h-4 w-4" />
                                </div>
                                <span suppressHydrationWarning>Access granted {new Date(user.createdAt || new Date()).toLocaleDateString()}</span>
                            </div>
                            <div className="flex items-center gap-4 text-sm font-bold opacity-70">
                                <div className="p-2.5 rounded-xl bg-secondary/50">
                                    <MapPin className="h-4 w-4" />
                                </div>
                                <span>Edge Network Node</span>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <div className="lg:col-span-8 space-y-10">
                    <Card className="border-none glass-card rounded-[3rem] overflow-hidden">
                        <CardHeader className="p-10 pb-4">
                            <CardTitle className="text-2xl font-black tracking-tight uppercase">Registry Details</CardTitle>
                            <CardDescription className="text-sm font-bold uppercase tracking-widest text-primary mt-1">Core Encryption Level V4</CardDescription>
                        </CardHeader>
                        <CardContent className="p-10 pt-4 space-y-10">
                            <div className="grid gap-8 md:grid-cols-2">
                                <div className="space-y-3 group">
                                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2 group-hover:text-primary transition-colors">
                                        <User className="h-3 w-3" /> Full Identity
                                    </label>
                                    <div className="p-5 rounded-2xl border border-border/40 bg-background/50 text-sm font-bold shadow-inner group-hover:border-primary/20 transition-all">{user.name}</div>
                                </div>
                                <div className="space-y-3 group">
                                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2 group-hover:text-primary transition-colors">
                                        <Mail className="h-3 w-3" /> Secure Email
                                    </label>
                                    <div className="p-5 rounded-2xl border border-border/40 bg-background/50 text-sm font-bold shadow-inner group-hover:border-primary/20 transition-all">{user.email}</div>
                                </div>
                                <div className="space-y-3 group">
                                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2 group-hover:text-primary transition-colors">
                                        <Shield className="h-3 w-3" /> System ID
                                    </label>
                                    <div className="p-5 rounded-2xl border border-border/40 bg-background/50 text-[10px] font-mono font-bold text-muted-foreground overflow-hidden truncate shadow-inner">{user.id}</div>
                                </div>
                                <div className="space-y-3 group">
                                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2 group-hover:text-primary transition-colors">
                                        <Shield className="h-3 w-3" /> Archetype Sync
                                    </label>
                                    <div className="p-5 rounded-2xl border border-primary/20 bg-primary/5 text-sm font-black text-primary shadow-[0_0_20px_rgba(var(--primary),0.05)]">{user.archetype}</div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <div className="grid gap-10 md:grid-cols-2">
                        <Card className="border-none glass-card rounded-[3rem] overflow-hidden group hover:-translate-y-2 transition-transform duration-500">
                            <CardHeader className="bg-muted/30 p-8 border-b border-border/10">
                                <CardTitle className="text-xs font-black uppercase tracking-widest text-muted-foreground">Experience Matrix</CardTitle>
                            </CardHeader>
                            <CardContent className="p-8">
                                <div className="flex items-center justify-between">
                                    <div className="space-y-1">
                                        <div className="text-4xl font-black text-gradient">{user.courseEnrollments.length}</div>
                                        <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest">Active Enrollments</p>
                                    </div>
                                    <div className="space-y-1 text-right">
                                        <div className="text-4xl font-black text-gradient">{user.testResults.length}</div>
                                        <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest">Validated Mastery</p>
                                    </div>
                                </div>
                                <div className="mt-8 h-2 w-full bg-secondary/50 rounded-full overflow-hidden border border-white/5">
                                    <div className="h-full bg-primary shadow-[0_0_15px_rgba(var(--primary),0.5)] rounded-full animate-pulse" style={{ width: '65%' }} />
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="border-none glass-card rounded-[3rem] overflow-hidden group hover:-translate-y-2 transition-transform duration-500">
                            <CardHeader className="bg-muted/30 p-8 border-b border-border/10">
                                <CardTitle className="text-xs font-black uppercase tracking-widest text-muted-foreground">Cognitive Sync Time</CardTitle>
                            </CardHeader>
                            <CardContent className="p-8">
                                <div className="flex items-center gap-6">
                                    <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 group-hover:rotate-12 transition-all duration-500 shadow-xl">
                                        <Calendar className="h-8 w-8" />
                                    </div>
                                    <div>
                                        <div className="text-4xl font-black text-gradient">
                                            {(user.dailyLearningSessions.reduce((acc: number, s: typeof user.dailyLearningSessions[number]) => acc + (s.durationMinutes || 0), 0) / 60).toFixed(1)}h
                                        </div>
                                        <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest mt-1">Total System Engagement</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );
}
