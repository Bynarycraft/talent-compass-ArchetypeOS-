import { useEffect, useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Users, Search, Clock, BookOpen, ClipboardCheck, AlertTriangle, TrendingUp } from 'lucide-react';
import { Profile, CourseEnrollment, LearningSession, TestResult } from '@/lib/types';

interface LearnerWithStats extends Profile {
  totalHours: number;
  coursesInProgress: number;
  testsCompleted: number;
  lastActive: string | null;
  avgScore: number;
}

export default function SupervisorLearners() {
  const { user } = useAuth();
  const [learners, setLearners] = useState<LearnerWithStats[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchLearners();
    }
  }, [user]);

  const fetchLearners = async () => {
    if (!user) return;

    try {
      // Fetch learners assigned to this supervisor
      const { data: learnersData } = await supabase
        .from('profiles')
        .select('*')
        .eq('supervisor_id', user.id);

      if (!learnersData || learnersData.length === 0) {
        setLoading(false);
        return;
      }

      // Fetch stats for each learner
      const learnersWithStats = await Promise.all(
        learnersData.map(async (learner) => {
          // Learning sessions
          const { data: sessions } = await supabase
            .from('learning_sessions')
            .select('duration_minutes, start_time')
            .eq('user_id', learner.id)
            .order('start_time', { ascending: false });

          const totalMinutes = sessions?.reduce((sum, s) => sum + (s.duration_minutes || 0), 0) || 0;
          const lastActive = sessions?.[0]?.start_time || null;

          // Course enrollments
          const { data: enrollments } = await supabase
            .from('course_enrollments')
            .select('status')
            .eq('user_id', learner.id);

          const coursesInProgress = enrollments?.filter(e => e.status === 'in_progress').length || 0;

          // Test results
          const { data: results } = await supabase
            .from('test_results')
            .select('score, status')
            .eq('user_id', learner.id);

          const testsCompleted = results?.filter(r => r.status === 'passed' || r.status === 'failed').length || 0;
          const scores = results?.filter(r => r.score !== null).map(r => r.score!) || [];
          const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;

          return {
            ...learner,
            totalHours: Math.round(totalMinutes / 60 * 10) / 10,
            coursesInProgress,
            testsCompleted,
            lastActive,
            avgScore,
          } as LearnerWithStats;
        })
      );

      setLearners(learnersWithStats);
    } catch (error) {
      console.error('Error fetching learners:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredLearners = learners.filter(learner =>
    learner.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    learner.email.toLowerCase().includes(search.toLowerCase())
  );

  const idleLearners = learners.filter(learner => {
    if (!learner.lastActive) return true;
    const daysSinceActive = Math.floor(
      (Date.now() - new Date(learner.lastActive).getTime()) / (1000 * 60 * 60 * 24)
    );
    return daysSinceActive > 3;
  });

  return (
    <MainLayout requiredRole="supervisor">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">My Learners</h1>
            <p className="text-muted-foreground mt-1">
              Monitor progress and performance of assigned learners
            </p>
          </div>
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search learners..."
              className="pl-10"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Learners</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{learners.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Avg. Learning Hours</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {learners.length > 0
                  ? Math.round(learners.reduce((sum, l) => sum + l.totalHours, 0) / learners.length * 10) / 10
                  : 0}h
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Avg. Score</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {learners.length > 0
                  ? Math.round(learners.reduce((sum, l) => sum + l.avgScore, 0) / learners.length)
                  : 0}%
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Idle Learners</CardTitle>
              <AlertTriangle className="h-4 w-4 text-warning" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-warning">{idleLearners.length}</div>
              <p className="text-xs text-muted-foreground">3+ days inactive</p>
            </CardContent>
          </Card>
        </div>

        {/* Learners List */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="h-16 bg-muted rounded" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredLearners.length === 0 ? (
          <div className="text-center py-12">
            <Users className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-semibold">No learners assigned</h3>
            <p className="text-muted-foreground">
              {search ? 'No learners match your search' : 'Learners will appear here once assigned to you'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredLearners.map(learner => {
              const isIdle = !learner.lastActive || 
                Math.floor((Date.now() - new Date(learner.lastActive).getTime()) / (1000 * 60 * 60 * 24)) > 3;

              return (
                <Card key={learner.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row md:items-center gap-4">
                      <div className="flex items-center gap-4 flex-1">
                        <Avatar className="h-12 w-12">
                          <AvatarFallback className="bg-accent text-accent-foreground">
                            {learner.full_name?.charAt(0) || learner.email.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold truncate">
                              {learner.full_name || learner.email}
                            </h3>
                            {isIdle && (
                              <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20">
                                Idle
                              </Badge>
                            )}
                            {learner.archetype && (
                              <Badge variant="secondary">{learner.archetype}</Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground truncate">{learner.email}</p>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-6 text-sm">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span>{learner.totalHours}h</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <BookOpen className="h-4 w-4 text-muted-foreground" />
                          <span>{learner.coursesInProgress} active</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <ClipboardCheck className="h-4 w-4 text-muted-foreground" />
                          <span>{learner.testsCompleted} tests</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <TrendingUp className="h-4 w-4 text-muted-foreground" />
                          <span>{learner.avgScore}% avg</span>
                        </div>
                      </div>

                      <div className="text-sm text-muted-foreground">
                        {learner.lastActive ? (
                          <>
                            Last active:{' '}
                            {new Date(learner.lastActive).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                            })}
                          </>
                        ) : (
                          'Never active'
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
