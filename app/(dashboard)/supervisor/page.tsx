"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Users, BookOpen, CheckCircle2 } from "lucide-react";

type Course = {
  id: string;
  title: string;
  difficulty: string;
};

type Enrollment = {
  id: string;
  status: string;
  progress: number;
  course: Course;
};

type Learner = {
  id: string;
  name: string | null;
  email: string | null;
  role: string;
  archetype: string | null;
  supervisorId?: string | null;
  courseEnrollments: Enrollment[];
};

type PendingResult = {
  id: string;
  score: number;
  status: string;
  submittedAt: string | null;
  user: { id: string; name: string | null; email: string | null; role: string };
  test: { id: string; title: string; passingScore: number; type: string };
};

export default function SupervisorPage() {
  const [learners, setLearners] = useState<Learner[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState<Record<string, boolean>>({});
  const [selectedCourse, setSelectedCourse] = useState<Record<string, string>>({});
  const [updating, setUpdating] = useState<Record<string, boolean>>({});
  const [progressOverrides, setProgressOverrides] = useState<Record<string, string>>({});
  const [pendingResults, setPendingResults] = useState<PendingResult[]>([]);
  const [grading, setGrading] = useState<Record<string, boolean>>({});
  const [gradeInputs, setGradeInputs] = useState<Record<string, string>>({});
  const [feedbackInputs, setFeedbackInputs] = useState<Record<string, string>>({});
  const [deciding, setDeciding] = useState<Record<string, boolean>>({});
  const [weeklyGoals, setWeeklyGoals] = useState<Record<string, number>>({});
  const [idleLearners, setIdleLearners] = useState<
    Array<{ id: string; name: string | null; email: string | null; role: string; lastSessionAt: string | null }>
  >([]);
  const [goalInputs, setGoalInputs] = useState<Record<string, string>>({});

  useEffect(() => {
    const load = async () => {
      try {
        const [learnersRes, coursesRes, resultsRes, goalsRes, idleRes] = await Promise.all([
          fetch("/api/supervisor/learners"),
          fetch("/api/courses"),
          fetch("/api/supervisor/test-results"),
          fetch("/api/supervisor/goals"),
          fetch("/api/supervisor/idle"),
        ]);

        if (learnersRes.ok) {
          const data = await learnersRes.json();
          setLearners(data);
        }

        if (coursesRes.ok) {
          const data = await coursesRes.json();
          setCourses(data);
        }

        if (resultsRes.ok) {
          const data = await resultsRes.json();
          setPendingResults(data);
        }

        if (goalsRes.ok) {
          const data = await goalsRes.json();
          const goalMap = data.learners.reduce((acc: Record<string, number>, learner: { id: string; goalMinutes: number }) => {
            acc[learner.id] = learner.goalMinutes;
            return acc;
          }, {});
          setWeeklyGoals(goalMap);
        }

        if (idleRes.ok) {
          const data = await idleRes.json();
          setIdleLearners(data.idleLearners);
        }
      } catch (_error) {
        toast.error("Failed to load supervisor data");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const stats = useMemo(() => {
    const totalLearners = learners.length;
    const totalEnrollments = learners.reduce((acc, learner) => acc + learner.courseEnrollments.length, 0);
    const completed = learners.reduce(
      (acc, learner) => acc + learner.courseEnrollments.filter((e) => e.status === "completed").length,
      0
    );
    return { totalLearners, totalEnrollments, completed };
  }, [learners]);

  const handleAssign = async (learnerId: string) => {
    const courseId = selectedCourse[learnerId];
    if (!courseId) {
      toast.error("Select a course to assign");
      return;
    }

    setAssigning((prev) => ({ ...prev, [learnerId]: true }));
    try {
      const res = await fetch("/api/supervisor/assign-course", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ learnerId, courseId }),
      });

      if (res.ok) {
        toast.success("Course assigned");
        const refreshed = await fetch("/api/supervisor/learners");
        if (refreshed.ok) {
          setLearners(await refreshed.json());
        }
      } else {
        toast.error("Failed to assign course");
      }
    } catch (_error) {
      toast.error("Failed to assign course");
    } finally {
      setAssigning((prev) => ({ ...prev, [learnerId]: false }));
    }
  };

  const handleUpdateEnrollment = async (enrollmentId: string, updates: { status?: string; progress?: number }) => {
    setUpdating((prev) => ({ ...prev, [enrollmentId]: true }));
    try {
      const res = await fetch("/api/supervisor/enrollments", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enrollmentId, ...updates }),
      });

      if (res.ok) {
        toast.success("Enrollment updated");
        const refreshed = await fetch("/api/supervisor/learners");
        if (refreshed.ok) {
          setLearners(await refreshed.json());
        }
      } else {
        toast.error("Failed to update enrollment");
      }
    } catch (_error) {
      toast.error("Failed to update enrollment");
    } finally {
      setUpdating((prev) => ({ ...prev, [enrollmentId]: false }));
    }
  };

  const handleGrade = async (resultId: string) => {
    const scoreValue = Number(gradeInputs[resultId]);
    if (Number.isNaN(scoreValue)) {
      toast.error("Enter a valid score");
      return;
    }

    setGrading((prev) => ({ ...prev, [resultId]: true }));
    try {
      const res = await fetch(`/api/supervisor/test-results/${resultId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ score: scoreValue, feedback: feedbackInputs[resultId] || null }),
      });

      if (res.ok) {
        toast.success("Result graded");
        setPendingResults((prev) => prev.filter((item) => item.id !== resultId));
      } else {
        toast.error("Failed to grade result");
      }
    } catch (_error) {
      toast.error("Failed to grade result");
    } finally {
      setGrading((prev) => ({ ...prev, [resultId]: false }));
    }
  };

  const handleDecision = async (userId: string, decision: "accept" | "reject") => {
    setDeciding((prev) => ({ ...prev, [userId]: true }));
    try {
      const res = await fetch(`/api/admin/candidates/${userId}/decision`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision }),
      });

      if (!res.ok) {
        throw new Error("Decision failed");
      }

      const refreshed = await fetch("/api/supervisor/learners");
      if (refreshed.ok) {
        setLearners(await refreshed.json());
      }

      toast.success(`Candidate ${decision}ed`);
    } catch (_error) {
      toast.error("Failed to update candidate");
    } finally {
      setDeciding((prev) => ({ ...prev, [userId]: false }));
    }
  };

  const handleGoalUpdate = async (learnerId: string) => {
    const goalValue = Number(goalInputs[learnerId]);
    if (Number.isNaN(goalValue)) {
      toast.error("Enter a valid goal in minutes");
      return;
    }

    try {
      const res = await fetch("/api/supervisor/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ learnerId, goalMinutes: goalValue }),
      });

      if (res.ok) {
        toast.success("Weekly goal updated");
        setWeeklyGoals((prev) => ({ ...prev, [learnerId]: goalValue }));
      } else {
        toast.error("Failed to update goal");
      }
    } catch (_error) {
      toast.error("Failed to update goal");
    }
  };

  return (
    <div className="space-y-10">
      <div className="pb-2 border-b border-border/10">
        <h1 className="text-4xl font-black tracking-tight text-gradient">Supervisor Hub</h1>
        <p className="text-muted-foreground mt-2 text-sm font-medium">
          Monitor learner progress and deploy new modules as needed.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {[
          { label: "Learners", value: stats.totalLearners, icon: Users },
          { label: "Active Enrollments", value: stats.totalEnrollments, icon: BookOpen },
          { label: "Completed", value: stats.completed, icon: CheckCircle2 },
        ].map((stat) => (
          <Card key={stat.label} className="border-none bg-card/40 backdrop-blur-md shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                {stat.label}
              </CardTitle>
              <stat.icon className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-none glass-card rounded-3xl">
        <CardHeader>
          <CardTitle className="text-lg font-black">Learner Assignments</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {loading ? (
            <div className="text-sm text-muted-foreground">Loading learners...</div>
          ) : learners.length === 0 ? (
            <div className="text-sm text-muted-foreground">No learners assigned.</div>
          ) : (
            learners.map((learner) => (
              <div key={learner.id} className="rounded-2xl border border-border/30 p-4 space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <p className="font-bold text-base">{learner.name || learner.email}</p>
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                      {learner.role} · {learner.archetype || "Unassigned"}
                    </p>
                  </div>
                  <div className="flex flex-col sm:flex-row items-stretch gap-3">
                    <Select
                      value={selectedCourse[learner.id] || ""}
                      onValueChange={(value) =>
                        setSelectedCourse((prev) => ({ ...prev, [learner.id]: value }))
                      }
                    >
                      <SelectTrigger className="min-w-[220px]">
                        <SelectValue placeholder="Select course" />
                      </SelectTrigger>
                      <SelectContent>
                        {courses.map((course) => (
                          <SelectItem key={course.id} value={course.id}>
                            {course.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      onClick={() => handleAssign(learner.id)}
                      disabled={assigning[learner.id]}
                      className="rounded-2xl font-black"
                    >
                      {assigning[learner.id] ? "Assigning..." : "Assign Course"}
                    </Button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {learner.courseEnrollments.length === 0 ? (
                    <Badge variant="outline">No enrollments</Badge>
                  ) : (
                    learner.courseEnrollments.map((enrollment) => (
                      <div key={enrollment.id} className="flex flex-col gap-2 rounded-2xl border border-border/30 px-4 py-3">
                        <div className="flex flex-wrap items-center gap-3">
                          <Badge className="bg-secondary/50 text-foreground">
                            {enrollment.course.title} · {enrollment.status}
                          </Badge>
                          <Badge variant="outline">{enrollment.progress}%</Badge>
                        </div>
                        <div className="flex flex-col md:flex-row md:items-center gap-3">
                          <div className="flex items-center gap-2">
                            <Input
                              value={progressOverrides[enrollment.id] ?? enrollment.progress.toString()}
                              onChange={(event) =>
                                setProgressOverrides((prev) => ({
                                  ...prev,
                                  [enrollment.id]: event.target.value,
                                }))
                              }
                              className="w-20"
                              placeholder="0"
                            />
                            <Button
                              variant="outline"
                              className="rounded-2xl"
                              disabled={updating[enrollment.id]}
                              onClick={() =>
                                handleUpdateEnrollment(enrollment.id, {
                                  progress: Number(progressOverrides[enrollment.id] ?? enrollment.progress),
                                })
                              }
                            >
                              Update Progress
                            </Button>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              className="rounded-2xl"
                              disabled={updating[enrollment.id]}
                              onClick={() => handleUpdateEnrollment(enrollment.id, { status: "completed" })}
                            >
                              Mark Complete
                            </Button>
                            <Button
                              variant="ghost"
                              className="rounded-2xl"
                              disabled={updating[enrollment.id]}
                              onClick={() =>
                                handleUpdateEnrollment(enrollment.id, { status: "in_progress", progress: 0 })
                              }
                            >
                              Reset
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                {learner.role === "candidate" && (
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={deciding[learner.id]}
                      onClick={() => handleDecision(learner.id, "accept")}
                    >
                      Accept Candidate
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={deciding[learner.id]}
                      onClick={() => handleDecision(learner.id, "reject")}
                    >
                      Reject Candidate
                    </Button>
                  </div>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card className="border-none glass-card rounded-3xl">
        <CardHeader>
          <CardTitle className="text-lg font-black">Pending Assessments</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {loading ? (
            <div className="text-sm text-muted-foreground">Loading assessments...</div>
          ) : pendingResults.length === 0 ? (
            <div className="text-sm text-muted-foreground">No submitted assessments awaiting review.</div>
          ) : (
            pendingResults.map((result) => (
              <div key={result.id} className="rounded-2xl border border-border/30 p-4 space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <p className="font-bold text-base">{result.test.title}</p>
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                      {result.user.name || result.user.email} · {result.test.type}
                    </p>
                  </div>
                  <Badge variant="outline">Passing {result.test.passingScore}%</Badge>
                </div>
                <div className="grid gap-3 md:grid-cols-3">
                  <Input
                    placeholder="Score"
                    value={gradeInputs[result.id] ?? ""}
                    onChange={(event) =>
                      setGradeInputs((prev) => ({ ...prev, [result.id]: event.target.value }))
                    }
                  />
                  <Input
                    placeholder="Feedback"
                    value={feedbackInputs[result.id] ?? ""}
                    onChange={(event) =>
                      setFeedbackInputs((prev) => ({ ...prev, [result.id]: event.target.value }))
                    }
                    className="md:col-span-2"
                  />
                </div>
                <Button
                  onClick={() => handleGrade(result.id)}
                  disabled={grading[result.id]}
                  className="rounded-2xl font-black"
                >
                  {grading[result.id] ? "Grading..." : "Submit Grade"}
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card className="border-none glass-card rounded-3xl">
        <CardHeader>
          <CardTitle className="text-lg font-black">Weekly Learning Goals</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {learners.length === 0 ? (
            <div className="text-sm text-muted-foreground">No learners available.</div>
          ) : (
            learners.map((learner) => (
              <div key={learner.id} className="flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-2xl border border-border/30 p-4">
                <div>
                  <p className="font-bold text-sm">{learner.name || learner.email}</p>
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                    Current goal: {weeklyGoals[learner.id] || 0} minutes
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    value={goalInputs[learner.id] ?? ""}
                    onChange={(event) =>
                      setGoalInputs((prev) => ({ ...prev, [learner.id]: event.target.value }))
                    }
                    placeholder="Goal minutes"
                    className="w-32"
                  />
                  <Button onClick={() => handleGoalUpdate(learner.id)} className="rounded-2xl font-black">
                    Set Goal
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card className="border-none glass-card rounded-3xl">
        <CardHeader>
          <CardTitle className="text-lg font-black">Idle Learners</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {idleLearners.length === 0 ? (
            <div className="text-sm text-muted-foreground">No idle learners detected.</div>
          ) : (
            idleLearners.map((learner) => (
              <div key={learner.id} className="flex flex-col md:flex-row md:items-center justify-between gap-2 rounded-2xl border border-border/30 p-4">
                <div>
                  <p className="font-bold text-sm">{learner.name || learner.email}</p>
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                    Last session: {learner.lastSessionAt ? new Date(learner.lastSessionAt).toLocaleDateString() : "Never"}
                  </p>
                </div>
                <Button variant="outline" size="sm" className="rounded-2xl">Send Reminder</Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
