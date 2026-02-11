"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Plus, BookOpen } from "lucide-react";

interface CourseSummary {
    id: string;
    title: string;
    description?: string | null;
    difficulty?: string | null;
    contentType?: string | null;
    createdAt: string;
    _count?: {
        enrollments?: number;
    };
    tests?: Array<{ id: string; title: string; type: string }>;
}

export default function AdminCoursesPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [courses, setCourses] = useState<CourseSummary[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (status === "unauthenticated") {
            router.push("/auth/signin");
            return;
        }

        const role = session?.user?.role?.toLowerCase();
        if (status === "authenticated" && role !== "admin") {
            router.push("/dashboard");
        }
    }, [status, session, router]);

    useEffect(() => {
        const role = session?.user?.role?.toLowerCase();
        if (status !== "authenticated" || role !== "admin") {
            return;
        }

        const fetchCourses = async () => {
            setLoading(true);
            setError(null);

            try {
                const response = await fetch("/api/courses");
                if (!response.ok) {
                    throw new Error("Failed to load courses");
                }
                const data = (await response.json()) as CourseSummary[];
                setCourses(data);
            } catch (err) {
                console.error("Failed to load courses:", err);
                setError("Unable to load courses right now.");
            } finally {
                setLoading(false);
            }
        };

        fetchCourses();
    }, [status, session]);

    const totalEnrollments = useMemo(() => {
        return courses.reduce((sum, course) => sum + (course._count?.enrollments ?? 0), 0);
    }, [courses]);

    if (loading) {
        return (
            <div className="flex min-h-[60vh] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div className="flex flex-col gap-6 border-b border-border/10 pb-6 md:flex-row md:items-end md:justify-between">
                <div>
                    <h1 className="text-4xl font-black tracking-tight text-gradient">Course Management</h1>
                    <p className="mt-2 text-muted-foreground text-lg">
                        Create, review, and maintain the learning catalog for your organization.
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <Badge variant="outline" className="px-4 py-1.5 rounded-full font-black border-primary/20 bg-primary/5 text-primary tracking-widest uppercase text-[10px]">
                        {courses.length} Courses
                    </Badge>
                    <Badge variant="outline" className="px-4 py-1.5 rounded-full font-black border-primary/20 bg-primary/5 text-primary tracking-widest uppercase text-[10px]">
                        {totalEnrollments} Enrollments
                    </Badge>
                    <Link href="/admin/courses/new">
                        <Button className="rounded-xl font-bold shadow-xl shadow-primary/20">
                            <Plus className="mr-2 h-4 w-4" />
                            New Course
                        </Button>
                    </Link>
                </div>
            </div>

            {error ? (
                <Card className="border-none glass-card">
                    <CardHeader>
                        <CardTitle>Course data unavailable</CardTitle>
                        <CardDescription>{error}</CardDescription>
                    </CardHeader>
                </Card>
            ) : courses.length === 0 ? (
                <Card className="border-none glass-card">
                    <CardHeader className="pb-4">
                        <CardTitle>No courses yet</CardTitle>
                        <CardDescription>Start by creating the first learning module.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Link href="/admin/courses/new">
                            <Button className="rounded-xl font-bold">
                                <Plus className="mr-2 h-4 w-4" />
                                Create Course
                            </Button>
                        </Link>
                    </CardContent>
                </Card>
            ) : (
                <Card className="border-none glass-card">
                    <CardHeader>
                        <CardTitle>Active Courses</CardTitle>
                        <CardDescription>Manage your training catalog and enrollments.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Course</TableHead>
                                    <TableHead>Difficulty</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead>Tests</TableHead>
                                    <TableHead>Enrollments</TableHead>
                                    <TableHead>Created</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {courses.map((course) => {
                                    const difficulty = course.difficulty?.toLowerCase() || "beginner";
                                    const difficultyLabel = difficulty.charAt(0).toUpperCase() + difficulty.slice(1);
                                    const difficultyColor =
                                        difficulty === "beginner"
                                            ? "bg-emerald-500/10 text-emerald-500"
                                            : difficulty === "intermediate"
                                                ? "bg-amber-500/10 text-amber-500"
                                                : "bg-rose-500/10 text-rose-500";

                                    return (
                                        <TableRow key={course.id}>
                                            <TableCell className="font-semibold">
                                                <div className="flex items-center gap-3">
                                                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                                                        <BookOpen className="h-4 w-4" />
                                                    </div>
                                                    <div>
                                                        <div className="text-sm font-bold">{course.title}</div>
                                                        <div className="text-xs text-muted-foreground line-clamp-1">
                                                            {course.description || "No description"}
                                                        </div>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge className={`rounded-full border-none px-3 py-1 text-[10px] font-black uppercase tracking-widest ${difficultyColor}`}>
                                                    {difficultyLabel}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-sm font-medium">
                                                {course.contentType || "Resource"}
                                            </TableCell>
                                            <TableCell className="text-sm font-medium">
                                                {course.tests?.length ?? 0}
                                            </TableCell>
                                            <TableCell className="text-sm font-medium">
                                                {course._count?.enrollments ?? 0}
                                            </TableCell>
                                            <TableCell className="text-sm text-muted-foreground">
                                                {new Date(course.createdAt).toLocaleDateString()}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Link href={`/courses/${course.id}`}>
                                                    <Button variant="outline" size="sm" className="rounded-lg font-semibold">
                                                        View
                                                    </Button>
                                                </Link>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
