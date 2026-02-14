import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BookOpen, CheckCircle2, Target, Timer } from "lucide-react";
import Link from "next/link";
import type { Prisma } from "@prisma/client";

type CandidateUser = Prisma.UserGetPayload<{
  include: {
    courseEnrollments: { include: { course: true } };
    testResults: { include: { test: true } };
    dailyLearningSessions: true;
  };
}>;

export default async function CandidateHomePage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/auth/signin");
  }

  if (session.user.role !== "candidate") {
    redirect("/dashboard");
  }

  let user: CandidateUser | null = null;
  try {
    user = (await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        courseEnrollments: { include: { course: true } },
        testResults: { include: { test: true }, orderBy: { submittedAt: "desc" } },
        dailyLearningSessions: { orderBy: { startTime: "desc" }, take: 5 },
      },
    })) as CandidateUser | null;
  } catch (error) {
    console.error("[candidate] prisma error:", error);
  }

  if (!user) {
    return (
      <div className="p-12 text-center">
        <h2 className="text-2xl font-bold">Candidate data unavailable</h2>
        <p className="mt-3 text-muted-foreground">Please try again later.</p>
      </div>
    );
  }

  const completedCourses = user.courseEnrollments.filter((e) => e.status === "completed").length;
  const enrolledCourses = user.courseEnrollments.length;

  const passedAssessments = user.testResults.filter((result) => {
    const passing = result.test.passingScore ?? 70;
    return result.score >= passing;
  }).length;

  const totalAssessments = user.testResults.length;
  const totalMinutes = user.dailyLearningSessions.reduce(
    (acc, sessionItem) => acc + (sessionItem.durationMinutes || 0),
    0
  );

  const totalHours = (totalMinutes / 60).toFixed(1);

  const recommended = await prisma.course.findMany({
    orderBy: { createdAt: "desc" },
    take: 3,
  });

  return (
    <div className="space-y-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-2 border-b border-border/10">
        <div>
          <h1 className="text-5xl font-black tracking-tight text-gradient">Candidate Command</h1>
          <p className="text-muted-foreground mt-2 text-base font-medium">
            Your readiness metrics are tracked in real time. Complete assessments to unlock learner status.
          </p>
        </div>
        <Link href="/courses">
          <Button className="rounded-2xl px-8 bg-primary hover:bg-primary/90 shadow-xl shadow-primary/30 font-black text-primary-foreground">
            <Target className="mr-2 h-5 w-5" /> Begin Assessment
          </Button>
        </Link>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Hours Logged", value: `${totalHours}h`, icon: Timer },
          { label: "Courses Enrolled", value: enrolledCourses, icon: BookOpen },
          { label: "Courses Completed", value: completedCourses, icon: CheckCircle2 },
          { label: "Assessments Passed", value: `${passedAssessments}/${totalAssessments}`, icon: Target },
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

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-none glass-card rounded-3xl">
          <CardHeader>
            <CardTitle className="text-lg font-black">Current Missions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {user.courseEnrollments.length === 0 ? (
              <p className="text-sm text-muted-foreground">You have no active missions yet.</p>
            ) : (
              user.courseEnrollments.slice(0, 3).map((enrollment) => (
                <div key={enrollment.id} className="flex items-center justify-between">
                  <div>
                    <p className="font-bold text-sm">{enrollment.course.title}</p>
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                      {enrollment.status.replace("_", " ")}
                    </p>
                  </div>
                  <Badge className="bg-primary/10 text-primary border-none text-[10px] uppercase tracking-widest">
                    {enrollment.progress}%
                  </Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="border-none glass-card rounded-3xl">
          <CardHeader>
            <CardTitle className="text-lg font-black">Recommended Modules</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {recommended.length === 0 ? (
              <p className="text-sm text-muted-foreground">No modules available yet.</p>
            ) : (
              recommended.map((course) => (
                <Link key={course.id} href={`/courses/${course.id}`} className="block">
                  <div className="flex items-center justify-between rounded-2xl border border-border/30 p-4 hover:border-primary/40 transition-colors">
                    <div>
                      <p className="font-bold text-sm">{course.title}</p>
                      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{course.difficulty}</p>
                    </div>
                    <Badge className="bg-secondary/60 text-foreground border-none">View</Badge>
                  </div>
                </Link>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
