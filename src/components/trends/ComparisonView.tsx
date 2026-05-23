import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TrendingUp, TrendingDown, Minus, ArrowUp } from 'lucide-react';

interface ComparisonViewProps {
  primaryKeyword: string;
  compareKeyword: string;
  primaryData: any;
  compareData: any;
  onSelectTopic: (topic: string) => void;
}

function VelocityIcon({ velocity }: { velocity: string }) {
  if (velocity === 'exploding' || velocity === 'rising') return <TrendingUp className="w-4 h-4" />;
  if (velocity === 'dying' || velocity === 'cooling') return <TrendingDown className="w-4 h-4" />;
  return <Minus className="w-4 h-4" />;
}

function velocityColor(velocity: string) {
  if (velocity === 'exploding') return 'text-emerald-600 dark:text-emerald-400';
  if (velocity === 'rising') return 'text-green-600 dark:text-green-400';
  if (velocity === 'dying') return 'text-red-600 dark:text-red-400';
  if (velocity === 'cooling') return 'text-amber-600 dark:text-amber-400';
  return 'text-slate-600 dark:text-slate-400';
}

function scoreColor(score: number) {
  if (score >= 80) return 'text-emerald-600 dark:text-emerald-400';
  if (score >= 60) return 'text-green-600 dark:text-green-400';
  if (score >= 40) return 'text-amber-600 dark:text-amber-400';
  return 'text-red-600 dark:text-red-400';
}

function getRecommendation(opportunity: any) {
  const level = opportunity?.opportunityLevel;
  const velocity = opportunity?.velocity;
  if (level === 'Goldmine' && (velocity === 'exploding' || velocity === 'rising')) {
    return 'Write about this NOW — high opportunity + momentum';
  }
  if (level === 'Goldmine') return 'Strong opportunity — schedule this week';
  if (level === 'Good') return 'Good angle — plan for next 2 weeks';
  if (velocity === 'exploding') return 'Trend rising — if you write, do it today';
  return 'Lower priority — only if you have a unique contrarian angle';
}

export default function ComparisonView({
  primaryKeyword,
  compareKeyword,
  primaryData,
  compareData,
  onSelectTopic,
}: ComparisonViewProps) {
  const primaryOpp = primaryData?.opportunity || {};
  const compareOpp = compareData?.opportunity || {};

  const winner = (primaryOpp.overallScore || 0) >= (compareOpp.overallScore || 0) ? 'primary' : 'compare';

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-center gap-4 py-2">
        <span className="text-sm text-muted-foreground font-medium">Comparing topics:</span>
        <Badge variant="outline" className="text-sm px-3 py-1 border-blue-300 text-blue-700">
          {primaryKeyword}
        </Badge>
        <span className="font-bold text-muted-foreground">vs</span>
        <Badge variant="outline" className="text-sm px-3 py-1 border-violet-300 text-violet-700">
          {compareKeyword}
        </Badge>
      </div>

      {/* Side by side cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Primary topic */}
        <Card className={`relative border-2 ${winner === 'primary' ? 'border-emerald-300 dark:border-emerald-700 shadow-emerald-100 dark:shadow-none shadow-lg' : 'border-border'}`}>
          {winner === 'primary' && (
            <div className="absolute -top-2.5 left-1/2 -translate-x-1/2">
              <Badge className="bg-emerald-500 text-white text-xs px-3">
                🏆 Better Pick
              </Badge>
            </div>
          )}
          <CardContent className="pt-6 space-y-4">
            <h3 className="font-bold text-lg capitalize">{primaryKeyword}</h3>

            <div className="flex items-center justify-between">
              <span className={`text-4xl font-bold ${scoreColor(primaryOpp.overallScore || 0)}`}>
                {primaryOpp.overallScore || 0}
              </span>
              <Badge className={
                primaryOpp.opportunityLevel === 'Goldmine' ? 'bg-emerald-500' :
                primaryOpp.opportunityLevel === 'Good' ? 'bg-green-500' :
                primaryOpp.opportunityLevel === 'Meh' ? 'bg-amber-500' : 'bg-slate-500'
              }>
                {primaryOpp.opportunityLevel || 'N/A'}
              </Badge>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Velocity</span>
                <span className={`flex items-center gap-1 font-medium ${velocityColor(primaryOpp.velocity || 'stable')}`}>
                  <VelocityIcon velocity={primaryOpp.velocity || 'stable'} />
                  {primaryOpp.velocity || 'Stable'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Best Format</span>
                <span className="font-medium capitalize">{primaryOpp.bestContentType || 'Post'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Community Signal</span>
                <span className="font-medium">
                  {primaryData?.research?.redditSignal?.isDataReal ? 'High' : 'Estimated'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Sources</span>
                <span className="font-medium">{primaryData?.research?.dataSourceCount || 0} verified</span>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-muted text-sm text-muted-foreground">
              {getRecommendation(primaryOpp)}
            </div>

            <Button
              onClick={() => onSelectTopic(primaryKeyword)}
              className="w-full"
              variant={winner === 'primary' ? 'default' : 'outline'}
            >
              <ArrowUp className="w-4 h-4 mr-2" />
              Write about "{primaryKeyword}"
            </Button>
          </CardContent>
        </Card>

        {/* Compare topic */}
        <Card className={`relative border-2 ${winner === 'compare' ? 'border-emerald-300 dark:border-emerald-700 shadow-emerald-100 dark:shadow-none shadow-lg' : 'border-border'}`}>
          {winner === 'compare' && (
            <div className="absolute -top-2.5 left-1/2 -translate-x-1/2">
              <Badge className="bg-emerald-500 text-white text-xs px-3">
                🏆 Better Pick
              </Badge>
            </div>
          )}
          <CardContent className="pt-6 space-y-4">
            <h3 className="font-bold text-lg capitalize">{compareKeyword}</h3>

            <div className="flex items-center justify-between">
              <span className={`text-4xl font-bold ${scoreColor(compareOpp.overallScore || 0)}`}>
                {compareOpp.overallScore || 0}
              </span>
              <Badge className={
                compareOpp.opportunityLevel === 'Goldmine' ? 'bg-emerald-500' :
                compareOpp.opportunityLevel === 'Good' ? 'bg-green-500' :
                compareOpp.opportunityLevel === 'Meh' ? 'bg-amber-500' : 'bg-slate-500'
              }>
                {compareOpp.opportunityLevel || 'N/A'}
              </Badge>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Velocity</span>
                <span className={`flex items-center gap-1 font-medium ${velocityColor(compareOpp.velocity || 'stable')}`}>
                  <VelocityIcon velocity={compareOpp.velocity || 'stable'} />
                  {compareOpp.velocity || 'Stable'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Best Format</span>
                <span className="font-medium capitalize">{compareOpp.bestContentType || 'Post'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Community Signal</span>
                <span className="font-medium">
                  {compareData?.research?.redditSignal?.isDataReal ? 'High' : 'Estimated'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Sources</span>
                <span className="font-medium">{compareData?.research?.dataSourceCount || 0} verified</span>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-muted text-sm text-muted-foreground">
              {getRecommendation(compareOpp)}
            </div>

            <Button
              onClick={() => onSelectTopic(compareKeyword)}
              className="w-full"
              variant={winner === 'compare' ? 'default' : 'outline'}
            >
              <ArrowUp className="w-4 h-4 mr-2" />
              Write about "{compareKeyword}"
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
