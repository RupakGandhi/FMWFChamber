import { useState } from "react";
import { useRoute } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { CheckCircle2, Loader2, Shirt, Users, Plus, Trash2, Star } from "lucide-react";
import { toast } from "sonner";

const TSHIRT_SIZES = ["XS", "S", "M", "L", "XL", "2XL", "3XL", "4XL"];

interface Attendee {
  name: string;
  tshirtSize: string;
  relationship: "self" | "spouse" | "child" | "guest";
}

export default function ParticipantForm() {
  const [, params] = useRoute("/participant-form/:token");
  const token = params?.token || "";

  const { data: accessContext, isLoading, error } = trpc.participantForms.getAccessContext.useQuery(
    { token },
    { enabled: token.length >= 20 },
  );
  
  const submitMutation = trpc.participantForms.submit.useMutation({
    onSuccess: () => {
      setSubmitted(true);
      toast.success("Form submitted successfully!");
    },
    onError: (err) => toast.error(err.message),
  });

  const [submitted, setSubmitted] = useState(false);
  const [isCommander, setIsCommander] = useState(false);
  const [attendees, setAttendees] = useState<Attendee[]>([
    { name: "", tshirtSize: "", relationship: "self" }
  ]);
  const [form, setForm] = useState({
    participantName: "",
    namePronunciation: "",
    rank: "",
    branch: "",
    yearsOfService: "",
    dietaryRestrictions: "",
    specialNeeds: "",
  });

  const addAttendee = () => {
    setAttendees([...attendees, { name: "", tshirtSize: "", relationship: "guest" }]);
  };

  const removeAttendee = (index: number) => {
    if (index === 0) return; // Can't remove primary
    setAttendees(attendees.filter((_, i) => i !== index));
  };

  const updateAttendee = (index: number, field: keyof Attendee, value: string) => {
    const updated = [...attendees];
    updated[index] = { ...updated[index], [field]: value } as Attendee;
    setAttendees(updated);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.participantName.trim()) {
      toast.error("Please enter your full name");
      return;
    }

    // The primary attendee's name is displayed from form.participantName but
    // never written back into attendees[0], so sync it here before it's used
    // for validation or submission.
    const syncedAttendees = attendees.map((attendee, index) =>
      index === 0 ? { ...attendee, name: form.participantName } : attendee
    );

    if (syncedAttendees.some(attendee => !attendee.name.trim() || !attendee.tshirtSize)) {
      toast.error("Please provide a name and T-shirt size for every attendee");
      return;
    }

    // Submit primary participant with all structured fields
    submitMutation.mutate({
      token,
      participantName: form.participantName,
      tshirtSize: syncedAttendees[0]?.tshirtSize || undefined,
      plusOne: syncedAttendees.length > 1,
      plusOneName: syncedAttendees.length > 1 ? syncedAttendees.slice(1).map(a => a.name).join(", ") : undefined,
      plusOneTshirtSize: syncedAttendees.length > 1 ? syncedAttendees.slice(1).map(a => a.tshirtSize).join(", ") : undefined,
      namePronunciation: form.namePronunciation || undefined,
      dietaryRestrictions: form.dietaryRestrictions || undefined,
      specialNeeds: form.specialNeeds || undefined,
      isCommander,
      rank: form.rank || undefined,
      branch: form.branch || undefined,
      yearsOfService: form.yearsOfService || undefined,
      attendees: syncedAttendees.map(a => ({ name: a.name, tshirtSize: a.tshirtSize, relationship: a.relationship })),
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !accessContext) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle>Participant Form Unavailable</CardTitle>
            <CardDescription>{error?.message || "This link is invalid or no longer available."}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (accessContext.alreadySubmitted && !submitted) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="flex flex-col items-center py-12 text-center">
            <CheckCircle2 className="h-14 w-14 text-green-500 mb-4" />
            <h2 className="text-xl font-bold">Information Already Submitted</h2>
            <p className="text-muted-foreground mt-2">
              Participant details for {accessContext.programName} have already been received. Contact Chamber staff if changes are needed.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="flex flex-col items-center py-12">
            <CheckCircle2 className="h-16 w-16 text-green-500 mb-4" />
            <h2 className="text-2xl font-bold text-center">Thank You!</h2>
            <p className="text-muted-foreground text-center mt-2">
              Your participant information has been submitted successfully. We look forward to seeing you at the event!
            </p>
            <div className="mt-4 p-3 bg-muted rounded-lg text-sm text-center">
              <p className="font-medium">T-Shirts Registered: {attendees.filter(a => a.tshirtSize).length}</p>
              <p className="text-muted-foreground">Total Attendees: {attendees.length}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2 mb-2">
              <Shirt className="h-5 w-5 text-primary" />
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border bg-green-50 text-green-700 border-green-200">
                {accessContext.programName}
              </span>
            </div>
            <CardTitle>Event Registration Details</CardTitle>
            <CardDescription>
              Please provide your details and information for all attendees in your party. 
              Each attendee will receive a commemorative t-shirt.
            </CardDescription>
          </CardHeader>
        </Card>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Primary Participant Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Star className="h-4 w-4" />
                Your Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name *</Label>
                <Input
                  id="name"
                  value={form.participantName}
                  onChange={(e) => setForm({ ...form, participantName: e.target.value })}
                  placeholder="Enter your full name"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="pronunciation">Name Pronunciation</Label>
                <Input
                  id="pronunciation"
                  value={form.namePronunciation}
                  onChange={(e) => setForm({ ...form, namePronunciation: e.target.value })}
                  placeholder="How do you pronounce your name? (phonetic spelling)"
                />
                <p className="text-xs text-muted-foreground">
                  This helps us announce your name correctly at the event.
                </p>
              </div>

              {/* Commander Toggle */}
              <div className="border rounded-lg p-4 bg-muted/30">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="commander"
                    checked={isCommander}
                    onCheckedChange={(checked) => setIsCommander(!!checked)}
                  />
                  <Label htmlFor="commander" className="font-medium">I am a Commander / Senior Leader being honored</Label>
                </div>
                
                {isCommander && (
                  <div className="mt-4 space-y-3 pl-6 border-l-2 border-primary/20">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label htmlFor="rank">Rank / Title</Label>
                        <Input
                          id="rank"
                          value={form.rank}
                          onChange={(e) => setForm({ ...form, rank: e.target.value })}
                          placeholder="e.g., Colonel, Captain"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="branch">Branch of Service</Label>
                        <Select value={form.branch} onValueChange={(v) => setForm({ ...form, branch: v })}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select branch" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Army">Army</SelectItem>
                            <SelectItem value="Navy">Navy</SelectItem>
                            <SelectItem value="Air Force">Air Force</SelectItem>
                            <SelectItem value="Marines">Marines</SelectItem>
                            <SelectItem value="Coast Guard">Coast Guard</SelectItem>
                            <SelectItem value="Space Force">Space Force</SelectItem>
                            <SelectItem value="National Guard">National Guard</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="years">Years of Service</Label>
                      <Input
                        id="years"
                        value={form.yearsOfService}
                        onChange={(e) => setForm({ ...form, yearsOfService: e.target.value })}
                        placeholder="e.g., 12 years"
                      />
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Attendees & T-Shirts */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Attendees & T-Shirt Sizes
                  </CardTitle>
                  <CardDescription>
                    Add all members of your party. Each person receives a commemorative t-shirt.
                  </CardDescription>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-primary">{attendees.length}</p>
                  <p className="text-xs text-muted-foreground">Total Attendees</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {attendees.map((attendee, index) => (
                <div key={index} className="border rounded-lg p-4 relative">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-muted-foreground">
                      {index === 0 ? "You (Primary)" : `Guest ${index}`}
                    </span>
                    {index > 0 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeAttendee(index)}
                        className="text-red-500 hover:text-red-700 h-7 px-2"
                      >
                        <Trash2 className="h-3 w-3 mr-1" />
                        Remove
                      </Button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-1 space-y-1">
                      <Label className="text-xs">Name</Label>
                      <Input
                        value={index === 0 ? form.participantName : attendee.name}
                        onChange={(e) => {
                          if (index === 0) {
                            setForm({ ...form, participantName: e.target.value });
                          } else {
                            updateAttendee(index, "name", e.target.value);
                          }
                        }}
                        placeholder="Full name"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">T-Shirt Size *</Label>
                      <Select 
                        value={attendee.tshirtSize} 
                        onValueChange={(v) => updateAttendee(index, "tshirtSize", v)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Size" />
                        </SelectTrigger>
                        <SelectContent>
                          {TSHIRT_SIZES.map(size => (
                            <SelectItem key={size} value={size}>{size}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Relationship</Label>
                      <Select 
                        value={attendee.relationship} 
                        onValueChange={(v) => updateAttendee(index, "relationship", v)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="self">Self</SelectItem>
                          <SelectItem value="spouse">Spouse/Partner</SelectItem>
                          <SelectItem value="child">Child</SelectItem>
                          <SelectItem value="guest">Guest</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              ))}

              <Button
                type="button"
                variant="outline"
                onClick={addAttendee}
                className="w-full border-dashed"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Another Attendee
              </Button>

              {/* T-Shirt Summary */}
              <div className="bg-muted/50 rounded-lg p-3 mt-4">
                <p className="text-sm font-medium mb-2">T-Shirt Summary</p>
                <div className="grid grid-cols-4 gap-2 text-xs">
                  {TSHIRT_SIZES.map(size => {
                    const count = attendees.filter(a => a.tshirtSize === size).length;
                    return count > 0 ? (
                      <div key={size} className="flex justify-between bg-white rounded px-2 py-1">
                        <span>{size}</span>
                        <span className="font-bold">{count}</span>
                      </div>
                    ) : null;
                  })}
                  {attendees.filter(a => a.tshirtSize).length === 0 && (
                    <p className="col-span-4 text-muted-foreground text-center">No sizes selected yet</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Accommodations */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Additional Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="dietary">Dietary Restrictions</Label>
                <Textarea
                  id="dietary"
                  value={form.dietaryRestrictions}
                  onChange={(e) => setForm({ ...form, dietaryRestrictions: e.target.value })}
                  placeholder="Any food allergies or dietary preferences for your party?"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="special">Special Accommodations</Label>
                <Textarea
                  id="special"
                  value={form.specialNeeds}
                  onChange={(e) => setForm({ ...form, specialNeeds: e.target.value })}
                  placeholder="Any accessibility or special accommodation needs?"
                />
              </div>
            </CardContent>
          </Card>

          {/* Submit */}
          <Button 
            type="submit" 
            className="w-full h-12 text-lg" 
            disabled={!form.participantName || submitMutation.isPending}
          >
            {submitMutation.isPending && <Loader2 className="h-5 w-5 mr-2 animate-spin" />}
            Submit Registration ({attendees.length} {attendees.length === 1 ? "attendee" : "attendees"})
          </Button>
        </form>
      </div>
    </div>
  );
}
