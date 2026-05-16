import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { competitorApi } from '../services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

import { toast } from 'sonner';
import { Search, Loader2, BarChart3, Lightbulb } from 'lucide-react';

export default function CompetitorAnalysis() {
  const [topic, setTopic] = useState('');

  const analyzeMutation = useMutation({
    mutationFn: (t: string) => competitorApi.analyze({ topic: t, depth: 'deep' }),
    onSuccess: () => {
      toast.success('Analysis complete!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || 'Analysis failed');
    },
  });

  const handleAnalyze = () => {
    if (!topic) {
      toast.error('Please enter a topic');
      return;
    }
    analyzeMutation.mutate(topic);
  };

  const analysis = analyzeMutation.data?.data.analysis;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Competitor Analysis</h1>
        <p className="text-muted-foreground">
          Analyze competitor content and find gaps
        </p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-2">
            <Input
              placeholder="Enter a topic to analyze..."
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAnalyze()}
            />
            <Button
              onClick={handleAnalyze}
              disabled={analyzeMutation.isPending}
            >
              {analyzeMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
              Analyze
            </Button>
          </div>
        </CardContent>
      </Card>

      {analysis && (
        <div className="grid gap-6">
          {/* Overview */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardContent className="p-6">
                <p className="text-sm text-muted-foreground">Posts Analyzed</p>
                <p className="text-3xl font-bold">{analysis.totalPosts}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <p className="text-sm text-muted-foreground">Avg Likes</p>
                <p className="text-3xl font-bold">{analysis.avgEngagement.likes}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <p className="text-sm text-muted-foreground">Avg Comments</p>
                <p className="text-3xl font-bold">{analysis.avgEngagement.comments}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <p className="text-sm text-muted-foreground">Content Gaps</p>
                <p className="text-3xl font-bold">{analysis.contentGaps.length}</p>
              </CardContent>
            </Card>
          </div>

          {/* Content Gaps */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="h-5 w-5" />
                Content Gaps
              </CardTitle>
              <CardDescription>Topics not covered by competitors</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {analysis.contentGaps.map((gap: string, i: number) => (
                  <div key={i} className="p-3 rounded-lg bg-muted">
                    <p className="text-sm">{gap}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Opportunities */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Opportunities
              </CardTitle>
              <CardDescription>Potential content angles</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-2">
                {analysis.opportunities.map((opp: string, i: number) => (
                  <Badge key={i} variant="secondary" className="justify-start py-2 px-3">
                    {opp}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
