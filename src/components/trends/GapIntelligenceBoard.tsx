import React from 'react';
import { Layers, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { GapCard } from './GapCard';
import { cn } from '@/lib/utils';

interface GapIntelligenceBoardProps {
  gaps: any; // from API: { topGaps: [], saturatedAngles: [] }
  topic: string;
  audienceSegment?: string;
}

// ─── Empty state ──────────────────────────────────────────────────────────────
function EmptyState() {
  return (
    <div className="col-span-full flex flex-col items-center justify-center py-16 px-8 text-center">
      <div className="w-16 h-16 rounded-2xl bg-slate-800/80 border border-white/10 flex items-center justify-center mb-4 shadow-xl">
        <Layers className="w-7 h-7 text-slate-500" />
      </div>
      <h3 className="text-base font-semibold text-slate-300 mb-2">No gaps found yet</h3>
      <p className="text-sm text-slate-500 max-w-xs leading-relaxed">
        No content gaps were identified for this topic. Try switching to{' '}
        <span className="text-blue-400 font-medium">Deep research</span> mode or
        refining your keyword for better results.
      </p>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export function GapIntelligenceBoard({
  gaps,
  topic,
  audienceSegment,
}: GapIntelligenceBoardProps) {
  const topGaps: any[] = gaps?.topGaps ?? [];
  const count = topGaps.length;

  function handleGenerate(gap: any) {
    // Parent page handles navigation via GapCard's internal useNavigate
    console.log('[GapIntelligenceBoard] generate gap:', gap.gap);
  }

  function handleSave(gap: any) {
    // TODO: wire to watchlist / saved gaps API
    console.log('[GapIntelligenceBoard] save gap:', gap.gap);
  }

  return (
    <section className="w-full space-y-5">
      {/* ─── Section header ─── */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500/20 to-violet-500/20 border border-white/10">
            <Sparkles className="w-4.5 h-4.5 text-violet-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight">Gap Intelligence Board</h2>
            <p className="text-xs text-slate-400">Content opportunities your competitors are missing</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {count > 0 && (
            <Badge className="bg-blue-500/20 text-blue-300 border border-blue-500/30 font-bold text-xs px-3 py-1">
              {count} {count === 1 ? 'opportunity' : 'opportunities'} found
            </Badge>
          )}
        </div>
      </div>

      {/* ─── Gap grid ─── */}
      <div className={cn(
        'grid gap-4',
        count === 0 ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3'
      )}>
        {count === 0 ? (
          <EmptyState />
        ) : (
          topGaps.map((gap, idx) => (
            <GapCard
              key={gap.id ?? `gap-${idx}`}
              gap={gap}
              topic={topic}
              audienceSegment={audienceSegment}
              onGenerate={handleGenerate}
              onSave={handleSave}
            />
          ))
        )}
      </div>

      {/* ─── Saturated angles (if present) ─── */}
      {gaps?.saturatedAngles && gaps.saturatedAngles.length > 0 && (
        <div className="mt-6 pt-5 border-t border-white/10">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">
            Saturated angles to avoid
          </p>
          <div className="flex flex-wrap gap-2">
            {gaps.saturatedAngles.map((angle: string, i: number) => (
              <span
                key={i}
                className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20 line-through opacity-70"
              >
                {angle}
              </span>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

export default GapIntelligenceBoard;
