import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { userApi } from '@/services/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Bookmark, Plus, Trash2, TrendingUp, Minus, TrendingDown, Bell } from 'lucide-react';
import { toast } from 'sonner';
import type { WatchlistItem } from '@/types/trendExplorer';

interface TopicWatchlistProps {
  currentKeyword?: string;
  currentConfig?: any;
  onSelectTopic: (keyword: string) => void;
}

function velocityIcon(v?: string) {
  if (v === 'exploding' || v === 'rising') return <TrendingUp className="w-3 h-3 text-emerald-500" />;
  if (v === 'dying' || v === 'cooling') return <TrendingDown className="w-3 h-3 text-red-500" />;
  return <Minus className="w-3 h-3 text-slate-400" />;
}

function scoreColor(score?: number) {
  if (!score) return 'text-muted-foreground';
  if (score >= 75) return 'text-emerald-600 dark:text-emerald-400';
  if (score >= 55) return 'text-green-600 dark:text-green-400';
  if (score >= 40) return 'text-amber-600 dark:text-amber-400';
  return 'text-red-500';
}

export default function TopicWatchlist({
  currentKeyword,
  currentConfig,
  onSelectTopic,
}: TopicWatchlistProps) {
  const [threshold, setThreshold] = useState(70);
  const queryClient = useQueryClient();

  const { data: watchlistData, isLoading } = useQuery({
    queryKey: ['watchlist'],
    queryFn: () => userApi.getWatchlist().then(r => r.data.watchlist || []),
  });

  const addMutation = useMutation({
    mutationFn: (data: any) => userApi.addToWatchlist(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['watchlist'] });
      toast.success('Topic added to watchlist!');
    },
    onError: () => toast.error('Failed to add topic'),
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => userApi.removeFromWatchlist(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['watchlist'] });
      toast.success('Topic removed from watchlist');
    },
  });

  const watchlist: WatchlistItem[] = watchlistData || [];
  const isCurrentWatched = currentKeyword && watchlist.some(w => w.keyword === currentKeyword.toLowerCase());

  const handleAddCurrent = () => {
    if (!currentKeyword) return;
    addMutation.mutate({
      keyword: currentKeyword,
      contentType: currentConfig?.contentTypeTarget,
      topicType: currentConfig?.topicType,
      audienceSegment: currentConfig?.audienceSegment,
      alertThreshold: threshold,
    });
  };

  return (
    <Card className="border-indigo-200/50 dark:border-indigo-800/30">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Bookmark className="w-4 h-4 text-indigo-500" />
          My Topic Watchlist
          <Badge variant="outline" className="text-xs">
            {watchlist.length}
          </Badge>
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Track topics and get alerted when opportunity scores rise
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Add current topic */}
        {currentKeyword && !isCurrentWatched && (
          <div className="flex items-center gap-2 p-2.5 rounded-lg border border-dashed border-indigo-300 dark:border-indigo-700 bg-indigo-50/30 dark:bg-indigo-900/10">
            <Bell className="w-3.5 h-3.5 text-indigo-500 flex-shrink-0" />
            <span className="text-xs text-muted-foreground flex-1 truncate">
              Alert if score ≥
            </span>
            <Input
              type="number"
              value={threshold}
              onChange={e => setThreshold(Number(e.target.value))}
              className="w-14 h-6 text-xs px-2 py-0"
              min={40}
              max={100}
            />
            <Button
              size="sm"
              variant="default"
              className="h-6 text-xs px-2"
              onClick={handleAddCurrent}
              disabled={addMutation.isPending}
            >
              <Plus className="w-3 h-3 mr-1" />
              Watch "{currentKeyword}"
            </Button>
          </div>
        )}

        {isCurrentWatched && (
          <div className="flex items-center gap-2 p-2 rounded-lg bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-800">
            <Bookmark className="w-3.5 h-3.5 text-emerald-500 fill-emerald-500" />
            <span className="text-xs text-emerald-700 dark:text-emerald-400">
              "{currentKeyword}" is in your watchlist
            </span>
          </div>
        )}

        {/* Watchlist items */}
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-10 rounded-lg bg-muted animate-pulse" />
            ))}
          </div>
        ) : watchlist.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">
            No topics watched yet. Research a topic and click "Save as Topic Alert".
          </p>
        ) : (
          <div className="space-y-2">
            {watchlist.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-2 p-2.5 rounded-lg border hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors group"
              >
                <button
                  onClick={() => onSelectTopic(item.keyword)}
                  className="flex-1 flex items-center gap-2 text-left min-w-0"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-medium truncate capitalize">{item.keyword}</span>
                      {velocityIcon(item.latestVelocity)}
                    </div>
                    {item.latestScore && (
                      <span className={`text-xs font-semibold ${scoreColor(item.latestScore)}`}>
                        Score: {Math.round(item.latestScore)}
                      </span>
                    )}
                  </div>
                  <Badge
                    variant="outline"
                    className={`text-xs flex-shrink-0 ${
                      item.isActive
                        ? 'border-green-300 text-green-700 dark:text-green-400'
                        : 'border-slate-300 text-slate-500'
                    }`}
                  >
                    <Bell className="w-2.5 h-2.5 mr-1" />
                    ≥{item.alertThreshold}
                  </Badge>
                </button>
                <button
                  onClick={() => removeMutation.mutate(item.id)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-red-500"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
