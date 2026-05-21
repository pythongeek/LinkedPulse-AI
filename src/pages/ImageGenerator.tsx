import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { imageApi, personaApi } from '../services/api';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import {
  Loader2, ImageIcon, Download, Sparkles, Wand2, Copy,
  LayoutTemplate, MonitorSpeaker, BookOpen, Image, PanelLeft
} from 'lucide-react';

// LinkedIn image spec definitions (matches backend)
const LINKEDIN_PURPOSES = [
  {
    value: 'feed_post',
    label: 'Feed Post',
    dimensions: '1200 × 627',
    ratio: '1.91:1',
    description: 'Standard LinkedIn feed post image',
    icon: '📰',
  },
  {
    value: 'carousel_cover',
    label: 'Carousel Cover',
    dimensions: '1080 × 1080',
    ratio: '1:1',
    description: 'First slide cover of a carousel post',
    icon: '🎠',
  },
  {
    value: 'carousel_slide',
    label: 'Carousel Slide',
    dimensions: '1080 × 1080',
    ratio: '1:1',
    description: 'Content slide inside a carousel',
    icon: '📑',
  },
  {
    value: 'article_cover',
    label: 'Article Cover',
    dimensions: '1920 × 1080',
    ratio: '16:9',
    description: 'Newsletter or article header image',
    icon: '📰',
  },
  {
    value: 'banner',
    label: 'Profile Banner',
    dimensions: '1584 × 396',
    ratio: '4:1',
    description: 'LinkedIn profile or company banner',
    icon: '🖼️',
  },
];

const HOOK_FORMULAS = [
  { value: 'statistic', label: '📊 Statistic', desc: 'Data-viz aesthetic, analytical layout' },
  { value: 'story', label: '📖 Story', desc: 'Warm editorial, narrative composition' },
  { value: 'contrarian', label: '⚡ Contrarian', desc: 'Split design, tension-creating contrast' },
  { value: 'question', label: '❓ Question', desc: 'Open space, curiosity-inducing' },
  { value: 'bold_claim', label: '💥 Bold Claim', desc: 'Single powerful element, declarative' },
  { value: 'how_to', label: '🛠️ How-To', desc: 'Step-by-step, process diagram feel' },
  { value: 'listicle', label: '📋 Listicle', desc: 'Grid layout, organized tile design' },
];

const STYLES = [
  { value: 'minimalist', label: 'Minimalist' },
  { value: 'tech', label: 'Tech / Dark' },
  { value: 'corporate', label: 'Corporate' },
  { value: 'creative', label: 'Creative / Bold' },
  { value: 'bold', label: 'Bold Statement' },
  { value: 'warm', label: 'Warm / Human' },
  { value: 'data_driven', label: 'Data-Driven' },
];

export default function ImageGenerator() {
  const [mode, setMode] = useState<'linkedin' | 'custom'>('linkedin');
  const [topic, setTopic] = useState('');
  const [customPrompt, setCustomPrompt] = useState('');
  const [selectedPurpose, setSelectedPurpose] = useState('feed_post');
  const [selectedPersonaId, setSelectedPersonaId] = useState('');
  const [selectedHook, setSelectedHook] = useState('');
  const [selectedStyle, setSelectedStyle] = useState('minimalist');
  const [count, setCount] = useState([2]);
  const [campaignId, setCampaignId] = useState('');
  const [generatedImages, setGeneratedImages] = useState<string[]>([]);
  const [aiPromptLoading, setAiPromptLoading] = useState(false);

  // Fetch personas for dropdown
  const { data: personas } = useQuery({
    queryKey: ['personas'],
    queryFn: () => personaApi.getAll().then((r) => r.data.personas || []),
  });

  const generateMutation = useMutation({
    mutationFn: (data: any) => imageApi.generate(data),
    onSuccess: (res) => {
      setGeneratedImages(res.data.images || []);
      toast.success(`${res.data.images?.length || 0} image(s) generated!`);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || 'Generation failed');
    },
  });

  const handleGenerate = () => {
    if (mode === 'linkedin') {
      if (!topic.trim()) { toast.error('Please enter a topic'); return; }
      generateMutation.mutate({
        prompt: topic,
        purpose: selectedPurpose,
        personaId: selectedPersonaId || undefined,
        hookFormula: selectedHook || undefined,
        campaignId: campaignId || `campaign-${topic.slice(0, 20).replace(/[^a-z0-9]/gi, '-')}`,
        count: count[0],
      });
    } else {
      if (!customPrompt.trim()) { toast.error('Please enter a prompt'); return; }
      generateMutation.mutate({
        prompt: customPrompt,
        style: selectedStyle,
        count: count[0],
      });
    }
  };

  // Use Gemini to turn a topic description into a structured image prompt
  const handleAIPromptGenerate = async () => {
    if (!topic.trim()) { toast.error('Enter a topic first'); return; }
    setAiPromptLoading(true);
    try {
      const res = await imageApi.generate({
        prompt: topic,
        purpose: selectedPurpose,
        personaId: selectedPersonaId || undefined,
        hookFormula: selectedHook || undefined,
        count: 0, // count=0 signals preview-only mode (we'll just get the prompt back)
      });
      // The route returns the prompt used
      if (res.data.prompt) {
        setCustomPrompt(res.data.prompt);
        setMode('custom');
        toast.success('AI prompt generated! Switch to Custom mode to edit it.');
      }
    } catch {
      toast.error('Failed to generate AI prompt');
    } finally {
      setAiPromptLoading(false);
    }
  };

  const copyImage = async (src: string) => {
    try {
      const response = await fetch(src);
      const blob = await response.blob();
      await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
      toast.success('Image copied to clipboard!');
    } catch {
      toast.info('Right-click the image to copy it');
    }
  };

  const downloadImage = (src: string, index: number) => {
    const link = document.createElement('a');
    link.href = src;
    link.download = `linkedin-image-${selectedPurpose}-${index + 1}.jpg`;
    link.click();
  };

  const purposeSpec = LINKEDIN_PURPOSES.find(p => p.value === selectedPurpose);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">AI Image Generator</h1>
        <p className="text-muted-foreground">
          LinkedIn-spec images powered by Gemini 2.5 Flash · Fal.ai · Stable Diffusion
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Controls — 2 cols */}
        <div className="lg:col-span-2 space-y-5">
          <Tabs value={mode} onValueChange={(v) => setMode(v as 'linkedin' | 'custom')}>
            <TabsList className="w-full">
              <TabsTrigger value="linkedin" className="flex-1 gap-2">
                <LayoutTemplate className="w-4 h-4" /> LinkedIn Spec
              </TabsTrigger>
              <TabsTrigger value="custom" className="flex-1 gap-2">
                <Wand2 className="w-4 h-4" /> Custom Prompt
              </TabsTrigger>
            </TabsList>

            {/* LinkedIn Mode */}
            <TabsContent value="linkedin" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Topic / Subject</Label>
                <Textarea
                  placeholder="e.g. AI in healthcare, leadership transformation, startup growth..."
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  rows={3}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAIPromptGenerate}
                  disabled={aiPromptLoading || !topic}
                  className="w-full gap-2"
                >
                  {aiPromptLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4 text-purple-500" />
                  )}
                  AI: Build Detailed Prompt from Topic
                </Button>
              </div>

              {/* Purpose selector */}
              <div className="space-y-2">
                <Label>LinkedIn Image Purpose</Label>
                <div className="grid grid-cols-1 gap-2">
                  {LINKEDIN_PURPOSES.map((p) => (
                    <button
                      key={p.value}
                      onClick={() => setSelectedPurpose(p.value)}
                      className={`flex items-center gap-3 p-3 rounded-lg border text-left transition-all ${
                        selectedPurpose === p.value
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-950'
                          : 'border-border hover:border-blue-300'
                      }`}
                    >
                      <span className="text-2xl">{p.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{p.label}</span>
                          <Badge variant="outline" className="text-xs font-mono">{p.dimensions}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{p.description}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Hook Formula */}
              <div className="space-y-2">
                <Label>Hook Formula (visual mood)</Label>
                <Select value={selectedHook} onValueChange={setSelectedHook}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select mood (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
                    {HOOK_FORMULAS.map((h) => (
                      <SelectItem key={h.value} value={h.value}>
                        <div>
                          <div className="font-medium">{h.label}</div>
                          <div className="text-xs text-muted-foreground">{h.desc}</div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Persona */}
              <div className="space-y-2">
                <Label>Persona (visual DNA)</Label>
                <Select value={selectedPersonaId} onValueChange={setSelectedPersonaId}>
                  <SelectTrigger>
                    <SelectValue placeholder="No persona (default style)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Default style</SelectItem>
                    {personas?.map((p: any) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name} {p.isDefault ? '★' : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Persona injects your color scheme and visual style preferences
                </p>
              </div>

              {/* Campaign ID for coherence */}
              <div className="space-y-2">
                <Label>Campaign ID <span className="text-muted-foreground text-xs">(for visual coherence across posts)</span></Label>
                <Input
                  placeholder="e.g. q1-product-launch (leave blank to auto-generate)"
                  value={campaignId}
                  onChange={(e) => setCampaignId(e.target.value)}
                />
              </div>
            </TabsContent>

            {/* Custom Prompt Mode */}
            <TabsContent value="custom" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Image Prompt</Label>
                <Textarea
                  placeholder="Detailed image description... e.g. 'Abstract geometric neural network visualization, deep navy background, electric blue glowing nodes, clean minimal design, LinkedIn feed post'"
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  rows={6}
                />
              </div>
              <div className="space-y-2">
                <Label>Visual Style</Label>
                <Select value={selectedStyle} onValueChange={setSelectedStyle}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STYLES.map((s) => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </TabsContent>
          </Tabs>

          {/* Count slider */}
          <div className="space-y-3">
            <Label>Number of Images: <span className="font-bold text-primary">{count[0]}</span></Label>
            <Slider
              min={1}
              max={4}
              step={1}
              value={count}
              onValueChange={setCount}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>1</span><span>2</span><span>3</span><span>4</span>
            </div>
          </div>

          <Button
            onClick={handleGenerate}
            disabled={generateMutation.isPending}
            className="w-full h-12 text-base gap-2"
            size="lg"
          >
            {generateMutation.isPending ? (
              <><Loader2 className="h-5 w-5 animate-spin" /> Generating via AI chain...</>
            ) : (
              <><ImageIcon className="h-5 w-5" /> Generate {count[0]} Image{count[0] > 1 ? 's' : ''}</>
            )}
          </Button>

          {/* Spec info */}
          {mode === 'linkedin' && purposeSpec && (
            <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <MonitorSpeaker className="w-4 h-4 text-blue-600" />
                  <span className="font-semibold text-sm text-blue-900 dark:text-blue-100">LinkedIn Spec</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div><span className="text-muted-foreground">Dimensions:</span> <span className="font-mono font-medium">{purposeSpec.dimensions}px</span></div>
                  <div><span className="text-muted-foreground">Ratio:</span> <span className="font-mono font-medium">{purposeSpec.ratio}</span></div>
                  <div className="col-span-2"><span className="text-muted-foreground">Provider chain:</span> <span className="font-medium">Fal.ai → HuggingFace → Pollinations</span></div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Safety rules */}
          <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950">
            <CardContent className="p-4">
              <p className="text-xs font-semibold text-amber-800 dark:text-amber-200 mb-2">🛡️ LinkedIn Safety Rules Applied</p>
              <ul className="text-xs text-amber-700 dark:text-amber-300 space-y-1">
                <li>• No human faces</li>
                <li>• No stock photo clichés (handshakes, whiteboards)</li>
                <li>• No text overlay or watermarks</li>
                <li>• Professional B2B appropriate</li>
              </ul>
            </CardContent>
          </Card>
        </div>

        {/* Results — 3 cols */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ImageIcon className="h-5 w-5" /> Generated Images
            </CardTitle>
            <CardDescription>
              {generatedImages.length > 0
                ? `${generatedImages.length} image(s) ready — hover to download or copy`
                : 'Your images will appear here after generation'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {generatedImages.length > 0 ? (
              <div className={`grid gap-4 ${generatedImages.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                {generatedImages.map((image, i) => (
                  <div key={i} className="relative group rounded-xl overflow-hidden border shadow-md bg-muted">
                    <img
                      src={image}
                      alt={`Generated ${i + 1}`}
                      className="w-full object-cover"
                      style={{
                        aspectRatio: purposeSpec?.ratio?.replace(':', '/') || '16/9',
                      }}
                    />
                    {/* Hover overlay */}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => downloadImage(image, i)}
                        className="gap-1"
                      >
                        <Download className="w-4 h-4" /> Download
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => copyImage(image)}
                        className="gap-1"
                      >
                        <Copy className="w-4 h-4" /> Copy
                      </Button>
                    </div>
                    {/* Purpose badge */}
                    <div className="absolute top-2 left-2">
                      <Badge className="bg-black/70 text-white text-xs">
                        {purposeSpec?.icon} {purposeSpec?.label}
                      </Badge>
                    </div>
                    <div className="absolute bottom-2 right-2">
                      <Badge variant="secondary" className="text-xs font-mono bg-black/50 text-white">
                        {purposeSpec?.dimensions}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-24 flex flex-col items-center justify-center text-muted-foreground gap-4">
                <div className="relative">
                  <ImageIcon className="h-16 w-16 opacity-20" />
                  <Sparkles className="h-6 w-6 text-purple-400 absolute -top-2 -right-2" />
                </div>
                <div className="text-center">
                  <p className="font-medium">No images yet</p>
                  <p className="text-sm mt-1">
                    Choose a topic and LinkedIn purpose, then hit generate
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-3 w-full max-w-sm mt-4">
                  {['📰 Feed', '🎠 Carousel', '📰 Article'].map((label) => (
                    <div key={label} className="p-3 rounded-lg bg-muted/60 border text-center text-xs font-medium opacity-50">
                      {label}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
