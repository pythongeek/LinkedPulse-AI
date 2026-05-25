import { useState, useEffect, useRef } from 'react';
import { useMutation } from '@tanstack/react-query';
import { competitorApi, jobApi } from '../services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import {
  Search, Loader2, BarChart3, Lightbulb, PieChart, TrendingUp, Download,
  Sparkles, Target, Users, AlertCircle, BookOpen, ArrowUpRight, Zap,
  TrendingDown, CheckCircle2, Radio, Save, FileText, Trophy, Swords,
  Brain, Clock, ChevronDown, ChevronUp, Copy, Share2, RefreshCw,
  Calendar, Star, Flag, Crosshair, Shield
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart as RePieChart, Pie, Cell, RadarChart, Radar,
  PolarGrid, PolarAngleAxis,
} from 'recharts';
import { QuickGenerateDialog } from '../components/studio/QuickGenerateDialog';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

const GAP_TYPE_STYLES: Record<string, { label: string; color: string; bg: string; border: string; icon: any }> = {
  angle:    { label: 'Angle Gap',    color: 'text-indigo-700 dark:text-indigo-400',   bg: 'bg-indigo-50 dark:bg-indigo-950/30',   border: 'border-indigo-200 dark:border-indigo-800',   icon: Target },
  format:   { label: 'Format Gap',  color: 'text-purple-700 dark:text-purple-400',   bg: 'bg-purple-50 dark:bg-purple-950/30',   border: 'border-purple-200 dark:border-purple-800',   icon: BarChart3 },
  audience: { label: 'Audience Gap', color: 'text-emerald-700 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950/30', border: 'border-emerald-200 dark:border-emerald-800', icon: Users },
  recency:  { label: 'Recency Gap', color: 'text-amber-700 dark:text-amber-400',     bg: 'bg-amber-50 dark:bg-amber-950/30',     border: 'border-amber-200 dark:border-amber-800',     icon: TrendingUp },
  data:     { label: 'Data Gap',    color: 'text-rose-700 dark:text-rose-400',       bg: 'bg-rose-50 dark:bg-rose-950/30',       border: 'border-rose-200 dark:border-rose-800',       icon: BookOpen },
  depth:    { label: 'Depth Gap',   color: 'text-teal-700 dark:text-teal-400',       bg: 'bg-teal-50 dark:bg-teal-950/30',       border: 'border-teal-200 dark:border-teal-800',       icon: Zap },
};

interface SavedReport {
  id: string;
  topic: string;
  savedAt: string;
  analysis: any;
  strategy?: string;
}

export default function CompetitorAnalysis() {
  const [topic, setTopic] = useState('');
  const [depth, setDepth] = useState<'quick' | 'deep'>('quick');
  const [jobId, setJobId] = useState<string | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  
  // Inline Generation God Mode State
  const [generateTopic, setGenerateTopic] = useState('');
  const [generateFormat, setGenerateFormat] = useState('post');
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);

  const handleGenerateClick = (topic: string, format: string = 'post') => {
    setGenerateTopic(topic);
    setGenerateFormat(format);
    setIsGenerateModalOpen(true);
  };
  const [savedReports, setSavedReports] = useState<SavedReport[]>([]);
  const [showSavedReports, setShowSavedReports] = useState(false);
  const [isGeneratingStrategy, setIsGeneratingStrategy] = useState(false);
  const [overtakeStrategy, setOvertakeStrategy] = useState<string>('');
  const [strategyExpanded, setStrategyExpanded] = useState(true);
  const strategyRef = useRef<HTMLDivElement>(null);

  // Load saved reports from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('competitor_reports');
    if (saved) setSavedReports(JSON.parse(saved));
  }, []);

  const analyzeMutation = useMutation({
    mutationFn: (t: string) => competitorApi.analyze({ topic: t, depth }),
    onSuccess: (res) => {
      if (res.data.cached) {
        setAnalysisResult(res.data.analysis);
        toast.info('Loaded from recent cache');
      } else if (res.data.jobId) {
        setJobId(res.data.jobId);
        setIsPolling(true);
        toast.info('Deep analysis started...');
      } else {
        setAnalysisResult(res.data.analysis);
        toast.success('Competitor intelligence ready!');
      }
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || 'Analysis failed');
    },
  });

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (jobId && isPolling) {
      interval = setInterval(async () => {
        try {
          const res = await jobApi.getStatus(jobId);
          const job = res.data.job;
          if (job.status === 'COMPLETED') {
            setIsPolling(false);
            setJobId(null);
            if (job.result?.analysis) {
              setAnalysisResult(job.result.analysis);
              toast.success('Competitor intelligence ready!');
            }
          } else if (job.status === 'FAILED') {
            setIsPolling(false);
            setJobId(null);
            toast.error(job.error || 'Analysis failed');
          }
        } catch (error) {
          setIsPolling(false);
          setJobId(null);
          toast.error('Failed to check analysis status');
        }
      }, 3000);
    }
    return () => { if (interval) clearInterval(interval); };
  }, [jobId, isPolling]);

  const handleAnalyze = () => {
    if (!topic) { toast.error('Please enter a topic'); return; }
    setAnalysisResult(null);
    setOvertakeStrategy('');
    analyzeMutation.mutate(topic);
  };

  // ── Save Report ─────────────────────────────────────────────────────────────

  const handleSaveReport = () => {
    if (!analysisResult) return;
    const report: SavedReport = {
      id: `report_${Date.now()}`,
      topic,
      savedAt: new Date().toISOString(),
      analysis: analysisResult,
      strategy: overtakeStrategy || undefined,
    };
    const updated = [report, ...savedReports].slice(0, 20);
    setSavedReports(updated);
    localStorage.setItem('competitor_reports', JSON.stringify(updated));
    toast.success('Report saved successfully!');
  };

  const handleDeleteReport = (id: string) => {
    const updated = savedReports.filter(r => r.id !== id);
    setSavedReports(updated);
    localStorage.setItem('competitor_reports', JSON.stringify(updated));
    toast.success('Report deleted');
  };

  const handleLoadReport = (report: SavedReport) => {
    setTopic(report.topic);
    setAnalysisResult(report.analysis);
    setOvertakeStrategy(report.strategy || '');
    setShowSavedReports(false);
    toast.success(`Loaded: ${report.topic}`);
  };

  // ── Download Report ──────────────────────────────────────────────────────────

  const handleDownloadJSON = () => {
    if (!analysisResult) return;
    const reportData = {
      topic,
      generatedAt: new Date().toISOString(),
      analysis: analysisResult,
      strategy: overtakeStrategy || null,
    };
    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `competitor-analysis-${topic.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('JSON report downloaded!');
  };

  const handleDownloadCSV = () => {
    if (!analysisResult) return;
    const rows: string[][] = [
      ['Competitor Intelligence Report'],
      ['Topic', topic],
      ['Generated At', new Date().toISOString()],
      ['Total Posts Analyzed', String(analysisResult.totalPostsAnalyzed)],
      ['Data Source', analysisResult.dataSource],
      ['Top Format', analysisResult.topFormat],
      ['Avg Likes', String(analysisResult.avgEngagement?.likes)],
      ['Avg Comments', String(analysisResult.avgEngagement?.comments)],
      [],
      ['CONTENT GAPS'],
      ['Title', 'Type', 'Priority Score', 'Competition Level', 'Suggested Format', 'Opportunity'],
      ...((analysisResult.structuredGaps || []).map((g: any) => [
        g.title || '', g.type || '', String(g.priorityScore || ''),
        g.competitionLevel || '', g.suggestedFormat || '', g.opportunity || ''
      ])),
      [],
      ['TOP POSTS'],
      ['Author', 'Format', 'Likes', 'Comments', 'Hook Text'],
      ...((analysisResult.topPosts || []).slice(0, 15).map((p: any) => [
        p.author || '', p.contentFormat || '', String(p.likes), String(p.comments), (p.hookText || '').replace(/,/g, ';')
      ])),
    ];
    if (overtakeStrategy) {
      rows.push([], ['OVERTAKE STRATEGY'], [overtakeStrategy.replace(/,/g, ';')]);
    }
    const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `competitor-analysis-${topic.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV report downloaded!');
  };

  const handleDownloadMarkdown = () => {
    if (!analysisResult) return;
    let md = `# Competitor Intelligence Report: ${topic}\n\n`;
    md += `**Generated:** ${new Date().toLocaleString()}\n`;
    md += `**Data Source:** ${analysisResult.dataSource}\n`;
    md += `**Posts Analyzed:** ${analysisResult.totalPostsAnalyzed}\n\n`;
    md += `## Key Metrics\n`;
    md += `| Metric | Value |\n|--------|-------|\n`;
    md += `| Avg Likes | ${analysisResult.avgEngagement?.likes} |\n`;
    md += `| Avg Comments | ${analysisResult.avgEngagement?.comments} |\n`;
    md += `| Top Format | ${analysisResult.topFormat} |\n\n`;
    if ((analysisResult.structuredGaps || []).length > 0) {
      md += `## Content Gaps\n\n`;
      for (const g of (analysisResult.structuredGaps || [])) {
        md += `### ${g.title} (Score: ${g.priorityScore}/100)\n`;
        md += `- **Type:** ${g.type}\n- **Problem:** ${g.problem}\n- **Opportunity:** ${g.opportunity}\n`;
        md += `- **Suggested Format:** ${g.suggestedFormat}\n- **Competition:** ${g.competitionLevel}\n\n`;
      }
    }
    if ((analysisResult.benchmark?.risingAngles || []).length > 0) {
      md += `## Rising Angles\n${(analysisResult.benchmark.risingAngles).map((a: string) => `- ${a}`).join('\n')}\n\n`;
    }
    if ((analysisResult.benchmark?.saturatedAngles || []).length > 0) {
      md += `## Saturated Angles (Avoid)\n${(analysisResult.benchmark.saturatedAngles).map((a: string) => `- ~~${a}~~`).join('\n')}\n\n`;
    }
    if (overtakeStrategy) {
      md += `## Overtake Strategy\n\n${overtakeStrategy}\n`;
    }
    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `competitor-strategy-${topic.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Markdown report downloaded!');
  };

  // ── AI Overtake Strategy via Anthropic API ──────────────────────────────────

  const handleGenerateStrategy = async () => {
    if (!analysisResult) return;
    setIsGeneratingStrategy(true);
    setOvertakeStrategy('');

    const prompt = `You are an elite LinkedIn content strategist. Based on this competitor intelligence data for the topic "${topic}", create a comprehensive 90-day OVERTAKE STRATEGY.

COMPETITOR DATA:
- Posts analyzed: ${analysisResult.totalPostsAnalyzed}
- Top format: ${analysisResult.topFormat}
- Avg engagement: ${analysisResult.avgEngagement?.likes} likes, ${analysisResult.avgEngagement?.comments} comments
- Data source: ${analysisResult.dataSource}

CONTENT GAPS IDENTIFIED:
${(analysisResult.structuredGaps || []).slice(0, 6).map((g: any) => `- [${g.type?.toUpperCase()}] ${g.title}: ${g.opportunity} (Priority: ${g.priorityScore}/100)`).join('\n')}

RISING ANGLES:
${(analysisResult.benchmark?.risingAngles || []).join(', ')}

SATURATED ANGLES TO AVOID:
${(analysisResult.benchmark?.saturatedAngles || []).join(', ')}

TOP CREATOR STYLES:
${(analysisResult.benchmark?.topCreators || []).map((c: any) => `- ${c.name}: ${c.style} — ${c.strength}`).join('\n')}

COMMUNITY PAIN POINTS:
${(analysisResult.communitySignal?.painPoints || []).join('\n- ')}

VIRAL PATTERNS:
- Common hooks: ${(analysisResult.viralPatterns?.commonHooks || []).join(', ')}
- Avg word count: ${analysisResult.viralPatterns?.avgWordCount}
- Emoji usage: ${analysisResult.viralPatterns?.emojiUsage}

Create a detailed, actionable 90-day OVERTAKE STRATEGY with:

## 🎯 Strategic Position
State the unique positioning to dominate this space.

## 📅 Week-by-Week Battle Plan

### Phase 1: Foundation (Weeks 1–4) — "Establish Authority"
- Content themes to own
- 3 specific post ideas with exact formats
- Key hashtags to dominate

### Phase 2: Acceleration (Weeks 5–8) — "Capture Mindshare"
- Content angles to amplify
- Collaboration & engagement tactics
- Algorithmic triggers to exploit

### Phase 3: Dominance (Weeks 9–12) — "Own the Conversation"
- Thought leadership moves
- Series/franchise content to build
- Community-building tactics

## 🔑 5 Unfair Advantage Moves
Five specific tactics the competitors are NOT doing that you can own immediately.

## 📊 KPIs to Track Weekly
What to measure to know you're winning.

## ⚡ Quick Wins (Do This Week)
3 immediate actions to take right now.

Be specific, tactical, and brutal. No generic advice. Every recommendation must be directly tied to the gap data above.`;

    try {
      const response = await competitorApi.generateStrategy({ prompt });
      const text = response.data.strategy || '';
      setOvertakeStrategy(text);
      setTimeout(() => strategyRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
      toast.success('Overtake strategy generated!');
    } catch (err) {
      toast.error('Failed to generate strategy');
    } finally {
      setIsGeneratingStrategy(false);
    }
  };

  const analysis = analysisResult;
  const structuredGaps = analysis?.structuredGaps || [];
  const contentBriefs = analysis?.contentBriefs || [];
  const benchmark = analysis?.benchmark;
  const communitySignal = analysis?.communitySignal;
  const isGrounded = analysis?.isGrounded;

  // Format strategy markdown to JSX
  const renderStrategy = (text: string) => {
    if (!text) return null;
    const lines = text.split('\n');
    return lines.map((line, i) => {
      if (line.startsWith('## ')) return <h3 key={i} className="text-lg font-bold mt-6 mb-2 text-foreground flex items-center gap-2">{line.replace('## ', '')}</h3>;
      if (line.startsWith('### ')) return <h4 key={i} className="text-sm font-bold mt-4 mb-1 text-indigo-600 dark:text-indigo-400">{line.replace('### ', '')}</h4>;
      if (line.startsWith('- ')) return <li key={i} className="text-sm ml-4 mb-1 text-foreground/90 list-disc">{line.replace('- ', '')}</li>;
      if (line.startsWith('**') && line.endsWith('**')) return <p key={i} className="text-sm font-bold my-1">{line.replace(/\*\*/g, '')}</p>;
      if (line.trim() === '') return <div key={i} className="h-1" />;
      return <p key={i} className="text-sm mb-1 text-foreground/80 leading-relaxed">{line}</p>;
    });
  };

  const isLoading = analyzeMutation.isPending || isPolling;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Swords className="w-8 h-8 text-indigo-500" />
            Competitor Intelligence
          </h1>
          <p className="text-muted-foreground mt-1">
            Real signals from Google Search grounding + AI-powered overtake strategy
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {analysis && (
            <>
              {isGrounded && (
                <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800">
                  <CheckCircle2 className="w-3 h-3 mr-1" /> Google-Grounded
                </Badge>
              )}
              <Button variant="outline" size="sm" onClick={handleSaveReport}>
                <Save className="mr-2 h-4 w-4" /> Save Report
              </Button>
              <div className="relative group">
                <Button variant="outline" size="sm">
                  <Download className="mr-2 h-4 w-4" /> Download <ChevronDown className="ml-1 h-3 w-3" />
                </Button>
                <div className="absolute right-0 top-full mt-1 bg-card border border-border rounded-lg shadow-lg z-50 min-w-[160px] hidden group-hover:block">
                  <button onClick={handleDownloadJSON} className="w-full text-left px-4 py-2 text-sm hover:bg-accent rounded-t-lg flex items-center gap-2">
                    <FileText className="w-4 h-4 text-blue-500" /> JSON
                  </button>
                  <button onClick={handleDownloadCSV} className="w-full text-left px-4 py-2 text-sm hover:bg-accent flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-green-500" /> CSV
                  </button>
                  <button onClick={handleDownloadMarkdown} className="w-full text-left px-4 py-2 text-sm hover:bg-accent rounded-b-lg flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-purple-500" /> Markdown
                  </button>
                </div>
              </div>
            </>
          )}
          <Button variant="ghost" size="sm" onClick={() => setShowSavedReports(!showSavedReports)}>
            <Save className="mr-2 h-4 w-4" />
            Saved ({savedReports.length})
          </Button>
        </div>
      </div>

      {/* Saved Reports Panel */}
      {showSavedReports && (
        <Card className="border-indigo-200 dark:border-indigo-800 bg-indigo-50/50 dark:bg-indigo-950/20">
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm flex items-center gap-2">
              <Save className="w-4 h-4 text-indigo-500" /> Saved Reports ({savedReports.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {savedReports.length === 0 ? (
              <p className="text-sm text-muted-foreground">No saved reports yet.</p>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {savedReports.map(report => (
                  <div key={report.id} className="flex items-center justify-between p-3 border rounded-lg bg-card hover:bg-accent/30 transition">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate capitalize">{report.topic}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        <Clock className="w-3 h-3" />
                        {new Date(report.savedAt).toLocaleDateString()}
                        {report.strategy && <span className="text-indigo-500 font-semibold ml-1">+ Strategy</span>}
                      </p>
                    </div>
                    <div className="flex gap-1 ml-2">
                      <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => handleLoadReport(report)}>Load</Button>
                      <Button size="sm" variant="ghost" className="h-7 px-2 text-rose-500 hover:text-rose-600 hover:bg-rose-50" onClick={() => handleDeleteReport(report.id)}>×</Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Search Bar */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-2 flex-wrap sm:flex-nowrap">
            <Input
              placeholder="Enter topic, keyword, or niche to analyze..."
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAnalyze()}
              className="flex-1"
            />
            <Button variant={depth === 'quick' ? 'secondary' : 'ghost'} onClick={() => setDepth('quick')} type="button" className="shrink-0">
              Quick Scan
            </Button>
            <Button variant={depth === 'deep' ? 'secondary' : 'ghost'} onClick={() => setDepth('deep')} type="button" className="shrink-0">
              Deep Dive
            </Button>
            <Button onClick={handleAnalyze} disabled={isLoading} className="w-36 shrink-0 bg-indigo-600 hover:bg-indigo-700">
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Search className="mr-2 h-4 w-4" />}
              {isLoading ? 'Researching...' : 'Analyze'}
            </Button>
          </div>
          {isLoading && (
            <p className="text-sm text-muted-foreground mt-3 flex items-center gap-2">
              <Radio className="w-4 h-4 text-indigo-500 animate-pulse" />
              Searching Google, Reddit, and LinkedIn for real signals... this may take a minute
            </p>
          )}
        </CardContent>
      </Card>

      {analysis && (
        <div className="grid gap-6">
          {/* KPI Row */}
          <div className="grid gap-4 md:grid-cols-4">
            {[
              { label: 'Posts Analyzed', value: analysis.totalPostsAnalyzed, sub: analysis.dataSource, color: 'text-indigo-600' },
              { label: 'Avg Engagement', value: (analysis.avgEngagement.likes + analysis.avgEngagement.comments).toLocaleString(), sub: `❤️${analysis.avgEngagement.likes} 💬${analysis.avgEngagement.comments}`, color: 'text-rose-500' },
              { label: 'Top Format', value: analysis.topFormat, sub: 'Most used type', color: 'text-amber-600' },
              { label: 'Gaps Found', value: structuredGaps.length, sub: 'Actionable opportunities', color: 'text-emerald-600' },
            ].map((kpi) => (
              <Card key={kpi.label}>
                <CardContent className="p-6">
                  <p className="text-sm font-medium text-muted-foreground">{kpi.label}</p>
                  <p className={`text-3xl font-bold mt-1 capitalize ${kpi.color}`}>{kpi.value}</p>
                  <p className="text-xs text-muted-foreground mt-1">{kpi.sub}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* AI OVERTAKE STRATEGY BUTTON */}
          <Card className="border-2 border-dashed border-indigo-300 dark:border-indigo-700 bg-indigo-50/30 dark:bg-indigo-950/10">
            <CardContent className="p-6 flex flex-col sm:flex-row items-center gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center">
                  <Trophy className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">Generate Overtake Strategy</h3>
                  <p className="text-sm text-muted-foreground">AI creates a 90-day battle plan to dominate your competitors using the gap data above.</p>
                </div>
              </div>
              <Button
                className="ml-auto shrink-0 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white shadow-lg shadow-indigo-500/30"
                onClick={handleGenerateStrategy}
                disabled={isGeneratingStrategy}
                size="lg"
              >
                {isGeneratingStrategy ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Strategizing...</>
                ) : (
                  <><Brain className="mr-2 h-4 w-4" /> Generate Strategy</>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* OVERTAKE STRATEGY RESULT */}
          {(overtakeStrategy || isGeneratingStrategy) && (
            <Card className="border-2 border-indigo-300 dark:border-indigo-700 shadow-xl" ref={strategyRef}>
              <CardHeader className="bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-t-xl">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-white">
                    <Crosshair className="w-5 h-5" />
                    90-Day Overtake Strategy: <span className="capitalize">{topic}</span>
                  </CardTitle>
                  <div className="flex gap-2">
                    {overtakeStrategy && (
                      <>
                        <Button size="sm" variant="ghost" className="text-white hover:bg-white/20 h-8 px-3"
                          onClick={() => { navigator.clipboard.writeText(overtakeStrategy); toast.success('Strategy copied!'); }}>
                          <Copy className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="ghost" className="text-white hover:bg-white/20 h-8 px-3"
                          onClick={() => setStrategyExpanded(!strategyExpanded)}>
                          {strategyExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </Button>
                      </>
                    )}
                  </div>
                </div>
                <CardDescription className="text-indigo-200 text-xs mt-1">
                  AI-generated based on real competitor gap analysis data
                </CardDescription>
              </CardHeader>
              {(strategyExpanded || isGeneratingStrategy) && (
                <CardContent className="p-6">
                  {isGeneratingStrategy && !overtakeStrategy ? (
                    <div className="space-y-3 animate-pulse">
                      {['Strategic Position', 'Phase 1: Foundation', 'Phase 2: Acceleration', 'Phase 3: Dominance', 'Unfair Advantage Moves'].map((l) => (
                        <div key={l} className="h-4 bg-muted rounded w-full" />
                      ))}
                    </div>
                  ) : (
                    <div className="prose prose-sm max-w-none dark:prose-invert">
                      {renderStrategy(overtakeStrategy)}
                    </div>
                  )}
                  {overtakeStrategy && (
                    <div className="mt-6 pt-4 border-t border-border flex gap-2 flex-wrap">
                      <Button size="sm" variant="outline" onClick={handleDownloadMarkdown}>
                        <Download className="w-4 h-4 mr-1" /> Download Strategy (.md)
                      </Button>
                      <Button size="sm" variant="outline" onClick={handleSaveReport}>
                        <Save className="w-4 h-4 mr-1" /> Save Report with Strategy
                      </Button>
                      <Button size="sm" variant="ghost" onClick={handleGenerateStrategy} disabled={isGeneratingStrategy}>
                        <RefreshCw className="w-4 h-4 mr-1" /> Regenerate
                      </Button>
                    </div>
                  )}
                </CardContent>
              )}
            </Card>
          )}

          {/* Priority Gap Board */}
          {structuredGaps.length > 0 && (
            <Card className="border-2 border-blue-200 shadow-md">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 rounded-t-lg">
                <CardTitle className="flex items-center gap-2 text-xl">
                  <Lightbulb className="h-5 w-5 text-blue-600" />
                  Priority Gap Board
                  <Badge className="ml-2 bg-blue-600 text-white">{structuredGaps.length} gaps</Badge>
                </CardTitle>
                <CardDescription>Sorted by opportunity score — real missing angles identified via Google Search.</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {structuredGaps.map((gap: any, i: number) => {
                    const typeStyle = GAP_TYPE_STYLES[gap.type] || GAP_TYPE_STYLES.angle;
                    const TypeIcon = typeStyle.icon;
                    return (
                      <div key={gap.id || i} className={`flex flex-col p-5 border-2 rounded-xl hover:shadow-md transition-all ${typeStyle.bg} ${typeStyle.border}`}>
                        <div className="flex items-center justify-between mb-3">
                          <Badge className={`${typeStyle.bg} ${typeStyle.color} border ${typeStyle.border} flex items-center gap-1 text-xs`}>
                            <TypeIcon className="w-3 h-3" /> {typeStyle.label}
                          </Badge>
                          <div className="flex items-center gap-1">
                            <span className={`text-2xl font-bold ${typeStyle.color}`}>{gap.priorityScore}</span>
                            <span className="text-xs text-muted-foreground">/100</span>
                          </div>
                        </div>
                        <Progress value={gap.priorityScore} className="h-1.5 mb-3" />
                        <h4 className="font-bold text-base mb-1">{gap.title}</h4>
                        <p className="text-sm text-muted-foreground mb-2 flex-1">{gap.problem}</p>
                        <p className="text-sm font-medium text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-950/30 px-3 py-2 rounded-lg mb-3 border border-green-200 dark:border-green-800">
                          💡 {gap.opportunity}
                        </p>
                        <div className="flex gap-2 flex-wrap mb-3">
                          <Badge variant="outline" className="text-xs capitalize">{gap.suggestedFormat}</Badge>
                          <Badge variant="outline" className={`text-xs ${gap.competitionLevel === 'low' ? 'text-green-700 border-green-300' : gap.competitionLevel === 'medium' ? 'text-amber-700 border-amber-300' : 'text-red-700 border-red-300'}`}>
                            {gap.competitionLevel === 'low' ? '🟢' : gap.competitionLevel === 'medium' ? '🟡' : '🔴'} {gap.competitionLevel}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mb-3">📈 Est. lift: <span className="font-semibold">{gap.estimatedEngagementLift}</span></p>
                        <Button size="sm" className="w-full bg-indigo-600 hover:bg-indigo-700"
                          onClick={() => handleGenerateClick(gap.opportunity, gap.suggestedFormat || 'post')}>
                          <Sparkles className="mr-1 h-3 w-3" /> Generate Now →
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Content Briefs */}
          {contentBriefs.length > 0 && (
            <Card className="border border-purple-200 shadow-sm">
              <CardHeader className="bg-purple-50 dark:bg-purple-950/20 rounded-t-lg">
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  Execution-Ready Content Briefs
                  <Badge className="ml-2 bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300">Top {contentBriefs.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                {contentBriefs.map((brief: any, i: number) => (
                  <div key={i} className="p-5 border rounded-xl bg-white dark:bg-slate-900 shadow-sm">
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div className="flex-1">
                        <h4 className="font-bold text-lg">{brief.headline}</h4>
                        <p className="text-sm text-indigo-700 dark:text-indigo-400 font-medium mt-1">{brief.angle}</p>
                      </div>
                      <Badge variant="outline" className="capitalize shrink-0">{brief.recommendedFormat}</Badge>
                    </div>
                    <div className="bg-gray-50 dark:bg-slate-800 border rounded-lg p-3 mb-4">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Opening Hook</p>
                      <p className="text-sm font-medium italic">"{brief.openingHook}"</p>
                    </div>
                    {brief.uniqueDataAngle && (
                      <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3 mb-4">
                        <p className="text-xs font-medium text-amber-800 dark:text-amber-400 uppercase tracking-wider mb-1">📊 Unique Data Angle</p>
                        <p className="text-sm font-medium text-amber-900 dark:text-amber-200">{brief.uniqueDataAngle}</p>
                      </div>
                    )}
                    <p className="text-sm text-green-700 dark:text-green-400 font-medium bg-green-50 dark:bg-green-950/30 px-3 py-2 rounded-lg border border-green-200 dark:border-green-800 mb-4">
                      ✅ {brief.whyItWins}
                    </p>
                    <Button className="w-full" onClick={() => handleGenerateClick(brief.angle, brief.recommendedFormat || 'post')}>
                      <ArrowUpRight className="mr-2 h-4 w-4" /> Generate This Now →
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Benchmark + Community Signal */}
          {(benchmark || communitySignal) && (
            <div className="grid gap-6 md:grid-cols-2">
              {benchmark && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2"><BarChart3 className="h-5 w-5 text-indigo-500" /> Landscape Benchmark</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 bg-muted rounded-lg text-center">
                        <div className="text-2xl font-bold">{benchmark.estimatedPostsPerWeek}</div>
                        <div className="text-xs text-muted-foreground">Posts / Week</div>
                      </div>
                      <div className="p-3 bg-muted rounded-lg text-center">
                        <div className="text-2xl font-bold capitalize">{benchmark.dominantFormats?.[0]?.format || '—'}</div>
                        <div className="text-xs text-muted-foreground">Top Format</div>
                      </div>
                    </div>
                    {benchmark.risingAngles?.length > 0 && (
                      <div>
                        <p className="text-sm font-medium flex items-center gap-1 mb-2 text-green-700"><TrendingUp className="w-4 h-4" /> Rising Angles</p>
                        <ul className="space-y-1">
                          {benchmark.risingAngles.map((a: string, i: number) => (
                            <li key={i} className="text-sm p-2 bg-green-50 dark:bg-green-950/30 rounded border border-green-100 dark:border-green-800 flex items-start gap-2">
                              <Star className="w-3 h-3 text-green-600 mt-0.5 shrink-0" /> {a}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {benchmark.saturatedAngles?.length > 0 && (
                      <div>
                        <p className="text-sm font-medium flex items-center gap-1 mb-2 text-red-700"><TrendingDown className="w-4 h-4" /> Avoid (Saturated)</p>
                        <ul className="space-y-1">
                          {benchmark.saturatedAngles.map((a: string, i: number) => (
                            <li key={i} className="text-sm p-2 bg-red-50 dark:bg-red-950/30 rounded border border-red-100 dark:border-red-800 line-through text-muted-foreground">{a}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {benchmark.topCreators?.length > 0 && (
                      <div>
                        <p className="text-sm font-medium mb-2 flex items-center gap-1"><Shield className="w-4 h-4 text-indigo-500" /> Top Creators</p>
                        <ul className="space-y-2">
                          {benchmark.topCreators.map((c: any, i: number) => (
                            <li key={i} className="text-sm p-3 border rounded-lg">
                              <span className="font-semibold">{c.name}</span>
                              <span className="text-muted-foreground"> — {c.style}: </span>
                              <span>{c.strength}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {communitySignal && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5 text-orange-500" /> Community Signal</CardTitle>
                    <CardDescription>Real discussions from Reddit & forums</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {communitySignal.painPoints?.length > 0 && (
                      <div>
                        <p className="text-sm font-medium mb-2 text-red-700">😤 Top Pain Points</p>
                        <ul className="space-y-1">
                          {communitySignal.painPoints.slice(0, 4).map((p: string, i: number) => (
                            <li key={i} className="text-sm p-2 bg-red-50 dark:bg-red-950/30 rounded border border-red-100 dark:border-red-800 flex items-start gap-2">
                              <AlertCircle className="w-3 h-3 text-red-500 mt-0.5 shrink-0" /> {p}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {communitySignal.commonQuestions?.length > 0 && (
                      <div>
                        <p className="text-sm font-medium mb-2 text-blue-700">❓ Unanswered Questions</p>
                        <ul className="space-y-1">
                          {communitySignal.commonQuestions.slice(0, 4).map((q: string, i: number) => (
                            <li key={i} className="text-sm p-2 bg-blue-50 dark:bg-blue-950/30 rounded border border-blue-100 dark:border-blue-800 flex items-start gap-2">
                              <Flag className="w-3 h-3 text-blue-500 mt-0.5 shrink-0" /> {q}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {communitySignal.hotDiscussions?.length > 0 && (
                      <div>
                        <p className="text-sm font-medium mb-2 text-orange-700">🔥 Hot Discussions</p>
                        <ul className="space-y-1">
                          {communitySignal.hotDiscussions.slice(0, 3).map((d: string, i: number) => (
                            <li key={i} className="text-sm p-2 bg-orange-50 dark:bg-orange-950/30 rounded border border-orange-100 dark:border-orange-800">{d}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-sm font-medium p-3 bg-muted rounded-lg">
                      Sentiment:
                      <Badge className={communitySignal.sentiment === 'positive' ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300' : communitySignal.sentiment === 'negative' ? 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300' : 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'}>
                        {communitySignal.sentiment}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Charts Row */}
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><PieChart className="h-5 w-5 text-indigo-500" /> Share of Voice</CardTitle>
              </CardHeader>
              <CardContent>
                {analysis.shareOfVoice?.length > 0 ? (
                  <div className="h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <RePieChart>
                        <Pie data={analysis.shareOfVoice.slice(0, 5)} dataKey="sharePercent" nameKey="author"
                          cx="50%" cy="50%" outerRadius={90}
                          label={({ name, percent }) => `${name?.substring(0,12)} ${(percent * 100).toFixed(0)}%`}>
                          {analysis.shareOfVoice.slice(0, 5).map((_: any, i: number) => (
                            <Cell key={i} fill={COLORS[i % COLORS.length]} />
                          ))}
                        </Pie>
                        <RechartsTooltip />
                      </RePieChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                    <div className="text-center"><AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-40" /><p className="text-sm">Insufficient data</p></div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><BarChart3 className="h-5 w-5 text-green-500" /> Engagement by Format</CardTitle>
              </CardHeader>
              <CardContent>
                {analysis.formatBreakdown?.length > 0 ? (
                  <div className="h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={analysis.formatBreakdown}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="format" className="capitalize" />
                        <YAxis />
                        <RechartsTooltip />
                        <Bar dataKey="avgLikes" name="Avg Likes" fill="#6366f1" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                    <div className="text-center"><AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-40" /><p className="text-sm">No data available</p></div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Viral Patterns + Top Posts */}
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><TrendingUp className="h-5 w-5 text-purple-500" /> Viral Patterns</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {analysis.viralPatterns?.commonHooks?.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2 text-sm">🎣 Common Hooks</h4>
                    <ul className="space-y-1">
                      {analysis.viralPatterns.commonHooks.map((hook: string, i: number) => (
                        <li key={i} className="text-sm p-2 bg-muted rounded">{hook}</li>
                      ))}
                    </ul>
                  </div>
                )}
                <div>
                  <h4 className="font-semibold mb-2 text-sm">#️⃣ Top Hashtags</h4>
                  <div className="flex flex-wrap gap-2">
                    {analysis.topHashtags?.map((tag: string, i: number) => (
                      <Badge key={i} variant="outline" className="text-xs bg-purple-50 dark:bg-purple-950/30">{tag}</Badge>
                    ))}
                  </div>
                </div>
                {analysis.viralPatterns?.avgWordCount && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-muted rounded-lg text-center">
                      <div className="text-xl font-bold">{analysis.viralPatterns.avgWordCount}</div>
                      <div className="text-xs text-muted-foreground">Avg Word Count</div>
                    </div>
                    <div className="p-3 bg-muted rounded-lg text-center">
                      <div className="text-xl font-bold">{analysis.viralPatterns.emojiUsage || 'N/A'}</div>
                      <div className="text-xs text-muted-foreground">Emoji Usage</div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Top Analyzed Posts</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {analysis.topPosts?.slice(0, 5).map((post: any, i: number) => (
                    <div key={i} className="p-3 border rounded-lg hover:bg-accent/20 transition">
                      <div className="flex justify-between items-start mb-1">
                        <p className="font-semibold text-sm">{post.author}</p>
                        <div className="flex gap-2 text-xs text-muted-foreground shrink-0 ml-2">
                          <span>❤️ {post.likes}</span>
                          <span>💬 {post.comments}</span>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2">{post.content}</p>
                      <div className="flex justify-between items-center mt-2">
                        <Badge variant="secondary" className="capitalize text-xs">{post.contentFormat}</Badge>
                        {post.postUrl?.startsWith('http') && (
                          <a href={post.postUrl} target="_blank" rel="noreferrer" className="text-xs text-indigo-500 hover:underline flex items-center gap-1">
                            View <ArrowUpRight className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Bottom CTA: Generate Strategy */}
          {!overtakeStrategy && (
            <Card className="border-indigo-200 dark:border-indigo-800 bg-gradient-to-r from-indigo-50 to-violet-50 dark:from-indigo-950/20 dark:to-violet-950/20">
              <CardContent className="p-6 text-center space-y-4">
                <Trophy className="w-12 h-12 text-indigo-500 mx-auto" />
                <h3 className="text-xl font-bold">Ready to dominate this space?</h3>
                <p className="text-muted-foreground max-w-lg mx-auto">Get a custom 90-day battle plan with Week-by-Week tactics, 5 Unfair Advantage Moves, and immediate Quick Wins — all tailored from the gap data above.</p>
                <Button size="lg" className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white shadow-lg shadow-indigo-500/30"
                  onClick={handleGenerateStrategy} disabled={isGeneratingStrategy}>
                  {isGeneratingStrategy ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating...</> : <><Brain className="mr-2 h-5 w-5" /> Generate My Overtake Strategy</>}
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      <QuickGenerateDialog 
        isOpen={isGenerateModalOpen} 
        onClose={() => setIsGenerateModalOpen(false)} 
        topic={generateTopic} 
        contentType={generateFormat} 
      />
    </div>
  );
}
