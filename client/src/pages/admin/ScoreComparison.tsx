import { questionCommentEntries, ratedCriteria, resolveCriteria } from "@shared/reviewRubric";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { useParams, Link } from "wouter";
import { ArrowLeft, Star, Users, AlertTriangle, CheckCircle, TrendingUp, TrendingDown, Minus, Download, FileText, FileSpreadsheet } from "lucide-react";
import AdminLayout from "./AdminLayout";
import { toast } from "sonner";

interface CriteriaScore {
  criteriaId: string;
  score: number;
  comment?: string;
}

interface ScoringCriteria {
  id: string;
  name: string;
  description?: string;
  maxScore: number;
  weight?: number;
}

const escapeHtml = (value: string) => value
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;');

export default function ScoreComparison() {
  const { programId, id } = useParams<{ programId: string; id: string }>();
  const pid = parseInt(programId || '0');
  const appId = parseInt(id || '0');
  const [exporting, setExporting] = useState<'pdf' | 'csv' | null>(null);

  const { data: application, isLoading: appLoading } = trpc.applications.getById.useQuery({ id: appId });
  const { data: program, isLoading: progLoading } = trpc.programs.getById.useQuery({ id: pid });
  const { data: scores, isLoading: scoresLoading } = trpc.scores.getByApplication.useQuery({ applicationId: appId });
  const { data: reviewers } = trpc.reviewers.list.useQuery();

  const isLoading = appLoading || progLoading || scoresLoading;

  // Export to CSV
  const exportToCSV = () => {
    if (!application || !program || !scores || scores.length === 0) {
      toast.error("No data to export");
      return;
    }

    setExporting('csv');
    
    try {
      const criteria = ratedCriteria(resolveCriteria(program, application));
      
      // Build CSV content
      const rows: string[][] = [];
      
      // Header row
      const headerRow = [
        'Application',
        'Applicant',
        'Program',
        'Reviewer',
        'Total Score',
        'Submitted Date',
        ...criteria.map(c => c.name),
        'General Comments',
        'Comment-Only Answers'
      ];
      rows.push(headerRow);
      
      // Data rows
      scores.forEach(score => {
        const reviewer = reviewers?.find(r => r.id === score.reviewerId);
        const criteriaScores = score.criteriaScores as CriteriaScore[] || [];
        
        const row = [
          application.applicationNumber,
          application.applicantName || 'N/A',
          program.name,
          reviewer?.name || `Reviewer #${score.reviewerId}`,
          score.totalScore || '0',
          new Date(score.submittedAt).toLocaleDateString(),
          ...criteria.map(c => {
            const cs = criteriaScores.find(cs => cs.criteriaId === c.id);
            return cs ? cs.score.toString() : '';
          }),
          (score.comments || '').replace(/"/g, '""').replace(/\n/g, ' '),
          questionCommentEntries(program.scoringConfig, score)
            .map(item => `${item.label}: ${item.comment}`).join(' | ').replace(/"/g, '""').replace(/\n/g, ' ')
        ];
        rows.push(row);
      });
      
      // Add summary row
      const avgScores = criteria.map(c => {
        const criteriaScores = scores.map(s => {
          const cs = (s.criteriaScores as CriteriaScore[] || []).find(cs => cs.criteriaId === c.id);
          return cs?.score ?? null;
        }).filter((s): s is number => s !== null);
        return criteriaScores.length > 0 
          ? (criteriaScores.reduce((a, b) => a + b, 0) / criteriaScores.length).toFixed(1)
          : '';
      });
      
      const totalAvg = scores.reduce((sum, s) => sum + parseFloat(s.totalScore || '0'), 0) / scores.length;
      
      rows.push([
        'AVERAGE',
        '',
        '',
        `${scores.length} reviewers`,
        totalAvg.toFixed(1),
        '',
        ...avgScores,
        ''
      ]);
      
      // Convert to CSV string
      const csvContent = rows.map(row => 
        row.map(cell => `"${cell}"`).join(',')
      ).join('\n');
      
      // Download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `score-comparison-${application.applicationNumber}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success("CSV exported successfully!");
    } catch (error) {
      toast.error("Failed to export CSV");
      console.error(error);
    } finally {
      setExporting(null);
    }
  };

  // Export to PDF (generates printable HTML)
  const exportToPDF = () => {
    if (!application || !program || !scores || scores.length === 0) {
      toast.error("No data to export");
      return;
    }

    setExporting('pdf');
    
    try {
      const criteria = ratedCriteria(resolveCriteria(program, application));
      
      // Calculate statistics
      const totalStats = {
        avg: scores.reduce((sum, s) => sum + parseFloat(s.totalScore || '0'), 0) / scores.length,
        min: Math.min(...scores.map(s => parseFloat(s.totalScore || '0'))),
        max: Math.max(...scores.map(s => parseFloat(s.totalScore || '0'))),
      };
      
      // Build HTML content for PDF
      const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Score Comparison Report - ${application.applicationNumber}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 40px; color: #333; line-height: 1.5; }
    .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #2563eb; padding-bottom: 20px; }
    .header h1 { color: #1e40af; font-size: 24px; margin-bottom: 5px; }
    .header p { color: #666; font-size: 14px; }
    .meta { display: flex; justify-content: space-between; margin-bottom: 30px; background: #f8fafc; padding: 15px; border-radius: 8px; }
    .meta-item { text-align: center; }
    .meta-item label { display: block; font-size: 11px; color: #666; text-transform: uppercase; }
    .meta-item value { display: block; font-size: 18px; font-weight: bold; color: #1e40af; }
    .section { margin-bottom: 30px; }
    .section h2 { font-size: 16px; color: #1e40af; margin-bottom: 15px; padding-bottom: 5px; border-bottom: 1px solid #e2e8f0; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    th, td { padding: 10px 8px; text-align: left; border: 1px solid #e2e8f0; }
    th { background: #f1f5f9; font-weight: 600; color: #475569; }
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .score { font-weight: bold; font-size: 14px; }
    .avg-row { background: #eff6ff; font-weight: bold; }
    .comment-box { background: #f8fafc; padding: 12px; border-radius: 6px; margin-bottom: 10px; }
    .comment-box h4 { font-size: 13px; color: #1e40af; margin-bottom: 5px; }
    .comment-box p { font-size: 12px; color: #475569; }
    .footer { margin-top: 40px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 20px; }
    @media print {
      body { padding: 20px; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>Score Comparison Report</h1>
    <p>${program.name} - Application #${application.applicationNumber}</p>
    <p>Applicant: ${application.applicantName || 'N/A'} | Generated: ${new Date().toLocaleDateString()}</p>
  </div>
  
  <div class="meta">
    <div class="meta-item">
      <label>Average Score</label>
      <value>${totalStats.avg.toFixed(1)}</value>
    </div>
    <div class="meta-item">
      <label>Score Range</label>
      <value>${totalStats.min.toFixed(0)} - ${totalStats.max.toFixed(0)}</value>
    </div>
    <div class="meta-item">
      <label>Spread</label>
      <value>${(totalStats.max - totalStats.min).toFixed(1)}</value>
    </div>
    <div class="meta-item">
      <label>Reviews</label>
      <value>${scores.length}</value>
    </div>
  </div>
  
  <div class="section">
    <h2>Score Breakdown by Criterion</h2>
    <table>
      <thead>
        <tr>
          <th>Criterion</th>
          <th class="text-center">Max</th>
          ${scores.map((score) => {
            const reviewer = reviewers?.find(r => r.id === score.reviewerId);
            return `<th class="text-center">${reviewer?.name || `Reviewer ${score.reviewerId}`}</th>`;
          }).join('')}
          <th class="text-center">Average</th>
        </tr>
      </thead>
      <tbody>
        ${criteria.map(criterion => {
          const criteriaScores = scores.map(s => {
            const cs = (s.criteriaScores as CriteriaScore[] || []).find(c => c.criteriaId === criterion.id);
            return cs?.score ?? null;
          }).filter((s): s is number => s !== null);
          const avg = criteriaScores.length > 0 
            ? criteriaScores.reduce((a, b) => a + b, 0) / criteriaScores.length 
            : 0;
          
          return `
            <tr>
              <td>${criterion.name}</td>
              <td class="text-center">${criterion.maxScore}</td>
              ${scores.map(score => {
                const cs = (score.criteriaScores as CriteriaScore[] || []).find(c => c.criteriaId === criterion.id);
                return `<td class="text-center score">${cs ? cs.score : '—'}</td>`;
              }).join('')}
              <td class="text-center">${avg.toFixed(1)}</td>
            </tr>
          `;
        }).join('')}
        <tr class="avg-row">
          <td>Total Score</td>
          <td class="text-center">${criteria.reduce((sum, c) => sum + c.maxScore, 0)}</td>
          ${scores.map(score => `<td class="text-center score">${score.totalScore}</td>`).join('')}
          <td class="text-center">${totalStats.avg.toFixed(1)}</td>
        </tr>
      </tbody>
    </table>
  </div>
  
  <div class="section">
    <h2>Reviewer Comments</h2>
    ${scores.map((score) => {
      const reviewer = reviewers?.find(r => r.id === score.reviewerId);
      return `
        <div class="comment-box">
          <h4>${reviewer?.name || `Reviewer ${score.reviewerId}`} (Score: ${score.totalScore})</h4>
          <p>${score.comments || 'No general comments provided'}</p>
          ${questionCommentEntries(program.scoringConfig, score).map(item => `<p><strong>${escapeHtml(item.label)}:</strong> ${escapeHtml(item.comment)}</p>`).join('')}
        </div>
      `;
    }).join('')}
  </div>
  
  <div class="footer">
    <p>FMWF Chamber of Commerce - Application Review System</p>
    <p>This report was generated for committee review purposes.</p>
  </div>
  
  <script>
    window.onload = function() { window.print(); }
  </script>
</body>
</html>
      `;
      
      // Open in new window for printing
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(htmlContent);
        printWindow.document.close();
        toast.success("PDF report opened for printing!");
      } else {
        toast.error("Please allow popups to generate PDF");
      }
    } catch (error) {
      toast.error("Failed to generate PDF");
      console.error(error);
    } finally {
      setExporting(null);
    }
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3" />
          <div className="h-64 bg-muted rounded" />
        </div>
      </AdminLayout>
    );
  }

  if (!application || !program) {
    return (
      <AdminLayout>
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold mb-2">Application Not Found</h2>
          <Link href={`/admin/programs/${pid}/applications`}>
            <Button variant="outline">Back to Applications</Button>
          </Link>
        </div>
      </AdminLayout>
    );
  }

  const criteria = ratedCriteria(resolveCriteria(program, application));

  // Calculate statistics for each criterion
  const getCriteriaStats = (criteriaId: string) => {
    const criteriaScores = scores?.map(s => {
      const cs = (s.criteriaScores as CriteriaScore[] || []).find(c => c.criteriaId === criteriaId);
      return cs?.score ?? null;
    }).filter((s): s is number => s !== null) || [];

    if (criteriaScores.length === 0) return null;

    const avg = criteriaScores.reduce((a, b) => a + b, 0) / criteriaScores.length;
    const min = Math.min(...criteriaScores);
    const max = Math.max(...criteriaScores);
    const variance = criteriaScores.length > 1 
      ? criteriaScores.reduce((sum, s) => sum + Math.pow(s - avg, 2), 0) / criteriaScores.length
      : 0;
    const stdDev = Math.sqrt(variance);

    return { avg, min, max, stdDev, count: criteriaScores.length };
  };

  // Get score variance indicator
  const getVarianceIndicator = (stdDev: number, maxScore: number) => {
    const variancePercent = (stdDev / maxScore) * 100;
    if (variancePercent < 10) {
      return { icon: CheckCircle, color: "text-green-600", label: "High Agreement" };
    } else if (variancePercent < 25) {
      return { icon: Minus, color: "text-yellow-600", label: "Moderate Variance" };
    } else {
      return { icon: AlertTriangle, color: "text-red-600", label: "High Variance - Review Needed" };
    }
  };

  // Get score comparison for a reviewer against average
  const getScoreComparison = (score: number, avg: number) => {
    const diff = score - avg;
    if (Math.abs(diff) < 0.5) return { icon: Minus, color: "text-gray-500", label: "Average" };
    if (diff > 0) return { icon: TrendingUp, color: "text-green-600", label: `+${diff.toFixed(1)}` };
    return { icon: TrendingDown, color: "text-red-600", label: diff.toFixed(1) };
  };

  const totalStats = {
    avg: scores?.length ? scores.reduce((sum, s) => sum + parseFloat(s.totalScore || '0'), 0) / scores.length : 0,
    min: scores?.length ? Math.min(...scores.map(s => parseFloat(s.totalScore || '0'))) : 0,
    max: scores?.length ? Math.max(...scores.map(s => parseFloat(s.totalScore || '0'))) : 0,
  };

  return (
    <AdminLayout currentPath="/admin/programs">
      <div className="space-y-6 px-4 sm:px-0">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link href={`/admin/programs/${pid}/applications/${appId}`}>
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold">Score Comparison</h1>
              <p className="text-sm text-muted-foreground">
                Application #{application.applicationNumber} • {program.name}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {scores && scores.length > 0 && (
              <>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={exportToCSV}
                  disabled={exporting === 'csv'}
                >
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  {exporting === 'csv' ? 'Exporting...' : 'Export CSV'}
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={exportToPDF}
                  disabled={exporting === 'pdf'}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  {exporting === 'pdf' ? 'Generating...' : 'Export PDF'}
                </Button>
              </>
            )}
            <Badge variant="outline" className="ml-2">
              <Users className="h-3 w-3 mr-1" />
              {scores?.length || 0} Reviews
            </Badge>
          </div>
        </div>

        {/* No Scores Message */}
        {(!scores || scores.length === 0) && (
          <Card>
            <CardContent className="py-12 text-center">
              <Star className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Reviews Yet</h3>
              <p className="text-muted-foreground mb-4">
                This application hasn't been reviewed yet. Assign reviewers to start collecting scores.
              </p>
              <Link href={`/admin/programs/${pid}/applications/${appId}`}>
                <Button>Assign Reviewers</Button>
              </Link>
            </CardContent>
          </Card>
        )}

        {/* Single Review Message */}
        {scores && scores.length === 1 && (
          <Card className="border-yellow-200 bg-yellow-50">
            <CardContent className="py-4">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
                <p className="text-sm text-yellow-800">
                  Only one review has been submitted. At least two reviews are needed for meaningful comparison.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Summary Stats */}
        {scores && scores.length > 0 && (
          <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Average Score</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalStats.avg.toFixed(1)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Score Range</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalStats.min.toFixed(0)} - {totalStats.max.toFixed(0)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Spread</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{(totalStats.max - totalStats.min).toFixed(1)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Reviews</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{scores.length}</div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Criteria Comparison Table */}
        {scores && scores.length > 1 && criteria.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Criteria Breakdown</CardTitle>
              <CardDescription>
                Side-by-side comparison of scores from each reviewer by criterion
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b bg-muted/50">
                    <tr>
                      <th className="p-3 text-left text-sm font-medium sticky left-0 bg-muted/50 min-w-[150px]">Criterion</th>
                      <th className="p-3 text-center text-sm font-medium min-w-[80px]">Max</th>
                      {scores.map((score, idx) => {
                        const reviewer = reviewers?.find(r => r.id === score.reviewerId);
                        return (
                          <th key={score.id} className="p-3 text-center text-sm font-medium min-w-[120px]">
                            <div className="flex flex-col items-center">
                              <span>{reviewer?.name || `Reviewer ${idx + 1}`}</span>
                              <span className="text-xs text-muted-foreground font-normal">
                                Total: {score.totalScore}
                              </span>
                            </div>
                          </th>
                        );
                      })}
                      <th className="p-3 text-center text-sm font-medium min-w-[100px]">Average</th>
                      <th className="p-3 text-center text-sm font-medium min-w-[120px]">Variance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {criteria.map((criterion) => {
                      const stats = getCriteriaStats(criterion.id);
                      const variance = stats ? getVarianceIndicator(stats.stdDev, criterion.maxScore) : null;

                      return (
                        <tr key={criterion.id} className="border-b hover:bg-muted/30">
                          <td className="p-3 sticky left-0 bg-background">
                            <div>
                              <p className="font-medium text-sm">{criterion.name}</p>
                              {criterion.description && (
                                <p className="text-xs text-muted-foreground line-clamp-1">{criterion.description}</p>
                              )}
                            </div>
                          </td>
                          <td className="p-3 text-center text-muted-foreground">{criterion.maxScore}</td>
                          {scores.map((score) => {
                            const criteriaScores = score.criteriaScores as CriteriaScore[] || [];
                            const cs = criteriaScores.find(c => c.criteriaId === criterion.id);
                            const comparison = stats && cs ? getScoreComparison(cs.score, stats.avg) : null;

                            return (
                              <td key={score.id} className="p-3 text-center">
                                {cs ? (
                                  <div className="flex flex-col items-center gap-1">
                                    <span className="font-bold text-lg">{cs.score}</span>
                                    {comparison && stats && scores.length > 1 && (
                                      <span className={`text-xs flex items-center gap-0.5 ${comparison.color}`}>
                                        <comparison.icon className="h-3 w-3" />
                                        {comparison.label}
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-muted-foreground">—</span>
                                )}
                              </td>
                            );
                          })}
                          <td className="p-3 text-center">
                            {stats ? (
                              <span className="font-medium">{stats.avg.toFixed(1)}</span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>
                          <td className="p-3 text-center">
                            {variance && stats ? (
                              <div className={`flex items-center justify-center gap-1 ${variance.color}`}>
                                <variance.icon className="h-4 w-4" />
                                <span className="text-xs hidden sm:inline">{variance.label}</span>
                              </div>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                    {/* Total Row */}
                    <tr className="bg-muted/50 font-medium">
                      <td className="p-3 sticky left-0 bg-muted/50">Total Score</td>
                      <td className="p-3 text-center text-muted-foreground">
                        {criteria.reduce((sum, c) => sum + c.maxScore, 0)}
                      </td>
                      {scores.map((score) => (
                        <td key={score.id} className="p-3 text-center">
                          <span className="font-bold text-lg">{score.totalScore}</span>
                        </td>
                      ))}
                      <td className="p-3 text-center">
                        <span className="font-bold">{totalStats.avg.toFixed(1)}</span>
                      </td>
                      <td className="p-3 text-center">
                        <span className="text-sm text-muted-foreground">
                          ±{((totalStats.max - totalStats.min) / 2).toFixed(1)}
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Comments Comparison */}
        {scores && scores.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Reviewer Comments</CardTitle>
              <CardDescription>
                General comments and feedback from each reviewer
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                {scores.map((score, idx) => {
                  const reviewer = reviewers?.find(r => r.id === score.reviewerId);
                  return (
                    <Card key={score.id} className="bg-muted/30">
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-sm font-medium">
                            {reviewer?.name || `Reviewer ${idx + 1}`}
                          </CardTitle>
                          <Badge variant="outline">
                            <Star className="h-3 w-3 mr-1 fill-yellow-500 text-yellow-500" />
                            {score.totalScore}
                          </Badge>
                        </div>
                        <CardDescription className="text-xs">
                          Submitted {new Date(score.submittedAt).toLocaleDateString()}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        {score.comments ? (
                          <p className="text-sm whitespace-pre-wrap">{score.comments}</p>
                        ) : (
                          <p className="text-sm text-muted-foreground italic">No general comments provided</p>
                        )}
                        {questionCommentEntries(program.scoringConfig, score).map(item => (
                          <div key={item.label} className="mt-3 text-sm">
                            <p className="font-medium">{item.label}</p>
                            <p className="whitespace-pre-wrap text-muted-foreground">{item.comment}</p>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Criteria-Specific Comments */}
        {scores && scores.length > 0 && criteria.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Criteria-Specific Feedback</CardTitle>
              <CardDescription>
                Detailed comments for each scoring criterion
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {criteria.map((criterion) => {
                  const hasComments = scores.some(s => {
                    const cs = (s.criteriaScores as CriteriaScore[] || []).find(c => c.criteriaId === criterion.id);
                    return cs?.comment;
                  });

                  if (!hasComments) return null;

                  return (
                    <div key={criterion.id} className="border-b pb-4 last:border-0">
                      <h4 className="font-medium mb-3">{criterion.name}</h4>
                      <div className="grid gap-3 md:grid-cols-2">
                        {scores.map((score, idx) => {
                          const reviewer = reviewers?.find(r => r.id === score.reviewerId);
                          const cs = (score.criteriaScores as CriteriaScore[] || []).find(c => c.criteriaId === criterion.id);
                          
                          if (!cs?.comment) return null;

                          return (
                            <div key={score.id} className="bg-muted/30 rounded-lg p-3">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-medium">{reviewer?.name || `Reviewer ${idx + 1}`}</span>
                                <Badge variant="secondary" className="text-xs">
                                  {cs.score}/{criterion.maxScore}
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground">{cs.comment}</p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Back Button */}
        <div className="flex justify-center pt-4">
          <Link href={`/admin/programs/${pid}/applications/${appId}`}>
            <Button variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Application
            </Button>
          </Link>
        </div>
      </div>
    </AdminLayout>
  );
}
