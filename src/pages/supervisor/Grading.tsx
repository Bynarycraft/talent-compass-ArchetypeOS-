import { useEffect, useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { ClipboardCheck, Clock, Search, Eye, CheckCircle, XCircle, User } from 'lucide-react';
import { TestResult, Test, Profile, Question } from '@/lib/types';

interface ResultWithDetails extends TestResult {
  test: Test;
  user: Profile;
}

export default function SupervisorGrading() {
  const { user } = useAuth();
  const [results, setResults] = useState<ResultWithDetails[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedResult, setSelectedResult] = useState<ResultWithDetails | null>(null);
  const [feedback, setFeedback] = useState('');
  const [score, setScore] = useState('');
  const [grading, setGrading] = useState(false);

  useEffect(() => {
    if (user) {
      fetchPendingResults();
    }
  }, [user]);

  const fetchPendingResults = async () => {
    if (!user) return;

    try {
      // Get learners assigned to this supervisor
      const { data: learners } = await supabase
        .from('profiles')
        .select('id')
        .eq('supervisor_id', user.id);

      if (!learners || learners.length === 0) {
        setLoading(false);
        return;
      }

      const learnerIds = learners.map(l => l.id);

      // Fetch pending results from assigned learners
      const { data: resultsData } = await supabase
        .from('test_results')
        .select(`
          *,
          test:tests(*),
          user:profiles!test_results_user_id_fkey(*)
        `)
        .in('user_id', learnerIds)
        .in('status', ['needs_review', 'submitted'])
        .order('submitted_at', { ascending: true });

      if (resultsData) {
        setResults(resultsData as unknown as ResultWithDetails[]);
      }
    } catch (error) {
      console.error('Error fetching results:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGrade = async (passed: boolean) => {
    if (!selectedResult || !user) return;

    const numScore = parseInt(score);
    if (isNaN(numScore) || numScore < 0 || numScore > 100) {
      toast({
        title: 'Invalid score',
        description: 'Please enter a valid score between 0 and 100',
        variant: 'destructive',
      });
      return;
    }

    setGrading(true);

    try {
      const status = passed ? 'passed' : 'failed';

      const { error } = await supabase
        .from('test_results')
        .update({
          score: numScore,
          status,
          feedback,
          graded_by: user.id,
        })
        .eq('id', selectedResult.id);

      if (error) throw error;

      // If passed and user is candidate, promote to learner
      if (passed) {
        const { data: userRoles } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', selectedResult.user_id);

        if (userRoles?.some(r => r.role === 'candidate')) {
          await supabase.rpc('promote_to_learner', { _user_id: selectedResult.user_id });
        }
      }

      toast({
        title: 'Grading complete',
        description: `Test marked as ${status}`,
      });

      setSelectedResult(null);
      setFeedback('');
      setScore('');
      fetchPendingResults();
    } catch (error) {
      console.error('Error grading test:', error);
      toast({
        title: 'Error',
        description: 'Failed to submit grade',
        variant: 'destructive',
      });
    } finally {
      setGrading(false);
    }
  };

  const filteredResults = results.filter(result =>
    result.user?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    result.user?.email.toLowerCase().includes(search.toLowerCase()) ||
    result.test?.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <MainLayout requiredRole="supervisor">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Grading Queue</h1>
            <p className="text-muted-foreground mt-1">
              Review and grade tests submitted by your learners
            </p>
          </div>
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search..."
              className="pl-10"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Pending count */}
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-warning/10">
                <ClipboardCheck className="h-6 w-6 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold">{results.length}</p>
                <p className="text-sm text-muted-foreground">Tests awaiting review</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Results List */}
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
        ) : filteredResults.length === 0 ? (
          <div className="text-center py-12">
            <ClipboardCheck className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-semibold">No tests to grade</h3>
            <p className="text-muted-foreground">
              {search ? 'No results match your search' : 'All caught up! Check back later.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredResults.map(result => (
              <Card key={result.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="p-3 rounded-lg bg-primary/10">
                        <ClipboardCheck className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold">{result.test?.title}</h3>
                        <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                          <User className="h-3.5 w-3.5" />
                          <span>{result.user?.full_name || result.user?.email}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-sm text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {result.submitted_at && new Date(result.submitted_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit',
                        })}
                      </div>
                      <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20">
                        Needs Review
                      </Badge>
                      <Button onClick={() => {
                        setSelectedResult(result);
                        setScore('');
                        setFeedback('');
                      }}>
                        <Eye className="h-4 w-4 mr-2" />
                        Review
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Grading Modal */}
      <Dialog open={!!selectedResult} onOpenChange={() => setSelectedResult(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Review Submission</DialogTitle>
            <DialogDescription>
              {selectedResult?.test?.title} - {selectedResult?.user?.full_name || selectedResult?.user?.email}
            </DialogDescription>
          </DialogHeader>

          {selectedResult && (
            <div className="space-y-6 py-4">
              {/* Answers */}
              <div className="space-y-4">
                <h4 className="font-medium">Submitted Answers</h4>
                {(selectedResult.test?.questions as Question[])?.map((question, index) => (
                  <div key={question.id} className="p-4 rounded-lg border bg-muted/30">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                      <Badge variant="outline" className="capitalize">{question.type}</Badge>
                      <span>{question.points} pts</span>
                    </div>
                    <p className="font-medium mb-3">{index + 1}. {question.question}</p>
                    <div className="pl-4">
                      {question.type === 'mcq' && question.options ? (
                        <div className="space-y-1">
                          {question.options.map((opt, optIndex) => {
                            const isSelected = selectedResult.answers[question.id] === optIndex;
                            const isCorrect = question.correctAnswer === optIndex;
                            return (
                              <div
                                key={optIndex}
                                className={`p-2 rounded text-sm ${
                                  isSelected
                                    ? isCorrect
                                      ? 'bg-success/10 border border-success'
                                      : 'bg-destructive/10 border border-destructive'
                                    : isCorrect
                                      ? 'bg-success/5 border border-success/30'
                                      : ''
                                }`}
                              >
                                {opt}
                                {isSelected && (
                                  <span className="ml-2 text-xs">
                                    {isCorrect ? '✓ Correct' : '✗ Selected'}
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="p-3 rounded bg-card border">
                          <p className="text-sm whitespace-pre-wrap">
                            {String(selectedResult.answers[question.id] || 'No answer provided')}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Grading Form */}
              <div className="space-y-4 pt-4 border-t">
                <div>
                  <label className="text-sm font-medium">Score (0-100)</label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={score}
                    onChange={(e) => setScore(e.target.value)}
                    placeholder="Enter score"
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Feedback (optional)</label>
                  <Textarea
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    placeholder="Provide feedback for the learner..."
                    className="mt-1"
                  />
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setSelectedResult(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => handleGrade(false)}
              disabled={grading || !score}
            >
              <XCircle className="h-4 w-4 mr-2" />
              Mark Failed
            </Button>
            <Button
              onClick={() => handleGrade(true)}
              disabled={grading || !score}
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Mark Passed
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
