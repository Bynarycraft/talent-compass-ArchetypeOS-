import { useEffect, useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import {
  Clock,
  BookOpen,
  Trophy,
  Flame,
  ArrowRight,
  Play,
} from 'lucide-react';
import { CourseEnrollment, LearningSession, DashboardStats } from '@/lib/types';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

export default function Dashboard() {
  const { user, profile } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalHours: 0,
    coursesCompleted: 0,
    averageScore: 0,
    currentStreak: 0,
    progressPercent: 0,
  });
  const [recentEnrollments, setRecentEnrollments] = useState<CourseEnrollment[]>([]);
  const [activeSession, setActiveSession] = useState<LearningSession | null>(null);
  const [weeklyData, setWeeklyData] = useState<{ day: string; hours: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    if (!user) return;

    try {
      // Fetch course enrollments with course details
      const { data: enrollments } = await supabase
        .from('course_enrollments')
        .select(`
          *,
          course:courses(*)
        `)
        .eq('user_id', user.id)
        .order('enrolled_at', { ascending: false })
        .limit(5);

      if (enrollments) {
        setRecentEnrollments(enrollments as CourseEnrollment[]);
        
        // Calculate stats
        const completed = enrollments.filter(e => e.status === 'completed').length;
        const avgProgress = enrollments.reduce((sum, e) => sum + e.progress_percent, 0) / (enrollments.length || 1);
        
        setStats(prev => ({
          ...prev,
          coursesCompleted: completed,
          progressPercent: Math.round(avgProgress),
        }));
      }

      // Fetch learning sessions for total hours
      const { data: sessions } = await supabase
        .from('learning_sessions')
        .select('*')
        .eq('user_id', user.id);

      if (sessions) {
        const totalMinutes = sessions.reduce((sum, s) => sum + (s.duration_minutes || 0), 0);
        setStats(prev => ({
          ...prev,
          totalHours: Math.round(totalMinutes / 60 * 10) / 10,
        }));

        // Check for active session
        const active = sessions.find(s => !s.end_time);
        if (active) {
          setActiveSession(active as LearningSession);
        }

        // Calculate weekly data
        const last7Days = Array.from({ length: 7 }, (_, i) => {
          const date = new Date();
          date.setDate(date.getDate() - (6 - i));
          return date;
        });

        const weekly = last7Days.map(date => {
          const dayStr = date.toLocaleDateString('en-US', { weekday: 'short' });
          const dayStart = new Date(date);
          dayStart.setHours(0, 0, 0, 0);
          const dayEnd = new Date(date);
          dayEnd.setHours(23, 59, 59, 999);

          const dayMinutes = sessions
            .filter(s => {
              const sessionDate = new Date(s.start_time);
              return sessionDate >= dayStart && sessionDate <= dayEnd;
            })
            .reduce((sum, s) => sum + (s.duration_minutes || 0), 0);

          return { day: dayStr, hours: Math.round(dayMinutes / 60 * 10) / 10 };
        });

        setWeeklyData(weekly);
      }

      // Fetch test results for average score
      const { data: results } = await supabase
        .from('test_results')
        .select('score')
        .eq('user_id', user.id)
        .not('score', 'is', null);

      if (results && results.length > 0) {
        const avgScore = results.reduce((sum, r) => sum + (r.score || 0), 0) / results.length;
        setStats(prev => ({
          ...prev,
          averageScore: Math.round(avgScore),
        }));
      }

      // Calculate streak (simplified - count consecutive days with sessions)
      if (sessions && sessions.length > 0) {
        let streak = 0;
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        for (let i = 0; i < 30; i++) {
          const checkDate = new Date(today);
          checkDate.setDate(checkDate.getDate() - i);
          const nextDay = new Date(checkDate);
          nextDay.setDate(nextDay.getDate() + 1);

          const hasSession = sessions.some(s => {
            const sessionDate = new Date(s.start_time);
            return sessionDate >= checkDate && sessionDate < nextDay;
          });

          if (hasSession) {
            streak++;
          } else if (i > 0) {
            break;
          }
        }

        setStats(prev => ({
          ...prev,
          currentStreak: streak,
        }));
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <MainLayout requiredRole="learner">
      <div className="space-y-6">
        {/* Welcome Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Welcome back, {profile?.full_name?.split(' ')[0] || 'Learner'}
            </h1>
            <p className="text-muted-foreground mt-1">
              Track your progress and continue learning
            </p>
          </div>
          {activeSession ? (
            <Button asChild variant="outline" className="gap-2">
              <Link to="/tracker">
                <Clock className="h-4 w-4 text-success animate-pulse" />
                Session Active
              </Link>
            </Button>
          ) : (
            <Button asChild className="gap-2">
              <Link to="/tracker">
                <Play className="h-4 w-4" />
                Start Learning
              </Link>
            </Button>
          )}
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Hours</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalHours}h</div>
              <p className="text-xs text-muted-foreground">Learning time logged</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Courses Completed</CardTitle>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.coursesCompleted}</div>
              <p className="text-xs text-muted-foreground">
                {recentEnrollments.length} total enrolled
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Average Score</CardTitle>
              <Trophy className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.averageScore}%</div>
              <p className="text-xs text-muted-foreground">Across all tests</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Current Streak</CardTitle>
              <Flame className="h-4 w-4 text-warning" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.currentStreak} days</div>
              <p className="text-xs text-muted-foreground">Keep it going!</p>
            </CardContent>
          </Card>
        </div>

        {/* Charts and Courses */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Weekly Activity Chart */}
          <Card className="col-span-1">
            <CardHeader>
              <CardTitle>Weekly Activity</CardTitle>
              <CardDescription>Hours learned per day</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={weeklyData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="day" className="text-xs" />
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

          {/* Recent Courses */}
          <Card className="col-span-1">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Recent Courses</CardTitle>
                <CardDescription>Continue where you left off</CardDescription>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/courses">
                  View all <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {recentEnrollments.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No courses enrolled yet</p>
                  <Button asChild variant="link" className="mt-2">
                    <Link to="/courses">Browse courses</Link>
                  </Button>
                </div>
              ) : (
                recentEnrollments.slice(0, 4).map((enrollment) => (
                  <div
                    key={enrollment.id}
                    className="flex items-center gap-4 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">
                        {(enrollment.course as any)?.title || 'Untitled Course'}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <Progress value={enrollment.progress_percent} className="h-2 flex-1" />
                        <span className="text-xs text-muted-foreground">
                          {enrollment.progress_percent}%
                        </span>
                      </div>
                    </div>
                    <Button size="sm" variant="ghost" asChild>
                      <Link to={`/courses/${enrollment.course_id}`}>
                        <Play className="h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}
