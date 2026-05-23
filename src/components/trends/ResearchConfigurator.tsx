import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { personaApi } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  Search, Loader2, ChevronDown, GitCompare, Bell, Zap, Globe,
  Clock, User, Building, SlidersHorizontal, Layers
} from 'lucide-react';
import {
  type TrendResearchConfig, type ContentTypeTarget, type TopicType,
  type AudienceSegment, INDUSTRY_VERTICALS, GEO_OPTIONS,
  CONTENT_TYPE_BADGES, TOPIC_TYPE_META,
} from '@/types/trendExplorer';

interface ResearchConfiguratorProps {
  onSubmit: (config: TrendResearchConfig) => void;
  isLoading: boolean;
  initialKeyword?: string;
  onSaveAlert?: (config: TrendResearchConfig) => void;
}

const AUDIENCE_OPTIONS: { value: AudienceSegment; label: string }[] = [
  { value: 'c_suite', label: 'C-Suite (CEOs, CTOs, CMOs)' },
  { value: 'founders', label: 'Founders & Solopreneurs' },
  { value: 'managers', label: 'Managers & Team Leads' },
  { value: 'individual_contributors', label: 'Individual Contributors (ICs)' },
  { value: 'recruiters_hr', label: 'Recruiters & HR / People Ops' },
  { value: 'investors_vcs', label: 'Investors & VCs' },
  { value: 'general_professionals', label: 'General Professionals' },
];

const CONTENT_TYPES: { value: ContentTypeTarget; icon: string; label: string }[] = [
  { value: 'post', icon: '📝', label: 'Post' },
  { value: 'carousel', icon: '🎠', label: 'Carousel' },
  { value: 'article', icon: '📰', label: 'Article' },
  { value: 'poll', icon: '🗳️', label: 'Poll' },
];

const TOPIC_TYPES = Object.entries(TOPIC_TYPE_META) as [TopicType, typeof TOPIC_TYPE_META[TopicType]][];

export default function ResearchConfigurator({
  onSubmit,
  isLoading,
  initialKeyword = '',
  onSaveAlert,
}: ResearchConfiguratorProps) {
  const [keyword, setKeyword] = useState(initialKeyword);
  const [contentTypeTarget, setContentTypeTarget] = useState<ContentTypeTarget>('post');
  const [topicType, setTopicType] = useState<TopicType>('thought_leadership');
  const [audienceSegment, setAudienceSegment] = useState<AudienceSegment>('general_professionals');
  const [industryVertical, setIndustryVertical] = useState('');
  const [industryInput, setIndustryInput] = useState('');
  const [showIndustrySuggestions, setShowIndustrySuggestions] = useState(false);
  const [timeframe, setTimeframe] = useState<TrendResearchConfig['timeframe']>('today 3-m');
  const [geo, setGeo] = useState('US');
  const [personaId, setPersonaId] = useState('');
  const [isBtoB, setIsBtoB] = useState(true);
  const [compareWith, setCompareWith] = useState('');
  const [competitorContext, setCompetitorContext] = useState('');
  const [existingContentContext, setExistingContentContext] = useState('');
  const [customResearchDirective, setCustomResearchDirective] = useState('');
  const [researchDepth, setResearchDepth] = useState<'quick' | 'deep'>('quick');
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const charCount = keyword.length;

  const { data: personasData } = useQuery({
    queryKey: ['personas'],
    queryFn: () => personaApi.getAll().then(r => r.data.personas || []),
  });

  const handleSubmit = () => {
    if (!keyword.trim()) return;
    onSubmit({
      keyword: keyword.trim(),
      contentTypeTarget,
      topicType,
      audienceSegment,
      industryVertical: industryVertical || industryInput,
      timeframe,
      geo: geo === 'GLOBAL' ? '' : geo,
      personaId: personaId || undefined,
      isBtoB,
      compareWith: compareWith.trim() || undefined,
      competitorContext: competitorContext.trim() || undefined,
      existingContentContext: existingContentContext.trim() || undefined,
      customResearchDirective: customResearchDirective.trim() || undefined,
      researchDepth,
    });
  };

  const filteredIndustries = industryInput
    ? INDUSTRY_VERTICALS.filter(v => v.toLowerCase().includes(industryInput.toLowerCase()))
    : INDUSTRY_VERTICALS;

  return (
    <Card className="border-0 shadow-none bg-transparent">
      <CardHeader className="px-0 pt-0 pb-4">
        <CardTitle className="flex items-center gap-2 text-base">
          <Search className="w-4 h-4 text-primary" />
          Research Configurator
        </CardTitle>
      </CardHeader>
      <CardContent className="px-0 space-y-5">

        {/* Section A: Topic Input */}
        <div className="space-y-2">
          <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Topic / Keyword
          </Label>
          <div className="relative">
            <Textarea
              placeholder="e.g., AI agents replacing knowledge workers"
              value={keyword}
              onChange={e => setKeyword(e.target.value.slice(0, 500))}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSubmit())}
              rows={3}
              className="resize-none pr-16 text-sm"
            />
            <span className={`absolute bottom-2 right-2 text-xs ${charCount > 400 ? 'text-amber-500' : 'text-muted-foreground'}`}>
              {charCount}/500
            </span>
          </div>
        </div>

        {/* Section B: Topic Type grid */}
        <div className="space-y-2">
          <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Topic Type
          </Label>
          <div className="grid grid-cols-2 gap-1.5">
            {TOPIC_TYPES.map(([value, meta]) => (
              <button
                key={value}
                onClick={() => setTopicType(value)}
                className={`flex items-start gap-2 p-2.5 rounded-lg text-left text-xs border transition-all duration-150 ${
                  topicType === value
                    ? 'border-primary bg-primary/10 text-primary font-medium'
                    : 'border-border bg-card hover:border-primary/40 hover:bg-accent/50 text-foreground'
                }`}
              >
                <span className="text-base leading-none mt-0.5 flex-shrink-0">{meta.icon}</span>
                <div className="min-w-0">
                  <div className="font-semibold truncate leading-tight">{meta.label}</div>
                  <div className="text-muted-foreground text-[10px] leading-tight mt-0.5 truncate">{meta.desc}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Section C: Content Type Target pills */}
        <div className="space-y-2">
          <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Content Format Target
          </Label>
          <div className="flex gap-1.5 flex-wrap">
            {CONTENT_TYPES.map(({ value, icon, label }) => (
              <button
                key={value}
                onClick={() => setContentTypeTarget(value)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-150 ${
                  contentTypeTarget === value
                    ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                    : 'border-border hover:border-primary/50 hover:bg-accent/50'
                }`}
              >
                <span>{icon}</span>
                {label}
              </button>
            ))}
          </div>
          {contentTypeTarget && (
            <p className="text-[10px] text-muted-foreground bg-muted/60 rounded-md px-2 py-1.5 leading-snug">
              ℹ️ {CONTENT_TYPE_BADGES[contentTypeTarget]}
            </p>
          )}
        </div>

        {/* Section D: Audience & Context */}
        <div className="space-y-3">
          <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Audience & Context
          </Label>

          <div>
            <Label className="text-xs text-muted-foreground mb-1 block">Target Audience</Label>
            <Select value={audienceSegment} onValueChange={v => setAudienceSegment(v as AudienceSegment)}>
              <SelectTrigger className="h-8 text-xs">
                <User className="w-3 h-3 mr-2 text-muted-foreground" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {AUDIENCE_OPTIONS.map(({ value, label }) => (
                  <SelectItem key={value} value={value} className="text-xs">{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="relative">
            <Label className="text-xs text-muted-foreground mb-1 block">Industry Vertical</Label>
            <div className="relative">
              <Building className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
              <Input
                placeholder="SaaS, FinTech, Healthcare..."
                value={industryInput}
                onChange={e => {
                  setIndustryInput(e.target.value);
                  setIndustryVertical(e.target.value);
                  setShowIndustrySuggestions(true);
                }}
                onBlur={() => setTimeout(() => setShowIndustrySuggestions(false), 150)}
                onFocus={() => setShowIndustrySuggestions(true)}
                className="h-8 text-xs pl-7"
              />
            </div>
            {showIndustrySuggestions && filteredIndustries.length > 0 && (
              <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-popover border rounded-md shadow-lg max-h-40 overflow-y-auto">
                {filteredIndustries.slice(0, 8).map(v => (
                  <button
                    key={v}
                    onMouseDown={() => {
                      setIndustryInput(v);
                      setIndustryVertical(v);
                      setShowIndustrySuggestions(false);
                    }}
                    className="w-full text-left text-xs px-3 py-2 hover:bg-accent transition-colors"
                  >
                    {v}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Switch
                id="b2b-toggle"
                checked={isBtoB}
                onCheckedChange={setIsBtoB}
              />
              <Label htmlFor="b2b-toggle" className="text-xs cursor-pointer">
                {isBtoB ? 'B2B (Enterprise/Professional)' : 'B2C (Consumer)'}
              </Label>
            </div>
          </div>

          {personasData?.length > 0 && (
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Creator Persona (optional)</Label>
              <Select value={personaId} onValueChange={setPersonaId}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Use active persona..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none" className="text-xs">No persona</SelectItem>
                  {personasData.map((p: any) => (
                    <SelectItem key={p.id} value={p.id} className="text-xs">
                      {p.name} {p.isDefault ? '(Default)' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs text-muted-foreground mb-1 flex items-center gap-1 block">
                <Globe className="w-3 h-3" /> Region
              </Label>
              <Select value={geo} onValueChange={setGeo}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {GEO_OPTIONS.map(({ code, label }) => (
                    <SelectItem key={code || 'GLOBAL'} value={code || 'GLOBAL'} className="text-xs">{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1 flex items-center gap-1 block">
                <Clock className="w-3 h-3" /> Timeframe
              </Label>
              <div className="flex rounded-md overflow-hidden border h-8">
                {(['7d', '1m', '3m', '12m'] as const).map((tf) => {
                  const tfValue = `today ${tf === '7d' ? '7-d' : tf === '1m' ? '1-m' : tf === '3m' ? '3-m' : '12-m'}` as TrendResearchConfig['timeframe'];
                  const isActive = timeframe === tfValue;
                  return (
                    <button
                      key={tf}
                      onClick={() => setTimeframe(tfValue)}
                      className={`flex-1 text-[10px] font-medium transition-colors ${
                        isActive
                          ? 'bg-primary text-primary-foreground'
                          : 'hover:bg-accent text-muted-foreground'
                      }`}
                    >
                      {tf}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Section E: Advanced (collapsed) */}
        <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="w-full justify-between text-xs text-muted-foreground h-7 px-2">
              <span className="flex items-center gap-1.5">
                <SlidersHorizontal className="w-3.5 h-3.5" />
                Advanced Options
              </span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${advancedOpen ? 'rotate-180' : ''}`} />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-3 pt-2">
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Compare with second keyword (optional)</Label>
              <div className="relative">
                <GitCompare className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
                <Input
                  placeholder="automation, remote work..."
                  value={compareWith}
                  onChange={e => setCompareWith(e.target.value)}
                  className="h-8 text-xs pl-7"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Competitor or creator URL (optional)</Label>
              <Input
                placeholder="linkedin.com/in/xyz or brand name"
                value={competitorContext}
                onChange={e => setCompetitorContext(e.target.value)}
                className="h-8 text-xs"
              />
            </div>

            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Topics you've already covered (optional)</Label>
              <Textarea
                placeholder="AI productivity, remote work, hiring tips..."
                value={existingContentContext}
                onChange={e => setExistingContentContext(e.target.value)}
                rows={2}
                className="resize-none text-xs"
              />
            </div>

            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Custom research directive (optional)</Label>
              <Textarea
                placeholder="Focus on enterprise sales cycles, ignore consumer use cases"
                value={customResearchDirective}
                onChange={e => setCustomResearchDirective(e.target.value)}
                rows={2}
                className="resize-none text-xs"
              />
            </div>

            {/* Research depth */}
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Research Depth</Label>
              <div className="flex rounded-md overflow-hidden border">
                <button
                  onClick={() => setResearchDepth('quick')}
                  className={`flex-1 py-1.5 text-xs font-medium transition-colors ${
                    researchDepth === 'quick' ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'
                  }`}
                >
                  ⚡ Quick · 7–10 sources
                </button>
                <button
                  onClick={() => setResearchDepth('deep')}
                  className={`flex-1 py-1.5 text-xs font-medium transition-colors ${
                    researchDepth === 'deep' ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'
                  }`}
                >
                  🔬 Deep · 15+ sources
                </button>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Section F: Action Buttons */}
        <div className="space-y-2 pt-1">
          <Button
            onClick={handleSubmit}
            disabled={isLoading || !keyword.trim()}
            className="w-full gap-2 h-10"
            size="default"
          >
            {isLoading ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Researching...</>
            ) : (
              <><Search className="w-4 h-4" /> Research Now</>
            )}
          </Button>

          {compareWith.trim() && (
            <Button
              variant="outline"
              onClick={handleSubmit}
              disabled={isLoading || !keyword.trim()}
              className="w-full gap-2 h-8 text-xs"
              size="sm"
            >
              <GitCompare className="w-3.5 h-3.5" />
              Compare "{keyword}" vs "{compareWith}"
            </Button>
          )}

          {onSaveAlert && (
            <Button
              variant="ghost"
              onClick={() => onSaveAlert({
                keyword, contentTypeTarget, topicType, audienceSegment,
                industryVertical: industryVertical || industryInput,
                timeframe, geo: geo === 'GLOBAL' ? '' : geo, personaId: personaId || undefined, isBtoB,
                compareWith: compareWith || undefined, researchDepth,
              })}
              disabled={!keyword.trim()}
              className="w-full gap-2 h-8 text-xs text-muted-foreground"
              size="sm"
            >
              <Bell className="w-3.5 h-3.5" />
              Save as Topic Alert
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
