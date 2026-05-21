import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { trendApi } from '../services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { Search, Loader2, Sparkles, TrendingUp, Users, Target, BookOpen, AlertCircle } from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

export default function TrendExplorer() {
  const [keyword, setKeyword] = useState('');
  const [analyzing, setAnalyzing] = useState(false);

  const { data: opportunities } = useQuery({
    queryKey: ['opportunities'],
    queryFn: () => trendApi.getOpportunities().then((res) => res.data.topics || []),
  });

  const analyzeMutation = useMutation({
    mutationFn: (kw: string) =>
      trendApi.analyze({ keywords: [kw], timeframe: 'today 3-m' }),
    onSuccess: () => {
      toast.success('Analysis complete! Check out the real signals.');
    },
  });

  const handleAnalyze = () => {
    if (!keyword) return;
    setAnalyzing(true);
    analyzeMutation.mutate(keyword);
    setAnalyzing(false);
  };

  const analysisResult = analyzeMutation.data?.data;
  const trendData = analysisResult?.research?.interestOverTime || analysisResult?.legacyComparison?.[0]?.interestOverTime || [];
  const oppScore = analysisResult?.opportunity;
  const gaps = analysisResult?.gaps;
  const research = analysisResult?.research;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Trend Explorer</h1>
        <p className="text-muted-foreground">
          Discover trending topics and content opportunities
        </p>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-2">
            <Input
              placeholder="Enter a keyword or topic..."
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAnalyze()}
            />
            <Button onClick={handleAnalyze} disabled={analyzing || analyzeMutation.isPending}>
              {analyzing || analyzeMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
              Analyze
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {analysisResult && (
        <div className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Interest Over Time</CardTitle>
                <CardDescription>
                  {research?.isFullyGrounded ? "Grounded by real Search Trends" : "Estimated search interest"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trendData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Line
                        type="monotone"
                        dataKey="value"
                        stroke="#3b82f6"
                        strokeWidth={2}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Opportunity Score</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {oppScore && (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-5xl font-bold">
                        {oppScore.overallScore}
                      </span>
                      <Badge
                        variant={
                          oppScore.overallScore >= 80 ? 'default' : oppScore.overallScore >= 60 ? 'secondary' : 'outline'
                        }
                        className="text-lg py-1 px-3"
                      >
                        {oppScore.opportunityLevel}
                      </Badge>
                    </div>
                    <Progress value={oppScore.overallScore} className="h-3" />
                    <p className="text-sm font-medium text-muted-foreground bg-muted p-3 rounded-md border-l-4 border-primary">
                      {oppScore.recommendation}
                    </p>
                    <div className="space-y-2 pt-2 border-t">
                      <div className="flex justify-between text-sm">
                        <span className="flex items-center gap-2"><TrendingUp className="w-4 h-4 text-blue-500" /> Momentum</span>
                        <span className="font-medium">{oppScore.factors.trendMomentum}/100</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="flex items-center gap-2"><Users className="w-4 h-4 text-orange-500" /> Reddit Signal</span>
                        <span className="font-medium">{oppScore.factors.communityInterest}/100</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="flex items-center gap-2"><Target className="w-4 h-4 text-green-500" /> Content Gaps</span>
                        <span className="font-medium">{oppScore.factors.contentGapSize}/100</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="flex items-center gap-2"><BookOpen className="w-4 h-4 text-purple-500" /> Real Sources</span>
                        <span className="font-medium">{research?.verifiedSources?.length || 0}</span>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Gaps and Community Signal */}
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-green-500" /> 
                  Top Content Gaps
                </CardTitle>
                <CardDescription>Missing narratives in the current B2B landscape</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {gaps?.topGaps?.map((gap: any, i: number) => (
                    <div key={i} className="p-4 rounded-lg border bg-card text-card-foreground shadow-sm">
                      <h4 className="font-semibold text-lg">{gap.gap}</h4>
                      <p className="text-sm text-muted-foreground mt-1">{gap.rationale}</p>
                      <div className="mt-3 flex gap-2 flex-wrap">
                        <Badge variant="outline">{gap.suggestedFormat}</Badge>
                        <Badge variant="secondary" className="bg-green-100 text-green-800 hover:bg-green-100 dark:bg-green-900 dark:text-green-300">
                          {gap.competitorScore}% Saturation
                        </Badge>
                      </div>
                    </div>
                  ))}
                  {gaps?.topGaps?.length === 0 && (
                    <div className="text-center p-8 text-muted-foreground border border-dashed rounded-lg">
                      <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p>No major gaps found. Topic might be heavily saturated.</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-orange-500" />
                    Reddit Community Signal
                  </CardTitle>
                  <CardDescription>
                    {research?.redditSignal?.isDataReal ? "Sourced from real B2B subreddits" : "Estimated community signal"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 rounded-lg bg-muted text-center">
                        <div className="text-3xl font-bold">{research?.redditSignal?.weeklyPostCount || 0}</div>
                        <div className="text-xs text-muted-foreground uppercase tracking-wider mt-1">Posts / Week</div>
                      </div>
                      <div className="p-4 rounded-lg bg-muted text-center">
                        <div className="text-3xl font-bold capitalize">{research?.redditSignal?.sentiment || 'Neutral'}</div>
                        <div className="text-xs text-muted-foreground uppercase tracking-wider mt-1">Sentiment</div>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-medium text-sm text-muted-foreground mb-2">Hot Angles Discussed:</h4>
                      <ul className="space-y-2">
                        {research?.redditSignal?.hotAngles?.map((angle: string, i: number) => (
                          <li key={i} className="text-sm p-2 bg-accent/50 rounded flex items-start gap-2">
                            <span className="text-orange-500">•</span> {angle}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-purple-500" />
                    Verified Statistics
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {research?.keyStatistics?.length > 0 ? (
                    <ul className="space-y-3">
                      {research.keyStatistics.map((stat: any, i: number) => (
                        <li key={i} className="text-sm p-3 border rounded-md">
                          <p className="font-medium">{stat.fact}</p>
                          <a href={stat.url} target="_blank" rel="noreferrer" className="text-xs text-blue-500 hover:underline mt-1 block">
                            Source: {stat.source}
                          </a>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">No verified statistics found.</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      )}

      {/* Opportunities */}
      <Card>
        <CardHeader>
          <CardTitle>Content Opportunities</CardTitle>
          <CardDescription>High-opportunity topics to explore</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {opportunities?.map((topic: any) => (
              <Card key={topic.id} className="hover:bg-accent transition-colors cursor-pointer">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold capitalize">{topic.keyword}</h3>
                      <div className="flex items-center gap-2 mt-2">
                        <Progress value={topic.opportunityScore} className="w-20 h-2" />
                        <span className="text-xs text-muted-foreground">
                          {Math.round(topic.opportunityScore)}/100
                        </span>
                      </div>
                    </div>
                    <Sparkles
                      className={`h-5 w-5 ${
                        topic.opportunityScore >= 70
                          ? 'text-yellow-500'
                          : 'text-muted-foreground'
                      }`}
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
