import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { useParams, Link, useSearch } from "wouter";
import { Save, Plus, Trash2, GripVertical, Link2, ArrowUp, ArrowDown, Copy } from "lucide-react";
import { toast } from "sonner";
import AdminLayout from "./AdminLayout";
import ProgramSubNav from "@/components/ProgramSubNav";
import { EditConflictDialog, StaffDraftNote, StaffDraftRestored, StaffDraftStatusLabel } from "@/components/StaffDraftBar";
import { useStaffDraft } from "@/hooks/useStaffDraft";
import { CategoryRubric, FormConfig, ScoringConfig, FormField, ScoringCriteria } from "../../../../drizzle/schema";
import {
  assignOptionValues,
  canMove,
  dropField,
  findEmptyChoiceFields,
  getBlockRange,
  isChoiceField,
  moveField,
  normalizeOptions,
  validateFormFields,
} from "@shared/formBuilder";
import { DEFAULT_CATEGORY_FIELD_ID } from "@shared/awardEligibility";
import { conditionValues, DEFAULT_FILE_TYPES, MAX_UPLOAD_MB } from "@shared/formLogic";
import { createRubric, validateRubrics } from "@shared/reviewRubric";

interface EditorDraft {
  name: string;
  description: string;
  formConfig: FormConfig;
  scoringConfig: ScoringConfig;
}

export default function AdminProgramEdit() {
  const { id } = useParams<{ id: string }>();
  const programId = parseInt(id || '0');
  const initialTab = new URLSearchParams(useSearch()).get('tab') === 'details' ? 'details' : 'form';

  const { data: program, isLoading, refetch } = trpc.programs.getById.useQuery({ id: programId });
  const updateMutation = trpc.programs.update.useMutation({
    onSuccess: () => {
      toast.success('Program saved successfully');
      const empty = findEmptyChoiceFields(formConfig.fields);
      if (empty.length > 0) {
        toast.warning(`${empty.map(field => `"${field.label}"`).join(', ')} has no choices yet, so applicants cannot answer it.`);
      }
      reloadAfterSave.current = true;
      refetch();
    },
    onError: (error) => {
      if (error.data?.code === 'CONFLICT') setConflict(true);
      else toast.error(error.message);
    }
  });

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [formConfig, setFormConfig] = useState<FormConfig>({ fields: [] });
  const [scoringConfig, setScoringConfig] = useState<ScoringConfig>({ criteria: [] });
  const [baseline, setBaseline] = useState('');
  const [baseRevision, setBaseRevision] = useState(0);
  const [conflict, setConflict] = useState(false);
  const reloadAfterSave = useRef(false);
  const [rubricId, setRubricId] = useState('default');
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);

  const editorDraft: EditorDraft = { name, description, formConfig, scoringConfig };
  const hasUnsavedChanges = baseline !== '' && baseline !== JSON.stringify(editorDraft);
  const unsavedRef = useRef(false);
  unsavedRef.current = hasUnsavedChanges;

  const loadProgram = (source: NonNullable<typeof program>) => {
    const loaded: EditorDraft = {
      name: source.name,
      description: source.description ?? '',
      formConfig: { ...source.formConfig, fields: normalizeOptions(source.formConfig?.fields ?? []) },
      scoringConfig: { ...source.scoringConfig, criteria: source.scoringConfig?.criteria ?? [] },
    };
    setName(loaded.name);
    setDescription(loaded.description);
    setFormConfig(loaded.formConfig);
    setScoringConfig(loaded.scoringConfig);
    setBaseRevision(source.revision);
    setBaseline(JSON.stringify(loaded));
  };

  useEffect(() => {
    if (!program) return;
    // A background refresh must never replace work in progress. Someone else's save is
    // caught by the revision check when this editor saves.
    if (unsavedRef.current && !reloadAfterSave.current) return;
    reloadAfterSave.current = false;
    loadProgram(program);
  }, [program]);

  const draft = useStaffDraft<EditorDraft>({
    programId,
    scope: 'program-editor',
    value: editorDraft,
    dirty: hasUnsavedChanges,
    ready: baseline !== '',
    baseRevision,
    onRestore: (payload, revision) => {
      setName(payload.name);
      setDescription(payload.description);
      setFormConfig(payload.formConfig);
      setScoringConfig(payload.scoringConfig);
      setBaseRevision(revision);
    },
    onDiscard: () => {
      if (program) loadProgram(program);
    },
  });

  useEffect(() => {
    if (draft.isProtected) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [draft.isProtected]);

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
    if (updates.type && isChoiceField(newFields[index]) && !newFields[index].options?.length) {
      newFields[index].options = [{ value: '', label: '' }];
    }
    setFormConfig({ ...formConfig, fields: newFields });
  };

  const removeField = (index: number) => {
    const newFields = formConfig.fields.filter((_, i) => i !== index);
    setFormConfig({ ...formConfig, fields: newFields });
  };

  const setFields = (fields: FormField[]) => setFormConfig({ ...formConfig, fields });

  const updateOptions = (index: number, change: (options: { value: string; label: string }[]) => { value: string; label: string }[]) => {
    updateField(index, { options: change([...(formConfig.fields[index].options ?? [])]) });
  };

  const moveOption = (options: { value: string; label: string }[], from: number, to: number) => {
    if (to < 0 || to >= options.length) return options;
    [options[from], options[to]] = [options[to], options[from]];
    return options;
  };

  const endDrag = () => {
    setDragIndex(null);
    setDropIndex(null);
  };

  // Highlights the rows that move together while a section is dragged.
  const draggedRange = dragIndex === null ? null : getBlockRange(formConfig.fields, dragIndex);

  const rubrics = scoringConfig.categoryRubrics ?? [];
  const activeRubric = rubrics.find(rubric => rubric.id === rubricId);
  const activeCriteria = activeRubric ? activeRubric.criteria : scoringConfig.criteria;
  const categoryField = formConfig.fields.find(
    field => field.id === (program?.settings?.categoryFieldId || DEFAULT_CATEGORY_FIELD_ID)
  );

  const updateRubric = (updates: Partial<CategoryRubric>) => {
    setScoringConfig({
      ...scoringConfig,
      categoryRubrics: rubrics.map(rubric => (rubric.id === rubricId ? { ...rubric, ...updates } : rubric)),
    });
  };

  const setActiveCriteria = (criteria: ScoringCriteria[]) => {
    if (activeRubric) updateRubric({ criteria });
    else setScoringConfig({ ...scoringConfig, criteria });
  };

  const addRubric = () => {
    const rubric = createRubric('New Category Form', activeCriteria, Date.now());
    setScoringConfig({ ...scoringConfig, categoryRubrics: [...rubrics, rubric] });
    setRubricId(rubric.id);
  };

  const removeRubric = () => {
    if (!confirm(`Delete the reviewer form "${activeRubric?.name}"? Its entries will use the default form. Scores already submitted are kept.`)) return;
    setScoringConfig({ ...scoringConfig, categoryRubrics: rubrics.filter(rubric => rubric.id !== rubricId) });
    setRubricId('default');
  };

  const addCriteria = () => {
    const newCriteria: ScoringCriteria = {
      id: `criteria_${Date.now()}`,
      name: 'New Criteria',
      maxScore: 10,
    };
    setActiveCriteria([...activeCriteria, newCriteria]);
  };

  const updateCriteria = (index: number, updates: Partial<ScoringCriteria>) => {
    const newCriteria = [...activeCriteria];
    newCriteria[index] = { ...newCriteria[index], ...updates };
    setActiveCriteria(newCriteria);
  };

  const removeCriteria = (index: number) => {
    setActiveCriteria(activeCriteria.filter((_, i) => i !== index));
  };

  const moveCriteria = (index: number, to: number) => {
    const newCriteria = [...activeCriteria];
    [newCriteria[index], newCriteria[to]] = [newCriteria[to], newCriteria[index]];
    setActiveCriteria(newCriteria);
  };

  const handleSave = (expectedRevision = baseRevision) => {
    if (!name.trim()) {
      toast.error('Program name is required');
      return;
    }
    const problems = [...validateFormFields(formConfig.fields), ...validateRubrics(scoringConfig)];
    if (problems.length > 0) {
      toast.error(problems[0], { description: problems.length > 1 ? `${problems.length - 1} more issue(s) to fix before saving.` : undefined });
      return;
    }
    const fields = formConfig.fields.map(field =>
      isChoiceField(field)
        ? { ...field, options: assignOptionValues((field.options ?? []).map(option => ({ ...option, label: option.label.trim() }))) }
        : field
    );
    updateMutation.mutate({
      id: programId,
      name: name.trim(),
      description,
      formConfig: { ...formConfig, fields },
      scoringConfig,
      expectedRevision,
    });
  };

  const replaceWithMine = async () => {
    setConflict(false);
    const latest = await refetch();
    if (latest.data) handleSave(latest.data.revision);
  };

  const loadLatest = async () => {
    setConflict(false);
    const latest = await refetch();
    if (latest.data) loadProgram(latest.data);
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
            <p className="text-muted-foreground">Configure program details, form fields and scoring criteria</p>
          </div>
          <div className="flex items-center gap-2">
            <StaffDraftStatusLabel status={draft.status} savedAt={draft.savedAt} />
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
            <Button onClick={() => handleSave()} disabled={updateMutation.isPending}>
              <Save className="h-4 w-4 mr-2" />
              {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>

        {/* Program Sub-Navigation */}
        <ProgramSubNav programId={programId} programType={program.programType} activeTab="form-builder" />

        <StaffDraftNote saveLabel="Save Changes" />
        {draft.restoredFrom && (
          <StaffDraftRestored
            updatedAt={draft.restoredFrom.updatedAt}
            outdated={draft.restoredFrom.outdated}
            saveLabel="Save Changes"
            onDiscard={draft.discard}
          />
        )}
        <EditConflictDialog
          open={conflict}
          onKeepEditing={() => setConflict(false)}
          onOverwrite={replaceWithMine}
          onLoadLatest={loadLatest}
        />

        <Tabs defaultValue={initialTab} className="space-y-4">
          <TabsList>
            <TabsTrigger value="details">Program Details</TabsTrigger>
            <TabsTrigger value="form">Form Builder</TabsTrigger>
            <TabsTrigger value="scoring">Scoring Criteria</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Program Details</CardTitle>
                <CardDescription>
                  The name and description applicants see at the top of the public form.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="program-name">Program Name</Label>
                  <Input
                    id="program-name"
                    value={name}
                    maxLength={255}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="program-description">Description</Label>
                  <Textarea
                    id="program-description"
                    value={description}
                    rows={10}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Explain the program, nomination categories and who is eligible to apply..."
                  />
                  <p className="text-sm text-muted-foreground">
                    Line breaks and blank lines between paragraphs are kept on the public page.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Public Link</Label>
                  <p className="text-sm font-mono break-all">{window.location.origin}/apply/{program.slug}</p>
                  <p className="text-sm text-muted-foreground">
                    Changing the name does not change this link, so links already shared keep working.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="form" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Application Form Fields</CardTitle>
                <CardDescription>
                  Define the fields applicants will fill out. Drag the handle or use the arrows to reorder.
                  A Section Heading starts a new step of the form and moves together with the questions under it.
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
                  formConfig.fields.map((field, index) => {
                    const isHeading = field.type === 'heading';
                    const sectionSize = isHeading ? getBlockRange(formConfig.fields, index)[1] - index - 1 : 0;
                    const isDragged = !!draggedRange && index >= draggedRange[0] && index < draggedRange[1];
                    return (
                    <div
                      key={field.id}
                      data-field-row
                      onDragOver={(e) => {
                        if (dragIndex === null) return;
                        e.preventDefault();
                        e.dataTransfer.dropEffect = 'move';
                        if (dropIndex !== index) setDropIndex(index);
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        if (dragIndex !== null) setFields(dropField(formConfig.fields, dragIndex, index));
                        endDrag();
                      }}
                      className={`flex items-start gap-4 p-4 border rounded-lg ${
                        isHeading ? 'bg-primary/5 border-primary/40 mt-6 first:mt-0' : 'bg-muted/30'
                      } ${isDragged ? 'opacity-50' : ''} ${
                        dropIndex === index && dragIndex !== null && !isDragged ? 'ring-2 ring-primary' : ''
                      }`}
                    >
                      <div className="flex flex-col items-center gap-1 pt-1">
                        {/* The grip itself is the drag source: browsers do not reliably start a
                            drag from a button, and the inputs in the row must stay selectable.
                            Keyboard users move rows with the arrow buttons below. */}
                        <div
                          draggable
                          className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
                          aria-label={isHeading ? 'Drag to move this section' : 'Drag to move this field'}
                          title={isHeading ? 'Drag to move this section and its questions' : 'Drag to move this field'}
                          onDragStart={(e) => {
                            e.dataTransfer.effectAllowed = 'move';
                            e.dataTransfer.setData('text/plain', field.id);
                            const row = e.currentTarget.closest('[data-field-row]');
                            if (row) e.dataTransfer.setDragImage(row, 16, 16);
                            setDragIndex(index);
                          }}
                          onDragEnd={endDrag}
                        >
                          <GripVertical className="h-5 w-5" />
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          aria-label={isHeading ? 'Move section up' : 'Move field up'}
                          title={isHeading ? 'Move section up' : 'Move field up'}
                          disabled={!canMove(formConfig.fields, index, 'up')}
                          onClick={() => setFields(moveField(formConfig.fields, index, 'up'))}
                        >
                          <ArrowUp className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          aria-label={isHeading ? 'Move section down' : 'Move field down'}
                          title={isHeading ? 'Move section down' : 'Move field down'}
                          disabled={!canMove(formConfig.fields, index, 'down')}
                          onClick={() => setFields(moveField(formConfig.fields, index, 'down'))}
                        >
                          <ArrowDown className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="flex-1 space-y-4">
                      {isHeading && (
                        <Badge variant="secondary">
                          Section · {sectionSize} {sectionSize === 1 ? 'question' : 'questions'} move with it
                        </Badge>
                      )}
                      <div className="grid gap-4 md:grid-cols-3">
                        <div className="space-y-2">
                          <Label>{isHeading ? 'Section Title' : field.type === 'instructions' ? 'Title (Optional)' : 'Field Label'}</Label>
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
                            <option value="file">File Upload</option>
                            <option value="heading">Section Heading</option>
                            <option value="instructions">Instruction Text</option>
                          </select>
                        </div>
                        <div className="flex items-end gap-4">
                          {!isHeading && field.type !== 'instructions' && (
                            <div className="flex items-center gap-2">
                              <Switch
                                checked={field.required}
                                onCheckedChange={(checked) => updateField(index, { required: checked })}
                              />
                              <Label>Required</Label>
                            </div>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive"
                            aria-label={isHeading ? 'Delete section heading' : 'Delete field'}
                            onClick={() => removeField(index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      {field.type === 'instructions' && (
                        <div className="space-y-2">
                          <Label>Instruction Text</Label>
                          <Textarea
                            rows={6}
                            value={field.content ?? ''}
                            onChange={(e) => updateField(index, { content: e.target.value })}
                          />
                          <p className="text-xs text-muted-foreground">
                            Start a line with "- " for a bullet point. Put **double stars** around words for bold.
                          </p>
                        </div>
                      )}
                      {!isHeading && field.type !== 'instructions' && (
                        <div className="space-y-2">
                          <Label>Help Text (Optional)</Label>
                          <Input
                            value={field.helpText ?? ''}
                            onChange={(e) => updateField(index, { helpText: e.target.value })}
                          />
                        </div>
                      )}
                      {field.type === 'file' && (
                        <div className="space-y-2">
                          <Label>Accepted File Types</Label>
                          <Input
                            key={(field.fileTypes ?? DEFAULT_FILE_TYPES).join()}
                            defaultValue={(field.fileTypes ?? DEFAULT_FILE_TYPES).join(', ')}
                            onBlur={(e) => updateField(index, {
                              fileTypes: e.target.value.toLowerCase().split(/[\s,]+/).map(type => type.replace(/^\./, '')).filter(Boolean),
                            })}
                          />
                          <p className="text-xs text-muted-foreground">Separate with commas. Each file can be up to {MAX_UPLOAD_MB} MB.</p>
                        </div>
                      )}
                      <ConditionEditor
                        field={field}
                        fields={formConfig.fields}
                        onChange={(conditionalOn) => updateField(index, { conditionalOn })}
                      />
                      {isChoiceField(field) && (
                        <div className="space-y-2 rounded-md border bg-background p-3">
                          <Label>Choices</Label>
                          {(field.options ?? []).map((option, optionIndex, options) => (
                            <div key={optionIndex} className="flex items-center gap-2">
                              <Input
                                value={option.label}
                                placeholder={`Choice ${optionIndex + 1}`}
                                aria-label={`Choice ${optionIndex + 1}`}
                                onChange={(e) => updateOptions(index, opts => {
                                  opts[optionIndex] = { ...opts[optionIndex], label: e.target.value };
                                  return opts;
                                })}
                              />
                              <Button
                                variant="ghost"
                                size="icon"
                                className="shrink-0"
                                aria-label="Move choice up"
                                disabled={optionIndex === 0}
                                onClick={() => updateOptions(index, opts => moveOption(opts, optionIndex, optionIndex - 1))}
                              >
                                <ArrowUp className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="shrink-0"
                                aria-label="Move choice down"
                                disabled={optionIndex === options.length - 1}
                                onClick={() => updateOptions(index, opts => moveOption(opts, optionIndex, optionIndex + 1))}
                              >
                                <ArrowDown className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="shrink-0 text-destructive"
                                aria-label="Remove choice"
                                onClick={() => {
                                  if (option.value && !confirm(`Remove "${option.label || 'this choice'}"? Applications that already chose it keep their answer, but it will no longer be offered.`)) return;
                                  updateOptions(index, opts => opts.filter((_, i) => i !== optionIndex));
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => updateOptions(index, opts => [...opts, { value: '', label: '' }])}
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Add Choice
                          </Button>
                          <p className="text-xs text-muted-foreground">
                            Renaming a choice keeps earlier answers linked to it.
                          </p>
                        </div>
                      )}
                      </div>
                    </div>
                    );
                  })
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
                <CardTitle>Reviewer Forms</CardTitle>
                <CardDescription>
                  Define how reviewers will score applications. Each entry uses the form for its category, or the default form if none applies.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3 rounded-md border bg-muted/30 p-4">
                  <div className="flex flex-wrap items-end gap-3">
                    <div className="space-y-2 flex-1 min-w-56">
                      <Label htmlFor="reviewer-form">Reviewer Form</Label>
                      <select
                        id="reviewer-form"
                        className="w-full h-10 px-3 rounded-md border bg-background"
                        value={activeRubric ? rubricId : 'default'}
                        onChange={(e) => setRubricId(e.target.value)}
                      >
                        <option value="default">Default form</option>
                        {rubrics.map(rubric => <option key={rubric.id} value={rubric.id}>{rubric.name}</option>)}
                      </select>
                    </div>
                    <Button variant="outline" onClick={addRubric}>
                      <Copy className="h-4 w-4 mr-2" />
                      Copy Into New Category Form
                    </Button>
                    {activeRubric && (
                      <Button variant="ghost" className="text-destructive" onClick={removeRubric}>
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete This Form
                      </Button>
                    )}
                  </div>
                  {activeRubric && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="rubric-name">Form Name</Label>
                        <Input
                          id="rubric-name"
                          value={activeRubric.name}
                          onChange={(e) => updateRubric({ name: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Used For These Categories</Label>
                        {(categoryField?.options ?? []).filter(option => option.value).map(option => (
                          <label key={option.value} className="flex items-center gap-2 text-sm">
                            <input
                              type="checkbox"
                              checked={activeRubric.categoryValues.includes(option.value)}
                              onChange={(e) => updateRubric({
                                categoryValues: e.target.checked
                                  ? [...activeRubric.categoryValues, option.value]
                                  : activeRubric.categoryValues.filter(value => value !== option.value),
                              })}
                            />
                            {option.label}
                          </label>
                        ))}
                        {!categoryField?.options?.length && (
                          <p className="text-sm text-muted-foreground">
                            Add the award categories to this program's form first, then save.
                          </p>
                        )}
                      </div>
                    </>
                  )}
                </div>
                {activeCriteria.length === 0 ? (
                  <div className="text-center py-8 border-2 border-dashed rounded-lg">
                    <p className="text-muted-foreground mb-4">No scoring criteria defined</p>
                    <Button onClick={addCriteria}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add First Criteria
                    </Button>
                  </div>
                ) : (
                  activeCriteria.map((criteria, index) => (
                    <div key={criteria.id} className="flex items-start gap-4 p-4 border rounded-lg bg-muted/30">
                      <div className="flex flex-col gap-1 pt-6">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          aria-label="Move question up"
                          disabled={index === 0}
                          onClick={() => moveCriteria(index, index - 1)}
                        >
                          <ArrowUp className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          aria-label="Move question down"
                          disabled={index === activeCriteria.length - 1}
                          onClick={() => moveCriteria(index, index + 1)}
                        >
                          <ArrowDown className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="flex-1 grid gap-4 md:grid-cols-3">
                        <div className="space-y-2">
                          <Label>Question</Label>
                          <Textarea
                            rows={3}
                            value={criteria.name}
                            onChange={(e) => updateCriteria(index, { name: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 pb-1">
                            <Switch
                              checked={!!criteria.commentOnly}
                              onCheckedChange={(checked) => updateCriteria(index, { commentOnly: checked })}
                            />
                            <Label>Comment Only (No Rating)</Label>
                          </div>
                          {criteria.commentOnly ? (
                            <p className="text-xs text-muted-foreground">Optional for reviewers. Not included in scores.</p>
                          ) : (
                          <>
                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-2">
                              <Label>Lowest Score</Label>
                              <Input
                                type="number"
                                value={criteria.minScore ?? 0}
                                onChange={(e) => updateCriteria(index, { minScore: parseInt(e.target.value) || 0 })}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Highest Score</Label>
                              <Input
                                type="number"
                                value={criteria.maxScore}
                                onChange={(e) => updateCriteria(index, { maxScore: parseInt(e.target.value) })}
                              />
                            </div>
                          </div>
                          <div className="flex items-center gap-2 pt-1">
                            <Switch
                              checked={!!criteria.commentRequired}
                              onCheckedChange={(checked) => updateCriteria(index, { commentRequired: checked })}
                            />
                            <Label>Comment Required</Label>
                          </div>
                          </>
                          )}
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
                {activeCriteria.length > 0 && (
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

/** Limits a question, block or whole section to certain answers of a choice question. */
function ConditionEditor({ field, fields, onChange }: {
  field: FormField;
  fields: FormField[];
  onChange: (condition: FormField['conditionalOn']) => void;
}) {
  const sources = fields.filter(item => isChoiceField(item) && item.id !== field.id);
  if (sources.length === 0) return null;
  const source = sources.find(item => item.id === field.conditionalOn?.fieldId);
  const selected = conditionValues(field);
  return (
    <div className="space-y-2">
      <Label>{field.type === 'heading' ? 'Show This Section' : 'Show This'}</Label>
      <select
        className="w-full h-10 px-3 rounded-md border bg-background"
        aria-label={`Show condition for ${field.label || 'this block'}`}
        value={field.conditionalOn?.fieldId ?? ''}
        onChange={(e) => onChange(e.target.value ? { fieldId: e.target.value, value: [] } : undefined)}
      >
        <option value="">Always</option>
        {sources.map(item => <option key={item.id} value={item.id}>Only when: {item.label}</option>)}
      </select>
      {source && (
        <div className="space-y-1 pl-1">
          {(source.options ?? []).filter(option => option.value).map(option => (
            <label key={option.value} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={selected.includes(option.value)}
                onChange={(e) => onChange({
                  fieldId: source.id,
                  value: e.target.checked ? [...selected, option.value] : selected.filter(value => value !== option.value),
                })}
              />
              {option.label}
            </label>
          ))}
          <p className="text-xs text-muted-foreground">New choices appear here after you save the form.</p>
        </div>
      )}
    </div>
  );
}
