import { useState, useEffect } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { contentApi, personaApi, jobApi, linkedinApi } from '../services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import {
  Loader2,
  Sparkles,
  Wand2,
  BookOpen,
  Lightbulb,
  TrendingUp,
  Search,
  Target,
  Clock,
  BarChart3,
  RefreshCw,
  Copy,
  ChevronRight,
  Eye,
  FileText,
  User,
  Sliders,
  CheckSquare
} from 'lucide-react';

import { CONTENT_TYPE_CONFIGS, PHASE_LABELS } from '@/config/contentTypeConfig';
import { CharacterCounter } from '@/components/studio/CharacterCounter';
import { PostFields } from '@/components/studio/fields/PostFields';
import { CarouselFields } from '@/components/studio/fields/CarouselFields';
import { ArticleFields } from '@/components/studio/fields/ArticleFields';
import { PollFields } from '@/components/studio/fields/PollFields';
import { LinkedInPreview } from '@/components/studio/LinkedInPreview';
import { ContentHealthScore } from '@/components/studio/ContentHealthScore';
import { GenerationProgress } from '@/components/studio/GenerationProgress';
import { PrePublishChecklist } from '@/components/studio/PrePublishChecklist';
import { SlideEditor } from '@/components/studio/SlideEditor';

export default function ContentStudio() {
  const [topic, setTopic] = useState('');
  const [contentType, setContentType] = useState('post');
  const [personaId, setPersonaId] = useState('');
  const [researchDepth, setResearchDepth] = useState('quick');
  const [keywords, setKeywords] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [includeImages] = useState(true);
  
  // Advanced configuration states
  const [hookFormula, setHookFormula] = useState('question');
  const [ctaType, setCtaType] = useState('comment');
  const [emojiBudget, setEmojiBudget] = useState(3);
  const [linkToInclude, setLinkToInclude] = useState('');
  const [slideCount, setSlideCount] = useState(10);
  const [pollDuration, setPollDuration] = useState('1_week');
  const [optionCount, setOptionCount] = useState(4);
  const [articleTitle, setArticleTitle] = useState('');
  const [articleTargetWords, setArticleTargetWords] = useState(1500);
  const [includeFirstComment, setIncludeFirstComment] = useState(true);
  const [toneOverride, setToneOverride] = useState('');
  const [audienceExpertiseLevel, setAudienceExpertiseLevel] = useState('intermediate');

  const config = CONTENT_TYPE_CONFIGS[contentType];
  const [customInstructions, setCustomInstructions] = useState(config?.defaultPrompt || '');
  const [generatedContent, setGeneratedContent] = useState<any>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [selectedHook, setSelectedHook] = useState<string>('');
  const [activeTab, setActiveTab] = useState('content');

  // Keep instructions in sync on content type changes
  useEffect(() => {
    const activeConfig = CONTENT_TYPE_CONFIGS[contentType];
    if (activeConfig) {
      setCustomInstructions(activeConfig.defaultPrompt);
    }
  }, [contentType]);

  const [jobPhase, setJobPhase] = useState<number>(0);
  const [jobTotalPhases, setJobTotalPhases] = useState<number>(1);
  const [isPublishing, setIsPublishing] = useState(false);

  const { data: linkedinStatus } = useQuery({
    queryKey: ['linkedinStatus'],
    queryFn: () => linkedinApi.getStatus().then((res) => res.data),
  });

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
        if (job.phase !== undefined) setJobPhase(job.phase);
        if (job.totalPhases !== undefined) setJobTotalPhases(job.totalPhases);
        
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
      toast.info('Generation enqueued. Multi-agent pipeline starting...');
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
      keywords: keywords.split(',').map((k) => k.trim()).filter(Boolean),
      targetAudience: targetAudience || undefined,
      includeImages,
      customInstructions: customInstructions || undefined,
      // Enhanced parameters
      hookFormula,
      ctaType,
      emojiBudget,
      slideCount,
      pollDuration,
      articleTargetWords,
      includeFirstComment,
      linkToInclude,
      toneOverride,
      audienceExpertiseLevel,
    });
  };

  const handlePublish = async () => {
    if (!generatedContent?.id) {
      toast.error('No content ID found to publish');
      return;
    }
    
    setIsPublishing(true);
    try {
      await contentApi.publish(generatedContent.id);
      toast.success('Successfully published to LinkedIn!');
      setGeneratedContent({ ...generatedContent, status: 'published' });
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Failed to publish to LinkedIn');
    } finally {
      setIsPublishing(false);
    }
  };

  const handleCopyCleanContent = () => {
    const text = generatedContent.body || generatedContent.content || '';
    // Normalize line endings to standard LF and trim trailing whitespace from lines
    const cleanedText = text
      .replace(/\r\n/g, '\n')
      .split('\n')
      .map((line: string) => line.trimEnd())
      .join('\n');
    
    navigator.clipboard.writeText(cleanedText);
    toast.success('Clean formatting copied to clipboard!');
  };

  const getEngagementColor = (score: number) => {
    if (score >= 80) return 'text-green-500 bg-green-500/10 border-green-500/20';
    if (score >= 60) return 'text-amber-500 bg-amber-500/10 border-amber-500/20';
    return 'text-destructive bg-destructive/10 border-destructive/20';
  };

  const getBarColorClass = (score: number) => {
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-amber-500';
    return 'bg-destructive';
  };

  return (
    <div className="space-y-6 text-foreground max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 font-sans">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-primary to-indigo-400 bg-clip-text text-transparent">
          LinkedIn Content Studio
        </h1>
        <p className="text-muted-foreground text-sm mt-1.5 max-w-2xl leading-normal">
          Generate algorithm-optimized, fact-checked, visual content and slides using our specialized LinkedIn agent pipeline.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-12 items-start">
        {/* Input Settings Panel (Grid col 5) */}
        <div className="lg:col-span-5 space-y-6">
          <Card className="border border-border/80 shadow-md">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-bold">Content Configurations</CardTitle>
              <CardDescription className="text-xs">Tailor the ghostwriting parameters for this campaign.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Topic Input */}
              <div className="space-y-1.5">
                <Label htmlFor="topic" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Topic</Label>
                <Input
                  id="topic"
                  placeholder="e.g., Scaling engineering teams without losing velocity"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  className="bg-card/45 border-border"
                />
              </div>

              {/* Visual Card Selector for Content Type */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Content Format</Label>
                <div className="grid grid-cols-2 gap-2.5">
                  {Object.values(CONTENT_TYPE_CONFIGS).map((item) => {
                    const isSelected = contentType === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        id={`format-card-${item.id}`}
                        onClick={() => setContentType(item.id)}
                        className={cn(
                          'flex items-center gap-3 p-3.5 rounded-xl border text-left transition-all duration-200 group',
                          isSelected
                            ? 'border-primary bg-primary/5 ring-1 ring-primary shadow-sm'
                            : 'border-border bg-card/45 hover:bg-accent/40 hover:border-muted-foreground/30'
                        )}
                      >
                        <div className={cn(
                          'p-2 rounded-lg transition-colors',
                          isSelected ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground group-hover:text-foreground'
                        )}>
                          <item.icon className="h-4.5 w-4.5" />
                        </div>
                        <div className="space-y-0.5">
                          <span className="font-bold text-xs text-foreground block">{item.label}</span>
                          <span className="text-[9px] text-muted-foreground leading-normal line-clamp-1">
                            {item.description}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Dynamic Tips section based on Type */}
              {config && (
                <div className="p-3.5 bg-secondary/35 rounded-xl border border-border/80 space-y-1">
                  <div className="text-[10px] font-bold text-primary uppercase tracking-wider">LinkedIn Algorithm Tips:</div>
                  <ul className="list-disc list-inside text-[10px] text-muted-foreground space-y-0.5 leading-normal">
                    {config.tips.map((tip, idx) => (
                      <li key={idx}>{tip}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Audience & Persona Settings */}
              <div className="space-y-4 border-t border-border/60 pt-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-primary" />
                  Audience & Voice Context
                </h4>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Creator Persona</Label>
                    <Select value={personaId} onValueChange={setPersonaId}>
                      <SelectTrigger className="bg-card/45 border-border">
                        <SelectValue placeholder="Default Persona" />
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

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Audience Expertise</Label>
                    <Select value={audienceExpertiseLevel} onValueChange={setAudienceExpertiseLevel}>
                      <SelectTrigger className="bg-card/45 border-border">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="beginner">Beginner (Tactical)</SelectItem>
                        <SelectItem value="intermediate">Intermediate (Standard)</SelectItem>
                        <SelectItem value="expert">Expert (Strategic)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Target Audience</Label>
                    <Input
                      placeholder="e.g., Tech leaders, PMs"
                      value={targetAudience}
                      onChange={(e) => setTargetAudience(e.target.value)}
                      className="bg-card/45 border-border"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Tone Override</Label>
                    <Input
                      placeholder="e.g., witty, analytical"
                      value={toneOverride}
                      onChange={(e) => setToneOverride(e.target.value)}
                      className="bg-card/45 border-border"
                    />
                  </div>
                </div>
              </div>

              {/* Format Specific Dynamic Settings */}
              <div className="space-y-4 border-t border-border/60 pt-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-primary" />
                  Format Settings
                </h4>

                {contentType === 'post' && (
                  <PostFields
                    hookFormula={hookFormula}
                    onHookFormulaChange={setHookFormula}
                    ctaType={ctaType}
                    onCtaTypeChange={setCtaType}
                    emojiBudget={emojiBudget}
                    onEmojiBudgetChange={setEmojiBudget}
                    linkToInclude={linkToInclude}
                    onLinkToIncludeChange={setLinkToInclude}
                  />
                )}

                {contentType === 'carousel' && (
                  <CarouselFields
                    slideCount={slideCount}
                    onSlideCountChange={setSlideCount}
                    ctaType={ctaType}
                    onCtaTypeChange={setCtaType}
                  />
                )}

                {contentType === 'article' && (
                  <ArticleFields
                    articleTitle={articleTitle}
                    onArticleTitleChange={setArticleTitle}
                    articleTargetWords={articleTargetWords}
                    onArticleTargetWordsChange={setArticleTargetWords}
                  />
                )}

                {contentType === 'poll' && (
                  <PollFields
                    pollDuration={pollDuration}
                    onPollDurationChange={setPollDuration}
                    optionCount={optionCount}
                    onOptionCountChange={setOptionCount}
                  />
                )}
              </div>

              {/* Research and Prompt options */}
              <div className="space-y-4 border-t border-border/60 pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Research Depth</Label>
                    <Select value={researchDepth} onValueChange={setResearchDepth}>
                      <SelectTrigger className="bg-card/45 border-border">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="quick">Quick web search</SelectItem>
                        <SelectItem value="deep">Deep academic verify</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Keywords</Label>
                    <Input
                      placeholder="e.g., productivity, startup"
                      value={keywords}
                      onChange={(e) => setKeywords(e.target.value)}
                      className="bg-card/45 border-border"
                    />
                  </div>
                </div>

                {/* Include First Comment toggle */}
                <div className="flex items-center justify-between border-t border-border/40 pt-3">
                  <div className="space-y-0.5">
                    <Label className="text-xs font-semibold">Generate Strategic First Comment</Label>
                    <p className="text-[10px] text-muted-foreground">Creates an engagement post comment to hold links & CTAs.</p>
                  </div>
                  <Switch
                    id="first-comment-switch"
                    checked={includeFirstComment}
                    onCheckedChange={setIncludeFirstComment}
                  />
                </div>

                {/* Writing Prompt/Template Textarea */}
                <div className="space-y-2 pt-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="customInstructions" className="text-xs font-semibold flex items-center gap-1.5 text-foreground">
                      <Sparkles className="h-3.5 w-3.5 text-purple-500 animate-pulse" />
                      Prompt Instructions Template
                    </Label>
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="sm" 
                      className="h-7 px-2 text-[10px] text-muted-foreground hover:text-purple-500 transition"
                      onClick={() => setCustomInstructions(config?.defaultPrompt || '')}
                    >
                      <RefreshCw className="h-3 w-3 mr-1" />
                      Reset Prompt
                    </Button>
                  </div>
                  <div className="relative group rounded-lg p-[1px] bg-gradient-to-r from-purple-500/10 via-blue-500/10 to-purple-500/10 focus-within:from-purple-500/30 focus-within:via-blue-500/30 focus-within:to-purple-500/30 transition duration-300">
                    <Textarea
                      id="customInstructions"
                      rows={4}
                      className="w-full bg-background/95 text-xs font-mono leading-relaxed resize-y border-none focus-visible:ring-0 focus-visible:ring-offset-0 focus:ring-0"
                      placeholder="Custom instructions..."
                      value={customInstructions}
                      onChange={(e) => setCustomInstructions(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Generate Trigger */}
              <div className="pt-2">
                {isGenerating ? (
                  <GenerationProgress
                    currentPhase={jobPhase}
                    isGenerating={isGenerating}
                  />
                ) : (
                  <Button
                    onClick={handleGenerate}
                    id="generate-button"
                    className="w-full h-11 bg-primary hover:bg-primary/95 text-primary-foreground font-bold shadow-lg shadow-primary/20 transition-all duration-300 transform active:scale-[0.98]"
                    disabled={isGenerating || generateMutation.isPending}
                  >
                    <Wand2 className="mr-2 h-4 w-4" />
                    Generate Optimized Campaign
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Output Previews & Tabs (Grid col 7) */}
        <div className="lg:col-span-7">
          <Card className="border border-border/80 shadow-md">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-bold">Campaign Content Deck</CardTitle>
              <CardDescription className="text-xs">Evaluate and optimize your generated posts.</CardDescription>
            </CardHeader>
            <CardContent>
              {generatedContent ? (
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="grid w-full grid-cols-6 mb-5 bg-secondary/40 p-1 rounded-xl">
                    <TabsTrigger className="rounded-lg text-xs" value="content">Content</TabsTrigger>
                    <TabsTrigger className="rounded-lg text-xs" value="slides" disabled={contentType !== 'carousel'}>
                      Slides
                    </TabsTrigger>
                    <TabsTrigger className="rounded-lg text-xs" value="hooks">Hooks</TabsTrigger>
                    <TabsTrigger className="rounded-lg text-xs" value="optimize">Optimize</TabsTrigger>
                    <TabsTrigger className="rounded-lg text-xs" value="sources">Sources</TabsTrigger>
                    <TabsTrigger className="rounded-lg text-xs" value="first-comment" disabled={!generatedContent.firstComment}>
                      First Cmmt
                    </TabsTrigger>
                  </TabsList>

                  {/* 1. Main Content Tab */}
                  <TabsContent value="content" className="space-y-5 focus-visible:outline-none">
                    {/* Live Preview Embed */}
                    <div className="space-y-2">
                      <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Feed Card Visual Preview</Label>
                      <LinkedInPreview
                        content={generatedContent.body || generatedContent.content}
                        contentType={contentType}
                        slides={generatedContent.slides}
                        pollQuestion={generatedContent.pollQuestion}
                        pollOptions={generatedContent.pollOptions}
                        charCount={generatedContent.charCount}
                        articleTitle={generatedContent.articleTitle || articleTitle}
                        articleExcerpt={generatedContent.articleExcerpt}
                      />
                    </div>

                    {/* Editor Textarea */}
                    <div className="space-y-2.5">
                      <div className="flex justify-between items-center">
                        <Label className="text-xs font-semibold">Post Body Editor</Label>
                        <CharacterCounter
                          value={generatedContent.body || generatedContent.content || ''}
                          limit={config?.charLimit || 3000}
                          softLimit={config?.charSoftLimit}
                          hookWindowChars={config?.hookWindowChars || 210}
                          showHookWindow={true}
                        />
                      </div>
                      <Textarea
                        value={generatedContent.body || generatedContent.content || ''}
                        onChange={(e) =>
                          setGeneratedContent({ ...generatedContent, body: e.target.value })
                        }
                        rows={10}
                        className="font-mono text-sm leading-relaxed bg-card border-border focus-visible:ring-primary"
                      />
                    </div>

                    {/* Pre-Publish Checks list */}
                    <PrePublishChecklist
                      content={generatedContent.body || generatedContent.content || ''}
                      contentType={contentType}
                      charLimit={config?.charLimit || 3000}
                      hashtagRange={config?.hashtagRange || [3, 5]}
                    />

                    {/* Action buttons */}
                    <div className="flex gap-2 flex-wrap items-center">
                      <Button variant="outline" className="flex-1 h-10 gap-1.5" onClick={handleCopyCleanContent}>
                        <Copy className="w-4 h-4" />
                        Copy Clean Content
                      </Button>
                      {!linkedinStatus?.hasOAuth ? (
                        <div className="flex-1 flex flex-col gap-1">
                          <Button 
                            className="w-full bg-[#0a66c2]/50 hover:bg-[#0a66c2]/50 text-white cursor-not-allowed h-10 text-xs font-bold" 
                            disabled
                          >
                            Publish to LinkedIn
                          </Button>
                          <p className="text-[9px] text-rose-500 font-bold text-center leading-none">
                            Connect LinkedIn account in settings
                          </p>
                        </div>
                      ) : (
                        <Button 
                          className="flex-1 bg-[#0a66c2] hover:bg-[#004182] text-white h-10 font-bold shadow-lg shadow-[#0a66c2]/20" 
                          onClick={handlePublish}
                          disabled={isPublishing || generatedContent.status === 'published'}
                        >
                          {isPublishing ? (
                            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Publishing...</>
                          ) : generatedContent.status === 'published' ? (
                            'Published ✓'
                          ) : (
                            'Publish to LinkedIn'
                          )}
                        </Button>
                      )}
                    </div>
                  </TabsContent>

                  {/* 2. Slide Editor Tab (For Carousel only) */}
                  <TabsContent value="slides" className="space-y-4 focus-visible:outline-none">
                    <SlideEditor
                      slides={generatedContent.slides || []}
                      onSlidesChange={(updated) =>
                        setGeneratedContent({ ...generatedContent, slides: updated })
                      }
                    />
                  </TabsContent>

                  {/* 3. Alternate Hooks Selector Tab */}
                  <TabsContent value="hooks" className="space-y-4 focus-visible:outline-none">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-semibold">Regenerate and swap the hook intro sentence</Label>
                      <Button variant="outline" size="sm" className="h-8 border-border bg-card hover:bg-accent/40" onClick={handleRegenerateHook}>
                        <RefreshCw className="h-3 w-3 mr-1" />
                        Regenerate
                      </Button>
                    </div>
                    
                    <div className="space-y-2.5">
                      {generatedContent.hookSuggestions?.map((hook: string, i: number) => {
                        const isSelected = selectedHook === hook;
                        return (
                          <button
                            key={i}
                            type="button"
                            onClick={() => setSelectedHook(hook)}
                            className={cn(
                              'w-full p-4 rounded-xl border text-left transition-all duration-200 flex items-start gap-3.5',
                              isSelected
                                ? 'border-primary bg-primary/5 ring-1 ring-primary'
                                : 'border-border bg-card/65 hover:bg-accent/40 hover:border-muted-foreground/30'
                            )}
                          >
                            <div className={cn(
                              'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0',
                              isSelected ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'
                            )}>
                              {i + 1}
                            </div>
                            <p className="text-xs leading-relaxed font-sans text-foreground/90">{hook}</p>
                          </button>
                        );
                      })}
                    </div>

                    <Button 
                      className="w-full h-10 mt-3 font-semibold" 
                      disabled={!selectedHook}
                      onClick={() => {
                        const text = generatedContent.body || generatedContent.content;
                        setGeneratedContent({
                          ...generatedContent,
                          body: selectedHook + '\n\n' + text.substring(text.indexOf('\n\n') + 2)
                        });
                        setActiveTab('content');
                        toast.success('Selected hook applied to post body!');
                      }}
                    >
                      Apply Hook & Swap Intro
                    </Button>
                  </TabsContent>

                  {/* 4. Optimize Tab: Visual Scorecard */}
                  <TabsContent value="optimize" className="space-y-5 focus-visible:outline-none">
                    <ContentHealthScore
                      content={generatedContent.body || generatedContent.content || ''}
                      contentType={contentType}
                      charLimit={config?.charLimit || 3000}
                      hashtagRange={config?.hashtagRange || [3, 5]}
                      emojiMax={config?.emojiMax || 3}
                      hookWindowChars={config?.hookWindowChars || 210}
                    />

                    {/* Algorithm metrics */}
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="p-4 rounded-xl border border-border bg-card/45 space-y-3">
                        <h4 className="font-bold text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                          <Search className="h-4 w-4 text-primary" />
                          SEO Keyword Analytics
                        </h4>
                        <div className="space-y-3">
                          <div className="flex flex-wrap gap-1.5">
                            {generatedContent.linkedinOptimization?.keywords?.map((kw: any, i: number) => (
                              <Badge
                                key={i}
                                variant={kw.priority === 'high' ? 'default' : 'outline'}
                                className="text-[10px] font-semibold"
                              >
                                {kw.keyword}
                              </Badge>
                            ))}
                          </div>
                          {generatedContent.linkedinOptimization?.hashtags && (
                            <div className="border-t border-border/40 pt-2.5">
                              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Generated Hashtags:</p>
                              <p className="text-xs font-mono text-[#0a66c2] font-semibold">{generatedContent.linkedinOptimization.hashtags.join(' ')}</p>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="p-4 rounded-xl border border-border bg-card/45 space-y-3">
                        <h4 className="font-bold text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                          <BarChart3 className="h-4 w-4 text-primary" />
                          LinkedIn Competitive Benchmarking
                        </h4>
                        <div className="space-y-2 text-xs leading-normal">
                          <div className="flex items-center justify-between border-b border-border/30 pb-1.5">
                            <span className="text-muted-foreground">Optimal Length Index:</span>
                            <span className="font-semibold text-foreground">{generatedContent.competitiveAnalysis?.optimalLength || 'N/A'}</span>
                          </div>
                          <div className="flex items-center justify-between border-b border-border/30 pb-1.5">
                            <span className="text-muted-foreground">Engagement Predictor:</span>
                            <span className="font-bold font-mono text-primary">{generatedContent.engagementPrediction || 50}/100</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground font-semibold">Post timing:</span>
                            <span className="font-mono text-foreground font-semibold flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5" />
                              {generatedContent.bestPostingTime || 'General B2B Slot'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </TabsContent>

                  {/* 5. Fact Checked Sources Tab */}
                  <TabsContent value="sources" className="space-y-4 focus-visible:outline-none">
                    <Label className="text-xs font-semibold">Grounding Sources & Expert Citations</Label>
                    <div className="space-y-2.5 max-h-[400px] overflow-y-auto pr-1">
                      {generatedContent.sources && generatedContent.sources.length > 0 ? (
                        generatedContent.sources.map((source: any, i: number) => (
                          <div key={i} className="flex items-center gap-3.5 p-3 rounded-xl border border-border bg-card/50 hover:bg-card hover:border-muted-foreground/30 transition">
                            <div className="flex-1 space-y-0.5">
                              <p className="text-xs font-bold text-foreground/95 line-clamp-1">{source.title}</p>
                              {source.url && (
                                <a
                                  href={source.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[10px] text-primary font-semibold hover:underline block leading-none pt-0.5"
                                >
                                  {new URL(source.url).hostname}
                                </a>
                              )}
                            </div>
                            <Badge variant="outline" className={cn(
                              'text-[9px] font-bold uppercase tracking-wider',
                              source.credibility === 'high' ? 'border-green-500/30 text-green-500 bg-green-500/5' : 'border-amber-500/30 text-amber-500 bg-amber-500/5'
                            )}>
                              {source.credibility || 'Verified'}
                            </Badge>
                          </div>
                        ))
                      ) : (
                        <div className="p-6 text-center text-xs text-muted-foreground border border-dashed rounded-xl border-border">
                          No specific external source links found in the grounding context.
                        </div>
                      )}
                      
                      {generatedContent.researchData?.expertOpinions?.map((expert: any, i: number) => (
                        <div key={`expert-${i}`} className="p-3.5 rounded-xl border border-border bg-muted/45">
                          <p className="text-xs font-bold text-foreground flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5 text-primary" />
                            {expert.expert}
                          </p>
                          <p className="text-[11px] text-muted-foreground leading-relaxed italic mt-1.5 font-sans">
                            "{expert.opinion}"
                          </p>
                        </div>
                      ))}
                    </div>
                  </TabsContent>

                  {/* 6. First Comment Tab */}
                  <TabsContent value="first-comment" className="space-y-4 focus-visible:outline-none">
                    <div className="space-y-2.5">
                      <div className="flex justify-between items-center">
                        <Label className="text-xs font-semibold">Strategic First Comment</Label>
                        <span className="text-[10px] font-mono text-muted-foreground font-medium">
                          {(generatedContent.firstComment?.length || 0)} / 500
                        </span>
                      </div>
                      <Textarea
                        value={generatedContent.firstComment || ''}
                        onChange={(e) =>
                          setGeneratedContent({ ...generatedContent, firstComment: e.target.value })
                        }
                        rows={6}
                        className="font-mono text-sm leading-relaxed bg-card border-border"
                      />
                      <p className="text-[10px] text-muted-foreground/85 leading-normal italic">
                        💡 Placed in comments to host resource URLs and secondary conversation triggers to bypass the feed algorithm reach penalty.
                      </p>
                    </div>
                    
                    <Button
                      variant="outline"
                      className="w-full h-10 gap-1.5 font-medium"
                      onClick={() => {
                        navigator.clipboard.writeText(generatedContent.firstComment || '');
                        toast.success('First comment copied!');
                      }}
                    >
                      <Copy className="w-4 h-4" />
                      Copy First Comment
                    </Button>
                  </TabsContent>
                </Tabs>
              ) : (
                <div className="text-center py-20 text-muted-foreground border border-dashed rounded-xl border-border/80 bg-card/25 shadow-inner">
                  <Sparkles className="h-12 w-12 mx-auto mb-4 text-primary/40 animate-pulse" />
                  <h4 className="font-bold text-foreground/80 text-sm">No Content Generated Yet</h4>
                  <p className="text-xs text-muted-foreground/80 mt-1 max-w-sm mx-auto leading-normal">
                    Select a format, choose a persona/audience, write your topic and hit generate to kickstart your campaign deck.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
