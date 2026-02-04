import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ClipboardCheck, Clock, CheckCircle, XCircle, AlertCircle, Play } from 'lucide-react';
import { Test, TestResult } from '@/lib/types';

interface TestWithResult extends Test {
  latestResult?: TestResult;
}

export default function Tests() {
  const { user } = useAuth();
  const [tests, setTests] = useState<TestWithResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchTests();
    }
  }, [user]);

  const fetchTests = async () => {
    if (!user) return;

    try {
      // Fetch tests for enrolled courses
      const { data: enrollments } = await supabase
        .from('course_enrollments')
        .select('course_id')
        .eq('user_id', user.id);

      if (!enrollments || enrollments.length === 0) {
        setLoading(false);
        return;
      }

      const courseIds = enrollments.map(e => e.course_id);

      const { data: testsData } = await supabase
        .from('tests')
        .select(`
          *,
          course:courses(title)
        `)
        .in('course_id', courseIds)
        .order('created_at', { ascending: false });

      if (testsData) {
        // Fetch results for each test
        const { data: results } = await supabase
          .from('test_results')
          .select('*')
          .eq('user_id', user.id)
          .in('test_id', testsData.map(t => t.id))
          .order('created_at', { ascending: false });

        const testsWithResults: TestWithResult[] = testsData.map(test => {
          const latestResult = results?.find(r => r.test_id === test.id);
          return {
            ...test,
            latestResult: latestResult as TestResult | undefined,
          } as unknown as TestWithResult;
        });

        setTests(testsWithResults);
      }
    } catch (error) {
      console.error('Error fetching tests:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (result?: TestResult) => {
    if (!result) {
      return <Badge variant="outline">Not Started</Badge>;
    }

    switch (result.status) {
      case 'passed':
        return (
          <Badge className="bg-success/10 text-success border-success/20">
            <CheckCircle className="h-3 w-3 mr-1" />
            Passed
          </Badge>
        );
      case 'failed':
        return (
          <Badge variant="destructive">
            <XCircle className="h-3 w-3 mr-1" />
            Failed
          </Badge>
        );
      case 'needs_review':
        return (
          <Badge className="bg-warning/10 text-warning border-warning/20">
            <AlertCircle className="h-3 w-3 mr-1" />
            Pending Review
          </Badge>
        );
      case 'in_progress':
        return (
          <Badge className="bg-accent/10 text-accent border-accent/20">
            <Clock className="h-3 w-3 mr-1" />
            In Progress
          </Badge>
        );
      case 'submitted':
        return (
          <Badge className="bg-primary/10 text-primary border-primary/20">
            Submitted
          </Badge>
        );
      default:
        return <Badge variant="outline">Pending</Badge>;
    }
  };

  const canTakeTest = (test: TestWithResult) => {
    if (!test.latestResult) return true;
    if (test.latestResult.status === 'passed') return false;
    if (test.latestResult.status === 'in_progress') return true;
    return (test.latestResult.attempt_number || 0) < test.max_attempts;
  };

  return (
    <MainLayout requiredRole="learner">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tests & Assessments</h1>
          <p className="text-muted-foreground mt-1">
            Take tests to validate your knowledge and track your progress
          </p>
        </div>

        {/* Tests List */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="h-6 bg-muted rounded w-1/2" />
                  <div className="h-4 bg-muted rounded w-1/3 mt-2" />
                </CardHeader>
              </Card>
            ))}
          </div>
        ) : tests.length === 0 ? (
          <div className="text-center py-12">
            <ClipboardCheck className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-semibold">No tests available</h3>
            <p className="text-muted-foreground">
              Enroll in courses to access their assessments
            </p>
            <Button asChild variant="link" className="mt-2">
              <Link to="/courses">Browse courses</Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {tests.map(test => (
              <Card key={test.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className="p-3 rounded-lg bg-primary/10">
                        <ClipboardCheck className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-xl">{test.title}</CardTitle>
                        <CardDescription className="mt-1">
                          {(test.course as any)?.title || 'Course'}
                        </CardDescription>
                      </div>
                    </div>
                    {getStatusBadge(test.latestResult)}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {test.time_limit_minutes} min
                      </span>
                      <span>Passing: {test.passing_score}%</span>
                      <Badge variant="outline" className="capitalize">{test.type}</Badge>
                      {test.latestResult && (
                        <span>
                          Attempt {test.latestResult.attempt_number} of {test.max_attempts}
                        </span>
                      )}
                      {test.latestResult?.score !== null && test.latestResult?.score !== undefined && (
                        <span className="font-medium">
                          Score: {test.latestResult.score}%
                        </span>
                      )}
                    </div>
                    <Button
                      asChild
                      disabled={!canTakeTest(test)}
                      variant={test.latestResult?.status === 'passed' ? 'secondary' : 'default'}
                    >
                      <Link to={`/tests/${test.id}/take`}>
                        <Play className="h-4 w-4 mr-2" />
                        {test.latestResult?.status === 'in_progress' ? 'Continue' : 
                         test.latestResult?.status === 'passed' ? 'Review' : 'Take Test'}
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
