import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { trendApi } from '../services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { Search, Loader2, Sparkles } from 'lucide-react';
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
      toast.success('Analysis complete!');
    },
  });

  const scoreMutation = useMutation({
    mutationFn: (kw: string) => trendApi.getOpportunityScore(kw),
  });

  const handleAnalyze = () => {
    if (!keyword) return;
    setAnalyzing(true);
    analyzeMutation.mutate(keyword);
    scoreMutation.mutate(keyword);
    setAnalyzing(false);
  };

  const trendData = analyzeMutation.data?.data?.[0]?.interestOverTime || [];

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
      {(analyzeMutation.data || scoreMutation.data) && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Interest Over Time</CardTitle>
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
            <CardContent className="space-y-4">
              {scoreMutation.data && (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-4xl font-bold">
                      {Math.round(scoreMutation.data.data.score.score)}
                    </span>
                    <Badge
                      variant={
                        scoreMutation.data.data.score.score >= 70
                          ? 'default'
                          : scoreMutation.data.data.score.score >= 50
                          ? 'secondary'
                          : 'outline'
                      }
                    >
                      {scoreMutation.data.data.score.score >= 70
                        ? 'Excellent'
                        : scoreMutation.data.data.score.score >= 50
                        ? 'Good'
                        : 'Low'}
                    </Badge>
                  </div>
                  <Progress value={scoreMutation.data.data.score.score} className="h-3" />
                  <p className="text-sm text-muted-foreground">
                    {scoreMutation.data.data.score.recommendation}
                  </p>
                </>
              )}
            </CardContent>
          </Card>
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
