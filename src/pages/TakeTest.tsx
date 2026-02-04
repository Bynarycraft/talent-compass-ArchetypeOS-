import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { toast } from '@/hooks/use-toast';
import { Hexagon, Clock, AlertTriangle, CheckCircle, ArrowLeft, ArrowRight } from 'lucide-react';
import { Test, TestResult, Question } from '@/lib/types';

export default function TakeTest() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, role } = useAuth();
  const [test, setTest] = useState<Test | null>(null);
  const [result, setResult] = useState<TestResult | null>(null);
  const [answers, setAnswers] = useState<Record<string, string | number>>({});
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (id && user) {
      fetchTestData();
    }
  }, [id, user]);

  // Timer effect
  useEffect(() => {
    if (timeRemaining === null || timeRemaining <= 0) return;

    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev === null || prev <= 0) {
          clearInterval(timer);
          handleSubmit(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeRemaining]);

  const fetchTestData = async () => {
    if (!id || !user) return;

    try {
      // Fetch test
      const { data: testData } = await supabase
        .from('tests')
        .select(`
          *,
          course:courses(title)
        `)
        .eq('id', id)
        .single();

      if (testData) {
        // Parse questions
        const rawQuestions = testData.questions;
        const parsedQuestions = Array.isArray(rawQuestions) 
          ? rawQuestions as unknown as Question[]
          : [];
        const parsedTest = {
          ...testData,
          questions: parsedQuestions,
        } as unknown as Test;
        setTest(parsedTest);

        // Check for existing in-progress result
        const { data: existingResult } = await supabase
          .from('test_results')
          .select('*')
          .eq('test_id', id)
          .eq('user_id', user.id)
          .in('status', ['pending', 'in_progress'])
          .order('created_at', { ascending: false })
          .limit(1);

        if (existingResult && existingResult.length > 0) {
          const resultData = existingResult[0] as TestResult;
          setResult(resultData);
          setAnswers(resultData.answers || {});

          // Calculate remaining time
          if (resultData.started_at) {
            const elapsed = Math.floor((Date.now() - new Date(resultData.started_at).getTime()) / 1000);
            const remaining = (parsedTest.time_limit_minutes * 60) - elapsed;
            setTimeRemaining(Math.max(0, remaining));
          }
        } else {
          // Create new result
          const { data: newResult, error } = await supabase
            .from('test_results')
            .insert({
              test_id: id,
              user_id: user.id,
              status: 'in_progress',
              started_at: new Date().toISOString(),
              attempt_number: 1,
              answers: {},
            })
            .select()
            .single();

          if (error) throw error;

          if (newResult) {
            setResult(newResult as TestResult);
            setTimeRemaining(parsedTest.time_limit_minutes * 60);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching test:', error);
      toast({
        title: 'Error',
        description: 'Failed to load the test',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerChange = async (questionId: string, value: string | number) => {
    const newAnswers = { ...answers, [questionId]: value };
    setAnswers(newAnswers);

    // Save progress
    if (result) {
      await supabase
        .from('test_results')
        .update({ answers: newAnswers })
        .eq('id', result.id);
    }
  };

  const handleSubmit = useCallback(async (isTimeout = false) => {
    if (!test || !result || submitting) return;

    setSubmitting(true);

    try {
      let totalScore = 0;
      let maxScore = 0;
      let needsReview = false;

      // Calculate score for MCQ questions
      test.questions.forEach((q: Question) => {
        maxScore += q.points;
        if (q.type === 'mcq' && q.correctAnswer !== undefined) {
          if (answers[q.id] === q.correctAnswer) {
            totalScore += q.points;
          }
        } else if (q.type === 'written' || q.type === 'coding') {
          needsReview = true;
        }
      });

      const percentScore = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;
      const status = needsReview 
        ? 'needs_review' 
        : percentScore >= test.passing_score 
          ? 'passed' 
          : 'failed';

      const { error } = await supabase
        .from('test_results')
        .update({
          answers,
          score: needsReview ? null : percentScore,
          status,
          submitted_at: new Date().toISOString(),
        })
        .eq('id', result.id);

      if (error) throw error;

      // If passed and user is candidate, promote to learner
      if (status === 'passed' && role === 'candidate') {
        await supabase.rpc('promote_to_learner', { _user_id: user?.id });
      }

      toast({
        title: isTimeout ? 'Time\'s up!' : 'Test submitted!',
        description: needsReview 
          ? 'Your test will be reviewed by a supervisor.'
          : `You scored ${percentScore}%. ${status === 'passed' ? 'Congratulations!' : 'Keep practicing!'}`,
      });

      // Navigate based on role
      if (role === 'candidate') {
        navigate('/candidate');
      } else {
        navigate('/tests');
      }
    } catch (error) {
      console.error('Error submitting test:', error);
      toast({
        title: 'Error',
        description: 'Failed to submit the test',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  }, [test, result, answers, submitting, role, user, navigate]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
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

  if (!test) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <h2 className="text-xl font-semibold">Test not found</h2>
          <Button onClick={() => navigate(-1)} className="mt-4">
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  const questions = test.questions as Question[];
  const currentQ = questions[currentQuestion];
  const progress = ((currentQuestion + 1) / questions.length) * 100;
  const answeredCount = Object.keys(answers).length;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-card/95 backdrop-blur">
        <div className="container flex items-center justify-between h-16 px-4">
          <div className="flex items-center gap-4">
            <Hexagon className="h-6 w-6 text-accent" />
            <div>
              <h1 className="font-semibold">{test.title}</h1>
              <p className="text-xs text-muted-foreground">
                Question {currentQuestion + 1} of {questions.length}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-6">
            {/* Timer */}
            <div className={`flex items-center gap-2 ${timeRemaining && timeRemaining < 300 ? 'text-destructive' : 'text-muted-foreground'}`}>
              <Clock className="h-4 w-4" />
              <span className="font-mono font-medium">
                {timeRemaining !== null ? formatTime(timeRemaining) : '--:--'}
              </span>
            </div>

            {/* Progress */}
            <div className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground">
              <span>{answeredCount}/{questions.length} answered</span>
            </div>
          </div>
        </div>
        <Progress value={progress} className="h-1" />
      </header>

      {/* Main Content */}
      <main className="container max-w-3xl py-8 px-4">
        <Card className="shadow-lg">
          <CardHeader>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
              <span className="px-2 py-1 rounded bg-secondary capitalize">{currentQ.type}</span>
              <span>{currentQ.points} {currentQ.points === 1 ? 'point' : 'points'}</span>
            </div>
            <CardTitle className="text-xl">{currentQ.question}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {currentQ.type === 'mcq' && currentQ.options && (
              <RadioGroup
                value={String(answers[currentQ.id] ?? '')}
                onValueChange={(value) => handleAnswerChange(currentQ.id, parseInt(value))}
              >
                {currentQ.options.map((option, index) => (
                  <div key={index} className="flex items-center space-x-3 p-4 rounded-lg border hover:bg-muted/50 transition-colors">
                    <RadioGroupItem value={String(index)} id={`option-${index}`} />
                    <Label htmlFor={`option-${index}`} className="flex-1 cursor-pointer">
                      {option}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            )}

            {(currentQ.type === 'written' || currentQ.type === 'coding') && (
              <Textarea
                placeholder={currentQ.type === 'coding' ? 'Enter your code here...' : 'Enter your answer here...'}
                value={String(answers[currentQ.id] ?? '')}
                onChange={(e) => handleAnswerChange(currentQ.id, e.target.value)}
                className="min-h-[200px] font-mono"
              />
            )}

            {/* Navigation */}
            <div className="flex items-center justify-between pt-4">
              <Button
                variant="outline"
                onClick={() => setCurrentQuestion(prev => Math.max(0, prev - 1))}
                disabled={currentQuestion === 0}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Previous
              </Button>

              {currentQuestion === questions.length - 1 ? (
                <Button
                  onClick={() => handleSubmit(false)}
                  disabled={submitting}
                  className="min-w-[120px]"
                >
                  {submitting ? (
                    'Submitting...'
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Submit
                    </>
                  )}
                </Button>
              ) : (
                <Button
                  onClick={() => setCurrentQuestion(prev => Math.min(questions.length - 1, prev + 1))}
                >
                  Next
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Question Navigator */}
        <div className="mt-6 p-4 rounded-lg border bg-card">
          <p className="text-sm font-medium mb-3">Questions</p>
          <div className="flex flex-wrap gap-2">
            {questions.map((q, index) => (
              <button
                key={q.id}
                onClick={() => setCurrentQuestion(index)}
                className={`w-10 h-10 rounded-lg border font-medium text-sm transition-colors
                  ${currentQuestion === index ? 'bg-primary text-primary-foreground border-primary' : ''}
                  ${answers[q.id] !== undefined ? 'bg-success/10 border-success text-success' : 'hover:bg-muted'}
                `}
              >
                {index + 1}
              </button>
            ))}
          </div>
        </div>

        {/* Warning */}
        {timeRemaining !== null && timeRemaining < 300 && (
          <div className="mt-4 p-4 rounded-lg bg-destructive/10 border border-destructive/20 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <p className="text-sm text-destructive">
              Less than 5 minutes remaining! Your test will be auto-submitted when time runs out.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
