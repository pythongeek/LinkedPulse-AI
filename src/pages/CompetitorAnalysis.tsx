import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { competitorApi } from '../services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import {
  Search, Loader2, BarChart3, Lightbulb, PieChart, TrendingUp, Download,
  Sparkles, Target, Users, AlertCircle, BookOpen, ArrowUpRight, Zap,
  TrendingDown, CheckCircle2, Radio
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart as RePieChart, Pie, Cell,
} from 'recharts';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

// Gap type color coding from the plan
const GAP_TYPE_STYLES: Record<string, { label: string; color: string; bg: string; border: string; icon: any }> = {
  angle:    { label: 'Angle Gap',    color: 'text-blue-700',   bg: 'bg-blue-50',   border: 'border-blue-200',   icon: Target },
  format:   { label: 'Format Gap',  color: 'text-purple-700', bg: 'bg-purple-50', border: 'border-purple-200', icon: BarChart3 },
  audience: { label: 'Audience Gap', color: 'text-green-700',  bg: 'bg-green-50',  border: 'border-green-200',  icon: Users },
  recency:  { label: 'Recency Gap', color: 'text-amber-700',  bg: 'bg-amber-50',  border: 'border-amber-200',  icon: TrendingUp },
  data:     { label: 'Data Gap',    color: 'text-red-700',    bg: 'bg-red-50',    border: 'border-red-200',    icon: BookOpen },
  depth:    { label: 'Depth Gap',   color: 'text-teal-700',   bg: 'bg-teal-50',   border: 'border-teal-200',   icon: Zap },
};

export default function CompetitorAnalysis() {
  const [topic, setTopic] = useState('');
  const [depth, setDepth] = useState<'quick' | 'deep'>('quick');
  const navigate = useNavigate();

  const analyzeMutation = useMutation({
    mutationFn: (t: string) => competitorApi.analyze({ topic: t, depth }),
    onSuccess: (res) => {
      if (res.data.cached) {
        toast.info('Loaded from recent cache');
      } else {
        toast.success('Real competitor intelligence ready!');
      }
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || 'Analysis failed');
    },
  });

  const handleAnalyze = () => {
    if (!topic) { toast.error('Please enter a topic'); return; }
    analyzeMutation.mutate(topic);
  };

  const analysis = analyzeMutation.data?.data.analysis as any;
  const structuredGaps = analysis?.structuredGaps || [];
  const contentBriefs = analysis?.contentBriefs || [];
  const benchmark = analysis?.benchmark;
  const communitySignal = analysis?.communitySignal;
  const isGrounded = analysis?.isGrounded;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Competitor Intelligence</h1>
          <p className="text-muted-foreground">
            Real signals from Google Search grounding — no hallucinated data.
          </p>
        </div>
        {analysis && (
          <div className="flex items-center gap-2">
            {isGrounded && (
              <Badge className="bg-green-100 text-green-800 border-green-200 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Google-Grounded
              </Badge>
            )}
            <Button variant="outline" size="sm" onClick={() => toast.info('Export coming soon')}>
              <Download className="mr-2 h-4 w-4" /> Export
            </Button>
          </div>
        )}
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-2">
            <Input
              placeholder="Enter a keyword, topic, or niche..."
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAnalyze()}
              className="flex-1"
            />
            <Button
              variant={depth === 'quick' ? 'secondary' : 'ghost'}
              onClick={() => setDepth('quick')}
              type="button"
            >
              Quick Scan
            </Button>
            <Button
              variant={depth === 'deep' ? 'secondary' : 'ghost'}
              onClick={() => setDepth('deep')}
              type="button"
            >
              Deep Dive
            </Button>
            <Button
              onClick={handleAnalyze}
              disabled={analyzeMutation.isPending}
              className="w-36"
            >
              {analyzeMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Search className="mr-2 h-4 w-4" />
              )}
              {analyzeMutation.isPending ? 'Researching...' : 'Analyze'}
            </Button>
          </div>
          {analyzeMutation.isPending && (
            <p className="text-sm text-muted-foreground mt-3 flex items-center gap-2">
              <Radio className="w-4 h-4 text-blue-500 animate-pulse" />
              Searching Google, Reddit, and LinkedIn for real signals... this takes ~30 seconds
            </p>
          )}
        </CardContent>
      </Card>

      {analysis && (
        <div className="grid gap-6">
          {/* KPI Row */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardContent className="p-6">
                <p className="text-sm font-medium text-muted-foreground">Posts Analyzed</p>
                <div className="flex items-center mt-2">
                  <p className="text-3xl font-bold">{analysis.totalPostsAnalyzed}</p>
                  <Badge variant="outline" className="ml-auto text-xs">{analysis.dataSource}</Badge>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <p className="text-sm font-medium text-muted-foreground">Avg Engagement</p>
                <div className="flex items-center mt-2">
                  <p className="text-3xl font-bold">
                    {(analysis.avgEngagement.likes + analysis.avgEngagement.comments).toLocaleString()}
                  </p>
                  <span className="ml-auto text-xs text-muted-foreground">
                    ❤️{analysis.avgEngagement.likes} 💬{analysis.avgEngagement.comments}
                  </span>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <p className="text-sm font-medium text-muted-foreground">Top Format</p>
                <div className="flex items-center mt-2">
                  <p className="text-3xl font-bold capitalize">{analysis.topFormat}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <p className="text-sm font-medium text-muted-foreground">Content Gaps Found</p>
                <div className="flex items-center mt-2">
                  <p className="text-3xl font-bold text-green-600">{structuredGaps.length}</p>
                  <Badge className="ml-auto bg-green-100 text-green-800">Actionable</Badge>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* === PRIORITY GAP BOARD === */}
          {structuredGaps.length > 0 && (
            <Card className="border-2 border-blue-200 shadow-md">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-t-lg">
                <CardTitle className="flex items-center gap-2 text-xl">
                  <Lightbulb className="h-5 w-5 text-blue-600" />
                  Priority Gap Board
                  <Badge className="ml-2 bg-blue-600 text-white">{structuredGaps.length} gaps</Badge>
                </CardTitle>
                <CardDescription>
                  Sorted by opportunity score — these are real missing angles, not AI guesses.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {structuredGaps.map((gap: any, i: number) => {
                    const typeStyle = GAP_TYPE_STYLES[gap.type] || GAP_TYPE_STYLES.angle;
                    const TypeIcon = typeStyle.icon;
                    return (
                      <div
                        key={gap.id || i}
                        className={`flex flex-col p-5 border-2 rounded-xl transition-all hover:shadow-md ${typeStyle.bg} ${typeStyle.border}`}
                      >
                        {/* Type badge + score */}
                        <div className="flex items-center justify-between mb-3">
                          <Badge className={`${typeStyle.bg} ${typeStyle.color} border ${typeStyle.border} flex items-center gap-1 text-xs`}>
                            <TypeIcon className="w-3 h-3" />
                            {typeStyle.label}
                          </Badge>
                          <div className="flex items-center gap-1">
                            <span className={`text-2xl font-bold ${typeStyle.color}`}>{gap.priorityScore}</span>
                            <span className="text-xs text-muted-foreground">/100</span>
                          </div>
                        </div>

                        {/* Priority progress bar */}
                        <Progress value={gap.priorityScore} className="h-1.5 mb-3" />

                        {/* Content */}
                        <h4 className="font-bold text-base mb-1">{gap.title}</h4>
                        <p className="text-sm text-muted-foreground mb-2 flex-1">{gap.problem}</p>
                        <p className="text-sm font-medium text-green-700 bg-green-50 px-3 py-2 rounded-lg mb-3 border border-green-200">
                          💡 {gap.opportunity}
                        </p>

                        {/* Metadata */}
                        <div className="flex gap-2 flex-wrap mb-4">
                          <Badge variant="outline" className="text-xs capitalize">{gap.suggestedFormat}</Badge>
                          <Badge
                            variant="outline"
                            className={`text-xs ${gap.competitionLevel === 'low' ? 'text-green-700 border-green-300' : gap.competitionLevel === 'medium' ? 'text-amber-700 border-amber-300' : 'text-red-700 border-red-300'}`}
                          >
                            {gap.competitionLevel === 'low' ? '🟢' : gap.competitionLevel === 'medium' ? '🟡' : '🔴'} {gap.competitionLevel} competition
                          </Badge>
                        </div>

                        {/* Lift estimate */}
                        <p className="text-xs text-muted-foreground mb-4">
                          📈 Est. lift: <span className="font-semibold">{gap.estimatedEngagementLift}</span>
                        </p>

                        {/* Actions */}
                        <div className="flex gap-2 mt-auto">
                          <Button
                            size="sm"
                            className="flex-1 bg-blue-600 hover:bg-blue-700"
                            onClick={() => navigate(`/content/studio?topic=${encodeURIComponent(gap.opportunity)}&contentType=${gap.suggestedFormat || 'post'}&hookFormula=${gap.suggestedHookFormula || ''}`)}
                          >
                            <Sparkles className="mr-1 h-3 w-3" /> Generate Now →
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* === CONTENT BRIEFS === */}
          {contentBriefs.length > 0 && (
            <Card className="border border-purple-200 shadow-sm">
              <CardHeader className="bg-purple-50 rounded-t-lg">
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-purple-600" />
                  Execution-Ready Content Briefs
                  <Badge className="ml-2 bg-purple-100 text-purple-800">Top {contentBriefs.length}</Badge>
                </CardTitle>
                <CardDescription>
                  Full briefs a ghostwriter can execute immediately — based on real gaps.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  {contentBriefs.map((brief: any, i: number) => (
                    <div key={i} className="p-5 border rounded-xl bg-white shadow-sm">
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <div className="flex-1">
                          <h4 className="font-bold text-lg">{brief.headline}</h4>
                          <p className="text-sm text-blue-700 font-medium mt-1">{brief.angle}</p>
                        </div>
                        <Badge variant="outline" className="capitalize shrink-0">{brief.recommendedFormat}</Badge>
                      </div>

                      {/* Opening hook */}
                      <div className="bg-gray-50 border rounded-lg p-3 mb-4">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Opening Hook</p>
                        <p className="text-sm font-medium italic">"{brief.openingHook}"</p>
                      </div>

                      {/* Key points */}
                      <div className="mb-4">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Key Points</p>
                        <ul className="space-y-1">
                          {brief.keyPoints?.map((pt: string, j: number) => (
                            <li key={j} className="text-sm flex items-start gap-2">
                              <span className="text-blue-500 mt-0.5">•</span> {pt}
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Data angle */}
                      {brief.uniqueDataAngle && (
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
                          <p className="text-xs font-medium text-amber-800 uppercase tracking-wider mb-1">📊 Unique Data Angle</p>
                          <p className="text-sm font-medium text-amber-900">{brief.uniqueDataAngle}</p>
                        </div>
                      )}

                      {/* Why it wins */}
                      <p className="text-sm text-green-700 font-medium bg-green-50 px-3 py-2 rounded-lg border border-green-200 mb-4">
                        ✅ {brief.whyItWins}
                      </p>

                      <Button
                        onClick={() => navigate(`/content/studio?topic=${encodeURIComponent(brief.angle)}&hookFormula=${encodeURIComponent(brief.openingHook || '')}&contentType=${brief.recommendedFormat || 'post'}`)}
                        className="w-full"
                      >
                        <ArrowUpRight className="mr-2 h-4 w-4" /> Generate This Now →
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* === BENCHMARK + COMMUNITY SIGNAL === */}
          {(benchmark || communitySignal) && (
            <div className="grid gap-6 md:grid-cols-2">
              {/* Benchmark */}
              {benchmark && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="h-5 w-5 text-blue-500" /> Landscape Benchmark
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
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
                        <p className="text-sm font-medium flex items-center gap-1 mb-2 text-green-700">
                          <TrendingUp className="w-4 h-4" /> Rising Angles
                        </p>
                        <ul className="space-y-1">
                          {benchmark.risingAngles.map((a: string, i: number) => (
                            <li key={i} className="text-sm p-2 bg-green-50 rounded border border-green-100">{a}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {benchmark.saturatedAngles?.length > 0 && (
                      <div>
                        <p className="text-sm font-medium flex items-center gap-1 mb-2 text-red-700">
                          <TrendingDown className="w-4 h-4" /> Saturated Angles (Avoid)
                        </p>
                        <ul className="space-y-1">
                          {benchmark.saturatedAngles.map((a: string, i: number) => (
                            <li key={i} className="text-sm p-2 bg-red-50 rounded border border-red-100 line-through text-muted-foreground">{a}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {benchmark.topCreators?.length > 0 && (
                      <div>
                        <p className="text-sm font-medium mb-2">🏆 Top Creators</p>
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

              {/* Community Signal */}
              {communitySignal && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5 text-orange-500" /> Community Signal
                    </CardTitle>
                    <CardDescription>Real discussions from Reddit & forums</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {communitySignal.painPoints?.length > 0 && (
                      <div>
                        <p className="text-sm font-medium mb-2 text-red-700">😤 Top Pain Points</p>
                        <ul className="space-y-1">
                          {communitySignal.painPoints.slice(0, 4).map((p: string, i: number) => (
                            <li key={i} className="text-sm p-2 bg-red-50 rounded border border-red-100 flex items-start gap-2">
                              <span className="text-red-400">•</span> {p}
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
                            <li key={i} className="text-sm p-2 bg-blue-50 rounded border border-blue-100 flex items-start gap-2">
                              <span className="text-blue-400">•</span> {q}
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
                            <li key={i} className="text-sm p-2 bg-orange-50 rounded border border-orange-100">{d}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-sm font-medium p-3 bg-muted rounded-lg">
                      <span>Overall Sentiment:</span>
                      <Badge className={communitySignal.sentiment === 'positive' ? 'bg-green-100 text-green-800' : communitySignal.sentiment === 'negative' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'}>
                        {communitySignal.sentiment}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Format Performance Chart + Share of Voice */}
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="h-5 w-5 text-blue-500" /> Share of Voice
                </CardTitle>
                <CardDescription>Who is dominating this topic?</CardDescription>
              </CardHeader>
              <CardContent>
                {analysis.shareOfVoice?.length > 0 ? (
                  <div className="h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <RePieChart>
                        <Pie
                          data={analysis.shareOfVoice.slice(0, 5)}
                          dataKey="sharePercent"
                          nameKey="author"
                          cx="50%"
                          cy="50%"
                          outerRadius={90}
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        >
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
                    <div className="text-center">
                      <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-40" />
                      <p className="text-sm">Insufficient data for share of voice analysis</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-green-500" /> Engagement by Format
                </CardTitle>
                <CardDescription>Average likes per content type</CardDescription>
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
                        <Bar dataKey="avgLikes" name="Average Likes" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                    <div className="text-center">
                      <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-40" />
                      <p className="text-sm">No format breakdown data available</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Viral Patterns + Top Posts */}
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-purple-500" /> Viral Patterns
                </CardTitle>
                <CardDescription>Anatomy of highest-performing posts</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
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
                        <Badge key={i} variant="outline" className="text-xs bg-purple-50">{tag}</Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Top Analyzed Posts</CardTitle>
                <CardDescription>Highest-engaging posts found</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {analysis.topPosts?.slice(0, 4).map((post: any, i: number) => (
                    <div key={i} className="p-3 border rounded-lg">
                      <div className="flex justify-between items-start mb-1">
                        <p className="font-semibold text-sm">{post.author}</p>
                        <div className="flex gap-2 text-xs text-muted-foreground">
                          <span>❤️ {post.likes}</span>
                          <span>💬 {post.comments}</span>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2">{post.content}</p>
                      <div className="flex justify-between items-center mt-2">
                        <Badge variant="secondary" className="capitalize text-xs">{post.contentFormat}</Badge>
                        {post.postUrl?.startsWith('http') && (
                          <a
                            href={post.postUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs text-blue-500 hover:underline flex items-center gap-1"
                          >
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
        </div>
      )}
    </div>
  );
}
