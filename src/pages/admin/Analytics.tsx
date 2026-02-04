import { useEffect, useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users, Clock, BookOpen, TrendingUp, Award, Layers } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from 'recharts';

interface AnalyticsData {
  totalUsers: number;
  totalLearners: number;
  totalHours: number;
  totalCourses: number;
  avgScore: number;
  archetypeDistribution: { name: string; value: number }[];
  hoursByDay: { day: string; hours: number }[];
  topCourses: { name: string; enrollments: number }[];
}

const COLORS = ['hsl(173, 58%, 39%)', 'hsl(222, 47%, 35%)', 'hsl(142, 71%, 45%)', 'hsl(38, 92%, 50%)', 'hsl(0, 84%, 60%)'];

export default function AdminAnalytics() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [timeRange, setTimeRange] = useState('7d');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, [timeRange]);

  const fetchAnalytics = async () => {
    try {
      // Get date range
      const now = new Date();
      const startDate = new Date();
      if (timeRange === '7d') startDate.setDate(now.getDate() - 7);
      else if (timeRange === '30d') startDate.setDate(now.getDate() - 30);
      else if (timeRange === '90d') startDate.setDate(now.getDate() - 90);

      // Fetch all users
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, archetype');

      // Fetch user roles
      const { data: roles } = await supabase
        .from('user_roles')
        .select('user_id, role');

      const learnerCount = roles?.filter(r => r.role === 'learner').length || 0;

      // Fetch learning sessions
      const { data: sessions } = await supabase
        .from('learning_sessions')
        .select('duration_minutes, start_time')
        .gte('start_time', startDate.toISOString());

      const totalMinutes = sessions?.reduce((sum, s) => sum + (s.duration_minutes || 0), 0) || 0;

      // Fetch courses
      const { data: courses } = await supabase
        .from('courses')
        .select('id, title');

      // Fetch enrollments
      const { data: enrollments } = await supabase
        .from('course_enrollments')
        .select('course_id');

      // Fetch test results
      const { data: results } = await supabase
        .from('test_results')
        .select('score')
        .not('score', 'is', null)
        .gte('created_at', startDate.toISOString());

      const scores = results?.map(r => r.score!) || [];
      const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;

      // Calculate archetype distribution
      const archetypeCounts = new Map<string, number>();
      profiles?.forEach(p => {
        const arch = p.archetype || 'Unassigned';
        archetypeCounts.set(arch, (archetypeCounts.get(arch) || 0) + 1);
      });
      const archetypeDistribution = Array.from(archetypeCounts.entries())
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 5);

      // Calculate hours by day
      const dayMinutes = new Map<string, number>();
      const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
      for (let i = 0; i < Math.min(days, 14); i++) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dayStr = date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
        dayMinutes.set(dayStr, 0);
      }

      sessions?.forEach(s => {
        const date = new Date(s.start_time);
        const dayStr = date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
        if (dayMinutes.has(dayStr)) {
          dayMinutes.set(dayStr, dayMinutes.get(dayStr)! + (s.duration_minutes || 0));
        }
      });

      const hoursByDay = Array.from(dayMinutes.entries())
        .map(([day, mins]) => ({ day, hours: Math.round(mins / 60 * 10) / 10 }))
        .reverse();

      // Top courses by enrollment
      const courseCounts = new Map<string, number>();
      enrollments?.forEach(e => {
        courseCounts.set(e.course_id, (courseCounts.get(e.course_id) || 0) + 1);
      });
      const topCourses = courses
        ?.map(c => ({ name: c.title, enrollments: courseCounts.get(c.id) || 0 }))
        .sort((a, b) => b.enrollments - a.enrollments)
        .slice(0, 5) || [];

      setData({
        totalUsers: profiles?.length || 0,
        totalLearners: learnerCount,
        totalHours: Math.round(totalMinutes / 60),
        totalCourses: courses?.length || 0,
        avgScore,
        archetypeDistribution,
        hoursByDay,
        topCourses,
      });
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !data) {
    return (
      <MainLayout requiredRole="admin">
        <div className="space-y-6">
          <div className="h-8 bg-muted rounded w-64 animate-pulse" />
          <div className="grid gap-4 md:grid-cols-4">
            {[1, 2, 3, 4].map(i => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="h-16 bg-muted rounded" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout requiredRole="admin">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Analytics Dashboard</h1>
            <p className="text-muted-foreground mt-1">
              Platform-wide insights and metrics
            </p>
          </div>
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Time Range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data.totalUsers}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Active Learners</CardTitle>
              <Users className="h-4 w-4 text-accent" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data.totalLearners}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Hours</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data.totalHours}h</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Courses</CardTitle>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data.totalCourses}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Avg Score</CardTitle>
              <Award className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data.avgScore}%</div>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Learning Hours Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Learning Activity</CardTitle>
              <CardDescription>Hours learned over time</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.hoursByDay}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="day" className="text-xs" tick={{ fontSize: 10 }} />
                    <YAxis className="text-xs" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: 'var(--radius)',
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="hours"
                      stroke="hsl(var(--accent))"
                      strokeWidth={2}
                      dot={{ fill: 'hsl(var(--accent))' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Archetype Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>Archetype Distribution</CardTitle>
              <CardDescription>Users by archetype</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data.archetypeDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      {data.archetypeDistribution.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Top Courses */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Top Courses by Enrollment</CardTitle>
              <CardDescription>Most popular courses</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.topCourses} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis type="number" className="text-xs" />
                    <YAxis dataKey="name" type="category" className="text-xs" width={150} tick={{ fontSize: 12 }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: 'var(--radius)',
                      }}
                    />
                    <Bar dataKey="enrollments" fill="hsl(var(--accent))" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}
