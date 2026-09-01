import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { useParams, useLocation } from "wouter";
import { ClipboardList, ArrowRight, ArrowLeft, Send, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { FormField } from "../../../../drizzle/schema";

export default function PublicApply() {
  const { slug } = useParams<{ slug: string }>();
  const [, setLocation] = useLocation();
  
  const { data: program, isLoading, error } = trpc.programs.getBySlug.useQuery({ slug: slug || '' });
  
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const [applicantInfo, setApplicantInfo] = useState({
    name: '',
    email: '',
    phone: '',
    organization: '',
  });

  const submitMutation = trpc.applications.submit.useMutation({
    onSuccess: (data) => {
      toast.success('Application submitted successfully!');
      setLocation(`/confirmation/${data.applicationNumber}`);
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

  if (error || !program) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Program Not Found</CardTitle>
            <CardDescription>
              This application program is not currently available or does not exist.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setLocation('/')}>
              Return Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const formConfig = program.formConfig || { fields: [] };
  const fields = formConfig.fields || [];
  
  // Group fields into steps (sections)
  const steps: { title: string; fields: FormField[] }[] = [];
  let currentSection = { title: 'Contact Information', fields: [] as FormField[] };
  
  // First step is always contact info
  steps.push({ title: 'Contact Information', fields: [] });
  
  fields.forEach(field => {
    if (field.type === 'heading') {
      if (currentSection.fields.length > 0) {
        steps.push(currentSection);
      }
      currentSection = { title: field.label, fields: [] };
    } else {
      currentSection.fields.push(field);
    }
  });
  
  if (currentSection.fields.length > 0) {
    steps.push(currentSection);
  }

  // If no custom fields, just have contact info
  if (steps.length === 1) {
    steps.push({ title: 'Application Details', fields: [] });
  }

  const handleFieldChange = (fieldId: string, value: unknown) => {
    setFormData(prev => ({ ...prev, [fieldId]: value }));
  };

  const renderField = (field: FormField) => {
    const value = formData[field.id];

    switch (field.type) {
      case 'text':
      case 'email':
      case 'phone':
        return (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={field.id}>
              {field.label}
              {field.required && <span className="text-destructive ml-1">*</span>}
            </Label>
            <Input
              id={field.id}
              type={field.type === 'email' ? 'email' : field.type === 'phone' ? 'tel' : 'text'}
              placeholder={field.placeholder}
              value={String(value || '')}
              onChange={(e) => handleFieldChange(field.id, e.target.value)}
              required={field.required}
            />
            {field.helpText && (
              <p className="text-sm text-muted-foreground">{field.helpText}</p>
            )}
          </div>
        );

      case 'textarea':
        return (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={field.id}>
              {field.label}
              {field.required && <span className="text-destructive ml-1">*</span>}
            </Label>
            <Textarea
              id={field.id}
              placeholder={field.placeholder}
              value={String(value || '')}
              onChange={(e) => handleFieldChange(field.id, e.target.value)}
              required={field.required}
              rows={5}
            />
            {field.helpText && (
              <p className="text-sm text-muted-foreground">{field.helpText}</p>
            )}
          </div>
        );

      case 'number':
        return (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={field.id}>
              {field.label}
              {field.required && <span className="text-destructive ml-1">*</span>}
            </Label>
            <Input
              id={field.id}
              type="number"
              placeholder={field.placeholder}
              value={String(value || '')}
              onChange={(e) => handleFieldChange(field.id, parseInt(e.target.value))}
              required={field.required}
            />
          </div>
        );

      case 'date':
        return (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={field.id}>
              {field.label}
              {field.required && <span className="text-destructive ml-1">*</span>}
            </Label>
            <Input
              id={field.id}
              type="date"
              value={String(value || '')}
              onChange={(e) => handleFieldChange(field.id, e.target.value)}
              required={field.required}
            />
          </div>
        );

      case 'select':
        return (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={field.id}>
              {field.label}
              {field.required && <span className="text-destructive ml-1">*</span>}
            </Label>
            <Select
              value={String(value || '')}
              onValueChange={(v) => handleFieldChange(field.id, v)}
            >
              <SelectTrigger>
                <SelectValue placeholder={field.placeholder || 'Select an option'} />
              </SelectTrigger>
              <SelectContent>
                {field.options?.map(opt => (
                  <SelectItem key={typeof opt === 'string' ? opt : opt.value} value={typeof opt === 'string' ? opt : opt.value}>
                    {typeof opt === 'string' ? opt : opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );

      case 'radio':
        return (
          <div key={field.id} className="space-y-2">
            <Label>
              {field.label}
              {field.required && <span className="text-destructive ml-1">*</span>}
            </Label>
            <RadioGroup
              value={String(value || '')}
              onValueChange={(v) => handleFieldChange(field.id, v)}
            >
              {field.options?.map(opt => {
                const optValue = typeof opt === 'string' ? opt : opt.value;
                const optLabel = typeof opt === 'string' ? opt : opt.label;
                return (
                  <div key={optValue} className="flex items-center space-x-2">
                    <RadioGroupItem value={optValue} id={`${field.id}-${optValue}`} />
                    <Label htmlFor={`${field.id}-${optValue}`} className="font-normal">{optLabel}</Label>
                  </div>
                );
              })}
            </RadioGroup>
          </div>
        );

      case 'checkbox':
        return (
          <div key={field.id} className="space-y-2">
            <Label>
              {field.label}
              {field.required && <span className="text-destructive ml-1">*</span>}
            </Label>
            <div className="space-y-2">
              {field.options?.map(opt => {
                const optValue = typeof opt === 'string' ? opt : opt.value;
                const optLabel = typeof opt === 'string' ? opt : opt.label;
                const checked = Array.isArray(value) ? value.includes(optValue) : false;
                return (
                  <div key={optValue} className="flex items-center space-x-2">
                    <Checkbox
                      id={`${field.id}-${optValue}`}
                      checked={checked}
                      onCheckedChange={(c) => {
                        const current = Array.isArray(value) ? value : [];
                        if (c) {
                          handleFieldChange(field.id, [...current, optValue]);
                        } else {
                          handleFieldChange(field.id, current.filter(v => v !== optValue));
                        }
                      }}
                    />
                    <Label htmlFor={`${field.id}-${optValue}`} className="font-normal">{optLabel}</Label>
                  </div>
                );
              })}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const handleNext = () => {
    if (currentStep === 0) {
      // Validate contact info
      if (!applicantInfo.name || !applicantInfo.email) {
        toast.error('Please fill in your name and email');
        return;
      }
    }
    setCurrentStep(prev => Math.min(prev + 1, steps.length - 1));
  };

  const handleBack = () => {
    setCurrentStep(prev => Math.max(prev - 1, 0));
  };

  const handleSubmit = () => {
    // Validate required fields
    const currentFields = steps[currentStep]?.fields || [];
    for (const field of currentFields) {
      if (field.required && !formData[field.id]) {
        toast.error(`Please fill in: ${field.label}`);
        return;
      }
    }

    submitMutation.mutate({
      programSlug: slug || '',
      formData,
      applicantName: applicantInfo.name,
      applicantEmail: applicantInfo.email,
      applicantPhone: applicantInfo.phone || undefined,
      organizationName: applicantInfo.organization || undefined,
    });
  };

  const isLastStep = currentStep === steps.length - 1;

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container py-3 sm:py-4 px-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <ClipboardList className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
            <div>
              <h1 className="text-lg sm:text-xl font-bold text-foreground">FMWF Chamber</h1>
              <p className="text-xs text-muted-foreground">Application Portal</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container py-6 sm:py-8 px-4 max-w-2xl">
        {/* Program Info */}
        <div className="mb-6 sm:mb-8 text-center">
          <h2 className="text-xl sm:text-3xl font-bold mb-2">{program.name}</h2>
          {program.description && (
            <p className="text-sm sm:text-base text-muted-foreground">{program.description}</p>
          )}
        </div>

        {/* Progress */}
        <div className="mb-6 sm:mb-8">
          <div className="flex justify-between mb-2 gap-1">
            {steps.map((step, idx) => (
              <div
                key={idx}
                className={`flex-1 text-center text-xs sm:text-sm truncate px-1 ${
                  idx <= currentStep ? 'text-primary font-medium' : 'text-muted-foreground'
                }`}
              >
                <span className="hidden sm:inline">{step.title}</span>
                <span className="sm:hidden">{idx + 1}</span>
              </div>
            ))}
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground text-center mt-2 sm:hidden">
            Step {currentStep + 1} of {steps.length}: {steps[currentStep]?.title}
          </p>
        </div>

        {/* Form */}
        <Card>
          <CardHeader>
            {currentStep > 0 && <CardTitle>{steps[currentStep]?.title}</CardTitle>}
            <CardDescription>
              {currentStep === 0
                ? 'Please provide your contact information'
                : 'Fill out the following questions'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {currentStep === 0 ? (
              // Contact Information Step
              <>
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name <span className="text-destructive">*</span></Label>
                  <Input
                    id="name"
                    placeholder="John Smith"
                    value={applicantInfo.name}
                    onChange={(e) => setApplicantInfo({ ...applicantInfo, name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address <span className="text-destructive">*</span></Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="john@example.com"
                    value={applicantInfo.email}
                    onChange={(e) => setApplicantInfo({ ...applicantInfo, email: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="(701) 555-1234"
                    value={applicantInfo.phone}
                    onChange={(e) => setApplicantInfo({ ...applicantInfo, phone: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="organization">Organization / Company</Label>
                  <Input
                    id="organization"
                    placeholder="Your company name"
                    value={applicantInfo.organization}
                    onChange={(e) => setApplicantInfo({ ...applicantInfo, organization: e.target.value })}
                  />
                </div>
              </>
            ) : (
              // Dynamic Form Fields
              steps[currentStep]?.fields.map(field => renderField(field))
            )}

            {/* If no fields in current step (after contact), show placeholder */}
            {currentStep > 0 && steps[currentStep]?.fields.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <p>No additional questions for this section.</p>
                <p className="text-sm mt-2">Click submit to complete your application.</p>
              </div>
            )}

          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex justify-between mt-6">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={currentStep === 0}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          
          {isLastStep ? (
            <Button onClick={handleSubmit} disabled={submitMutation.isPending}>
              {submitMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Submit Application
                </>
              )}
            </Button>
          ) : (
            <Button onClick={handleNext}>
              Next
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          )}
        </div>
      </main>
    </div>
  );
}
