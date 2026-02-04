import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Slider } from '@/components/ui/slider';
import { toast } from '@/hooks/use-toast';
import {
  ArrowLeft,
  BookOpen,
  Clock,
  Play,
  CheckCircle,
  ClipboardCheck,
  ExternalLink,
  FileText,
  Video,
} from 'lucide-react';
import { Course, CourseEnrollment, Test } from '@/lib/types';

export default function CourseDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [course, setCourse] = useState<Course | null>(null);
  const [enrollment, setEnrollment] = useState<CourseEnrollment | null>(null);
  const [tests, setTests] = useState<Test[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id && user) {
      fetchCourseData();
    }
  }, [id, user]);

  const fetchCourseData = async () => {
    if (!id || !user) return;

    try {
      // Fetch course
      const { data: courseData } = await supabase
        .from('courses')
        .select(`
          *,
          roadmap:roadmaps(*)
        `)
        .eq('id', id)
        .single();

      if (courseData) {
        setCourse(courseData as Course);
      }

      // Fetch enrollment
      const { data: enrollmentData } = await supabase
        .from('course_enrollments')
        .select('*')
        .eq('course_id', id)
        .eq('user_id', user.id)
        .single();

      if (enrollmentData) {
        setEnrollment(enrollmentData as CourseEnrollment);
      }

      // Fetch related tests
      const { data: testsData } = await supabase
        .from('tests')
        .select('*')
        .eq('course_id', id);

      if (testsData) {
        setTests(testsData as unknown as Test[]);
      }
    } catch (error) {
      console.error('Error fetching course data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEnroll = async () => {
    if (!user || !course) return;

    try {
      const { data, error } = await supabase
        .from('course_enrollments')
        .insert({
          user_id: user.id,
          course_id: course.id,
          status: 'enrolled',
          progress_percent: 0,
        })
        .select()
        .single();

      if (error) throw error;

      if (data) {
        setEnrollment(data as CourseEnrollment);
        toast({
          title: 'Enrolled successfully!',
          description: `You're now enrolled in ${course.title}`,
        });
      }
    } catch (error) {
      console.error('Error enrolling:', error);
      toast({
        title: 'Error',
        description: 'Failed to enroll in the course',
        variant: 'destructive',
      });
    }
  };

  const handleProgressUpdate = async (value: number[]) => {
    if (!enrollment || !user) return;

    const newProgress = value[0];
    const newStatus = newProgress >= 100 ? 'completed' : 'in_progress';

    try {
      const { error } = await supabase
        .from('course_enrollments')
        .update({
          progress_percent: newProgress,
          status: newStatus,
          completed_at: newProgress >= 100 ? new Date().toISOString() : null,
        })
        .eq('id', enrollment.id);

      if (error) throw error;

      setEnrollment(prev => prev ? {
        ...prev,
        progress_percent: newProgress,
        status: newStatus,
      } : null);

      if (newProgress >= 100) {
        toast({
          title: 'Course completed!',
          description: 'Congratulations on finishing the course.',
        });
      }
    } catch (error) {
      console.error('Error updating progress:', error);
    }
  };

  const getContentIcon = (type: string | null) => {
    switch (type) {
      case 'video': return <Video className="h-5 w-5" />;
      case 'pdf': return <FileText className="h-5 w-5" />;
      case 'link': return <ExternalLink className="h-5 w-5" />;
      default: return <BookOpen className="h-5 w-5" />;
    }
  };

  if (loading) {
    return (
      <MainLayout requiredRole="learner">
        <div className="space-y-6 animate-pulse">
          <div className="h-8 bg-muted rounded w-64" />
          <div className="h-64 bg-muted rounded" />
        </div>
      </MainLayout>
    );
  }

  if (!course) {
    return (
      <MainLayout requiredRole="learner">
        <div className="text-center py-12">
          <BookOpen className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-semibold">Course not found</h3>
          <Button asChild variant="link" className="mt-2">
            <Link to="/courses">Back to courses</Link>
          </Button>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout requiredRole="learner">
      <div className="space-y-6">
        {/* Back Button */}
        <Button variant="ghost" asChild className="gap-2">
          <Link to="/courses">
            <ArrowLeft className="h-4 w-4" />
            Back to Courses
          </Link>
        </Button>

        {/* Course Header */}
        <div className="flex flex-col md:flex-row gap-6">
          <div className="flex-1">
            <div className="flex items-start gap-4">
              <div className="p-4 rounded-xl bg-accent/10">
                {getContentIcon(course.content_type)}
              </div>
              <div className="flex-1">
                <h1 className="text-3xl font-bold tracking-tight">{course.title}</h1>
                <p className="text-muted-foreground mt-2">{course.description}</p>
                <div className="flex flex-wrap items-center gap-3 mt-4">
                  <Badge variant="outline" className="capitalize">
                    {course.difficulty}
                  </Badge>
                  <span className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    {course.duration_minutes} min
                  </span>
                  {course.roadmap && (
                    <Badge variant="secondary">
                      {(course.roadmap as any).name}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Enrollment Status */}
          <Card className="w-full md:w-80">
            <CardHeader>
              <CardTitle className="text-lg">
                {enrollment ? 'Your Progress' : 'Get Started'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {enrollment ? (
                <>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Progress</span>
                      <span className="font-medium">{enrollment.progress_percent}%</span>
                    </div>
                    <Slider
                      value={[enrollment.progress_percent]}
                      max={100}
                      step={5}
                      onValueCommit={handleProgressUpdate}
                    />
                  </div>
                  {enrollment.status === 'completed' && (
                    <div className="flex items-center gap-2 text-success">
                      <CheckCircle className="h-4 w-4" />
                      <span className="text-sm font-medium">Completed</span>
                    </div>
                  )}
                  {course.content_url && (
                    <Button asChild className="w-full">
                      <a href={course.content_url} target="_blank" rel="noopener noreferrer">
                        <Play className="h-4 w-4 mr-2" />
                        Open Content
                      </a>
                    </Button>
                  )}
                </>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground">
                    Enroll to start learning and track your progress.
                  </p>
                  <Button className="w-full" onClick={handleEnroll}>
                    <BookOpen className="h-4 w-4 mr-2" />
                    Enroll Now
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Related Tests */}
        {tests.length > 0 && enrollment && (
          <Card>
            <CardHeader>
              <CardTitle className="text-xl flex items-center gap-2">
                <ClipboardCheck className="h-5 w-5" />
                Assessments
              </CardTitle>
              <CardDescription>
                Complete these tests to validate your knowledge
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {tests.map(test => (
                  <div
                    key={test.id}
                    className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <ClipboardCheck className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h4 className="font-medium">{test.title}</h4>
                        <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                          <span>{test.time_limit_minutes} min</span>
                          <span>Pass: {test.passing_score}%</span>
                          <Badge variant="outline" className="capitalize">{test.type}</Badge>
                        </div>
                      </div>
                    </div>
                    <Button asChild>
                      <Link to={`/tests/${test.id}/take`}>
                        Take Test
                      </Link>
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  );
}
