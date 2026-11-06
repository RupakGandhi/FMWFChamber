import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { trpc } from "@/lib/trpc";
import { useParams, useLocation, Link } from "wouter";
import { ArrowLeft, Send, Loader2, Star, FileText, CheckCircle, Clock, Lock } from "lucide-react";
import { toast } from "sonner";
import { ScoringCriteria } from "../../../../drizzle/schema";
import AnswerValue from "@/components/AnswerValue";
import { answerEntries } from "@shared/formLogic";
import { minScoreOf, ratedCriteria, ratingOptions, resolveCriteria } from "@shared/reviewRubric";

export default function ReviewerApplication() {
  const { token, applicationId } = useParams<{ token: string; applicationId: string }>();
  const [, setLocation] = useLocation();
  const appId = parseInt(applicationId || '0');

  const { data, isLoading, error } = trpc.reviewer.getApplication.useQuery({ 
    token: token || '', 
    applicationId: appId 
  });

  const [scores, setScores] = useState<Record<string, number>>({});
  const [comments, setComments] = useState<Record<string, string>>({});
  const [overallComments, setOverallComments] = useState('');

  const submitMutation = trpc.reviewer.submitScore.useMutation({
    onSuccess: () => {
      toast.success('Review submitted successfully!');
      setLocation(`/review/${token}`);
    },
    onError: (error) => {
      toast.error(error.message);
    }
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Error Loading Application</CardTitle>
            <CardDescription>
              Unable to load this application. Please try again or contact the administrator.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href={`/review/${token}`}>
              <Button>Back to Portal</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { application, program, existingScore } = data;
  const criteria = resolveCriteria(program, application);
  const rated = ratedCriteria(criteria);
  const ratingDropdown = program?.scoringConfig?.ratingDropdown;
  
  // Check review settings - only enforce when toggles are enabled
  const settings = program?.settings as any;
  const reviewDeadlineEnabled = settings?.reviewDeadlineEnabled || false;
  const scoreEditingEnabled = settings?.scoreEditingEnabled || false;
  const mandatoryCommentsEnabled = settings?.mandatoryCommentsEnabled || false;
  const reviewDeadline = reviewDeadlineEnabled ? settings?.reviewDeadline : null;
  const isDeadlinePassed = reviewDeadline ? new Date() > new Date(reviewDeadline) : false;
  const minScoreForComment = mandatoryCommentsEnabled ? (settings?.minScoreForComment || 0) : 0;
  const canEdit = scoreEditingEnabled || !existingScore; // Can always submit first time; editing requires toggle
  const formData = application.formData as Record<string, unknown> || {};

  // Initialize scores from existing score if available
  if (existingScore && Object.keys(scores).length === 0) {
    const existingScores: Record<string, number> = {};
    const existingComments: Record<string, string> = {};
    (existingScore.criteriaScores as Array<{ criteriaId: string; score: number; comment?: string }>)?.forEach(cs => {
      existingScores[cs.criteriaId] = cs.score;
      if (cs.comment) existingComments[cs.criteriaId] = cs.comment;
    });
    existingScore.questionComments?.forEach(item => {
      existingComments[item.criteriaId] = item.comment;
    });
    if (Object.keys(existingScores).length > 0) {
      setScores(existingScores);
      setComments(existingComments);
      if (existingScore.comments) setOverallComments(existingScore.comments);
    }
  }

  const handleScoreChange = (criteriaId: string, value: number) => {
    setScores(prev => ({ ...prev, [criteriaId]: value }));
  };

  const handleCommentChange = (criteriaId: string, value: string) => {
    setComments(prev => ({ ...prev, [criteriaId]: value }));
  };

  const calculateTotal = () => {
    return Object.values(scores).reduce((sum, score) => sum + score, 0);
  };

  const calculateMaxTotal = () => {
    return rated.reduce((sum: number, c: ScoringCriteria) => sum + c.maxScore, 0);
  };

  const handleSubmit = () => {
    if (isDeadlinePassed) {
      toast.error('Review deadline has passed. Scores are now locked.');
      return;
    }
    if (!canEdit) {
      toast.error('Score editing is not enabled for this program. You have already submitted your review.');
      return;
    }
    // Validate all criteria have scores
    for (const criterion of rated) {
      if (scores[criterion.id] === undefined) {
        toast.error(`Please score: ${criterion.name}`);
        return;
      }
      // Enforce mandatory comment for low scores
      if (minScoreForComment > 0 && scores[criterion.id] < minScoreForComment && !comments[criterion.id]?.trim()) {
        toast.error(`A comment is required for "${criterion.name}" when scoring below ${minScoreForComment}`);
        return;
      }
      if (criterion.commentRequired && !comments[criterion.id]?.trim()) {
        toast.error(`A comment is required for "${criterion.name}"`);
        return;
      }
    }

    const criteriaScores = rated.map((c: ScoringCriteria) => ({
      criteriaId: c.id,
      score: scores[c.id] ?? minScoreOf(c),
      comment: comments[c.id],
    }));

    submitMutation.mutate({
      token: token || '',
      applicationId: appId,
      criteriaScores,
      questionComments: criteria
        .filter((c: ScoringCriteria) => c.commentOnly && comments[c.id]?.trim())
        .map((c: ScoringCriteria) => ({ criteriaId: c.id, comment: comments[c.id] })),
      comments: overallComments,
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 to-white">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href={`/review/${token}`}>
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </Link>
              <div>
                <h1 className="text-xl font-bold">Review Application</h1>
                <p className="text-sm text-muted-foreground">{program?.name}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Current Score</p>
                <p className="text-xl font-bold">{calculateTotal()} / {calculateMaxTotal()}</p>
              </div>
              <Button onClick={handleSubmit} disabled={submitMutation.isPending || isDeadlinePassed || !canEdit}>
                {submitMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Submit Review
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container py-8">
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Application Content */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Application #{application.applicationNumber}
                </CardTitle>
                <CardDescription>
                  {application.applicantName}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {answerEntries(program?.formConfig?.fields, formData).map(({ id: key, label, value }) => (
                    <div key={key} className="border-b pb-4 last:border-0">
                      <h4 className="font-medium text-sm text-muted-foreground mb-2">
                        {label}
                      </h4>
                      <p className="whitespace-pre-wrap">
                        <AnswerValue fields={program?.formConfig?.fields} fieldId={key} value={value} reviewerToken={token} />
                      </p>
                    </div>
                  ))}
                  {Object.keys(formData).length === 0 && (
                    <p className="text-muted-foreground text-center py-4">No form data available</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Scoring Panel */}
          <div className="space-y-6">
            {isDeadlinePassed && (
              <Card className="bg-red-50 border-red-200">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 text-red-700">
                    <Lock className="h-5 w-5" />
                    <span className="font-medium">Review deadline has passed ({new Date(reviewDeadline).toLocaleDateString()}). Scores are locked.</span>
                  </div>
                </CardContent>
              </Card>
            )}

            {reviewDeadline && !isDeadlinePassed && (
              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 text-blue-700">
                    <Clock className="h-5 w-5" />
                    <span className="font-medium">Review deadline: {new Date(reviewDeadline).toLocaleDateString()}. You can edit your scores until then.</span>
                  </div>
                </CardContent>
              </Card>
            )}

            {existingScore && !isDeadlinePassed && canEdit && (
              <Card className="bg-yellow-50 border-yellow-200">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 text-yellow-700">
                    <CheckCircle className="h-5 w-5" />
                    <span className="font-medium">You have already reviewed this application. Submitting will update your previous score.</span>
                  </div>
                </CardContent>
              </Card>
            )}

            {existingScore && !canEdit && !isDeadlinePassed && (
              <Card className="bg-gray-50 border-gray-200">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 text-gray-700">
                    <Lock className="h-5 w-5" />
                    <span className="font-medium">You have already submitted your review. Score editing is not enabled for this program.</span>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Star className="h-5 w-5" />
                  Scoring Criteria
                </CardTitle>
                <CardDescription>
                  Rate each criterion
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-8">
                {criteria.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">
                    No scoring criteria configured for this program.
                  </p>
                ) : (
                  criteria.map((criterion: ScoringCriteria) => criterion.commentOnly ? (
                    <div key={criterion.id} className="space-y-2">
                      <Label className="text-base font-semibold">{criterion.name}</Label>
                      {criterion.description && (
                        <p className="text-sm text-muted-foreground">{criterion.description}</p>
                      )}
                      <Textarea
                        placeholder="Comment (optional, not scored)"
                        value={comments[criterion.id] || ''}
                        onChange={(e) => handleCommentChange(criterion.id, e.target.value)}
                        rows={3}
                      />
                    </div>
                  ) : (
                    <div key={criterion.id} className="space-y-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <Label className="text-base font-semibold">{criterion.name}</Label>
                          {criterion.description && (
                            <p className="text-sm text-muted-foreground mt-1">{criterion.description}</p>
                          )}
                        </div>
                        <div className="text-right">
                          <span className="text-2xl font-bold">{scores[criterion.id] ?? (ratingDropdown ? '—' : minScoreOf(criterion))}</span>
                          <span className="text-muted-foreground">/{criterion.maxScore}</span>
                        </div>
                      </div>
                      {ratingDropdown ? (
                        <select
                          aria-label={`Rating for ${criterion.name}`}
                          className="w-full h-10 px-3 rounded-md border bg-background"
                          value={scores[criterion.id] ?? ''}
                          onChange={(e) => handleScoreChange(criterion.id, Number(e.target.value))}
                        >
                          <option value="" disabled>Select a rating...</option>
                          {ratingOptions(criterion, ratingDropdown).map(option => (
                            <option key={option.value} value={option.value}>{option.label}</option>
                          ))}
                        </select>
                      ) : (
                        <Slider
                          value={[scores[criterion.id] ?? minScoreOf(criterion)]}
                          min={minScoreOf(criterion)}
                          max={criterion.maxScore}
                          step={1}
                          onValueChange={(value) => handleScoreChange(criterion.id, value[0])}
                          className="w-full"
                        />
                      )}
                      <Textarea
                        placeholder={criterion.commentRequired ? 'Comment (required)' : 'Comment (optional)'}
                        value={comments[criterion.id] || ''}
                        onChange={(e) => handleCommentChange(criterion.id, e.target.value)}
                        rows={2}
                      />
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Overall Comments</CardTitle>
                <CardDescription>
                  Add any additional notes or observations
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  placeholder="Your overall assessment of this application..."
                  value={overallComments}
                  onChange={(e) => setOverallComments(e.target.value)}
                  rows={4}
                />
              </CardContent>
            </Card>

            {/* Summary */}
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="pt-6">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Score</p>
                    <p className="text-3xl font-bold">{calculateTotal()} / {calculateMaxTotal()}</p>
                  </div>
                  <Button size="lg" onClick={handleSubmit} disabled={submitMutation.isPending || isDeadlinePassed || !canEdit}>
                    {submitMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-2" />
                        Submit Review
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
