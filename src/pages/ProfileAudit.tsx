import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { auditApi } from '../services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import {
  Loader2,
  UserCircle,
  AlertCircle,
  CheckCircle,
  Building2,
  Globe,
  Sparkles,
  Plus,
  Trash2,
  FileText,
  Copy,
  ExternalLink,
  Info,
  TrendingUp,
  Check
} from 'lucide-react';

// circular progress rings
function CircularProgress({ value, size = 70, strokeWidth = 7 }: { value: number; size?: number; strokeWidth?: number }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (value / 100) * circumference;

  const strokeColor = value >= 80 ? 'stroke-emerald-500' : value >= 50 ? 'stroke-amber-500' : 'stroke-rose-500';
  const textColor = value >= 80 ? 'text-emerald-500' : value >= 50 ? 'text-amber-500' : 'text-rose-500';

  return (
    <div className="relative flex flex-col items-center justify-center" style={{ width: size, height: size }}>
      <svg className="transform -rotate-90" width={size} height={size}>
        <circle
          className="text-muted/10"
          strokeWidth={strokeWidth}
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
        <circle
          className={`${strokeColor} transition-all duration-700 ease-out`}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
      </svg>
      <span className={`absolute text-sm font-extrabold ${textColor}`}>{Math.round(value)}%</span>
    </div>
  );
}

export default function ProfileAudit() {

  // Profile configuration states
  const [profileType, setProfileType] = useState<'personal' | 'company'>('personal');
  const [inputMethod, setInputMethod] = useState<'auto' | 'manual'>('auto');

  // Common inputs
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [industry, setIndustry] = useState('');
  const [focusAreasText, setFocusAreasText] = useState('');

  // Personal overrides
  const [headline, setHeadline] = useState('');
  const [about, setAbout] = useState('');
  const [profilePicUrl, setProfilePicUrl] = useState('');
  const [bannerUrl, setBannerUrl] = useState('');
  const [skillsText, setSkillsText] = useState('');
  const [customUrlPresent, setCustomUrlPresent] = useState(true);
  const [featuredPresent, setFeaturedPresent] = useState(false);
  const [experiences, setExperiences] = useState<{ role: string; company: string }[]>([
    { role: '', company: '' }
  ]);

  // Company overrides
  const [tagline, setTagline] = useState('');
  const [description, setDescription] = useState('');
  const [ctaButton, setCtaButton] = useState('Visit website');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [companySize, setCompanySize] = useState('10-50 employees');

  // AI suggestions helpers states
  const [headlineIdeas, setHeadlineIdeas] = useState<any[]>([]);
  const [isGeneratingHeadlines, setIsGeneratingHeadlines] = useState(false);
  const [copiedHeadline, setCopiedHeadline] = useState<number | null>(null);

  const [aiAboutResult, setAiAboutResult] = useState('');
  const [isGeneratingAbout, setIsGeneratingAbout] = useState(false);
  const [aboutPersona, setAboutPersona] = useState('');
  const [aboutAchievements, setAboutAchievements] = useState('');
  const [aboutAudience, setAboutAudience] = useState('');

  // Get historical audits
  const { data: auditHistory, refetch: refetchHistory } = useQuery({
    queryKey: ['auditHistory'],
    queryFn: () => auditApi.getHistory().then((res) => res.data.audits),
  });

  const auditMutation = useMutation({
    mutationFn: (data: any) => auditApi.run(data),
    onSuccess: () => {
      toast.success('LinkedIn Audit complete!');
      refetchHistory();
      // Reset AI suggestion boxes
      setHeadlineIdeas([]);
      setAiAboutResult('');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || 'Audit failed');
    },
  });

  const latestAudit = auditMutation.data?.data.audit || auditHistory?.[0];

  // Pre-fill inputs when selecting an audit from history
  const handleSelectHistoricalAudit = (audit: any) => {
    setProfileType(audit.profileType || 'personal');
    setLinkedinUrl(audit.profileUrl || '');
    setIndustry(audit.industryTrends?.industry || audit.industryTrends?.trends?.industry || '');
    setInputMethod('manual');

    if (audit.profileType === 'company') {
      setTagline(audit.headline || '');
      setDescription(audit.about || '');
      setBannerUrl(audit.bannerUrl || '');
      setCtaButton(audit.conversionAnalysis?.ctaButton || 'Visit website');
      setWebsiteUrl(audit.conversionAnalysis?.websiteUrl || '');
    } else {
      setHeadline(audit.headline || '');
      setAbout(audit.about || '');
      setBannerUrl(audit.bannerUrl || '');
      setCustomUrlPresent(!!audit.pillars?.firstImpression?.feedback?.some((f: string) => f.includes('clean custom URL') || f.includes('URL configured')));
      setFeaturedPresent(!!audit.pillars?.completeness?.feedback?.some((f: string) => f.includes('Featured section is active') || f.includes('Featured section utilized')));
    }
  };

  const handleAddExperience = () => {
    setExperiences([...experiences, { role: '', company: '' }]);
  };

  const handleRemoveExperience = (index: number) => {
    setExperiences(experiences.filter((_, i) => i !== index));
  };

  const handleUpdateExperience = (index: number, key: 'role' | 'company', val: string) => {
    const next = [...experiences];
    next[index][key] = val;
    setExperiences(next);
  };

  const handleAudit = () => {
    if (inputMethod === 'auto' && !linkedinUrl) {
      toast.error('Please enter a LinkedIn profile URL');
      return;
    }
    if (!industry) {
      toast.error('Please specify the target industry');
      return;
    }

    const payload: any = {
      linkedinUrl,
      industry,
      profileType,
      focusAreas: focusAreasText ? focusAreasText.split(',').map((x) => x.trim()) : []
    };

    if (inputMethod === 'manual') {
      if (profileType === 'personal') {
        payload.headline = headline;
        payload.about = about;
        payload.profilePicUrl = profilePicUrl;
        payload.bannerUrl = bannerUrl;
        payload.customUrlPresent = customUrlPresent;
        payload.featuredPresent = featuredPresent;
        payload.skills = skillsText ? skillsText.split(',').map((x) => x.trim()) : [];
        payload.experience = experiences.filter((e) => e.role && e.company);
      } else {
        payload.tagline = tagline;
        payload.description = description;
        payload.profilePicUrl = profilePicUrl; // logo
        payload.bannerUrl = bannerUrl;
        payload.ctaButton = ctaButton;
        payload.websiteUrl = websiteUrl;
        payload.companySize = companySize;
      }
    }

    auditMutation.mutate(payload);
  };

  // Run AI headline generation
  const handleGetHeadlineIdeas = async () => {
    const currentHeadline = profileType === 'personal' ? headline : tagline;
    if (!currentHeadline && !industry) {
      toast.error('Please enter a headline/tagline and industry first');
      return;
    }
    setIsGeneratingHeadlines(true);
    try {
      const res = await auditApi.generateHeadlines({
        currentHeadline: currentHeadline || '',
        industry,
        focus: focusAreasText
      });
      setHeadlineIdeas(res.data.headlines || []);
      toast.success('AI Headlines generated!');
    } catch (e) {
      toast.error('Failed to generate headlines');
    } finally {
      setIsGeneratingHeadlines(false);
    }
  };

  // Run AI About section generation
  const handleGenerateAbout = async () => {
    if (!aboutPersona || !aboutAchievements || !aboutAudience) {
      toast.error('Please complete all generator helper fields');
      return;
    }
    setIsGeneratingAbout(true);
    try {
      const res = await auditApi.generateAbout({
        persona: aboutPersona,
        achievements: aboutAchievements.split(',').map((x) => x.trim()),
        targetAudience: aboutAudience
      });
      setAiAboutResult(res.data.about || '');
      toast.success('AI Summary Generated!');
    } catch (e) {
      toast.error('Failed to generate summary');
    } finally {
      setIsGeneratingAbout(false);
    }
  };

  const copyToClipboard = (text: string, index?: number) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
    if (index !== undefined) {
      setCopiedHeadline(index);
      setTimeout(() => setCopiedHeadline(null), 2000);
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/40 pb-6">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-primary to-violet-500 bg-clip-text text-transparent">
            LinkedIn Profile & Page Auditor
          </h1>
          <p className="text-muted-foreground mt-1 text-base">
            Detailed, industry-standard diagnostics to optimize visibility and conversions.
          </p>
        </div>

        {/* History Select */}
        {auditHistory && auditHistory.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground">Load Previous:</span>
            <Select onValueChange={(val) => {
              const matched = auditHistory.find((a: any) => a.id === val);
              if (matched) handleSelectHistoricalAudit(matched);
            }}>
              <SelectTrigger className="w-[200px] h-9 text-xs bg-card">
                <SelectValue placeholder="Select historical audit" />
              </SelectTrigger>
              <SelectContent>
                {auditHistory.map((h: any) => (
                  <SelectItem key={h.id} value={h.id} className="text-xs">
                    {h.profileType === 'company' ? '🏢' : '👤'} {h.headline?.substring(0, 18)}... ({(new Date(h.createdAt)).toLocaleDateString()})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <div className="grid gap-8 lg:grid-cols-12 items-start">
        {/* Left Side: Setup Card (Inputs) */}
        <div className="lg:col-span-5 space-y-6">
          <Card className="border border-border/60 shadow-xl bg-card/60 backdrop-blur-md">
            <CardHeader className="space-y-2">
              <CardTitle className="text-xl font-bold flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                Audit Configurator
              </CardTitle>
              <CardDescription>Select target type and supply your section inputs.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Profile Type Toggle */}
              <div className="grid grid-cols-2 gap-2 p-1 bg-muted/40 rounded-lg border border-border/40">
                <Button
                  variant={profileType === 'personal' ? 'default' : 'ghost'}
                  onClick={() => setProfileType('personal')}
                  className="w-full text-xs font-semibold"
                  size="sm"
                >
                  <UserCircle className="mr-2 h-4 w-4" />
                  Personal Profile
                </Button>
                <Button
                  variant={profileType === 'company' ? 'default' : 'ghost'}
                  onClick={() => setProfileType('company')}
                  className="w-full text-xs font-semibold"
                  size="sm"
                >
                  <Building2 className="mr-2 h-4 w-4" />
                  Company Page
                </Button>
              </div>

              {/* Input Method Toggle */}
              <div className="grid grid-cols-2 gap-2 p-1 bg-muted/40 rounded-lg border border-border/40">
                <Button
                  variant={inputMethod === 'auto' ? 'default' : 'ghost'}
                  onClick={() => setInputMethod('auto')}
                  className="w-full text-xs font-semibold"
                  size="sm"
                >
                  <Globe className="mr-2 h-4 w-4" />
                  Auto-Fetch (URL)
                </Button>
                <Button
                  variant={inputMethod === 'manual' ? 'default' : 'ghost'}
                  onClick={() => setInputMethod('manual')}
                  className="w-full text-xs font-semibold"
                  size="sm"
                >
                  <FileText className="mr-2 h-4 w-4" />
                  Manual Entry
                </Button>
              </div>

              {/* Dynamic Inputs Form */}
              <div className="space-y-4">
                {/* Always show Industry & Focus Areas */}
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label className="text-xs font-bold mb-1.5 block">Target Industry</Label>
                    <Input
                      placeholder="e.g. Technology, Software"
                      value={industry}
                      onChange={(e) => setIndustry(e.target.value)}
                      className="bg-card/50"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-bold mb-1.5 block">Focus Areas (Optional)</Label>
                    <Input
                      placeholder="SEO, B2B Leads, copywriting"
                      value={focusAreasText}
                      onChange={(e) => setFocusAreasText(e.target.value)}
                      className="bg-card/50"
                    />
                  </div>
                </div>

                {inputMethod === 'auto' ? (
                  <div>
                    <Label className="text-xs font-bold mb-1.5 block">LinkedIn URL</Label>
                    <Input
                      placeholder={
                        profileType === 'company'
                          ? 'https://linkedin.com/company/yourcompany'
                          : 'https://linkedin.com/in/yourprofile'
                      }
                      value={linkedinUrl}
                      onChange={(e) => setLinkedinUrl(e.target.value)}
                      className="bg-card/50"
                    />
                    <p className="text-[10px] text-muted-foreground mt-1.5 flex items-center gap-1">
                      <Info className="h-3 w-3" /> Auto-fetch uses active session cookies if connected in Settings.
                    </p>
                  </div>
                ) : (
                  /* Manual Fields Form */
                  <div className="space-y-4 pt-2 border-t border-border/30">
                    <div>
                      <Label className="text-xs font-bold mb-1.5 block">Profile/Logo Picture URL</Label>
                      <Input
                        placeholder="Paste image link..."
                        value={profilePicUrl}
                        onChange={(e) => setProfilePicUrl(e.target.value)}
                        className="bg-card/50"
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-bold mb-1.5 block">Header Banner URL</Label>
                      <Input
                        placeholder="Paste banner image link..."
                        value={bannerUrl}
                        onChange={(e) => setBannerUrl(e.target.value)}
                        className="bg-card/50"
                      />
                    </div>

                    {profileType === 'personal' ? (
                      /* Personal Manual Fields */
                      <>
                        <div>
                          <Label className="text-xs font-bold mb-1.5 block">LinkedIn Headline</Label>
                          <Textarea
                            placeholder="e.g. Senior Software Architect | Specialized in Cloud-Native & AI integrations"
                            value={headline}
                            onChange={(e) => setHeadline(e.target.value)}
                            className="bg-card/50 min-h-[60px]"
                          />
                        </div>
                        <div>
                          <Label className="text-xs font-bold mb-1.5 block">About Summary</Label>
                          <Textarea
                            placeholder="Write your personal storytelling bio here..."
                            value={about}
                            onChange={(e) => setAbout(e.target.value)}
                            className="bg-card/50 min-h-[100px]"
                          />
                        </div>
                        <div>
                          <Label className="text-xs font-bold mb-1.5 block">Key Skills (Comma separated)</Label>
                          <Input
                            placeholder="React, Node.js, AWS, System Architecture"
                            value={skillsText}
                            onChange={(e) => setSkillsText(e.target.value)}
                            className="bg-card/50"
                          />
                        </div>

                        {/* Switches Grid */}
                        <div className="grid grid-cols-2 gap-4 py-2 bg-muted/20 px-3 rounded-lg border border-border/20">
                          <div className="flex items-center justify-between">
                            <Label htmlFor="custom-url" className="text-xs font-medium cursor-pointer">Custom Clean URL</Label>
                            <Switch
                              id="custom-url"
                              checked={customUrlPresent}
                              onCheckedChange={setCustomUrlPresent}
                            />
                          </div>
                          <div className="flex items-center justify-between">
                            <Label htmlFor="featured-section" className="text-xs font-medium cursor-pointer">Featured Section</Label>
                            <Switch
                              id="featured-section"
                              checked={featuredPresent}
                              onCheckedChange={setFeaturedPresent}
                            />
                          </div>
                        </div>

                        {/* Experiences Array */}
                        <div className="space-y-2 pt-2">
                          <div className="flex items-center justify-between">
                            <Label className="text-xs font-bold">Experiences</Label>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={handleAddExperience}
                              className="h-7 text-[10px] px-2"
                            >
                              <Plus className="h-3 w-3 mr-1" /> Add Role
                            </Button>
                          </div>
                          {experiences.map((exp, index) => (
                            <div key={index} className="flex gap-2 items-center bg-muted/20 p-2 rounded-lg border border-border/25">
                              <Input
                                placeholder="Role (e.g. CTO)"
                                value={exp.role}
                                onChange={(e) => handleUpdateExperience(index, 'role', e.target.value)}
                                className="bg-card h-8 text-xs"
                              />
                              <Input
                                placeholder="Company (e.g. Google)"
                                value={exp.company}
                                onChange={(e) => handleUpdateExperience(index, 'company', e.target.value)}
                                className="bg-card h-8 text-xs"
                              />
                              {experiences.length > 1 && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleRemoveExperience(index)}
                                  className="h-8 w-8 p-0 text-rose-500 hover:text-rose-600 hover:bg-rose-500/10"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          ))}
                        </div>
                      </>
                    ) : (
                      /* Company Manual Fields */
                      <>
                        <div>
                          <Label className="text-xs font-bold mb-1.5 block">Company Tagline</Label>
                          <Input
                            placeholder="e.g. Powering advanced AI systems for growth-focused marketing teams."
                            value={tagline}
                            onChange={(e) => setTagline(e.target.value)}
                            className="bg-card/50"
                          />
                        </div>
                        <div>
                          <Label className="text-xs font-bold mb-1.5 block">Overview Description</Label>
                          <Textarea
                            placeholder="Write company overview detail..."
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="bg-card/50 min-h-[100px]"
                          />
                        </div>
                        <div className="grid gap-4 md:grid-cols-2">
                          <div>
                            <Label className="text-xs font-bold mb-1.5 block">CTA Button Config</Label>
                            <Select value={ctaButton} onValueChange={setCtaButton}>
                              <SelectTrigger className="bg-card/50 h-10">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="None">None (Default)</SelectItem>
                                <SelectItem value="Visit website">Visit website</SelectItem>
                                <SelectItem value="Contact us">Contact us</SelectItem>
                                <SelectItem value="Learn more">Learn more</SelectItem>
                                <SelectItem value="Register">Register</SelectItem>
                                <SelectItem value="Sign up">Sign up</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label className="text-xs font-bold mb-1.5 block">Website URL Link</Label>
                            <Input
                              placeholder="e.g. https://domain.com"
                              value={websiteUrl}
                              onChange={(e) => setWebsiteUrl(e.target.value)}
                              className="bg-card/50"
                            />
                          </div>
                        </div>
                        <div>
                          <Label className="text-xs font-bold mb-1.5 block">Company Size</Label>
                          <Input
                            placeholder="e.g. 10-50 employees"
                            value={companySize}
                            onChange={(e) => setCompanySize(e.target.value)}
                            className="bg-card/50"
                          />
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Action Button */}
              <Button
                onClick={handleAudit}
                disabled={auditMutation.isPending}
                className="w-full bg-gradient-to-r from-primary to-violet-600 hover:from-primary/90 hover:to-violet-600/90 font-bold"
              >
                {auditMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Running Deep Audit...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4 animate-pulse" />
                    Analyze & Optimize Profile
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Right Side: Mockup Live Preview */}
        <div className="lg:col-span-7 space-y-6">
          <Card className="border border-border/40 shadow-xl overflow-hidden bg-card/40">
            <CardHeader className="py-3 px-4 border-b border-border/30 bg-muted/20">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                  <UserCircle className="h-4 w-4 text-primary" />
                  LinkedIn Preview Simulator
                </CardTitle>
                <Badge variant="outline" className="text-[10px] py-0 px-2 font-mono">
                  Live View
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {/* LinkedIn Header Mockup */}
              <div className="w-full relative bg-[#f4f2ee] p-4 text-[#191919] font-sans antialiased text-sm">
                <div className="bg-white rounded-lg border border-[#e0e0e0] shadow-sm overflow-hidden relative">
                  
                  {/* Banner block */}
                  <div
                    className="h-28 sm:h-36 w-full relative bg-gradient-to-r from-[#98b4cc] to-[#a3c9e6] bg-cover bg-center border-b border-[#e0e0e0]"
                    style={{
                      backgroundImage: bannerUrl ? `url(${bannerUrl})` : undefined
                    }}
                  >
                    {/* Warning indicator on Banner */}
                    {latestAudit && latestAudit.pillars?.firstImpression?.score < 70 && !bannerUrl && (
                      <span className="absolute top-2 right-2 bg-rose-500 text-white rounded-full p-1 shadow-md animate-bounce cursor-help" title="Missing custom banner">
                        <AlertCircle className="h-4 w-4" />
                      </span>
                    )}
                  </div>

                  {/* Logo / Pic & Top Metadata spacing */}
                  <div className="px-6 pb-6 relative pt-12 sm:pt-14">
                    {/* Avatar overlap */}
                    <div className="absolute -top-16 sm:-top-20 left-6 border-4 border-white rounded-full bg-[#f4f2ee] shadow-md overflow-hidden h-24 w-24 sm:h-32 sm:w-32 flex items-center justify-center">
                      {profilePicUrl ? (
                        <img src={profilePicUrl} alt="Logo" className="h-full w-full object-cover" />
                      ) : (
                        <div className="h-full w-full bg-[#e0e0e0] flex items-center justify-center text-muted-foreground">
                          {profileType === 'company' ? (
                            <Building2 className="h-10 w-10 sm:h-14 sm:w-14" />
                          ) : (
                            <UserCircle className="h-12 w-12 sm:h-16 sm:w-16" />
                          )}
                        </div>
                      )}

                      {/* Warning dot on avatar */}
                      {latestAudit && !profilePicUrl && (
                        <span className="absolute bottom-0 right-0 bg-rose-500 text-white rounded-full p-0.5 shadow-md border-2 border-white" title="Missing profile picture">
                          <AlertCircle className="h-3 w-3" />
                        </span>
                      )}
                    </div>

                    {/* Headline and Metadata */}
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5">
                        <h2 className="text-xl font-bold hover:underline cursor-pointer">
                          {profileType === 'personal'
                            ? (headline ? 'Your Name' : 'LinkedIn Professional')
                            : (tagline ? 'Your Enterprise Name' : 'LinkedIn Business')}
                        </h2>
                        {profileType === 'company' && (
                          <Badge variant="outline" className="text-[9px] h-4 py-0 text-muted-foreground font-mono">Company</Badge>
                        )}
                      </div>

                      {/* Headline / Tagline */}
                      <p className="text-sm font-normal text-[#191919] leading-tight max-w-xl">
                        {profileType === 'personal'
                          ? (headline || <span className="text-muted-foreground italic">Add headline (e.g. Role | Expertise | Result)...</span>)
                          : (tagline || <span className="text-muted-foreground italic">Add tagline (e.g. Slogan or core service proposition)...</span>)}
                      </p>

                      {/* Warning on Headline */}
                      {latestAudit && profileType === 'personal' && latestAudit.pillars?.headline?.score < 70 && (
                        <div className="inline-flex items-center gap-1 text-xs text-rose-500 font-semibold bg-rose-50 px-2 py-0.5 rounded mt-1">
                          <AlertCircle className="h-3.5 w-3.5" /> Optimize this headline for SEO & Clarity!
                        </div>
                      )}

                      {/* Sub-text metadata */}
                      <div className="pt-2 text-xs text-[#5e5e5e] flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span>{industry || 'Industry'}</span>
                        {profileType === 'personal' ? (
                          <>
                            <span>•</span>
                            <span className={customUrlPresent ? 'text-[#0a66c2] font-semibold' : 'text-amber-500'}>
                              {customUrlPresent ? 'Custom URL Active' : 'Default URL (Sub-optimal)'}
                            </span>
                            {featuredPresent && (
                              <>
                                <span>•</span>
                                <span className="text-[#0a66c2] font-semibold">Featured Enabled</span>
                              </>
                            )}
                          </>
                        ) : (
                          <>
                            <span>•</span>
                            <span>{companySize}</span>
                            {websiteUrl && (
                              <>
                                <span>•</span>
                                <a href={websiteUrl} target="_blank" rel="noopener noreferrer" className="text-[#0a66c2] hover:underline inline-flex items-center gap-0.5">
                                  {websiteUrl.replace(/https?:\/\/(www\.)?/, '')} <ExternalLink className="h-2.5 w-2.5" />
                                </a>
                              </>
                            )}
                          </>
                        )}
                      </div>

                      {/* CTA Buttons */}
                      <div className="pt-4 flex flex-wrap gap-2">
                        {profileType === 'personal' ? (
                          <>
                            <Button size="sm" className="bg-[#0a66c2] hover:bg-[#004182] text-white rounded-full h-8 px-4 font-semibold text-xs">
                              Open to
                            </Button>
                            <Button size="sm" variant="outline" className="border-[#0a66c2] text-[#0a66c2] hover:bg-[#0a66c2]/10 rounded-full h-8 px-4 font-semibold text-xs">
                              Add profile section
                            </Button>
                          </>
                        ) : (
                          <>
                            {ctaButton !== 'None' && (
                              <Button size="sm" className="bg-[#0a66c2] hover:bg-[#004182] text-white rounded-full h-8 px-4 font-semibold text-xs">
                                {ctaButton} <ExternalLink className="h-3 w-3 ml-1" />
                              </Button>
                            )}
                            <Button size="sm" variant="outline" className="border-[#5e5e5e] text-[#5e5e5e] hover:bg-[#f4f2ee] rounded-full h-8 px-4 font-semibold text-xs">
                              Follow
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* AI suggestion blocks if triggered */}
          {headlineIdeas.length > 0 && (
            <Card className="border border-primary/30 shadow-lg bg-primary/5">
              <CardHeader className="py-3 px-4">
                <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4 text-primary animate-pulse" />
                  AI Suggested Variations
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0 space-y-2">
                {headlineIdeas.map((h, i) => (
                  <div key={i} className="flex justify-between items-start gap-4 p-2 bg-card rounded-md border border-border/50 text-xs">
                    <div>
                      <Badge variant="secondary" className="mb-1 text-[9px] capitalize">{h.type}</Badge>
                      <p className="font-medium text-foreground">{h.headline}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        copyToClipboard(h.headline, i);
                        if (profileType === 'personal') setHeadline(h.headline);
                        else setTagline(h.headline);
                      }}
                      className="h-7 px-2 hover:bg-muted text-[10px] shrink-0"
                    >
                      {copiedHeadline === i ? <CheckCircle className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                      <span className="ml-1">Use</span>
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* AI About Rewrite Form */}
          {profileType === 'personal' && latestAudit && (
            <Card className="border border-border/60">
              <CardHeader className="py-3 px-4">
                <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4 text-primary" />
                  Interactive AI Bio Builder
                </CardTitle>
                <CardDescription className="text-[11px]">Generate a storytelling LinkedIn About section.</CardDescription>
              </CardHeader>
              <CardContent className="p-4 pt-0 space-y-3">
                <div className="grid gap-3 sm:grid-cols-3">
                  <div>
                    <Label className="text-[10px] font-bold">Your Persona</Label>
                    <Input
                      placeholder="e.g. AI Product Manager"
                      value={aboutPersona}
                      onChange={(e) => setAboutPersona(e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>
                  <div>
                    <Label className="text-[10px] font-bold">Achievements (comma separated)</Label>
                    <Input
                      placeholder="e.g. Led 20+ releases"
                      value={aboutAchievements}
                      onChange={(e) => setAboutAchievements(e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>
                  <div>
                    <Label className="text-[10px] font-bold">Target Audience</Label>
                    <Input
                      placeholder="e.g. Tech recruiters"
                      value={aboutAudience}
                      onChange={(e) => setAboutAudience(e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>
                </div>

                <Button
                  size="sm"
                  onClick={handleGenerateAbout}
                  disabled={isGeneratingAbout}
                  className="w-full h-8 text-xs bg-muted text-foreground hover:bg-muted/80"
                >
                  {isGeneratingAbout ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Sparkles className="h-3.5 w-3.5 mr-1" />}
                  Generate AI About Bio
                </Button>

                {aiAboutResult && (
                  <div className="relative bg-muted/40 border border-border/50 rounded-lg p-3 pt-8">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        copyToClipboard(aiAboutResult);
                        setAbout(aiAboutResult);
                      }}
                      className="absolute top-1.5 right-1.5 h-6 px-2 hover:bg-muted text-[10px]"
                    >
                      <Copy className="h-3 w-3 mr-1" /> Copy & Use
                    </Button>
                    <p className="text-xs text-foreground whitespace-pre-line leading-relaxed">{aiAboutResult}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* SECTION: AUDIT RESULTS DASHBOARD */}
      {latestAudit && (
        <Card className="border border-border/80 shadow-2xl overflow-hidden bg-card/30">
          <CardHeader className="bg-muted/10 border-b border-border/30">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-2xl font-bold flex items-center gap-2">
                  <CheckCircle className="h-6 w-6 text-emerald-500" />
                  Audit Analysis Results
                </CardTitle>
                <CardDescription>Comprehensive metric breakdown and actionable checklist.</CardDescription>
              </div>
              <div className="flex gap-4">
                <div className="text-center bg-card/60 border border-border/40 py-2 px-4 rounded-xl shadow-inner">
                  <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Overall Score</span>
                  <div className="text-2xl font-extrabold text-primary">{Math.round(latestAudit.overallScore)}<span className="text-xs text-muted-foreground">/100</span></div>
                </div>
                <div className="text-center bg-card/60 border border-border/40 py-2 px-4 rounded-xl shadow-inner">
                  <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">SEO Score</span>
                  <div className="text-2xl font-extrabold text-emerald-500">{Math.round(latestAudit.seoScore)}<span className="text-xs text-muted-foreground">/100</span></div>
                </div>
                <div className="text-center bg-card/60 border border-border/40 py-2 px-4 rounded-xl shadow-inner">
                  <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Brand Score</span>
                  <div className="text-2xl font-extrabold text-violet-500">{Math.round(latestAudit.brandScore)}<span className="text-xs text-muted-foreground">/100</span></div>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-8">
            
            {/* The 5 Key Performance Pillars */}
            {latestAudit.pillars && (
              <div className="space-y-4">
                <h3 className="text-base font-bold text-foreground flex items-center gap-1.5">
                  <TrendingUp className="h-4.5 w-4.5 text-primary" />
                  The 5 Pillars of Profile Performance
                </h3>
                <div className="grid gap-4 sm:grid-cols-5">
                  {Object.entries(latestAudit.pillars).map(([key, pillar]: [string, any]) => {
                    const titleMap: any = {
                      firstImpression: 'First Impression',
                      headline: profileType === 'company' ? 'Tagline Hook' : 'Headline Hook',
                      summary: profileType === 'company' ? 'Overview Text' : 'Summary story',
                      seo: 'Search SEO',
                      completeness: 'Completeness'
                    };
                    return (
                      <Card key={key} className="border border-border/40 bg-card/50 flex flex-col items-center p-4 text-center">
                        <CircularProgress value={pillar.score} size={65} />
                        <span className="text-xs font-bold text-foreground mt-2 block capitalize">{titleMap[key] || key}</span>
                        <Badge
                          variant="secondary"
                          className={`mt-1.5 text-[9px] py-0 px-2 font-semibold capitalize ${
                            pillar.status === 'good'
                              ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                              : pillar.status === 'average'
                              ? 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                              : 'bg-rose-500/10 text-rose-600 border-rose-500/20'
                          }`}
                        >
                          {pillar.status}
                        </Badge>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Profile Gaps */}
            {latestAudit.gaps && latestAudit.gaps.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-base font-bold text-foreground flex items-center gap-1.5">
                  <AlertCircle className="h-4.5 w-4.5 text-rose-500" />
                  Identified Gaps ({latestAudit.gaps.length})
                </h3>
                <div className="grid gap-2 sm:grid-cols-2">
                  {latestAudit.gaps.map((gap: string, i: number) => (
                    <div key={i} className="flex items-start gap-2.5 p-3 rounded-xl bg-rose-500/5 border border-rose-500/15">
                      <AlertCircle className="h-4.5 w-4.5 text-rose-500 mt-0.5 shrink-0" />
                      <p className="text-xs text-foreground leading-relaxed">{gap}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Suggestions Checklist */}
            {latestAudit.suggestions && latestAudit.suggestions.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-base font-bold text-foreground flex items-center gap-1.5">
                  <CheckCircle className="h-4.5 w-4.5 text-emerald-500" />
                  Actionable Optimization Checklist
                </h3>
                <div className="space-y-3">
                  {latestAudit.suggestions.map((suggestion: any, i: number) => (
                    <div key={i} className="p-4 rounded-xl border border-border/50 bg-card/40 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                      <div className="space-y-1 max-w-3xl">
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={
                              suggestion.priority === 'high'
                                ? 'destructive'
                                : suggestion.priority === 'medium'
                                ? 'default'
                                : 'secondary'
                            }
                            className="text-[9px] py-0 px-2 uppercase tracking-wide"
                          >
                            {suggestion.priority} priority
                          </Badge>
                          <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider font-mono">
                            {suggestion.section}
                          </span>
                        </div>
                        <p className="text-xs text-foreground leading-relaxed">{suggestion.suggestion}</p>
                        {suggestion.example && (
                          <div className="bg-muted/30 border border-border/40 p-2.5 rounded-lg text-xs font-mono text-muted-foreground mt-2 relative">
                            <span className="text-[9px] uppercase font-bold text-primary block mb-1">AI Example suggestion:</span>
                            "{suggestion.example}"
                          </div>
                        )}
                      </div>

                      {/* Interactive Helpers inside suggestions checklist */}
                      <div className="shrink-0 flex items-center">
                        {suggestion.section === 'headline' || suggestion.section === 'tagline' ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={handleGetHeadlineIdeas}
                            disabled={isGeneratingHeadlines}
                            className="h-8 text-[10px] px-2.5"
                          >
                            {isGeneratingHeadlines ? (
                              <Loader2 className="h-3 w-3 animate-spin mr-1" />
                            ) : (
                              <Sparkles className="h-3 w-3 text-primary mr-1" />
                            )}
                            Get AI Drafts
                          </Button>
                        ) : (
                          <div className="text-[10px] text-muted-foreground font-mono flex items-center gap-1">
                            <Check className="h-3.5 w-3.5 text-emerald-500" /> Pending Action
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Benchmark Section: Top Creators & Industry Trends */}
            <div className="grid gap-6 md:grid-cols-2 pt-2 border-t border-border/40">
              
              {/* Industry Trends */}
              {latestAudit.industryTrends && (
                <Card className="border border-border/40 bg-card/40">
                  <CardHeader className="py-4 px-5">
                    <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                      <TrendingUp className="h-4.5 w-4.5 text-primary" />
                      Current LinkedIn Trends ({industry})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-5 pb-5 pt-0 space-y-4">
                    {/* Trending topics */}
                    {latestAudit.industryTrends.trendingTopics && (
                      <div className="space-y-1">
                        <span className="text-[10px] uppercase font-bold text-muted-foreground font-mono">Trending Topics</span>
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {latestAudit.industryTrends.trendingTopics.map((topic: string, i: number) => (
                            <Badge key={i} variant="secondary" className="text-[10px] font-normal">{topic}</Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    {/* formats */}
                    {latestAudit.industryTrends.popularFormats && (
                      <div className="space-y-1">
                        <span className="text-[10px] uppercase font-bold text-muted-foreground font-mono block">Format Recommendations</span>
                        <p className="text-xs text-foreground leading-relaxed">{latestAudit.industryTrends.popularFormats.join(', ')}</p>
                      </div>
                    )}
                    {/* structures */}
                    {latestAudit.industryTrends.successfulPostStructures && (
                      <div className="space-y-1">
                        <span className="text-[10px] uppercase font-bold text-muted-foreground font-mono block">Writing Structure Tip</span>
                        <p className="text-xs text-foreground leading-relaxed italic">"{latestAudit.industryTrends.successfulPostStructures[0]}"</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Top Creators / Benchmarks */}
              {latestAudit.topCreators && latestAudit.topCreators.length > 0 && (
                <Card className="border border-border/40 bg-card/40">
                  <CardHeader className="py-4 px-5">
                    <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                      <UserCircle className="h-4.5 w-4.5 text-primary" />
                      Benchmarked Accounts
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-5 pb-5 pt-0 space-y-3.5">
                    {latestAudit.topCreators.map((creator: any, i: number) => (
                      <div key={i} className="text-xs space-y-1 pb-3 border-b border-border/30 last:pb-0 last:border-none">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-foreground flex items-center gap-1">
                            {creator.name}
                          </span>
                          <Badge variant="outline" className="text-[8px] py-0 px-1 font-mono">Takeaway</Badge>
                        </div>
                        <p className="text-muted-foreground text-[11px] leading-relaxed">
                          <span className="text-foreground font-medium">Style:</span> {creator.contentStyle}. <span className="text-foreground font-medium">Good at:</span> {creator.whatTheyDoWell}
                        </p>
                        <p className="text-primary text-[10px] italic">
                          "Takeaway: {creator.keyTakeawaysForOthers || creator.takeaway}"
                        </p>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
