import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Clock } from "lucide-react";
import Link from "next/link";
import type { Prisma } from "@prisma/client";

type CourseWithRoadmap = Prisma.CourseGetPayload<{ include: { roadmap: true } }>;

export default async function CoursesPage() {
    let courses: CourseWithRoadmap[] = [];
    try {
        courses = await prisma.course.findMany({
            include: { roadmap: true }
        });
    } catch (err) {
        // DB unavailable — render fallback empty list and log the error
        console.error('[courses] prisma error:', err);
    }

    return (
        <div className="space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-1000">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-2 border-b border-border/10">
                <div>
                    <h1 className="text-5xl font-black tracking-tight text-gradient">Knowledge Library</h1>
                    <p className="text-muted-foreground mt-2 text-xl font-medium">Elite training modules for high-performance practitioners.</p>
                </div>
                <div className="flex items-center gap-3">
                    <Badge variant="outline" className="px-4 py-1.5 rounded-full font-black border-primary/20 bg-primary/5 text-primary tracking-widest uppercase text-[10px]">
                        {courses.length} Modules Available
                    </Badge>
                </div>
            </div>

            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
                {courses.map((course) => (
                    <Link href={`/courses/${course.id}`} key={course.id} className="group transition-all duration-500 hover:-translate-y-2 active:scale-95">
                        <Card className="flex flex-col h-full border-none glass-card rounded-[2.5rem] overflow-hidden shadow-2xl shadow-primary/5 group-hover:shadow-primary/10 transition-all duration-500">
                            <CardHeader className="p-8 pb-4">
                                <div className="flex justify-between items-start mb-6">
                                    <Badge className="bg-primary/20 text-primary border-none px-4 py-1.5 rounded-full font-black tracking-widest uppercase text-[10px]">
                                        {course.roadmap?.archetype || "CORE"}
                                    </Badge>
                                    <Badge className={`text-[10px] font-black tracking-widest px-4 py-1.5 rounded-full border-none shadow-sm ${course.difficulty === 'BEGINNER' ? 'bg-emerald-500/10 text-emerald-500' :
                                        course.difficulty === 'INTERMEDIATE' ? 'bg-amber-500/10 text-amber-500' :
                                            'bg-rose-500/10 text-rose-500'
                                        }`}>
                                        {course.difficulty}
                                    </Badge>
                                </div>
                                <CardTitle className="text-2xl font-black tracking-tight leading-tight group-hover:text-primary transition-colors">{course.title}</CardTitle>
                                <CardDescription className="line-clamp-3 mt-3 leading-relaxed font-medium text-sm italic">&quot;{course.description}&quot;</CardDescription>
                            </CardHeader>
                            <CardContent className="flex-1 px-8 pb-8 pt-4">
                                <div className="p-4 rounded-[1.5rem] bg-secondary/30 border border-white/5 flex items-center justify-between group-hover:bg-primary/5 transition-colors duration-500">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 rounded-xl bg-primary/10 text-primary">
                                            <BookOpen className="h-4 w-4" />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Type</span>
                                            <span className="text-[11px] font-bold text-foreground truncate max-w-[80px]">{course.contentType || "Resource"}</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 text-right">
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Est. Time</span>
                                            <span className="text-[11px] font-bold text-foreground">4h 30m</span>
                                        </div>
                                        <div className="p-2 rounded-xl bg-primary/10 text-primary">
                                            <Clock className="h-4 w-4" />
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                            <CardFooter className="px-8 pb-8 pt-0">
                                <Button className="w-full h-12 font-black uppercase text-[10px] tracking-widest rounded-2xl bg-secondary hover:bg-primary hover:text-white transition-all duration-500 text-foreground group-hover:bg-primary group-hover:text-white shadow-xl shadow-primary/0 group-hover:shadow-primary/20">
                                    Analyze Module
                                </Button>
                            </CardFooter>
                        </Card>
                    </Link>
                ))}
            </div>
        </div>
    );
}
