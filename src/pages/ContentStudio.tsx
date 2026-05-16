import { useState, useEffect } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { contentApi, personaApi, jobApi } from '../services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { Loader2, Sparkles, Wand2, BookOpen, Lightbulb, TrendingUp, Search, Target, Clock, BarChart3, RefreshCw } from 'lucide-react';

const contentTypes = [
  { value: 'post', label: 'LinkedIn Post', icon: Sparkles },
  { value: 'carousel', label: 'Carousel/Slides', icon: BookOpen },
  { value: 'article', label: 'Article', icon: BookOpen },
  { value: 'poll', label: 'Poll', icon: Lightbulb },
];

export default function ContentStudio() {
  const [topic, setTopic] = useState('');
  const [contentType, setContentType] = useState('post');
  const [personaId, setPersonaId] = useState('');
  const [researchDepth, setResearchDepth] = useState('quick');
  const [keywords, setKeywords] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [includeImages] = useState(true);
  const [generatedContent, setGeneratedContent] = useState<any>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<string | null>(null);
  const [selectedHook, setSelectedHook] = useState<string>('');
  const [activeTab, setActiveTab] = useState('content');

  const { data: personas } = useQuery({
    queryKey: ['personas'],
    queryFn: () => personaApi.getAll().then((res) => res.data.personas),
  });

  // Poll for job status
  useEffect(() => {
    let interval: any;
    
    const checkStatus = async () => {
      if (!jobId) return;
      
      try {
        const res = await jobApi.getStatus(jobId);
        const job = res.data.job;
        setJobStatus(job.status);
        
        if (job.status === 'COMPLETED') {
          const contentId = job.result?.contentId;
          if (contentId) {
            const contentRes = await contentApi.getById(contentId);
            const content = contentRes.data.content;
            setGeneratedContent(content);
            setSelectedHook(content.hookSuggestions?.[0] || '');
            toast.success('Content generated successfully!');
          }
          setJobId(null);
          setIsGenerating(false);
        } else if (job.status === 'FAILED') {
          toast.error(job.error || 'Content generation failed');
          setJobId(null);
          setIsGenerating(false);
        }
      } catch (error) {
        console.error('Polling error:', error);
      }
    };

    if (jobId) {
      interval = setInterval(checkStatus, 3000);
    }

    return () => clearInterval(interval);
  }, [jobId]);

  const generateMutation = useMutation({
    mutationFn: (data: any) => contentApi.generate(data),
    onSuccess: (res) => {
      setJobId(res.data.jobId);
      setJobStatus('PENDING');
      toast.info('Generation started. This may take 1-2 minutes...');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || 'Failed to start generation');
      setIsGenerating(false);
    },
  });

  const handleGenerate = async () => {
    if (!topic) {
      toast.error('Please enter a topic');
      return;
    }

    setIsGenerating(true);
    generateMutation.mutate({
      topic,
      contentType,
      personaId: personaId || undefined,
      researchDepth,
      keywords: keywords.split(',').map(k => k.trim()).filter(Boolean),
      targetAudience: targetAudience || undefined,
      includeImages,
    });
  };

  const handleRegenerateHook = () => {
    if (!topic) return;
    // This would call a specific hook regeneration endpoint
    toast.info('Regenerating hooks...');
  };

  const getEngagementColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Content Studio</h1>
          <p className="text-muted-foreground">
            Generate AI-powered LinkedIn content with research-backed optimization
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Input Panel */}
        <Card>
          <CardHeader>
            <CardTitle>Create Content</CardTitle>
            <CardDescription>Configure your content generation with advanced options</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="topic">Topic</Label>
              <Input
                id="topic"
                placeholder="e.g., The future of AI in healthcare"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Content Type</Label>
              <Select value={contentType} onValueChange={setContentType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {contentTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      <div className="flex items-center gap-2">
                        <type.icon className="h-4 w-4" />
                        {type.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Persona</Label>
              <Select value={personaId} onValueChange={setPersonaId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a persona (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {personas?.map((persona: any) => (
                    <SelectItem key={persona.id} value={persona.id}>
                      {persona.name} {persona.isDefault && '(Default)'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Research Depth</Label>
                <Select value={researchDepth} onValueChange={setResearchDepth}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="quick">Quick (faster)</SelectItem>
                    <SelectItem value="deep">Deep (comprehensive)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Target Audience</Label>
                <Input
                  placeholder="e.g., Startup founders"
                  value={targetAudience}
                  onChange={(e) => setTargetAudience(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Keywords (comma-separated)</Label>
              <Input
                placeholder="e.g., AI, healthcare, machine learning"
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
              />
            </div>

            <Button
              onClick={handleGenerate}
              className="w-full"
              disabled={isGenerating || generateMutation.isPending}
            >
              {isGenerating || generateMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating with AI Agents...
                </>
              ) : (
                <>
                  <Wand2 className="mr-2 h-4 w-4" />
                  Generate Optimized Content
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Output Panel */}
        <Card>
          <CardHeader>
            <CardTitle>Generated Content</CardTitle>
            <CardDescription>Preview, edit, and optimize your content</CardDescription>
          </CardHeader>
          <CardContent>
            {generatedContent ? (
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-5">
                  <TabsTrigger value="content">Content</TabsTrigger>
                  <TabsTrigger value="hooks">Hooks</TabsTrigger>
                  <TabsTrigger value="research">Research</TabsTrigger>
                  <TabsTrigger value="optimize">Optimize</TabsTrigger>
                  <TabsTrigger value="sources">Sources</TabsTrigger>
                </TabsList>

                <TabsContent value="content" className="space-y-4">
                  {/* Engagement Scores */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                        <Label className="text-xs">Engagement</Label>
                      </div>
                      <div className={`text-2xl font-bold ${getEngagementColor(generatedContent.engagementPrediction)}`}>
                        {generatedContent.engagementPrediction}/100
                      </div>
                      <Progress value={generatedContent.engagementPrediction} className="h-2" />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Search className="h-4 w-4 text-muted-foreground" />
                        <Label className="text-xs">SEO Score</Label>
                      </div>
                      <div className={`text-2xl font-bold ${getEngagementColor(generatedContent.seoScore)}`}>
                        {generatedContent.seoScore}/100
                      </div>
                      <Progress value={generatedContent.seoScore} className="h-2" />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Target className="h-4 w-4 text-muted-foreground" />
                        <Label className="text-xs">Virality</Label>
                      </div>
                      <div className="text-2xl font-bold">
                        {generatedContent.competitiveAnalysis?.viralityScore || 'N/A'}
                      </div>
                      <div className="h-2 bg-muted rounded">
                        <div 
                          className={`h-2 rounded ${getScoreColor(generatedContent.competitiveAnalysis?.viralityScore || 0)}`}
                          style={{ width: `${generatedContent.competitiveAnalysis?.viralityScore || 0}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline">{generatedContent.contentType}</Badge>
                    {generatedContent.linkedinOptimization?.hashtags?.slice(0, 3).map((tag: string, i: number) => (
                      <Badge key={i} variant="secondary">{tag}</Badge>
                    ))}
                    <Badge className="gap-1">
                      <Clock className="h-3 w-3" />
                      {generatedContent.bestPostingTime || 'Best time'}
                    </Badge>
                  </div>

                  <Textarea
                    value={generatedContent.content}
                    onChange={(e) =>
                      setGeneratedContent({ ...generatedContent, content: e.target.value })
                    }
                    rows={12}
                    className="font-mono text-sm"
                  />

                  <div className="flex gap-2">
                    <Button variant="outline" className="flex-1" onClick={() => navigator.clipboard.writeText(generatedContent.content)}>
                      Copy to Clipboard
                    </Button>
                    <Button className="flex-1">Save to Library</Button>
                  </div>
                </TabsContent>

                <TabsContent value="hooks" className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>Select the best hook for your content</Label>
                    <Button variant="outline" size="sm" onClick={handleRegenerateHook}>
                      <RefreshCw className="h-3 w-3 mr-1" />
                      Regenerate
                    </Button>
                  </div>
                  
                  <div className="space-y-3">
                    {generatedContent.hookSuggestions?.map((hook: string, i: number) => (
                      <div
                        key={i}
                        className={`p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                          selectedHook === hook ? 'border-primary bg-primary/5' : 'border-muted hover:border-primary/50'
                        }`}
                        onClick={() => setSelectedHook(hook)}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                            selectedHook === hook ? 'bg-primary text-primary-foreground' : 'bg-muted'
                          }`}>
                            {i + 1}
                          </div>
                          <p className="text-sm flex-1">{hook}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <Button 
                    className="w-full" 
                    disabled={!selectedHook}
                    onClick={() => setGeneratedContent({
                      ...generatedContent,
                      content: selectedHook + '\n\n' + generatedContent.content.substring(generatedContent.content.indexOf('\n\n') + 2)
                    })}
                    onClickCapture={() => setActiveTab('content')}
                  >
                    Apply Selected Hook
                  </Button>
                </TabsContent>

                <TabsContent value="research" className="space-y-4">
                  <div className="grid gap-4 max-h-[500px] overflow-y-auto">
                    {generatedContent.researchData?.keyInsights?.map((insight: string, i: number) => (
                      <div key={i} className="p-4 rounded-lg bg-muted">
                        <div className="flex items-start gap-2">
                          <Lightbulb className="h-4 w-4 text-yellow-500 mt-1 flex-shrink-0" />
                          <p className="text-sm">{insight}</p>
                        </div>
                      </div>
                    ))}

                    {generatedContent.researchData?.statistics?.map((stat: any, i: number) => (
                      <div key={i} className="p-4 rounded-lg border">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-semibold text-lg">{stat.value}</p>
                            <p className="text-sm text-muted-foreground">{stat.fact}</p>
                          </div>
                          <Badge variant="outline" className="text-xs">{stat.source}</Badge>
                        </div>
                      </div>
                    ))}

                    {generatedContent.researchData?.caseStudies?.map((cs: any, i: number) => (
                      <div key={i} className="p-4 rounded-lg border">
                        <h4 className="font-semibold">{cs.company || cs.title}</h4>
                        <p className="text-sm text-muted-foreground mt-1">{cs.results}</p>
                        {cs.metrics && (
                          <p className="text-sm mt-2"><strong>Metrics:</strong> {cs.metrics}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="optimize" className="space-y-4">
                  <div className="grid gap-4">
                    <div className="p-4 rounded-lg border">
                      <h4 className="font-semibold flex items-center gap-2">
                        <Search className="h-4 w-4" />
                        SEO Optimization
                      </h4>
                      <div className="mt-3 space-y-2">
                        <div className="flex flex-wrap gap-2">
                          {generatedContent.linkedinOptimization?.keywords?.map((kw: any, i: number) => (
                            <Badge
                              key={i}
                              variant={kw.priority === 'high' ? 'default' : 'outline'}
                              className="text-xs"
                            >
                              {kw.keyword} {kw.searchVolume && `(${kw.searchVolume})`}
                            </Badge>
                          ))}
                        </div>
                        {generatedContent.linkedinOptimization?.hashtags && (
                                                 <div className="mt-3">
                            <p className="text-xs text-muted-foreground mb-1">Hashtags:</p>
                            <p className="text-sm">{generatedContent.linkedinOptimization.hashtags.join(' ')}</p>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="p-4 rounded-lg border">
                      <h4 className="font-semibold flex items-center gap-2">
                        <BarChart3 className="h-4 w-4" />
                        Competitive Analysis
                      </h4>
                      <div className="mt-3 space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span>Best performing format:</span>
                          <Badge>{generatedContent.competitiveAnalysis?.winningFormats?.[0] || 'Post'}</Badge>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span>Optimal length:</span>
                          <span className="text-muted-foreground">{generatedContent.competitiveAnalysis?.optimalLength || 'N/A'}</span>
                        </div>
                        {generatedContent.competitiveAnalysis?.engagementDrivers && (
                          <div className="mt-2">
                            <p className="text-xs text-muted-foreground mb-1">Key engagement drivers:</p>
                            <ul className="text-xs list-disc list-inside">
                              {generatedContent.competitiveAnalysis.engagementDrivers.slice(0, 3).map((driver: string, i: number) => (
                                <li key={i}>{driver}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="p-4 rounded-lg border">
                      <h4 className="font-semibold flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        Best Time to Post
                      </h4>
                      <p className="text-sm mt-2">{generatedContent.bestPostingTime}</p>
                    </div>

                    {generatedContent.competitiveAnalysis?.bestPractices && (
                      <div className="p-4 rounded-lg border">
                        <h4 className="font-semibold">Best Practices</h4>
                        <ul className="mt-2 space-y-1">
                          {generatedContent.competitiveAnalysis.bestPractices.slice(0, 5).map((practice: string, i: number) => (
                            <li key={i} className="text-sm flex items-start gap-2">
                              <span className="text-green-500">✓</span>
                              {practice}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="sources" className="space-y-2">
                  <div className="space-y-2 max-h-[400px] overflow-y-auto">
                    {generatedContent.sources?.map((source: any, i: number) => (
                      <div key={i} className="flex items-center gap-3 p-3 rounded-lg border">
                        <div className="flex-1">
                          <p className="text-sm font-medium">{source.title}</p>
                          {source.url && (
                            <a
                              href={source.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-primary hover:underline"
                            >
                              {new URL(source.url).hostname}
                            </a>
                          )}
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {source.credibility || 'Medium'}
                        </Badge>
                      </div>
                    ))}
                    
                    {generatedContent.researchData?.expertOpinions?.map((expert: any, i: number) => (
                      <div key={`expert-${i}`} className="flex items-center gap-3 p-3 rounded-lg border bg-muted/50">
                        <div className="flex-1">
                          <p className="text-sm font-medium">{expert.expert}</p>
                          <p className="text-xs text-muted-foreground">"{expert.opinion?.substring(0, 100)}..."</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </TabsContent>
              </Tabs>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Sparkles className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Your AI-generated content will appear here</p>
                <p className="text-xs mt-2">Research • SEO • Hooks • Optimization</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
