import { useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, Printer, ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";
import { FormConfig, ScoringConfig, CriteriaScore } from "../../../../drizzle/schema";

export default function ApplicationPdf() {
  const params = useParams<{ id: string }>();
  const applicationId = parseInt(params.id || "0");
  const [, navigate] = useLocation();
  
  const { data, isLoading } = trpc.export.applicationPdf.useQuery({ applicationId });
  
  const handlePrint = () => {
    window.print();
  };
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  if (!data) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-muted-foreground">Application not found</p>
      </div>
    );
  }
  
  const { application, program, scores, documents } = data;
  const formConfig = program?.formConfig as FormConfig | null;
  const scoringConfig = program?.scoringConfig as ScoringConfig | null;
  const formData = application.formData as Record<string, unknown> | null;
  
  // Get field label from form config
  const getFieldLabel = (fieldId: string): string => {
    if (!formConfig?.fields) return fieldId;
    const field = formConfig.fields.find(f => f.id === fieldId);
    return field?.label || fieldId;
  };
  
  // Get criteria label from scoring config
  const getCriteriaLabel = (criteriaId: string): string => {
    if (!scoringConfig?.criteria) return criteriaId;
    const criteria = scoringConfig.criteria.find(c => c.id === criteriaId);
    return criteria?.name || criteriaId;
  };
  
  // Format status for display
  const formatStatus = (status: string): string => {
    const statusMap: Record<string, string> = {
      submitted: 'Submitted',
      under_review: 'Under Review',
      interview: 'Selected for Interview',
      accepted: 'Accepted',
      rejected: 'Not Selected',
      waitlist: 'Waitlisted',
    };
    return statusMap[status] || status;
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Print Controls - Hidden when printing */}
      <div className="print:hidden bg-gray-100 p-4 sticky top-0 z-10 border-b flex items-center justify-between">
        <Button variant="ghost" onClick={() => window.history.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
          <Button onClick={handlePrint}>
            <Download className="h-4 w-4 mr-2" />
            Save as PDF
          </Button>
        </div>
      </div>
      
      {/* PDF Content */}
      <div className="max-w-4xl mx-auto p-8 print:p-4">
        {/* Header */}
        <div className="text-center mb-8 border-b pb-6">
          <h1 className="text-3xl font-bold text-gray-900">FMWF Chamber of Commerce</h1>
          <h2 className="text-xl text-gray-600 mt-2">{program?.name || 'Application'}</h2>
          <p className="text-sm text-gray-500 mt-2">Application #{application.applicationNumber}</p>
        </div>
        
        {/* Applicant Information */}
        <Card className="mb-6 print:shadow-none print:border">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Applicant Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium text-gray-600">Name:</span>
                <span className="ml-2">{application.applicantName}</span>
              </div>
              <div>
                <span className="font-medium text-gray-600">Email:</span>
                <span className="ml-2">{application.applicantEmail}</span>
              </div>
              {application.applicantPhone && (
                <div>
                  <span className="font-medium text-gray-600">Phone:</span>
                  <span className="ml-2">{application.applicantPhone}</span>
                </div>
              )}
              {application.organizationName && (
                <div>
                  <span className="font-medium text-gray-600">Organization:</span>
                  <span className="ml-2">{application.organizationName}</span>
                </div>
              )}
              <div>
                <span className="font-medium text-gray-600">Status:</span>
                <span className="ml-2">{formatStatus(application.status)}</span>
              </div>
              <div>
                <span className="font-medium text-gray-600">Submitted:</span>
                <span className="ml-2">
                  {application.submittedAt ? new Date(application.submittedAt).toLocaleDateString() : 'N/A'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Application Responses */}
        <Card className="mb-6 print:shadow-none print:border">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Application Responses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {formData && Object.entries(formData).map(([fieldId, value]) => (
                <div key={fieldId} className="border-b pb-3 last:border-0">
                  <p className="font-medium text-gray-700 text-sm">{getFieldLabel(fieldId)}</p>
                  <p className="mt-1 text-gray-900 whitespace-pre-wrap">
                    {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value || 'N/A')}
                  </p>
                </div>
              ))}
              {(!formData || Object.keys(formData).length === 0) && (
                <p className="text-gray-500 italic">No responses recorded</p>
              )}
            </div>
          </CardContent>
        </Card>
        
        {/* Scores */}
        {scores && scores.length > 0 && (
          <Card className="mb-6 print:shadow-none print:border">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Review Scores</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {scores.map((score, index) => (
                  <div key={index} className="border-b pb-4 last:border-0">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium">{score.reviewerName}</span>
                      <span className="text-lg font-bold text-primary">
                        Total: {score.totalScore}
                      </span>
                    </div>
                    
                    {/* Criteria Scores */}
                    <div className="grid grid-cols-2 gap-2 text-sm mb-2">
                      {(score.criteriaScores as CriteriaScore[] || []).map((cs, csIndex) => (
                        <div key={csIndex} className="flex justify-between bg-gray-50 p-2 rounded">
                          <span>{getCriteriaLabel(cs.criteriaId)}</span>
                          <span className="font-medium">{cs.score}</span>
                        </div>
                      ))}
                    </div>
                    
                    {/* Comments */}
                    {score.comments && (
                      <div className="mt-2 text-sm">
                        <span className="font-medium text-gray-600">Comments:</span>
                        <p className="mt-1 text-gray-700 italic">{score.comments}</p>
                      </div>
                    )}
                  </div>
                ))}
                
                {/* Average Score */}
                <div className="bg-primary/10 p-4 rounded-lg text-center">
                  <span className="text-sm text-gray-600">Average Score</span>
                  <p className="text-2xl font-bold text-primary">
                    {application.averageScore || 'N/A'}
                  </p>
                  {application.rank && (
                    <p className="text-sm text-gray-600">Rank: #{application.rank}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}
        
        {/* Documents */}
        {documents && documents.length > 0 && (
          <Card className="mb-6 print:shadow-none print:border">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Attached Documents</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {documents.map((doc, index) => (
                  <li key={index} className="flex items-center gap-2 text-sm">
                    <span className="w-2 h-2 bg-primary rounded-full"></span>
                    <span>{doc.originalName}</span>
                    <span className="text-gray-500">({(doc.fileSize / 1024).toFixed(1)} KB)</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
        
        {/* Footer */}
        <div className="text-center text-sm text-gray-500 mt-8 pt-4 border-t print:mt-4">
          <p>Generated on {new Date().toLocaleDateString()} at {new Date().toLocaleTimeString()}</p>
          <p className="mt-1">FMWF Chamber of Commerce Application Management System</p>
        </div>
      </div>
      
      {/* Print Styles */}
      <style>{`
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .print\\:hidden { display: none !important; }
          .print\\:shadow-none { box-shadow: none !important; }
          .print\\:border { border: 1px solid #e5e7eb !important; }
          .print\\:p-4 { padding: 1rem !important; }
          .print\\:mt-4 { margin-top: 1rem !important; }
        }
      `}</style>
    </div>
  );
}
