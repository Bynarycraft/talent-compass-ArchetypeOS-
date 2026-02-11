import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, Users, Clock, Award } from "lucide-react";

export default async function AdminAnalyticsPage() {
    const session = await getServerSession(authOptions);
    const role = session?.user?.role?.toLowerCase();

    if (!session || role !== "admin") {
        redirect("/dashboard");
    }

    // eslint-disable-next-line react-hooks/purity
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    // Fetch analytics data
    const totalUsers = await prisma.user.count();
    const totalCourses = await prisma.course.count();
    const totalTests = await prisma.test.count();

    const usersByRole = await prisma.user.groupBy({
        by: ['role'],
        _count: true
    });

    const usersByArchetype = await prisma.user.groupBy({
        by: ['archetype'],
        _count: true
    });

    const recentSessions = await prisma.learningSession.count({
        where: {
            createdAt: {
                gte: sevenDaysAgo
            }
        }
    });

    return (
        <div className="space-y-8">
            {/* Header */}
            <div>
                <h1 className="text-4xl font-bold tracking-tight">Company Analytics</h1>
                <p className="text-muted-foreground mt-2">Overview of platform metrics and user engagement</p>
            </div>

            {/* Key Metrics Grid */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                <Card className="hover:shadow-lg transition-shadow">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">{totalUsers}</div>
                        <p className="text-xs text-muted-foreground mt-1">Across all roles</p>
                    </CardContent>
                </Card>

                <Card className="hover:shadow-lg transition-shadow">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Active Courses</CardTitle>
                        <Award className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">{totalCourses}</div>
                        <p className="text-xs text-muted-foreground mt-1">Available for learning</p>
                    </CardContent>
                </Card>

                <Card className="hover:shadow-lg transition-shadow">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Total Assessments</CardTitle>
                        <BarChart3 className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">{totalTests}</div>
                        <p className="text-xs text-muted-foreground mt-1">Evaluation tools</p>
                    </CardContent>
                </Card>

                <Card className="hover:shadow-lg transition-shadow">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Sessions (7d)</CardTitle>
                        <Clock className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">{recentSessions}</div>
                        <p className="text-xs text-muted-foreground mt-1">Learning hours logged</p>
                    </CardContent>
                </Card>
            </div>

            {/* Distribution Charts */}
            <div className="grid gap-6 md:grid-cols-2">
                {/* Users by Role */}
                <Card>
                    <CardHeader>
                        <CardTitle>Users by Role</CardTitle>
                        <CardDescription>Distribution across platform roles</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {usersByRole.map((item) => {
                                const percentage = ((item._count / totalUsers) * 100).toFixed(1);
                                return (
                                    <div key={item.role} className="space-y-2">
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="font-medium">{item.role}</span>
                                            <span className="text-muted-foreground">{item._count} ({percentage}%)</span>
                                        </div>
                                        <div className="h-2 bg-secondary rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-primary transition-all"
                                                style={{ width: `${percentage}%` }}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </CardContent>
                </Card>

                {/* Users by Archetype */}
                <Card>
                    <CardHeader>
                        <CardTitle>Users by Archetype</CardTitle>
                        <CardDescription>Personality distribution</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {usersByArchetype.map((item) => {
                                const percentage = ((item._count / totalUsers) * 100).toFixed(1);
                                const colorMap: Record<string, string> = {
                                    MAKER: 'bg-blue-500',
                                    ARCHITECT: 'bg-purple-500',
                                    REFINER: 'bg-green-500',
                                    CATALYST: 'bg-orange-500',
                                    CRAFTSMAN: 'bg-amber-600',
                                    NONE: 'bg-gray-400'
                                };
                                const color = (item.archetype && colorMap[item.archetype]) || 'bg-gray-400';

                                return (
                                    <div key={item.archetype || 'unknown'} className="space-y-2">
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="font-medium">{item.archetype || 'Unknown'}</span>
                                            <span className="text-muted-foreground">{item._count} ({percentage}%)</span>
                                        </div>
                                        <div className="h-2 bg-secondary rounded-full overflow-hidden">
                                            <div
                                                className={`h-full ${color} transition-all`}
                                                style={{ width: `${percentage}%` }}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
