"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSession } from "next-auth/react";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Loader2 } from "lucide-react";

export default function NewCoursePage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [authReady, setAuthReady] = useState(false);
    const [formData, setFormData] = useState({
        title: "",
        description: "",
        difficulty: "beginner",
        contentUrl: "",
        duration: "",
    });

    useEffect(() => {
        if (status === "loading") {
            return;
        }

        if (status === "unauthenticated") {
            router.push("/auth/signin");
            return;
        }

        if (session?.user?.role !== "admin") {
            router.push("/dashboard");
            return;
        }

        setAuthReady(true);
    }, [status, session, router]);

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
    ) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleSelectChange = (name: string, value: string) => {
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const res = await fetch("/api/courses", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...formData,
                    contentType: "video",
                    duration: formData.duration ? parseInt(formData.duration) : null,
                }),
            });

            if (res.ok) {
                await res.json();
                router.push("/admin/courses");
            } else {
                alert("Failed to create course");
            }
        } catch (error) {
            console.error("Error creating course:", error);
            alert("Error creating course");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-1000">
            {!authReady && (
                <div className="flex min-h-[40vh] items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin" />
                </div>
            )}

            {authReady && (
                <>
            {/* Navigation */}
            <Link
                href="/admin/courses"
                className="inline-flex items-center gap-3 text-sm font-bold text-muted-foreground hover:text-primary transition-all group w-fit"
            >
                <div className="p-2 rounded-lg bg-secondary/50 group-hover:bg-primary/10 group-hover:-translate-x-1 transition-all">
                    <ArrowLeft className="h-4 w-4" />
                </div>
                Back to Courses
            </Link>

            {/* Header */}
            <div className="pb-8 border-b border-border/10">
                <h1 className="text-5xl font-black tracking-tight text-gradient">
                    Create New Course
                </h1>
                <p className="text-muted-foreground mt-2 text-xl font-medium">
                    Add a new course to your learning library. Fill in the details below.
                </p>
            </div>

            {/* Form */}
            <Card className="border-none glass-card rounded-3xl shadow-2xl shadow-primary/5 max-w-3xl">
                <CardHeader className="p-8 pb-4">
                    <CardTitle className="text-2xl font-black">Course Details</CardTitle>
                    <CardDescription>
                        Provide comprehensive information about your course
                    </CardDescription>
                </CardHeader>

                <CardContent className="px-8 pb-8">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Title */}
                        <div className="space-y-2">
                            <Label htmlFor="title" className="text-sm font-bold">
                                Course Title *
                            </Label>
                            <Input
                                id="title"
                                name="title"
                                placeholder="e.g., Advanced System Design"
                                value={formData.title}
                                onChange={handleChange}
                                required
                                className="rounded-xl h-10 border-border/40 focus:border-primary"
                            />
                        </div>

                        {/* Description */}
                        <div className="space-y-2">
                            <Label htmlFor="description" className="text-sm font-bold">
                                Course Description
                            </Label>
                            <textarea
                                id="description"
                                name="description"
                                placeholder="Describe the course content, learning outcomes, and what students will learn..."
                                value={formData.description}
                                onChange={handleChange}
                                rows={5}
                                className="w-full rounded-xl border border-border/40 px-4 py-3 text-sm bg-background/50 focus:outline-none focus:border-primary transition-colors resize-none"
                            />
                        </div>

                        {/* Difficulty */}
                        <div className="space-y-2">
                            <Label htmlFor="difficulty" className="text-sm font-bold">
                                Difficulty Level *
                            </Label>
                            <Select
                                value={formData.difficulty}
                                onValueChange={(value) =>
                                    handleSelectChange("difficulty", value)
                                }
                            >
                                <SelectTrigger className="rounded-xl h-10 border-border/40 focus:border-primary">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl">
                                    <SelectItem value="beginner">Beginner</SelectItem>
                                    <SelectItem value="intermediate">Intermediate</SelectItem>
                                    <SelectItem value="advanced">Advanced</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Content Type */}
                        <div className="space-y-2">
                            <Label className="text-sm font-bold">Content Type *</Label>
                            <div className="rounded-xl border border-border/40 bg-secondary/30 px-4 py-2 text-sm font-bold">
                                Video (YouTube)
                            </div>
                        </div>

                        {/* Content URL */}
                        <div className="space-y-2">
                            <Label htmlFor="contentUrl" className="text-sm font-bold">
                                YouTube URL *
                            </Label>
                            <Input
                                id="contentUrl"
                                name="contentUrl"
                                placeholder="https://www.youtube.com/watch?v=..."
                                value={formData.contentUrl}
                                onChange={handleChange}
                                required
                                className="rounded-xl h-10 border-border/40 focus:border-primary"
                            />
                        </div>

                        {/* Duration */}
                        <div className="space-y-2">
                            <Label htmlFor="duration" className="text-sm font-bold">
                                Duration (minutes)
                            </Label>
                            <Input
                                id="duration"
                                name="duration"
                                type="number"
                                placeholder="e.g., 120"
                                value={formData.duration}
                                onChange={handleChange}
                                className="rounded-xl h-10 border-border/40 focus:border-primary"
                            />
                        </div>

                        {/* Actions */}
                        <div className="flex gap-4 pt-6 border-t border-border/10">
                            <Link href="/admin/courses" className="flex-1">
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="w-full rounded-xl font-bold"
                                >
                                    Cancel
                                </Button>
                            </Link>
                            <Button
                                type="submit"
                                disabled={loading || !formData.title}
                                className="flex-1 rounded-xl bg-primary hover:bg-primary/90 shadow-xl shadow-primary/30 font-bold text-primary-foreground"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Creating...
                                    </>
                                ) : (
                                    "Create Course"
                                )}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
                </>
            )}
        </div>
    );
}
