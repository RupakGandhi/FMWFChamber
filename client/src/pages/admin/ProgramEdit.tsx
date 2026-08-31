import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { useParams, Link } from "wouter";
import { Save, Plus, Trash2, GripVertical, Link2 } from "lucide-react";
import { toast } from "sonner";
import AdminLayout from "./AdminLayout";
import ProgramSubNav from "@/components/ProgramSubNav";
import { FormConfig, ScoringConfig, ProgramSettings, FormField, ScoringCriteria } from "../../../../drizzle/schema";

export default function AdminProgramEdit() {
  const { id } = useParams<{ id: string }>();
  const programId = parseInt(id || '0');
  
  const { data: program, isLoading, refetch } = trpc.programs.getById.useQuery({ id: programId });
  const updateMutation = trpc.programs.update.useMutation({
    onSuccess: () => {
      toast.success('Program saved successfully');
      refetch();
    },
    onError: (error) => toast.error(error.message)
  });

  const [formConfig, setFormConfig] = useState<FormConfig>({ fields: [] });
  const [scoringConfig, setScoringConfig] = useState<ScoringConfig>({ criteria: [] });
  const [settings, setSettings] = useState<ProgramSettings>({
    blindReview: true,
    allowMultipleSubmissions: false,
  });

  useEffect(() => {
    if (program) {
      setFormConfig({ ...program.formConfig, fields: program.formConfig?.fields ?? [] });
      setScoringConfig({ ...program.scoringConfig, criteria: program.scoringConfig?.criteria ?? [] });
      setSettings(program.settings || { blindReview: true });
    }
  }, [program]);

  const addField = () => {
    const newField: FormField = {
      id: `field_${Date.now()}`,
      type: 'text',
      label: 'New Field',
      required: false,
    };
    setFormConfig({ ...formConfig, fields: [...formConfig.fields, newField] });
  };

  const updateField = (index: number, updates: Partial<FormField>) => {
    const newFields = [...formConfig.fields];
    newFields[index] = { ...newFields[index], ...updates };
    setFormConfig({ ...formConfig, fields: newFields });
  };

  const removeField = (index: number) => {
    const newFields = formConfig.fields.filter((_, i) => i !== index);
    setFormConfig({ ...formConfig, fields: newFields });
  };

  const addCriteria = () => {
    const newCriteria: ScoringCriteria = {
      id: `criteria_${Date.now()}`,
      name: 'New Criteria',
      maxScore: 10,
    };
    setScoringConfig({ ...scoringConfig, criteria: [...scoringConfig.criteria, newCriteria] });
  };

  const updateCriteria = (index: number, updates: Partial<ScoringCriteria>) => {
    const newCriteria = [...scoringConfig.criteria];
    newCriteria[index] = { ...newCriteria[index], ...updates };
    setScoringConfig({ ...scoringConfig, criteria: newCriteria });
  };

  const removeCriteria = (index: number) => {
    const newCriteria = scoringConfig.criteria.filter((_, i) => i !== index);
    setScoringConfig({ ...scoringConfig, criteria: newCriteria });
  };

  const handleSave = () => {
    updateMutation.mutate({
      id: programId,
      formConfig,
      scoringConfig,
      settings,
    });
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

  if (!program) {
    return (
      <AdminLayout>
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold mb-2">Program Not Found</h2>
          <Link href="/admin/programs">
            <Button variant="outline">Back to Programs</Button>
          </Link>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout currentPath="/admin/programs">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{program.name}</h1>
            <p className="text-muted-foreground">Configure form fields and scoring criteria</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => {
                navigator.clipboard.writeText(`${window.location.origin}/apply/${program.slug}`);
                toast.success('Application link copied!');
              }}
            >
              <Link2 className="h-4 w-4 mr-2" />
              Copy Link
            </Button>
            <Button onClick={handleSave} disabled={updateMutation.isPending}>
              <Save className="h-4 w-4 mr-2" />
              {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>

        {/* Program Sub-Navigation */}
        <ProgramSubNav programId={programId} programType={program.programType} activeTab="form-builder" />

        <Tabs defaultValue="form" className="space-y-4">
          <TabsList>
            <TabsTrigger value="form">Form Builder</TabsTrigger>
            <TabsTrigger value="scoring">Scoring Criteria</TabsTrigger>
          </TabsList>

          <TabsContent value="form" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Application Form Fields</CardTitle>
                <CardDescription>
                  Define the fields applicants will fill out. Drag to reorder.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {formConfig.fields.length === 0 ? (
                  <div className="text-center py-8 border-2 border-dashed rounded-lg">
                    <p className="text-muted-foreground mb-4">No fields added yet</p>
                    <Button onClick={addField}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add First Field
                    </Button>
                  </div>
                ) : (
                  formConfig.fields.map((field, index) => (
                    <div key={field.id} className="flex items-start gap-4 p-4 border rounded-lg bg-muted/30">
                      <GripVertical className="h-5 w-5 text-muted-foreground mt-2 cursor-grab" />
                      <div className="flex-1 grid gap-4 md:grid-cols-3">
                        <div className="space-y-2">
                          <Label>Field Label</Label>
                          <Input
                            value={field.label}
                            onChange={(e) => updateField(index, { label: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Field Type</Label>
                          <select
                            className="w-full h-10 px-3 rounded-md border bg-background"
                            value={field.type}
                            onChange={(e) => updateField(index, { type: e.target.value as FormField['type'] })}
                          >
                            <option value="text">Short Text</option>
                            <option value="textarea">Long Text</option>
                            <option value="email">Email</option>
                            <option value="phone">Phone</option>
                            <option value="number">Number</option>
                            <option value="date">Date</option>
                            <option value="select">Dropdown</option>
                            <option value="radio">Radio Buttons</option>
                            <option value="checkbox">Checkboxes</option>
                            <option value="heading">Section Heading</option>
                          </select>
                        </div>
                        <div className="flex items-end gap-4">
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={field.required}
                              onCheckedChange={(checked) => updateField(index, { required: checked })}
                            />
                            <Label>Required</Label>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive"
                            onClick={() => removeField(index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
                {formConfig.fields.length > 0 && (
                  <Button variant="outline" onClick={addField}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Field
                  </Button>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="scoring" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Scoring Criteria</CardTitle>
                <CardDescription>
                  Define how reviewers will score applications.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {scoringConfig.criteria.length === 0 ? (
                  <div className="text-center py-8 border-2 border-dashed rounded-lg">
                    <p className="text-muted-foreground mb-4">No scoring criteria defined</p>
                    <Button onClick={addCriteria}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add First Criteria
                    </Button>
                  </div>
                ) : (
                  scoringConfig.criteria.map((criteria, index) => (
                    <div key={criteria.id} className="flex items-start gap-4 p-4 border rounded-lg bg-muted/30">
                      <div className="flex-1 grid gap-4 md:grid-cols-3">
                        <div className="space-y-2">
                          <Label>Criteria Name</Label>
                          <Input
                            value={criteria.name}
                            onChange={(e) => updateCriteria(index, { name: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Max Score</Label>
                          <Input
                            type="number"
                            value={criteria.maxScore}
                            onChange={(e) => updateCriteria(index, { maxScore: parseInt(e.target.value) })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Description (Optional)</Label>
                          <div className="flex gap-2">
                            <Input
                              value={criteria.description || ''}
                              onChange={(e) => updateCriteria(index, { description: e.target.value })}
                              placeholder="Guidance for reviewers..."
                            />
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive shrink-0"
                              onClick={() => removeCriteria(index)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
                {scoringConfig.criteria.length > 0 && (
                  <Button variant="outline" onClick={addCriteria}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Criteria
                  </Button>
                )}
                <div className="pt-4 border-t">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Reviewers Per Application</Label>
                      <Input
                        type="number"
                        value={scoringConfig.reviewersPerApplication || 3}
                        onChange={(e) => setScoringConfig({ 
                          ...scoringConfig, 
                          reviewersPerApplication: parseInt(e.target.value) 
                        })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Passing Score (Optional)</Label>
                      <Input
                        type="number"
                        value={scoringConfig.passingScore || ''}
                        onChange={(e) => setScoringConfig({ 
                          ...scoringConfig, 
                          passingScore: e.target.value ? parseInt(e.target.value) : undefined 
                        })}
                        placeholder="Minimum score to advance"
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>


        </Tabs>
      </div>
    </AdminLayout>
  );
}
