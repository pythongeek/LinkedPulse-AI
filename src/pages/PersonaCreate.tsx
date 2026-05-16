import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { personaApi } from '../services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Loader2, Plus, X } from 'lucide-react';

const tones = [
  { value: 'analytical', label: 'Analytical & Direct' },
  { value: 'provocative', label: 'Provocative & Bold' },
  { value: 'friendly', label: 'Friendly & Approachable' },
  { value: 'professional', label: 'Professional & Polished' },
  { value: 'casual', label: 'Casual & Relaxed' },
  { value: 'inspirational', label: 'Inspirational & Motivating' },
];

const visualStyles = [
  { value: 'minimalist', label: 'Minimalist' },
  { value: 'tech', label: 'Tech/Futuristic' },
  { value: 'corporate', label: 'Corporate' },
  { value: 'creative', label: 'Creative' },
  { value: 'bold', label: 'Bold' },
];

export default function PersonaCreate() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = !!id;

  const [name, setName] = useState('');
  const [jobRole, setJobRole] = useState('');
  const [expertiseNodes, setExpertiseNodes] = useState<string[]>([]);
  const [newExpertise, setNewExpertise] = useState('');
  const [experienceVault, setExperienceVault] = useState('');
  const [tone, setTone] = useState('professional');
  const [visualStyle, setVisualStyle] = useState('minimalist');
  const [colorScheme, setColorScheme] = useState('Blue and white');
  const [aesthetics, setAesthetics] = useState('Clean and professional');
  const [isDefault, setIsDefault] = useState(false);

  const { isLoading: isLoadingPersona } = useQuery({
    queryKey: ['persona', id],
    queryFn: () => personaApi.getById(id!).then((res) => res.data.persona),
    enabled: isEditing,
  });

  const createMutation = useMutation({
    mutationFn: (data: any) =>
      isEditing ? personaApi.update(id!, data) : personaApi.create(data),
    onSuccess: () => {
      toast.success(isEditing ? 'Persona updated!' : 'Persona created!');
      navigate('/personas');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || 'Failed to save persona');
    },
  });

  const handleAddExpertise = () => {
    if (newExpertise && !expertiseNodes.includes(newExpertise)) {
      setExpertiseNodes([...expertiseNodes, newExpertise]);
      setNewExpertise('');
    }
  };

  const handleRemoveExpertise = (expertise: string) => {
    setExpertiseNodes(expertiseNodes.filter((e) => e !== expertise));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (expertiseNodes.length === 0) {
      toast.error('Add at least one expertise');
      return;
    }

    createMutation.mutate({
      name,
      jobRole,
      expertiseNodes,
      experienceVault,
      tone,
      visualDNA: {
        style: visualStyle,
        colorScheme,
        aesthetics,
      },
      isDefault,
    });
  };

  if (isEditing && isLoadingPersona) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">
          {isEditing ? 'Edit Persona' : 'Create Persona'}
        </h1>
        <p className="text-muted-foreground">
          Define your AI content persona for authentic LinkedIn posts
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>Who is this persona?</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Persona Name</Label>
                <Input
                  id="name"
                  placeholder="e.g., Tech Founder Alex"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="jobRole">Job Role / Title</Label>
                <Input
                  id="jobRole"
                  placeholder="e.g., SaaS Entrepreneur & Startup Advisor"
                  value={jobRole}
                  onChange={(e) => setJobRole(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Expertise Areas</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Add expertise (e.g., Programmatic SEO)"
                    value={newExpertise}
                    onChange={(e) => setNewExpertise(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddExpertise())}
                  />
                  <Button type="button" onClick={handleAddExpertise} variant="outline">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {expertiseNodes.map((expertise) => (
                    <Badge key={expertise} variant="secondary" className="gap-1">
                      {expertise}
                      <button
                        type="button"
                        onClick={() => handleRemoveExpertise(expertise)}
                        className="ml-1 hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Experience & Background</CardTitle>
              <CardDescription>What makes this persona unique?</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="experience">Experience Vault</Label>
                <Textarea
                  id="experience"
                  placeholder="Describe key experiences, achievements, war stories, and unique perspectives..."
                  value={experienceVault}
                  onChange={(e) => setExperienceVault(e.target.value)}
                  rows={6}
                />
                <p className="text-xs text-muted-foreground">
                  This helps the AI create authentic content based on real experiences
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Voice & Style</CardTitle>
              <CardDescription>How should this persona communicate?</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="tone">Tone of Voice</Label>
                <Select value={tone} onValueChange={setTone}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {tones.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="visualStyle">Visual Style</Label>
                <Select value={visualStyle} onValueChange={setVisualStyle}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {visualStyles.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="colorScheme">Color Scheme</Label>
                <Input
                  id="colorScheme"
                  placeholder="e.g., Dark blue with neon accents"
                  value={colorScheme}
                  onChange={(e) => setColorScheme(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="aesthetics">Aesthetics</Label>
                <Input
                  id="aesthetics"
                  placeholder="e.g., Modern, minimalist, professional"
                  value={aesthetics}
                  onChange={(e) => setAesthetics(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="default"
                  checked={isDefault}
                  onCheckedChange={(checked) => setIsDefault(checked as boolean)}
                />
                <Label htmlFor="default" className="font-normal">
                  Set as default persona
                </Label>
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-4">
            <Button
              type="submit"
              className="flex-1"
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                isEditing ? 'Update Persona' : 'Create Persona'
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/personas')}
            >
              Cancel
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
