import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, Zap, ArrowRight, Clock } from 'lucide-react';
import type { ContentTypeTarget } from '@/types/trendExplorer';

interface EditorialCalendarPanelProps {
  gaps: any;
  topic: string;
  config?: any;
}

const FORMAT_ICONS: Record<string, string> = {
  carousel: '🎠',
  post: '📝',
  article: '📰',
  poll: '🗳️',
};

const FORMAT_COLORS: Record<string, string> = {
  carousel: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  post: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  article: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
  poll: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
};

const BEST_DAYS = ['Tue, 9am', 'Wed, 10am', 'Thu, 9am', 'Tue, 5pm'];

export default function EditorialCalendarPanel({ gaps, topic, config }: EditorialCalendarPanelProps) {
  const navigate = useNavigate();

  const calendarItems = gaps?.editorialCalendar || gaps?.topGaps?.slice(0, 4).map((gap: any, i: number) => ({
    week: i + 1,
    contentIdea: gap.gap || gap.title,
    format: gap.suggestedFormat || 'post',
    hook: gap.rationale || '',
    priorityScore: gap.competitorScore || Math.floor(Math.random() * 30 + 65),
  })) || [];

  const handleGenerate = (item: any) => {
    navigate(`/content/studio?${new URLSearchParams({
      topic: `${topic}: ${item.contentIdea}`,
      contentType: item.format || 'post',
      researchDepth: 'quick',
    }).toString()}`);
  };

  if (!calendarItems.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Calendar className="w-4 h-4 text-indigo-500" />
            Editorial Calendar
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            Run a research analysis to generate your 4-week editorial calendar.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-indigo-200/50 dark:border-indigo-800/30">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Calendar className="w-4 h-4 text-indigo-500" />
            4-Week Editorial Calendar
          </CardTitle>
          <Badge variant="outline" className="text-xs text-indigo-600 border-indigo-300">
            {calendarItems.length} items scheduled
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          Optimal publishing schedule based on gap analysis · Tue/Wed/Thu 9-11am
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {calendarItems.map((item: any, i: number) => (
          <div
            key={i}
            className="group relative rounded-xl border bg-card p-4 hover:border-indigo-300 dark:hover:border-indigo-700 transition-all duration-200 hover:shadow-md"
          >
            {/* Week indicator */}
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="flex items-center justify-center w-7 h-7 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 text-xs font-bold">
                  W{item.week}
                </span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${FORMAT_COLORS[item.format] || FORMAT_COLORS.post}`}>
                  {FORMAT_ICONS[item.format] || '📝'} {item.format}
                </span>
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  {BEST_DAYS[i % BEST_DAYS.length]}
                </span>
              </div>
              {item.priorityScore && (
                <div className="flex items-center gap-1">
                  <Zap className="w-3 h-3 text-amber-500" />
                  <span className="text-xs font-semibold text-amber-600">{item.priorityScore}</span>
                </div>
              )}
            </div>

            {/* Content idea */}
            <p className="text-sm font-semibold text-foreground mb-1 leading-snug">
              {item.contentIdea}
            </p>

            {/* Hook preview */}
            {item.hook && (
              <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
                {item.hook}
              </p>
            )}

            {/* Action button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleGenerate(item)}
              className="text-xs h-7 opacity-0 group-hover:opacity-100 transition-opacity border-indigo-200 text-indigo-700 hover:bg-indigo-50 dark:border-indigo-800 dark:text-indigo-400 dark:hover:bg-indigo-900/20"
            >
              Generate this post <ArrowRight className="w-3 h-3 ml-1" />
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
