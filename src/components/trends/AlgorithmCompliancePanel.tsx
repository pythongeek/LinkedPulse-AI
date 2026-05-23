import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle, AlertTriangle, XCircle, Shield } from 'lucide-react';
import type { TrendResearchConfig, ComplianceRule } from '@/types/trendExplorer';

interface AlgorithmCompliancePanelProps {
  config: TrendResearchConfig;
  analysis: any;
  onSwitchFormat: (format: string) => void;
}

function buildComplianceRules(config: TrendResearchConfig, analysis: any): ComplianceRule[] {
  const rules: ComplianceRule[] = [];
  const opportunity = analysis?.opportunity;
  const research = analysis?.research;

  // Rule 1: Hashtag strategy
  const hashtagRanges: Record<string, [number, number]> = {
    post: [3, 5], carousel: [3, 5], article: [0, 3], poll: [3, 5]
  };
  const [min, max] = hashtagRanges[config.contentTypeTarget] || [3, 5];
  rules.push({
    id: 'hashtag_count',
    label: `Optimal hashtags for ${config.contentTypeTarget}: ${min}–${max} recommended`,
    status: 'pass',
  });

  // Rule 2: Link-in-body
  rules.push({
    id: 'link_in_body',
    label: 'Links in body suppress reach ~40% — place link in first comment instead',
    status: 'warn',
  });

  // Rule 3: Format vs. recommendation
  const bestFormat = opportunity?.bestContentType;
  if (bestFormat && bestFormat !== config.contentTypeTarget) {
    rules.push({
      id: 'format_recommendation',
      label: `${bestFormat.charAt(0).toUpperCase() + bestFormat.slice(1)} outperforms ${config.contentTypeTarget} for this topic`,
      status: 'warn',
      action: { label: `Switch to ${bestFormat}`, handler: () => {} },
    });
  }

  // Rule 4: Velocity check
  const velocity7d = research?.velocity7d || 0;
  if (velocity7d < -20) {
    rules.push({
      id: 'declining_topic',
      label: 'Topic interest is declining — write now or pivot to a rising adjacent topic',
      status: 'warn',
    });
  } else if (velocity7d > 30) {
    rules.push({
      id: 'exploding_topic',
      label: 'Topic is exploding in popularity — publish ASAP to ride the wave',
      status: 'pass',
    });
  }

  // Rule 5: Posting time
  rules.push({
    id: 'posting_time',
    label: 'Best posting time: Tue/Wed/Thu 9–11am or 5–6pm in audience\'s timezone',
    status: 'warn',
  });

  // Rule 6: Hook window
  rules.push({
    id: 'hook_window',
    label: 'Hook window: First 210 characters must compel readers to click "see more"',
    status: config.contentTypeTarget === 'article' ? 'pass' : 'warn',
  });

  // Rule 7: Article-specific SEO
  if (config.contentTypeTarget === 'article') {
    rules.push({
      id: 'article_title',
      label: 'Article title should be ≤100 characters for Google indexing',
      status: 'warn',
    });
    rules.push({
      id: 'article_hashtags',
      label: 'Articles: use 0–3 hashtags only (SEO focus, not hashtag discovery)',
      status: 'pass',
    });
  }

  // Rule 8: Poll-specific
  if (config.contentTypeTarget === 'poll') {
    rules.push({
      id: 'poll_question',
      label: 'Poll question limit: 140 characters · Options: 30 chars each · 2–4 choices',
      status: 'warn',
    });
  }

  // Rule 9: Carousel slide count
  if (config.contentTypeTarget === 'carousel') {
    rules.push({
      id: 'carousel_slides',
      label: 'Optimal carousel: 7–12 slides (fewer reduces saves, more reduces completion)',
      status: 'pass',
    });
  }

  // Rule 10: Banned words
  rules.push({
    id: 'banned_words',
    label: 'Avoid: leverage, synergy, innovative, game-changing, paradigm, disruptive',
    status: 'warn',
  });

  return rules;
}

const StatusIcon = ({ status }: { status: 'pass' | 'warn' | 'fail' }) => {
  if (status === 'pass') return <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />;
  if (status === 'warn') return <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />;
  return <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />;
};

export default function AlgorithmCompliancePanel({
  config,
  analysis,
  onSwitchFormat,
}: AlgorithmCompliancePanelProps) {
  const rules = buildComplianceRules(config, analysis);
  const passCount = rules.filter(r => r.status === 'pass').length;
  const warnCount = rules.filter(r => r.status === 'warn').length;

  return (
    <Card className="border-violet-200/50 dark:border-violet-800/30">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Shield className="w-4 h-4 text-violet-500" />
            LinkedIn Algorithm Checklist
            <Badge variant="outline" className="text-xs">
              {config.contentTypeTarget?.toUpperCase()}
            </Badge>
          </CardTitle>
          <div className="flex items-center gap-2">
            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
              ✓ {passCount} passing
            </span>
            {warnCount > 0 && (
              <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                ⚠ {warnCount} warnings
              </span>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {rules.map((rule) => (
            <div
              key={rule.id}
              className={`flex items-start gap-3 p-3 rounded-lg border text-sm transition-all ${
                rule.status === 'pass'
                  ? 'bg-emerald-50/50 border-emerald-100 dark:bg-emerald-900/10 dark:border-emerald-900/30'
                  : rule.status === 'warn'
                  ? 'bg-amber-50/50 border-amber-100 dark:bg-amber-900/10 dark:border-amber-900/30'
                  : 'bg-red-50/50 border-red-100 dark:bg-red-900/10 dark:border-red-900/30'
              }`}
            >
              <StatusIcon status={rule.status} />
              <div className="flex-1 min-w-0">
                <span className="text-foreground leading-snug">{rule.label}</span>
                {rule.action && (
                  <Button
                    variant="link"
                    size="sm"
                    className="h-auto p-0 ml-2 text-xs font-semibold text-violet-600 dark:text-violet-400"
                    onClick={() => onSwitchFormat(rule.action!.label.replace('Switch to ', ''))}
                  >
                    {rule.action.label} →
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
