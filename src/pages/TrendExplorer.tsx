import { useState, useEffect } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { trendApi, userApi } from '../services/api';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, Area, AreaChart, BarChart, Bar, Cell, ReferenceLine, Legend,
} from 'recharts';
import {
  Search, Download, Share2, RefreshCw, Zap, AlertCircle,
  TrendingUp, TrendingDown, FileText, Layers, BookOpen, BarChart2,
  ChevronRight, Sparkles,
} from 'lucide-react';

import ResearchConfigurator from '../components/trends/ResearchConfigurator';
import SignalIntelligenceRow from '../components/trends/SignalIntelligenceRow';
import GapIntelligenceBoard from '../components/trends/GapIntelligenceBoard';
import CommunitySignalPanel from '../components/trends/CommunitySignalPanel';
import VerifiedStatsPanel from '../components/trends/VerifiedStatsPanel';
import EditorialCalendarPanel from '../components/trends/EditorialCalendarPanel';
import RelatedTopicsPanel from '../components/trends/RelatedTopicsPanel';
import AlgorithmCompliancePanel from '../components/trends/AlgorithmCompliancePanel';
import ComparisonView from '../components/trends/ComparisonView';
import TopicWatchlist from '../components/trends/TopicWatchlist';
import { QuickGenerateDialog } from '../components/studio/QuickGenerateDialog';

import type { TrendResearchConfig, ContentTypeTarget } from '../types/trendExplorer';

const SUGGESTION_CHIPS = [
  'AI agents replacing knowledge workers',
  'B2B sales automation 2025',
  'Remote work culture shifts',
  'SaaS pricing strategy trends',
  'Engineering leadership skills',
];

const FORMAT_COLORS: Record<string, string> = {
  carousel: '#8b5cf6',
  post: '#3b82f6',
  article: '#10b981',
  poll: '#f59e0b',
};

function EmptyState({ onSuggest }: { onSuggest: (kw: string) => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center space-y-6">
      <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
        <Search className="w-8 h-8 text-primary" />
      </div>
      <div>
        <h2 className="text-xl font-semibold mb-2">Discover Your Next Content Opportunity</h2>
        <p className="text-muted-foreground text-sm max-w-md">
          Research any topic to see trending signals, content gaps, verified statistics,
          and a ready-made 4-week editorial calendar.
        </p>
      </div>
      <div>
        <p className="text-xs text-muted-foreground mb-3">Start with one of these:</p>
        <div className="flex flex-wrap gap-2 justify-center max-w-lg">
          {SUGGESTION_CHIPS.map((chip) => (
            <button
              key={chip}
              onClick={() => onSuggest(chip)}
              className="px-3 py-1.5 rounded-full text-xs font-medium border border-primary/30 bg-primary/5 hover:bg-primary/10 text-primary transition-all duration-150"
            >
              {chip}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      {/* KPI cards skeleton */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => (
          <Skeleton key={i} className="h-36 rounded-xl" />
        ))}
      </div>
      {/* Charts skeleton */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
      {/* Gap board skeleton */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map(i => (
          <Skeleton key={i} className="h-56 rounded-xl" />
        ))}
      </div>
    </div>
  );
}

export default function TrendExplorer() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [config, setConfig] = useState<TrendResearchConfig | null>(null);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [initialKeyword, setInitialKeyword] = useState(searchParams.get('keyword') || '');
  
  // Inline Generation God Mode State
  const [generateTopic, setGenerateTopic] = useState('');
  const [generateFormat, setGenerateFormat] = useState('post');
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);

  // Opportunities sidebar
  const { data: opportunitiesData } = useQuery({
    queryKey: ['opportunities'],
    queryFn: () => trendApi.getOpportunities().then(r => r.data.topics || []),
  });

  const analyzeMutation = useMutation({
    mutationFn: (cfg: TrendResearchConfig) =>
      trendApi.analyze({
        keywords: cfg.compareWith ? [cfg.keyword, cfg.compareWith] : [cfg.keyword],
        timeframe: cfg.timeframe,
        geo: cfg.geo,
        contentTypeTarget: cfg.contentTypeTarget,
        topicType: cfg.topicType,
        audienceSegment: cfg.audienceSegment,
        industryVertical: cfg.industryVertical,
        isBtoB: cfg.isBtoB,
        personaId: cfg.personaId,
        competitorContext: cfg.competitorContext,
        existingContentContext: cfg.existingContentContext,
        customResearchDirective: cfg.customResearchDirective,
        researchDepth: cfg.researchDepth,
      }),
    onSuccess: (response) => {
      setAnalysisResult(response.data);
      toast.success('Analysis complete!');
    },
    onError: () => {
      toast.error('Research failed. Please try again.');
    },
  });

  const addWatchlistMutation = useMutation({
    mutationFn: (cfg: TrendResearchConfig) => userApi.addToWatchlist({
      keyword: cfg.keyword,
      contentType: cfg.contentTypeTarget,
      topicType: cfg.topicType,
      audienceSegment: cfg.audienceSegment,
      alertThreshold: 70,
    }),
    onSuccess: () => toast.success('Topic added to watchlist!'),
    onError: () => toast.error('Could not add to watchlist'),
  });

  const handleResearch = (cfg: TrendResearchConfig) => {
    setConfig(cfg);
    analyzeMutation.mutate(cfg);
  };

  const handleSuggestionClick = (keyword: string) => {
    const defaultConfig: TrendResearchConfig = {
      keyword,
      contentTypeTarget: 'post',
      topicType: 'thought_leadership',
      audienceSegment: 'general_professionals',
      industryVertical: '',
      timeframe: 'today 3-m',
      geo: 'US',
      isBtoB: true,
      researchDepth: 'quick',
    };
    setInitialKeyword(keyword);
    setConfig(defaultConfig);
    analyzeMutation.mutate(defaultConfig);
  };

  const handleTopicClick = (topic: string) => {
    const cfg: TrendResearchConfig = {
      ...((config as TrendResearchConfig) || {}),
      keyword: topic,
      contentTypeTarget: config?.contentTypeTarget || 'post',
      topicType: config?.topicType || 'thought_leadership',
      audienceSegment: config?.audienceSegment || 'general_professionals',
      industryVertical: config?.industryVertical || '',
      timeframe: config?.timeframe || 'today 3-m',
      geo: config?.geo || 'US',
      isBtoB: config?.isBtoB !== undefined ? config.isBtoB : true,
      researchDepth: config?.researchDepth || 'quick',
    };
    setInitialKeyword(topic);
    setConfig(cfg);
    analyzeMutation.mutate(cfg);
  };

  const handleGenerateNow = (contentType: string, specificTopic?: string) => {
    const keyword = specificTopic || config?.keyword || analysisResult?.data?.meta?.keyword;
    if (keyword) {
      setGenerateTopic(keyword);
      setGenerateFormat(contentType);
      setIsGenerateModalOpen(true);
    } else {
      toast.error('No topic selected for generation');
    }
  };

  const handleSwitchFormat = (format: string) => {
    if (config) {
      const newConfig = { ...config, contentTypeTarget: format as ContentTypeTarget };
      setConfig(newConfig);
    }
  };

  const handleExportPdf = async () => {
    if (!analysisResult) return;
    try {
      toast.info('Generating PDF report...');
      const response = await trendApi.exportPdf(analysisResult);
      const url = URL.createObjectURL(new Blob([response.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `trend-analysis-${Date.now()}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('PDF downloaded!');
    } catch {
      toast.error('Failed to generate PDF');
    }
  };

  const handleShare = async () => {
    if (!analysisResult) return;
    try {
      const response = await trendApi.share(analysisResult, config?.keyword || '');
      const shareUrl = `${window.location.origin}${response.data.url}`;
      await navigator.clipboard.writeText(shareUrl);
      toast.success('Share link copied to clipboard!');
    } catch {
      toast.error('Failed to create share link');
    }
  };

  const handleRefresh = () => {
    if (!config) return;
    analyzeMutation.mutate({ ...config });
  };

  const research = analysisResult?.data?.research;
  const opportunity = analysisResult?.data?.opportunity;
  const gaps = analysisResult?.data?.gaps;
  const comparison = analysisResult?.data?.comparison;
  const meta = analysisResult?.data?.meta;
  const isCached = analysisResult?.cached;
  const cachedAt = analysisResult?.cachedAt;

  const trendData = research?.interestOverTime || [];

  // Format performance chart data
  const formatPerfData = research?.linkedinContext?.formatPerformanceScores
    ? Object.entries(research.linkedinContext.formatPerformanceScores).map(([format, score]) => ({
        format: format.charAt(0).toUpperCase() + format.slice(1),
        score: score as number,
        fill: FORMAT_COLORS[format] || '#6b7280',
      }))
    : [];

  const hasResults = !!analysisResult;
  const isLoading = analyzeMutation.isPending;
  const hasComparison = !!comparison && !!config?.compareWith;

  return (
    <div className="flex gap-6 min-h-screen">
      {/* Left sticky panel */}
      <aside className="w-72 flex-shrink-0 space-y-4">
        <div className="sticky top-4 space-y-4 max-h-[calc(100vh-2rem)] overflow-y-auto pr-1 pb-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Trend Explorer</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Intelligence hub for LinkedIn content opportunities
            </p>
          </div>

          <ResearchConfigurator
            onSubmit={handleResearch}
            isLoading={isLoading}
            initialKeyword={initialKeyword}
            onSaveAlert={(cfg) => addWatchlistMutation.mutate(cfg)}
          />

          <TopicWatchlist
            currentKeyword={config?.keyword}
            currentConfig={config}
            onSelectTopic={handleTopicClick}
          />
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 min-w-0 space-y-6 pb-8">

        {/* Loading */}
        {isLoading && <LoadingSkeleton />}

        {/* Empty state */}
        {!isLoading && !hasResults && (
          <EmptyState onSuggest={handleSuggestionClick} />
        )}

        {/* Results */}
        {!isLoading && hasResults && (
          <>
            {/* Results header */}
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-primary" />
                  {config?.keyword}
                  {config?.compareWith && (
                    <span className="text-muted-foreground font-normal text-base">
                      {' '}vs{' '}
                    </span>
                  )}
                  {config?.compareWith && (
                    <span>{config.compareWith}</span>
                  )}
                </h2>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  {meta?.context?.contentTypeTarget && (
                    <Badge variant="outline" className="text-xs">{meta.context.contentTypeTarget}</Badge>
                  )}
                  {meta?.context?.audienceSegment && (
                    <Badge variant="outline" className="text-xs capitalize">{(meta.context.audienceSegment as string).replace(/_/g, ' ')}</Badge>
                  )}
                  {meta?.context?.industryVertical && (
                    <Badge variant="outline" className="text-xs">{meta.context.industryVertical}</Badge>
                  )}
                  {isCached && cachedAt && (
                    <Badge variant="secondary" className="text-xs flex items-center gap-1">
                      <Zap className="w-2.5 h-2.5" />
                      Cached result
                    </Badge>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {isCached && (
                  <Button variant="ghost" size="sm" className="h-8 text-xs gap-1.5" onClick={handleRefresh}>
                    <RefreshCw className="w-3.5 h-3.5" />
                    Refresh
                  </Button>
                )}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5">
                      <Download className="w-3.5 h-3.5" />
                      Export
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={handleExportPdf}>
                      <FileText className="w-4 h-4 mr-2" />
                      Download PDF Report
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleShare}>
                      <Share2 className="w-4 h-4 mr-2" />
                      Copy Share Link
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* Comparison mode */}
            {hasComparison ? (
              <ComparisonView
                primaryKeyword={config!.keyword}
                compareKeyword={config!.compareWith!}
                primaryData={analysisResult?.data}
                compareData={{ opportunity: comparison?.opportunity, research: comparison?.research }}
                onSelectTopic={handleTopicClick}
              />
            ) : (
              <>
                {/* Signal Intelligence Row — 4 KPI cards */}
                {opportunity && research && (
                  <SignalIntelligenceRow
                    opportunity={opportunity}
                    research={research}
                    onGenerateNow={handleGenerateNow}
                  />
                )}

                {/* Charts Row */}
                <div className="grid gap-4 lg:grid-cols-2">
                  {/* Interest Over Time */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">Interest Over Time</CardTitle>
                      <CardDescription className="text-xs">
                        {research?.isFullyGrounded
                          ? '⚡ Grounded by real search trend data'
                          : '📊 Estimated search interest (AI model)'
                        }
                        {research?.isPeaking && (
                          <span className="ml-2 text-amber-500 font-medium">📈 Currently Peaking</span>
                        )}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="h-48">
                        {trendData.length > 0 ? (
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={trendData}>
                              <defs>
                                <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
                                  <stop
                                    offset="5%"
                                    stopColor={
                                      opportunity?.velocity === 'exploding' || opportunity?.velocity === 'rising'
                                        ? '#10b981'
                                        : opportunity?.velocity === 'dying' || opportunity?.velocity === 'cooling'
                                        ? '#ef4444'
                                        : '#6366f1'
                                    }
                                    stopOpacity={0.3}
                                  />
                                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                              <XAxis dataKey="date" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                              <YAxis tick={{ fontSize: 10 }} />
                              <RechartsTooltip
                                contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }}
                              />
                              {research?.isPeaking && (
                                <ReferenceLine y={Math.max(...trendData.map((d: any) => d.value))} stroke="#f59e0b" strokeDasharray="5 5" label={{ value: 'Peak', position: 'insideTopRight', fill: '#f59e0b', fontSize: 10 }} />
                              )}
                              <Area
                                type="monotone"
                                dataKey="value"
                                stroke={
                                  opportunity?.velocity === 'exploding' || opportunity?.velocity === 'rising'
                                    ? '#10b981'
                                    : opportunity?.velocity === 'dying' || opportunity?.velocity === 'cooling'
                                    ? '#ef4444'
                                    : '#6366f1'
                                }
                                strokeWidth={2.5}
                                fill="url(#trendGrad)"
                              />
                            </AreaChart>
                          </ResponsiveContainer>
                        ) : (
                          <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                            <AlertCircle className="w-4 h-4 mr-2" /> No trend data available
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Format Performance */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">Format Performance</CardTitle>
                      <CardDescription className="text-xs">
                        Estimated engagement lift by content format for this topic
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="h-48">
                        {formatPerfData.length > 0 ? (
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={formatPerfData} layout="vertical" margin={{ left: 16, right: 16 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                              <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10 }} />
                              <YAxis type="category" dataKey="format" tick={{ fontSize: 11 }} width={60} />
                              <RechartsTooltip
                                formatter={(v: any) => [`${v}/100`, 'Engagement Score']}
                                contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }}
                              />
                              <Bar dataKey="score" radius={[0, 4, 4, 0]} cursor="pointer" onClick={(d) => handleGenerateNow(d.format.toLowerCase())}>
                                {formatPerfData.map((entry, i) => (
                                  <Cell key={i} fill={entry.fill} />
                                ))}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        ) : (
                          <div className="space-y-3 pt-2">
                            {['Carousel', 'Post', 'Article', 'Poll'].map((fmt, i) => (
                              <div key={fmt} className="flex items-center gap-3">
                                <span className="text-xs w-16 text-muted-foreground">{fmt}</span>
                                <div className="flex-1 h-6 bg-muted rounded-md overflow-hidden">
                                  <div
                                    className="h-full rounded-md transition-all"
                                    style={{
                                      width: `${[80, 65, 55, 45][i]}%`,
                                      background: Object.values(FORMAT_COLORS)[i],
                                    }}
                                  />
                                </div>
                                <span className="text-xs text-muted-foreground w-8">{[80, 65, 55, 45][i]}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Gap Intelligence Board */}
                {gaps && (
                  <GapIntelligenceBoard
                    gaps={gaps}
                    topic={config?.keyword || ''}
                    audienceSegment={config?.audienceSegment}
                    onGenerateNow={handleGenerateNow}
                  />
                )}

                {/* Bottom Row — 3 panels */}
                <div className="grid gap-4 lg:grid-cols-3">
                  {research && (
                    <CommunitySignalPanel
                      research={research}
                      onTopicClick={handleTopicClick}
                    />
                  )}
                  {research && (
                    <VerifiedStatsPanel research={research} />
                  )}
                  {gaps && (
                    <EditorialCalendarPanel
                      gaps={gaps}
                      topic={config?.keyword || ''}
                      config={config}
                    />
                  )}
                </div>

                {/* Related & Avoid */}
                {research && (
                  <RelatedTopicsPanel
                    research={{ ...research, gaps }}
                    onTopicClick={handleTopicClick}
                  />
                )}

                {/* Algorithm Compliance */}
                {config && (
                  <AlgorithmCompliancePanel
                    config={config}
                    analysis={analysisResult?.data}
                    onSwitchFormat={handleSwitchFormat}
                  />
                )}
              </>
            )}
          </>
        )}

        {/* Content Opportunities at bottom if no analysis */}
        {!hasResults && !isLoading && opportunitiesData && opportunitiesData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Trending Content Opportunities</CardTitle>
              <CardDescription>High-opportunity topics from your research history</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {opportunitiesData.slice(0, 9).map((topic: any) => (
                  <button
                    key={topic.id}
                    onClick={() => handleSuggestionClick(topic.keyword)}
                    className="group flex items-center justify-between p-3 rounded-xl border hover:border-primary/50 hover:bg-accent/30 transition-all text-left"
                  >
                    <div>
                      <h3 className="font-medium capitalize text-sm">{topic.keyword}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full bg-primary"
                            style={{ width: `${topic.opportunityScore || 0}%` }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {Math.round(topic.opportunityScore || 0)}/100
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </main>

      <QuickGenerateDialog 
        isOpen={isGenerateModalOpen} 
        onClose={() => setIsGenerateModalOpen(false)} 
        topic={generateTopic} 
        contentType={generateFormat} 
      />
    </div>
  );
}
