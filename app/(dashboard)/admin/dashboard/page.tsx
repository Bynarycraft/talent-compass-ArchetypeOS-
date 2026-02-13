"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Loader2 } from "lucide-react";

type AnalyticsSummary = {
  totalLearningMinutes?: number;
  averageTestScore?: number;
};

type AdminUser = {
  id: string;
  name: string | null;
  email: string | null;
  role?: string | null;
  archetype?: string | null;
  createdAt: string | Date;
};

type RoleDistributionItem = {
  name: string;
  value: number;
};

export default function AdminDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    }
    if (session?.user?.role !== "admin") {
      router.push("/dashboard");
    }
  }, [session, status, router]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [analyticsRes, usersRes] = await Promise.all([
          fetch("/api/admin/analytics"),
          fetch("/api/admin/users"),
        ]);

        if (analyticsRes.ok) {
          const analyticsData = (await analyticsRes.json()) as AnalyticsSummary;
          setAnalytics(analyticsData);
        }
        if (usersRes.ok) {
          const usersData = (await usersRes.json()) as AdminUser[];
          setUsers(usersData);
        }
      } catch (error) {
        console.error("Failed to fetch data:", error);
      } finally {
        setLoading(false);
      }
    };

    if (session?.user?.role === "admin") {
      fetchData();
    }
  }, [session]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const mockChartData = [
    { name: "Jan", hours: 120 },
    { name: "Feb", hours: 190 },
    { name: "Mar", hours: 150 },
    { name: "Apr", hours: 220 },
    { name: "May", hours: 180 },
  ];

  const roleDistribution = users.reduce<RoleDistributionItem[]>((acc, user) => {
    const role = user.role ?? "unknown";
    const existing = acc.find((item) => item.name === role);
    if (existing) {
      existing.value += 1;
    } else {
      acc.push({ name: role, value: 1 });
    }
    return acc;
  }, []);

  const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444"];

  return (
    <div className="space-y-8 p-6">
      <div>
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <p className="text-muted-foreground">Organization-wide insights and management</p>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Learning Hours</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {analytics?.totalLearningMinutes ? Math.round(analytics.totalLearningMinutes / 60) : 0}
                </div>
                <p className="text-xs text-muted-foreground">Across organization</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{users?.length || 0}</div>
                <p className="text-xs text-muted-foreground">Registered members</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Avg Test Score</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{Math.round(analytics?.averageTestScore || 0)}%</div>
                <p className="text-xs text-muted-foreground">Organization average</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Learning Hours Trend</CardTitle>
                <CardDescription>Monthly learning hours</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={mockChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="hours" stroke="#3b82f6" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>User Distribution by Role</CardTitle>
                <CardDescription>Current role breakdown</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={roleDistribution}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }: { name?: string; value?: number }) => `${name ?? ""} (${value ?? 0})`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {roleDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>All Users</CardTitle>
              <CardDescription>Manage system users and roles</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-4">Name</th>
                      <th className="text-left py-2 px-4">Email</th>
                      <th className="text-left py-2 px-4">Role</th>
                      <th className="text-left py-2 px-4">Archetype</th>
                      <th className="text-left py-2 px-4">Joined</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <tr key={user.id} className="border-b hover:bg-muted/50">
                        <td className="py-2 px-4">{user.name}</td>
                        <td className="py-2 px-4">{user.email}</td>
                        <td className="py-2 px-4">
                          <span className="px-2 py-1 bg-muted rounded text-xs font-medium">
                            {user.role}
                          </span>
                        </td>
                        <td className="py-2 px-4">{user.archetype || "-"}</td>
                        <td className="py-2 px-4 text-xs text-muted-foreground">
                          {new Date(user.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
