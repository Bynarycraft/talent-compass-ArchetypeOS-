import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Map, BookOpen, ArrowRight, Layers } from 'lucide-react';
import { Roadmap, Course } from '@/lib/types';

interface RoadmapWithCourses extends Roadmap {
  courses: Course[];
}

export default function Roadmaps() {
  const [roadmaps, setRoadmaps] = useState<RoadmapWithCourses[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRoadmaps();
  }, []);

  const fetchRoadmaps = async () => {
    try {
      const { data: roadmapsData } = await supabase
        .from('roadmaps')
        .select('*')
        .order('created_at', { ascending: false });

      if (roadmapsData) {
        // Fetch courses for each roadmap
        const roadmapsWithCourses = await Promise.all(
          roadmapsData.map(async (roadmap) => {
            const { data: courses } = await supabase
              .from('courses')
              .select('*')
              .eq('roadmap_id', roadmap.id)
              .order('created_at', { ascending: true });

            return {
              ...roadmap,
              courses: (courses || []) as Course[],
            } as RoadmapWithCourses;
          })
        );

        setRoadmaps(roadmapsWithCourses);
      }
    } catch (error) {
      console.error('Error fetching roadmaps:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <MainLayout requiredRole="learner">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Learning Roadmaps</h1>
          <p className="text-muted-foreground mt-1">
            Follow structured learning paths based on your archetype
          </p>
        </div>

        {/* Roadmaps Grid */}
        {loading ? (
          <div className="grid gap-6 md:grid-cols-2">
            {[1, 2].map(i => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="h-6 bg-muted rounded w-3/4" />
                  <div className="h-4 bg-muted rounded w-1/2 mt-2" />
                </CardHeader>
                <CardContent>
                  <div className="h-32 bg-muted rounded" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : roadmaps.length === 0 ? (
          <div className="text-center py-12">
            <Map className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-semibold">No roadmaps available</h3>
            <p className="text-muted-foreground">
              Learning roadmaps will appear here once created
            </p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {roadmaps.map(roadmap => (
              <Card key={roadmap.id} className="flex flex-col hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <div className="p-3 rounded-lg bg-accent/10">
                      <Layers className="h-6 w-6 text-accent" />
                    </div>
                    <Badge variant="outline">{roadmap.archetype}</Badge>
                  </div>
                  <CardTitle className="text-xl mt-2">{roadmap.name}</CardTitle>
                  <CardDescription>
                    {roadmap.description || 'A structured learning path'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-1">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        {roadmap.courses.length} {roadmap.courses.length === 1 ? 'course' : 'courses'}
                      </span>
                    </div>

                    {roadmap.courses.length > 0 ? (
                      <div className="space-y-2">
                        {roadmap.courses.slice(0, 3).map((course, index) => (
                          <div
                            key={course.id}
                            className="flex items-center gap-3 p-2 rounded-lg bg-muted/50"
                          >
                            <span className="text-xs font-medium text-muted-foreground w-5">
                              {index + 1}.
                            </span>
                            <BookOpen className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm truncate flex-1">{course.title}</span>
                            <Badge variant="outline" className="text-xs capitalize">
                              {course.difficulty}
                            </Badge>
                          </div>
                        ))}
                        {roadmap.courses.length > 3 && (
                          <p className="text-xs text-muted-foreground text-center">
                            +{roadmap.courses.length - 3} more courses
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        No courses in this roadmap yet
                      </p>
                    )}
                  </div>
                </CardContent>
                <div className="p-6 pt-0">
                  <Button asChild className="w-full">
                    <Link to={`/courses?roadmap=${roadmap.id}`}>
                      Explore Roadmap
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Link>
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
