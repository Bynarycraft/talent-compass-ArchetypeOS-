import { useEffect, useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { Clock, Play, Square, Timer, BookOpen, Smile, Meh, Frown, ThumbsUp, AlertCircle } from 'lucide-react';
import { LearningSession, Reflection, Course } from '@/lib/types';

const TARGET_HOURS = 6;
const TARGET_MINUTES = TARGET_HOURS * 60;

export default function LearningTracker() {
  const { user } = useAuth();
  const [activeSession, setActiveSession] = useState<LearningSession | null>(null);
  const [todayMinutes, setTodayMinutes] = useState(0);
  const [weeklyMinutes, setWeeklyMinutes] = useState(0);
  const [recentSessions, setRecentSessions] = useState<LearningSession[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<string | null>(null);
  const [showReflectionModal, setShowReflectionModal] = useState(false);
  const [reflectionText, setReflectionText] = useState('');
  const [reflectionMood, setReflectionMood] = useState<string>('good');
  const [loading, setLoading] = useState(true);
  const [elapsedTime, setElapsedTime] = useState(0);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  // Timer for active session
  useEffect(() => {
    if (!activeSession) {
      setElapsedTime(0);
      return;
    }

    const startTime = new Date(activeSession.start_time).getTime();
    
    const updateElapsed = () => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      setElapsedTime(elapsed);
    };

    updateElapsed();
    const timer = setInterval(updateElapsed, 1000);

    return () => clearInterval(timer);
  }, [activeSession]);

  const fetchData = async () => {
    if (!user) return;

    try {
      // Fetch all sessions
      const { data: sessions } = await supabase
        .from('learning_sessions')
        .select(`
          *,
          course:courses(title)
        `)
        .eq('user_id', user.id)
        .order('start_time', { ascending: false });

      if (sessions) {
        // Find active session
        const active = sessions.find(s => !s.end_time);
        if (active) {
          setActiveSession(active as LearningSession);
        }

        // Calculate today's minutes
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayTotal = sessions
          .filter(s => new Date(s.start_time) >= today && s.duration_minutes)
          .reduce((sum, s) => sum + (s.duration_minutes || 0), 0);
        setTodayMinutes(todayTotal);

        // Calculate weekly minutes
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        const weeklyTotal = sessions
          .filter(s => new Date(s.start_time) >= weekAgo && s.duration_minutes)
          .reduce((sum, s) => sum + (s.duration_minutes || 0), 0);
        setWeeklyMinutes(weeklyTotal);

        // Recent sessions (completed only)
        setRecentSessions(sessions.filter(s => s.end_time).slice(0, 10) as LearningSession[]);
      }

      // Fetch enrolled courses
      const { data: enrollments } = await supabase
        .from('course_enrollments')
        .select(`
          course:courses(*)
        `)
        .eq('user_id', user.id);

      if (enrollments) {
        const enrolledCourses = enrollments
          .map(e => e.course)
          .filter(c => c !== null) as Course[];
        setCourses(enrolledCourses);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClockIn = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('learning_sessions')
        .insert({
          user_id: user.id,
          course_id: selectedCourse,
          start_time: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      if (data) {
        setActiveSession(data as LearningSession);
        toast({
          title: 'Session started!',
          description: 'Your learning session has begun. Happy learning!',
        });
      }
    } catch (error) {
      console.error('Error starting session:', error);
      toast({
        title: 'Error',
        description: 'Failed to start learning session',
        variant: 'destructive',
      });
    }
  };

  const handleClockOut = async () => {
    if (!activeSession) return;

    setShowReflectionModal(true);
  };

  const handleSubmitReflection = async () => {
    if (!activeSession || !user) return;

    try {
      const endTime = new Date();
      const startTime = new Date(activeSession.start_time);
      const durationMinutes = Math.floor((endTime.getTime() - startTime.getTime()) / 60000);

      // Update session
      const { error: sessionError } = await supabase
        .from('learning_sessions')
        .update({
          end_time: endTime.toISOString(),
          duration_minutes: durationMinutes,
        })
        .eq('id', activeSession.id);

      if (sessionError) throw sessionError;

      // Create reflection
      if (reflectionText.trim()) {
        const { error: reflectionError } = await supabase
          .from('reflections')
          .insert({
            user_id: user.id,
            session_id: activeSession.id,
            course_id: activeSession.course_id,
            content: reflectionText,
            mood: reflectionMood as any,
          });

        if (reflectionError) throw reflectionError;
      }

      setActiveSession(null);
      setShowReflectionModal(false);
      setReflectionText('');
      setReflectionMood('good');
      
      toast({
        title: 'Session completed!',
        description: `You learned for ${formatDuration(durationMinutes)}. Great work!`,
      });

      // Refresh data
      fetchData();
    } catch (error) {
      console.error('Error ending session:', error);
      toast({
        title: 'Error',
        description: 'Failed to end session',
        variant: 'destructive',
      });
    }
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  const formatElapsed = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const progressPercent = Math.min(100, (todayMinutes / TARGET_MINUTES) * 100);

  return (
    <MainLayout requiredRole="learner">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Learning Tracker</h1>
          <p className="text-muted-foreground mt-1">
            Track your learning sessions and daily progress
          </p>
        </div>

        {/* Timer Card */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Timer className="h-5 w-5 text-accent" />
              Learning Session
            </CardTitle>
            <CardDescription>
              {activeSession ? 'Session in progress' : 'Start a new learning session'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {activeSession ? (
              <div className="text-center space-y-6">
                <div className="text-6xl font-mono font-bold text-accent">
                  {formatElapsed(elapsedTime)}
                </div>
                {activeSession.course && (
                  <p className="text-muted-foreground">
                    Working on: {(activeSession.course as any)?.title || 'General study'}
                  </p>
                )}
                <Button
                  size="lg"
                  variant="destructive"
                  onClick={handleClockOut}
                  className="gap-2"
                >
                  <Square className="h-5 w-5" />
                  Clock Out
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <Label>What are you learning? (Optional)</Label>
                  <RadioGroup
                    value={selectedCourse || ''}
                    onValueChange={setSelectedCourse}
                    className="mt-2 grid gap-2"
                  >
                    <div className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-muted/50">
                      <RadioGroupItem value="" id="general" />
                      <Label htmlFor="general" className="flex-1 cursor-pointer">
                        General study
                      </Label>
                    </div>
                    {courses.map(course => (
                      <div key={course.id} className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-muted/50">
                        <RadioGroupItem value={course.id} id={course.id} />
                        <Label htmlFor={course.id} className="flex-1 cursor-pointer">
                          {course.title}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>
                <Button size="lg" onClick={handleClockIn} className="w-full gap-2">
                  <Play className="h-5 w-5" />
                  Clock In
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Progress Cards */}
        <div className="grid gap-4 md:grid-cols-2">
          {/* Today's Progress */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Today's Progress</CardTitle>
              <CardDescription>Target: {TARGET_HOURS} hours</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center">
                <div className="text-4xl font-bold">{formatDuration(todayMinutes)}</div>
                <p className="text-sm text-muted-foreground">of {TARGET_HOURS}h goal</p>
              </div>
              <Progress value={progressPercent} className="h-3" />
              {progressPercent >= 100 ? (
                <div className="flex items-center justify-center gap-2 text-success">
                  <ThumbsUp className="h-4 w-4" />
                  <span className="text-sm font-medium">Daily goal achieved!</span>
                </div>
              ) : (
                <p className="text-center text-sm text-muted-foreground">
                  {formatDuration(TARGET_MINUTES - todayMinutes)} remaining
                </p>
              )}
            </CardContent>
          </Card>

          {/* Weekly Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Weekly Summary</CardTitle>
              <CardDescription>Last 7 days</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center">
                <div className="text-4xl font-bold">{formatDuration(weeklyMinutes)}</div>
                <p className="text-sm text-muted-foreground">total learning time</p>
              </div>
              <div className="flex justify-center gap-4 text-sm text-muted-foreground">
                <div className="text-center">
                  <div className="font-medium text-foreground">{recentSessions.length}</div>
                  <div>sessions</div>
                </div>
                <div className="text-center">
                  <div className="font-medium text-foreground">
                    {recentSessions.length > 0 ? Math.round(weeklyMinutes / recentSessions.length) : 0}m
                  </div>
                  <div>avg/session</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Sessions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recent Sessions</CardTitle>
            <CardDescription>Your learning history</CardDescription>
          </CardHeader>
          <CardContent>
            {recentSessions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Clock className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No sessions recorded yet</p>
                <p className="text-sm">Start your first session above!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentSessions.map(session => (
                  <div
                    key={session.id}
                    className="flex items-center justify-between p-3 rounded-lg border bg-card"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-accent/10">
                        <BookOpen className="h-4 w-4 text-accent" />
                      </div>
                      <div>
                        <p className="font-medium">
                          {(session.course as any)?.title || 'General study'}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(session.start_time).toLocaleDateString('en-US', {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">{formatDuration(session.duration_minutes || 0)}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Reflection Modal */}
      <Dialog open={showReflectionModal} onOpenChange={setShowReflectionModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Session Reflection</DialogTitle>
            <DialogDescription>
              How did your learning session go? (Optional but encouraged)
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>How are you feeling?</Label>
              <div className="flex gap-4 mt-2">
                {[
                  { value: 'great', icon: Smile, label: 'Great' },
                  { value: 'good', icon: ThumbsUp, label: 'Good' },
                  { value: 'neutral', icon: Meh, label: 'Neutral' },
                  { value: 'challenging', icon: AlertCircle, label: 'Challenging' },
                  { value: 'difficult', icon: Frown, label: 'Difficult' },
                ].map(({ value, icon: Icon, label }) => (
                  <button
                    key={value}
                    onClick={() => setReflectionMood(value)}
                    className={`flex flex-col items-center gap-1 p-2 rounded-lg border transition-colors
                      ${reflectionMood === value ? 'border-accent bg-accent/10' : 'hover:bg-muted'}
                    `}
                  >
                    <Icon className={`h-6 w-6 ${reflectionMood === value ? 'text-accent' : ''}`} />
                    <span className="text-xs">{label}</span>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label>Reflection notes</Label>
              <Textarea
                placeholder="What did you learn? What challenges did you face?"
                value={reflectionText}
                onChange={(e) => setReflectionText(e.target.value)}
                className="mt-2"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => handleSubmitReflection()}>
              Skip
            </Button>
            <Button onClick={handleSubmitReflection}>
              Save & End Session
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
