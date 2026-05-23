import { useState, useEffect } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { contentApi, personaApi, jobApi, linkedinApi, systemApi } from '../services/api';
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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
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
  CheckSquare,
  CalendarIcon
} from 'lucide-react';

import { cn } from '@/lib/utils';
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
  const [isGrounded, setIsGrounded] = useState(true);
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
  const [scheduleDate, setScheduleDate] = useState<Date>();
  const [scheduleTime, setScheduleTime] = useState('10:00');
  const [isScheduling, setIsScheduling] = useState(false);

  const { data: linkedinStatus } = useQuery({
    queryKey: ['linkedinStatus'],
    queryFn: () => linkedinApi.getStatus().then((res) => res.data),
  });

  const { data: systemHealth } = useQuery({
    queryKey: ['systemHealth'],
    queryFn: () => systemApi.getHealth().then((res) => res.data),
    refetchInterval: 30000,
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
      researchDepth: isGrounded ? researchDepth : 'none',
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
      setGeneratedContent({ ...generatedContent, status: 'published', publishedAt: new Date().toISOString() });
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Failed to publish to LinkedIn');
    } finally {
      setIsPublishing(false);
    }
  };

  const handleSchedule = async () => {
    if (!generatedContent?.id || !scheduleDate) {
      toast.error('Please select a date to schedule');
      return;
    }
    
    setIsScheduling(true);
    try {
      const [hours, minutes] = scheduleTime.split(':');
      const scheduledFor = new Date(scheduleDate);
      scheduledFor.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);

      await contentApi.update(generatedContent.id, {
        status: 'scheduled',
        scheduledFor: scheduledFor.toISOString()
      });
      
      toast.success('Successfully scheduled post!');
      setGeneratedContent({ ...generatedContent, status: 'scheduled', scheduledFor: scheduledFor.toISOString() });
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Failed to schedule post');
    } finally {
      setIsScheduling(false);
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

  const [imagePrompt, setImagePrompt] = useState('');
  const [isRegeneratingImage, setIsRegeneratingImage] = useState(false);

  useEffect(() => {
    if (generatedContent?.imagePrompts?.[0]) {
      setImagePrompt(generatedContent.imagePrompts[0]);
    }
  }, [generatedContent?.imagePrompts]);

  const handleRegenerateImage = async () => {
    if (!generatedContent?.id) return;
    setIsRegeneratingImage(true);
    try {
      const res = await contentApi.regenerateImage(generatedContent.id, { prompt: imagePrompt });
      setGeneratedContent(res.data.content);
      toast.success('Image regenerated successfully!');
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Failed to regenerate image');
    } finally {
      setIsRegeneratingImage(false);
    }
  };

  const handleRemoveImage = async () => {
    if (!generatedContent?.id) return;
    try {
      const updated = { ...generatedContent, images: [] };
      await contentApi.update(generatedContent.id, updated);
      setGeneratedContent(updated);
      toast.success('Image removed from post');
    } catch (error: any) {
      toast.error('Failed to remove image');
    }
  };

  const handleUploadCustomImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB');
      return;
    }
    
    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      try {
        const updated = { ...generatedContent, images: [base64] };
        await contentApi.update(generatedContent.id!, updated);
        setGeneratedContent(updated);
        toast.success('Custom image uploaded!');
      } catch (error) {
        toast.error('Failed to save custom image');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRegenerateHook = () => {
    toast.info('Hook suggestions are regenerated during draft generation. Please click "Generate Draft" to refresh suggestions.');
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
    <div className="min-h-screen bg-[#050505] relative overflow-hidden font-sans text-slate-200">
      {/* Dynamic Animated Background Elements */}
      <div className="absolute top-[-20%] left-[-10%] w-[50vw] h-[50vw] bg-indigo-600/10 rounded-full blur-[120px] mix-blend-screen animate-[pulse_8s_ease-in-out_infinite]" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[60vw] h-[60vw] bg-violet-600/10 rounded-full blur-[150px] mix-blend-screen animate-[pulse_10s_ease-in-out_infinite_reverse]" />
      <div className="absolute top-[40%] left-[20%] w-[30vw] h-[30vw] bg-blue-600/5 rounded-full blur-[100px] mix-blend-screen animate-[pulse_12s_ease-in-out_infinite]" />
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] pointer-events-none mix-blend-overlay"></div>
      
      <div className="relative space-y-10 max-w-[1400px] mx-auto px-6 sm:px-8 lg:px-12 py-12 z-10">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6 border-b border-white/5 pb-8">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[10px] font-bold uppercase tracking-widest shadow-[0_0_20px_rgba(99,102,241,0.15)]">
            <Sparkles className="w-3 h-3" />
            Advanced Agentic Pipeline
          </div>
          <h1 className="text-5xl md:text-6xl font-black tracking-tight bg-gradient-to-br from-white via-slate-200 to-slate-500 bg-clip-text text-transparent drop-shadow-sm">
            Content Studio
          </h1>
          <p className="text-slate-400 text-base max-w-2xl leading-relaxed font-medium">
            Generate algorithm-optimized, fact-checked, visual content and slides using our specialized LinkedIn agent pipeline.
          </p>
        </div>
        
        {/* System API Capability status indicators */}
        <div className="flex flex-wrap items-center gap-3 bg-[#0f0f13] backdrop-blur-2xl p-2.5 rounded-2xl border border-white/5 shadow-[0_8px_32px_-8px_rgba(0,0,0,0.8)]">
          <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-black/60 text-xs font-bold text-slate-300 border border-white/5 shadow-inner">
            <span className="text-slate-500">Trends API:</span>
            {systemHealth?.capabilities?.hasRealTrends ? (
              <span className="text-emerald-400 drop-shadow-[0_0_12px_rgba(52,211,153,0.5)] flex items-center gap-1.5">
                <span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span></span>
                Live
              </span>
            ) : (
              <span className="text-amber-400 drop-shadow-[0_0_12px_rgba(251,191,36,0.5)] flex items-center gap-1.5">▲ AI-only</span>
            )}
          </div>
          <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-black/60 text-xs font-bold text-slate-300 border border-white/5 shadow-inner">
            <span className="text-slate-500">Google Grounding:</span>
            {systemHealth?.capabilities?.hasRealResearch ? (
              <span className="text-emerald-400 drop-shadow-[0_0_12px_rgba(52,211,153,0.5)] flex items-center gap-1.5">
                <span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span></span>
                Live
              </span>
            ) : (
              <span className="text-amber-400 drop-shadow-[0_0_12px_rgba(251,191,36,0.5)] flex items-center gap-1.5">▲ Disabled</span>
            )}
          </div>
          <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-black/60 text-xs font-bold text-slate-300 border border-white/5 shadow-inner">
            <span className="text-slate-500">LinkedIn OAuth:</span>
            {systemHealth?.capabilities?.hasLinkedInOAuth ? (
              <span className="text-emerald-400 drop-shadow-[0_0_12px_rgba(52,211,153,0.5)] flex items-center gap-1.5">
                <span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span></span>
                Active
              </span>
            ) : (
              <span className="text-violet-400 drop-shadow-[0_0_12px_rgba(167,139,250,0.5)] flex items-center gap-1.5">⬥ Cookie fallback</span>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-12 items-start">
        {/* Input Settings Panel (Grid col 5) */}
        <div className="lg:col-span-4 xl:col-span-3 space-y-6">
          <Card className="border-0 bg-[#0a0a0c]/80 backdrop-blur-3xl shadow-[0_8px_32px_rgba(0,0,0,0.6)] overflow-hidden relative ring-1 ring-white/5">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-transparent to-purple-500/5 pointer-events-none" />
            <CardHeader className="pb-5 relative z-10 border-b border-white/5 bg-white/[0.02]">
              <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
                <Sliders className="w-4 h-4 text-indigo-400" />
                Configurations
              </CardTitle>
              <CardDescription className="text-xs text-slate-400">Tailor the ghostwriting parameters.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
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

              <div className="space-y-3">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Content Format</Label>
                <div className="grid grid-cols-1 gap-3">
                  {Object.values(CONTENT_TYPE_CONFIGS).map((item) => {
                    const isSelected = contentType === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        id={`format-card-${item.id}`}
                        onClick={() => setContentType(item.id)}
                        className={cn(
                          'flex items-center gap-3 p-3.5 rounded-2xl border text-left transition-all duration-300 group',
                          isSelected
                            ? 'border-indigo-500/50 bg-indigo-500/10 shadow-[0_0_20px_rgba(99,102,241,0.15)] ring-1 ring-indigo-500'
                            : 'border-white/10 bg-black/20 hover:bg-white/5 hover:border-white/20 hover:-translate-y-0.5 hover:shadow-lg'
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

                <div className="grid grid-cols-1 gap-4">
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

                <div className="grid grid-cols-1 gap-4">
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
                <div className="space-y-3 p-3.5 border border-border/65 rounded-xl bg-secondary/10">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="grounding-switch" className="text-xs font-semibold text-foreground">Google Search Grounding</Label>
                      <p className="text-[10px] text-muted-foreground leading-normal">Search live web to anchor facts & quotes.</p>
                    </div>
                    <Switch
                      id="grounding-switch"
                      checked={isGrounded}
                      onCheckedChange={setIsGrounded}
                    />
                  </div>
                  
                  {isGrounded && (
                    <div className="space-y-1.5 pt-2.5 border-t border-border/40 transition-all">
                      <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Grounding Level</Label>
                      <Select value={researchDepth} onValueChange={setResearchDepth}>
                        <SelectTrigger className="bg-card/45 border-border h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="quick">Quick web search (7-10 sources)</SelectItem>
                          <SelectItem value="deep">Deep academic verify (15+ sources)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Focus Keywords</Label>
                  <Input
                    placeholder="e.g., productivity, startup"
                    value={keywords}
                    onChange={(e) => setKeywords(e.target.value)}
                    className="bg-card/45 border-border"
                  />
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
                    className="w-full h-12 bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-400 hover:to-violet-500 text-white font-bold text-sm shadow-[0_0_20px_rgba(99,102,241,0.4)] hover:shadow-[0_0_30px_rgba(99,102,241,0.6)] transition-all duration-300 transform hover:-translate-y-0.5 active:scale-[0.98] border border-white/10 rounded-xl"
                    disabled={isGenerating || generateMutation.isPending}
                  >
                    <Wand2 className="mr-2 h-4 w-4 animate-pulse" />
                    Generate Optimized Campaign
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Output Previews & Tabs */}
        <div className="lg:col-span-8 xl:col-span-9">
          <Card className="border-0 bg-[#0a0a0c]/80 backdrop-blur-3xl shadow-[0_8px_32px_rgba(0,0,0,0.6)] overflow-hidden relative ring-1 ring-white/5 min-h-[800px] flex flex-col">
            <div className="absolute inset-0 bg-gradient-to-tl from-indigo-500/5 via-transparent to-violet-500/5 pointer-events-none" />
            <CardHeader className="pb-5 relative z-10 border-b border-white/5 bg-white/[0.02] flex-none">
              <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-violet-400" />
                Campaign Content Deck
              </CardTitle>
              <CardDescription className="text-xs text-slate-400">Evaluate and optimize your generated posts.</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col p-6">
              {generatedContent && (
                <div className="grid grid-cols-3 gap-4 bg-[#050505]/50 rounded-2xl border border-white/5 mb-6 text-center shadow-inner p-4 relative overflow-hidden">
                  <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.05] mix-blend-overlay pointer-events-none" />
                  <div className="flex flex-col items-center justify-center p-4 rounded-xl bg-white/[0.02] border border-white/5 shadow-[0_4px_24px_rgba(0,0,0,0.4)] hover:bg-white/[0.04] transition-colors relative z-10">
                    <span className="text-[10px] uppercase font-bold text-slate-500 tracking-widest mb-3">Grounded Status</span>
                    <div className={cn("px-4 py-1.5 rounded-full text-xs font-bold flex items-center gap-2 shadow-[0_0_15px_rgba(0,0,0,0.5)] border", generatedContent.isAiGrounded ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-[0_0_20px_rgba(52,211,153,0.15)]" : "bg-amber-500/10 text-amber-400 border-amber-500/20")}>
                      {generatedContent.isAiGrounded ? <><div className="w-2 h-2 rounded-full bg-emerald-400 animate-[pulse_2s_ease-in-out_infinite]" /> GOOGLE SEARCH</> : <><div className="w-2 h-2 rounded-full bg-amber-400" /> AI ONLY</>}
                    </div>
                  </div>
                  <div className="flex flex-col items-center justify-center p-4 rounded-xl bg-white/[0.02] border border-white/5 shadow-[0_4px_24px_rgba(0,0,0,0.4)] hover:bg-white/[0.04] transition-colors relative overflow-hidden group z-10">
                    <div className="absolute inset-0 bg-gradient-to-t from-indigo-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <span className="text-[10px] uppercase font-bold text-slate-500 tracking-widest mb-1 relative z-10">Research Quality</span>
                    <span className="text-3xl font-black font-mono text-indigo-400 drop-shadow-[0_0_12px_rgba(129,140,248,0.5)] relative z-10">{generatedContent.researchQuality || 50}<span className="text-sm text-indigo-400/50 ml-1">%</span></span>
                  </div>
                  <div className="flex flex-col items-center justify-center p-4 rounded-xl bg-white/[0.02] border border-white/5 shadow-[0_4px_24px_rgba(0,0,0,0.4)] hover:bg-white/[0.04] transition-colors relative overflow-hidden group z-10">
                    <div className="absolute inset-0 bg-gradient-to-t from-violet-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <span className="text-[10px] uppercase font-bold text-slate-500 tracking-widest mb-1 relative z-10">Verified Sources</span>
                    <span className="text-3xl font-black font-mono text-violet-400 drop-shadow-[0_0_12px_rgba(167,139,250,0.5)] relative z-10">{generatedContent.dataSourceCount || 0}<span className="text-sm text-violet-400/50 ml-1 font-sans">sites</span></span>
                  </div>
                </div>
              )}
              {generatedContent ? (
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <TabsList className="grid w-full grid-cols-7 mb-5 bg-secondary/40 p-1 rounded-xl">
                      <TabsTrigger className="rounded-lg text-xs" value="content">Content</TabsTrigger>
                      <TabsTrigger className="rounded-lg text-xs" value="slides" disabled={contentType !== 'carousel'}>
                        Slides
                      </TabsTrigger>
                      <TabsTrigger className="rounded-lg text-xs" value="hooks">Hooks</TabsTrigger>
                      <TabsTrigger className="rounded-lg text-xs" value="optimize">Optimize</TabsTrigger>
                      <TabsTrigger className="rounded-lg text-xs" value="sources">Sources</TabsTrigger>
                      <TabsTrigger className="rounded-lg text-xs" value="image" disabled={!generatedContent.images || generatedContent.images.length === 0}>
                        Image
                      </TabsTrigger>
                      <TabsTrigger className="rounded-lg text-xs" value="first-comment" disabled={!generatedContent.firstComment}>
                        First Cmmt
                      </TabsTrigger>
                    </TabsList>

                  {/* 1. Main Content Tab */}
                  <TabsContent value="content" className="space-y-5 focus-visible:outline-none">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                      {/* Left Column: Editor & Preview */}
                      <div className="lg:col-span-7 space-y-5">
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

                        {/* Action buttons */}
                        <div className="flex gap-2 flex-wrap items-center pt-2">
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
                            <div className="flex flex-1 gap-2">
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
                                  'Publish Now'
                                )}
                              </Button>
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Button variant="outline" className="h-10 px-3 bg-secondary text-foreground hover:bg-secondary/80 border-white/10" disabled={generatedContent.status === 'published' || generatedContent.status === 'scheduled'}>
                                    <Clock className="h-4 w-4 mr-2" />
                                    {generatedContent.status === 'scheduled' ? 'Scheduled ✓' : 'Schedule'}
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-4 bg-card border-border shadow-2xl">
                                  <div className="space-y-4">
                                    <h4 className="font-bold text-sm">Schedule Post</h4>
                                    <Calendar
                                      mode="single"
                                      selected={scheduleDate}
                                      onSelect={setScheduleDate}
                                      className="rounded-md border border-white/5"
                                      disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                                    />
                                    <div className="flex items-center gap-2">
                                      <Label htmlFor="time" className="text-xs">Time</Label>
                                      <Input
                                        id="time"
                                        type="time"
                                        value={scheduleTime}
                                        onChange={(e) => setScheduleTime(e.target.value)}
                                        className="h-8 text-sm"
                                      />
                                    </div>
                                    <Button onClick={handleSchedule} disabled={!scheduleDate || isScheduling} className="w-full h-8 text-xs bg-indigo-600 hover:bg-indigo-700">
                                      {isScheduling ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : 'Confirm Schedule'}
                                    </Button>
                                  </div>
                                </PopoverContent>
                              </Popover>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Right Column: Format Audit Side Panel */}
                      <div className="lg:col-span-5 space-y-5">
                        <PrePublishChecklist
                          content={generatedContent.body || generatedContent.content || ''}
                          contentType={contentType}
                          charLimit={config?.charLimit || 3000}
                          hashtagRange={config?.hashtagRange || [3, 5]}
                        />
                      </div>
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
                  {/* 7. Feature Image Tab */}
                  <TabsContent value="image" className="space-y-4 focus-visible:outline-none">
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <Label className="text-xs font-semibold">Post Feature Image</Label>
                        <Button 
                          variant="destructive" 
                          size="sm" 
                          className="h-7 px-2 text-[10px]"
                          onClick={handleRemoveImage}
                        >
                          Remove Image
                        </Button>
                      </div>

                      {generatedContent.images?.[0] ? (
                        <div className="rounded-xl overflow-hidden border border-border bg-card/50">
                          <img 
                            src={generatedContent.images[0]} 
                            alt="Feature" 
                            className="w-full object-contain max-h-[300px]" 
                          />
                        </div>
                      ) : (
                        <div className="p-10 border border-dashed border-border rounded-xl text-center text-muted-foreground text-xs">
                          No image generated.
                        </div>
                      )}

                      <div className="space-y-2 pt-2 border-t border-border/40">
                        <Label className="text-xs font-semibold">Regenerate with AI (Gemini 2.5 Flash Prompt)</Label>
                        <Textarea 
                          value={imagePrompt}
                          onChange={(e) => setImagePrompt(e.target.value)}
                          className="font-mono text-[11px] leading-relaxed bg-card border-border min-h-[80px]"
                        />
                        <Button 
                          onClick={handleRegenerateImage}
                          disabled={isRegeneratingImage || !imagePrompt}
                          className="w-full text-xs h-9 bg-primary/90 hover:bg-primary text-primary-foreground"
                        >
                          {isRegeneratingImage ? <Loader2 className="h-3 w-3 mr-2 animate-spin" /> : <RefreshCw className="h-3 w-3 mr-2" />}
                          Regenerate Image
                        </Button>
                      </div>

                      <div className="space-y-2 pt-2 border-t border-border/40">
                        <Label className="text-xs font-semibold">Or Upload Custom Image</Label>
                        <Input 
                          type="file" 
                          accept="image/*" 
                          onChange={handleUploadCustomImage} 
                          className="text-xs file:bg-primary/10 file:text-primary file:border-0 file:rounded-md file:px-2 file:py-1 file:text-[10px] file:font-semibold"
                        />
                      </div>
                    </div>
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
    </div>
  );
}
