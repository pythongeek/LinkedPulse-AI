import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { XCircle, TrendingUp, RefreshCw } from 'lucide-react';

interface RelatedTopicsPanelProps {
  research: any;
  onTopicClick: (topic: string) => void;
}

export default function RelatedTopicsPanel({ research, onTopicClick }: RelatedTopicsPanelProps) {
  const risingQueries = research?.relatedQueries?.rising || [];
  const topQueries = research?.relatedQueries?.top || [];
  const saturatedAngles = research?.linkedinContext?.saturatedAngles || research?.gaps?.saturatedAngles || [];

  const risingItems = risingQueries.slice(0, 10).map((q: any) => ({
    label: typeof q === 'string' ? q : (q.query || q.title || String(q)),
    value: q.value,
  }));

  const topItems = topQueries.slice(0, 6).map((q: any) => ({
    label: typeof q === 'string' ? q : (q.query || q.title || String(q)),
    value: q.value,
  }));

  const allRising = [...risingItems, ...topItems.filter((t: any) => !risingItems.some((r: any) => r.label === t.label))];

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* Explore These — rising related */}
      <Card className="border-teal-200/50 dark:border-teal-800/30">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <TrendingUp className="w-4 h-4 text-teal-500" />
            Explore These
            <Badge variant="outline" className="text-xs text-teal-600 border-teal-300">
              Rising
            </Badge>
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Adjacent topics gaining momentum — click to research
          </p>
        </CardHeader>
        <CardContent>
          {allRising.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {allRising.map((item, i) => (
                <button
                  key={i}
                  onClick={() => onTopicClick(item.label)}
                  className="group flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-teal-50 text-teal-700 border border-teal-200 hover:bg-teal-100 hover:border-teal-400 dark:bg-teal-900/20 dark:text-teal-300 dark:border-teal-700 dark:hover:bg-teal-900/40 transition-all duration-150"
                >
                  <RefreshCw className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  {item.label}
                  {item.value && <span className="text-xs opacity-60">↑{item.value}</span>}
                </button>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-6">
              No related rising topics found for this keyword.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Avoid These — saturated */}
      <Card className="border-red-200/50 dark:border-red-900/30">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <XCircle className="w-4 h-4 text-red-500" />
            Avoid These
            <Badge variant="outline" className="text-xs text-red-600 border-red-300">
              Saturated
            </Badge>
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Heavily covered angles — only write if you have a contrarian take
          </p>
        </CardHeader>
        <CardContent>
          {saturatedAngles.length > 0 ? (
            <ul className="space-y-2">
              {saturatedAngles.map((angle: string, i: number) => (
                <li
                  key={i}
                  className="flex items-start gap-2 p-2.5 rounded-lg bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/20"
                >
                  <XCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="text-sm text-foreground">{angle}</span>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Heavily covered — needs a strong contrarian angle to stand out
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-center py-6">
              <div className="text-2xl mb-1">✅</div>
              <p className="text-sm text-muted-foreground">
                No heavily saturated angles detected for this topic.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
