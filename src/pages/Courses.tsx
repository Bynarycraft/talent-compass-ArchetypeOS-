import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BookOpen, Clock, Play, Search, Filter, CheckCircle } from 'lucide-react';
import { Course, CourseEnrollment } from '@/lib/types';

export default function Courses() {
  const { user } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [enrollments, setEnrollments] = useState<Map<string, CourseEnrollment>>(new Map());
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [difficulty, setDifficulty] = useState<string>('all');

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    try {
      // Fetch all courses
      const { data: coursesData } = await supabase
        .from('courses')
        .select(`
          *,
          roadmap:roadmaps(*)
        `)
        .order('created_at', { ascending: false });

      if (coursesData) {
        setCourses(coursesData as Course[]);
      }

      // Fetch user's enrollments
      if (user) {
        const { data: enrollmentsData } = await supabase
          .from('course_enrollments')
          .select('*')
          .eq('user_id', user.id);

        if (enrollmentsData) {
          const enrollmentMap = new Map<string, CourseEnrollment>();
          enrollmentsData.forEach(e => {
            enrollmentMap.set(e.course_id, e as CourseEnrollment);
          });
          setEnrollments(enrollmentMap);
        }
      }
    } catch (error) {
      console.error('Error fetching courses:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEnroll = async (courseId: string) => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('course_enrollments')
        .insert({
          user_id: user.id,
          course_id: courseId,
          status: 'enrolled',
          progress_percent: 0,
        })
        .select()
        .single();

      if (error) throw error;

      if (data) {
        setEnrollments(prev => {
          const updated = new Map(prev);
          updated.set(courseId, data as CourseEnrollment);
          return updated;
        });
      }
    } catch (error) {
      console.error('Error enrolling in course:', error);
    }
  };

  const filteredCourses = courses.filter(course => {
    const matchesSearch = course.title.toLowerCase().includes(search.toLowerCase()) ||
      (course.description?.toLowerCase().includes(search.toLowerCase()) ?? false);
    const matchesDifficulty = difficulty === 'all' || course.difficulty === difficulty;
    return matchesSearch && matchesDifficulty;
  });

  const getDifficultyColor = (diff: string) => {
    switch (diff) {
      case 'beginner': return 'bg-success/10 text-success border-success/20';
      case 'intermediate': return 'bg-warning/10 text-warning border-warning/20';
      case 'advanced': return 'bg-destructive/10 text-destructive border-destructive/20';
      default: return '';
    }
  };

  return (
    <MainLayout requiredRole="learner">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Courses</h1>
          <p className="text-muted-foreground mt-1">
            Browse and enroll in courses to build your skills
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search courses..."
              className="pl-10"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={difficulty} onValueChange={setDifficulty}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Difficulty" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Levels</SelectItem>
              <SelectItem value="beginner">Beginner</SelectItem>
              <SelectItem value="intermediate">Intermediate</SelectItem>
              <SelectItem value="advanced">Advanced</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Courses Grid */}
        {loading ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map(i => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="h-6 bg-muted rounded w-3/4" />
                  <div className="h-4 bg-muted rounded w-1/2 mt-2" />
                </CardHeader>
                <CardContent>
                  <div className="h-20 bg-muted rounded" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredCourses.length === 0 ? (
          <div className="text-center py-12">
            <BookOpen className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-semibold">No courses found</h3>
            <p className="text-muted-foreground">
              {search || difficulty !== 'all' ? 'Try adjusting your filters' : 'Courses will appear here once added'}
            </p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredCourses.map(course => {
              const enrollment = enrollments.get(course.id);
              const isEnrolled = !!enrollment;
              const isCompleted = enrollment?.status === 'completed';

              return (
                <Card key={course.id} className="flex flex-col hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-lg line-clamp-2">{course.title}</CardTitle>
                      {isCompleted && (
                        <CheckCircle className="h-5 w-5 text-success shrink-0" />
                      )}
                    </div>
                    <CardDescription className="line-clamp-2">
                      {course.description || 'No description available'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex-1">
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      <Badge variant="outline" className={getDifficultyColor(course.difficulty)}>
                        {course.difficulty}
                      </Badge>
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <Clock className="h-3.5 w-3.5" />
                        {course.duration_minutes} min
                      </span>
                      {course.content_type && (
                        <Badge variant="secondary" className="capitalize">
                          {course.content_type}
                        </Badge>
                      )}
                    </div>

                    {isEnrolled && enrollment && (
                      <div className="mt-4 space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Progress</span>
                          <span className="font-medium">{enrollment.progress_percent}%</span>
                        </div>
                        <Progress value={enrollment.progress_percent} className="h-2" />
                      </div>
                    )}
                  </CardContent>
                  <CardFooter>
                    {isEnrolled ? (
                      <Button asChild className="w-full" variant={isCompleted ? 'secondary' : 'default'}>
                        <Link to={`/courses/${course.id}`}>
                          <Play className="h-4 w-4 mr-2" />
                          {isCompleted ? 'Review' : 'Continue'}
                        </Link>
                      </Button>
                    ) : (
                      <Button className="w-full" onClick={() => handleEnroll(course.id)}>
                        <BookOpen className="h-4 w-4 mr-2" />
                        Enroll
                      </Button>
                    )}
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
