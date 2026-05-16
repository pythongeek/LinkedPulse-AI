import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { auditApi } from '../services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { Loader2, UserCircle, AlertCircle, CheckCircle } from 'lucide-react';

export default function ProfileAudit() {
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [industry, setIndustry] = useState('');

  const { data: auditHistory } = useQuery({
    queryKey: ['auditHistory'],
    queryFn: () => auditApi.getHistory().then((res) => res.data.audits),
  });

  const auditMutation = useMutation({
    mutationFn: (data: any) => auditApi.run(data),
    onSuccess: () => {
      toast.success('Profile audit complete!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || 'Audit failed');
    },
  });

  const handleAudit = () => {
    if (!linkedinUrl || !industry) {
      toast.error('Please enter your LinkedIn URL and industry');
      return;
    }
    auditMutation.mutate({ linkedinUrl, industry });
  };

  const latestAudit = auditMutation.data?.data.audit || auditHistory?.[0];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Profile Audit</h1>
        <p className="text-muted-foreground">
          Analyze and optimize your LinkedIn profile
        </p>
      </div>

      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium mb-2 block">LinkedIn Profile URL</label>
              <Input
                placeholder="https://linkedin.com/in/yourprofile"
                value={linkedinUrl}
                onChange={(e) => setLinkedinUrl(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Industry</label>
              <Input
                placeholder="e.g., Technology, Healthcare"
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
              />
            </div>
          </div>
          <Button
            onClick={handleAudit}
            disabled={auditMutation.isPending}
            className="w-full"
          >
            {auditMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <UserCircle className="mr-2 h-4 w-4" />
                Run Profile Audit
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {latestAudit && (
        <div className="grid gap-6">
          {/* Scores */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardContent className="p-6">
                <p className="text-sm text-muted-foreground">Overall Score</p>
                <div className="flex items-center gap-2">
                  <p className="text-4xl font-bold">{Math.round(latestAudit.overallScore)}</p>
                  <span className="text-sm text-muted-foreground">/100</span>
                </div>
                <Progress value={latestAudit.overallScore} className="mt-2" />
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <p className="text-sm text-muted-foreground">SEO Score</p>
                <div className="flex items-center gap-2">
                  <p className="text-4xl font-bold">{Math.round(latestAudit.seoScore)}</p>
                  <span className="text-sm text-muted-foreground">/100</span>
                </div>
                <Progress value={latestAudit.seoScore} className="mt-2" />
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <p className="text-sm text-muted-foreground">Brand Score</p>
                <div className="flex items-center gap-2">
                  <p className="text-4xl font-bold">{Math.round(latestAudit.brandScore)}</p>
                  <span className="text-sm text-muted-foreground">/100</span>
                </div>
                <Progress value={latestAudit.brandScore} className="mt-2" />
              </CardContent>
            </Card>
          </div>

          {/* Gaps */}
          {latestAudit.gaps?.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5" />
                  Profile Gaps
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {latestAudit.gaps.map((gap: string, i: number) => (
                    <div key={i} className="flex items-start gap-2 p-3 rounded-lg bg-muted">
                      <AlertCircle className="h-4 w-4 text-orange-500 mt-0.5" />
                      <p className="text-sm">{gap}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Suggestions */}
          {latestAudit.suggestions?.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5" />
                  Improvement Suggestions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {latestAudit.suggestions.slice(0, 5).map((suggestion: any, i: number) => (
                    <div key={i} className="p-3 rounded-lg border">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge
                          variant={
                            suggestion.priority === 'high'
                              ? 'destructive'
                              : suggestion.priority === 'medium'
                              ? 'default'
                              : 'secondary'
                          }
                        >
                          {suggestion.priority}
                        </Badge>
                        <span className="text-xs text-muted-foreground capitalize">
                          {suggestion.section}
                        </span>
                      </div>
                      <p className="text-sm">{suggestion.suggestion}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
