import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Hexagon, BookOpen, ClipboardCheck, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { Course, Test, TestResult } from '@/lib/types';

type CandidateStatus = 'pending_assignment' | 'assigned' | 'test_in_progress' | 'pending_review' | 'passed' | 'failed';

export default function CandidateOnboarding() {
  const navigate = useNavigate();
  const { user, role, profile, signOut, refreshProfile } = useAuth();
  const [status, setStatus] = useState<CandidateStatus>('pending_assignment');
  const [assignedCourse, setAssignedCourse] = useState<Course | null>(null);
  const [assignedTest, setAssignedTest] = useState<Test | null>(null);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Redirect if not candidate
    if (role && role !== 'candidate') {
      navigate('/dashboard', { replace: true });
      return;
    }

    if (user) {
      fetchCandidateStatus();
    }
  }, [user, role, navigate]);

  const fetchCandidateStatus = async () => {
    if (!user) return;

    try {
      // Check for any course enrollments
      const { data: enrollments } = await supabase
        .from('course_enrollments')
        .select(`
          *,
          course:courses(*)
        `)
        .eq('user_id', user.id)
        .limit(1);

      if (!enrollments || enrollments.length === 0) {
        setStatus('pending_assignment');
        setLoading(false);
        return;
      }

      const enrollment = enrollments[0];
      setAssignedCourse(enrollment.course as Course);

      // Check for tests related to the course
      const { data: tests } = await supabase
        .from('tests')
        .select('*')
        .eq('course_id', enrollment.course_id)
        .limit(1);

      if (tests && tests.length > 0) {
        const test = tests[0] as unknown as Test;
        setAssignedTest(test);

        // Check for test results
        const { data: results } = await supabase
          .from('test_results')
          .select('*')
          .eq('test_id', test.id)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1);

        if (results && results.length > 0) {
          const result = results[0] as TestResult;
          setTestResult(result);

          if (result.status === 'passed') {
            setStatus('passed');
            // Check if already promoted
            await refreshProfile();
          } else if (result.status === 'failed') {
            setStatus('failed');
          } else if (result.status === 'needs_review' || result.status === 'submitted') {
            setStatus('pending_review');
          } else if (result.status === 'in_progress') {
            setStatus('test_in_progress');
          } else {
            setStatus('assigned');
          }
        } else {
          setStatus('assigned');
        }
      } else {
        setStatus('assigned');
      }
    } catch (error) {
      console.error('Error fetching candidate status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStartTest = () => {
    if (assignedTest) {
      navigate(`/tests/${assignedTest.id}/take`);
    }
  };

  const handleContinueToDashboard = () => {
    navigate('/dashboard', { replace: true });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse-soft">
          <Hexagon className="h-12 w-12 text-accent" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/30">
      {/* Header */}
      <header className="p-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Hexagon className="h-8 w-8 text-accent" />
          <span className="text-xl font-bold tracking-tight">ArchetypeOS</span>
        </div>
        <Button variant="ghost" onClick={signOut}>
          Sign Out
        </Button>
      </header>

      {/* Main Content */}
      <main className="container max-w-3xl py-12 px-4">
        <div className="space-y-8">
          {/* Welcome Section */}
          <div className="text-center space-y-3">
            <h1 className="text-3xl font-bold tracking-tight">
              Welcome, {profile?.full_name || 'Candidate'}!
            </h1>
            <p className="text-muted-foreground max-w-lg mx-auto">
              Complete your onboarding assessment to unlock the full learning experience.
            </p>
          </div>

          {/* Progress Steps */}
          <div className="flex items-center justify-center gap-2">
            <div className={`flex items-center gap-2 px-4 py-2 rounded-full ${status !== 'pending_assignment' ? 'bg-success/10 text-success' : 'bg-accent/10 text-accent'}`}>
              <span className="font-medium">1. Assigned</span>
            </div>
            <div className="w-8 h-0.5 bg-border" />
            <div className={`flex items-center gap-2 px-4 py-2 rounded-full ${['pending_review', 'passed', 'failed'].includes(status) ? 'bg-success/10 text-success' : status === 'test_in_progress' ? 'bg-accent/10 text-accent' : 'bg-muted text-muted-foreground'}`}>
              <span className="font-medium">2. Test</span>
            </div>
            <div className="w-8 h-0.5 bg-border" />
            <div className={`flex items-center gap-2 px-4 py-2 rounded-full ${status === 'passed' ? 'bg-success/10 text-success' : status === 'failed' ? 'bg-destructive/10 text-destructive' : 'bg-muted text-muted-foreground'}`}>
              <span className="font-medium">3. Result</span>
            </div>
          </div>

          {/* Status Card */}
          <Card className="shadow-lg">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl">Onboarding Status</CardTitle>
                <Badge variant={status === 'passed' ? 'default' : status === 'failed' ? 'destructive' : 'secondary'}>
                  {status.replace('_', ' ').toUpperCase()}
                </Badge>
              </div>
              <CardDescription>
                {status === 'pending_assignment' && 'Waiting for a course and test to be assigned to you.'}
                {status === 'assigned' && 'A course and test have been assigned. Take the test to proceed.'}
                {status === 'test_in_progress' && 'You have a test in progress. Continue where you left off.'}
                {status === 'pending_review' && 'Your test is being reviewed by a supervisor.'}
                {status === 'passed' && 'Congratulations! You passed and have been promoted to Learner.'}
                {status === 'failed' && 'Unfortunately, you did not pass. Please contact your supervisor.'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {status === 'pending_assignment' && (
                <div className="text-center py-8">
                  <Clock className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground">
                    An administrator will assign you a course soon. Please check back later.
                  </p>
                </div>
              )}

              {assignedCourse && (
                <div className="p-4 rounded-lg border bg-card">
                  <div className="flex items-start gap-4">
                    <div className="p-3 rounded-lg bg-accent/10">
                      <BookOpen className="h-6 w-6 text-accent" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold">{assignedCourse.title}</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        {assignedCourse.description || 'No description available'}
                      </p>
                      <div className="flex items-center gap-4 mt-3 text-sm">
                        <Badge variant="outline" className="capitalize">
                          {assignedCourse.difficulty}
                        </Badge>
                        <span className="text-muted-foreground">
                          {assignedCourse.duration_minutes} min
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {assignedTest && status !== 'pending_assignment' && (
                <div className="p-4 rounded-lg border bg-card">
                  <div className="flex items-start gap-4">
                    <div className="p-3 rounded-lg bg-primary/10">
                      <ClipboardCheck className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold">{assignedTest.title}</h3>
                      <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                        <span>{assignedTest.time_limit_minutes} min limit</span>
                        <span>Passing: {assignedTest.passing_score}%</span>
                        <span>Max attempts: {assignedTest.max_attempts}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {testResult && ['pending_review', 'passed', 'failed'].includes(status) && (
                <div className="p-4 rounded-lg border bg-card">
                  <div className="flex items-center gap-4">
                    {status === 'passed' ? (
                      <CheckCircle className="h-10 w-10 text-success" />
                    ) : status === 'failed' ? (
                      <AlertCircle className="h-10 w-10 text-destructive" />
                    ) : (
                      <Clock className="h-10 w-10 text-warning" />
                    )}
                    <div className="flex-1">
                      <h3 className="font-semibold">
                        {status === 'passed' && 'Test Passed!'}
                        {status === 'failed' && 'Test Not Passed'}
                        {status === 'pending_review' && 'Awaiting Review'}
                      </h3>
                      {testResult.score !== null && (
                        <div className="flex items-center gap-3 mt-2">
                          <Progress value={testResult.score} className="flex-1 h-2" />
                          <span className="text-sm font-medium">{testResult.score}%</span>
                        </div>
                      )}
                      {testResult.feedback && (
                        <p className="text-sm text-muted-foreground mt-2">
                          Feedback: {testResult.feedback}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex justify-center gap-3 pt-4">
                {(status === 'assigned' || status === 'test_in_progress') && assignedTest && (
                  <Button size="lg" onClick={handleStartTest}>
                    {status === 'test_in_progress' ? 'Continue Test' : 'Start Test'}
                  </Button>
                )}
                {status === 'passed' && (
                  <Button size="lg" onClick={handleContinueToDashboard}>
                    Go to Dashboard
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
