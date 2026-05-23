import React, { useState } from 'react';
import { ThumbsUp, MessageSquare, Repeat2, Send, Globe, MoreHorizontal, FileText, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LinkedInPreviewProps {
  content: string;
  contentType: string;
  slides?: any[] | null;
  pollQuestion?: string | null;
  pollOptions?: any[] | null;
  charCount?: number | null;
  userName?: string;
  userAvatar?: string;
  articleTitle?: string | null;
  articleExcerpt?: string | null;
}

export const LinkedInPreview: React.FC<LinkedInPreviewProps & { images?: string[] }> = ({
  content = '',
  contentType,
  images = [],
  slides,
  pollQuestion,
  pollOptions,
  charCount,
  userName = 'Alex Carter',
  userAvatar = 'AC',
  articleTitle,
  articleExcerpt,
}) => {
  const [expanded, setExpanded] = useState(false);

  // Formatting utility: identifies hashtags and wraps them in LinkedIn Blue CSS class.
  const formatHashtags = (text: string) => {
    if (!text) return '';
    const parts = text.split(/(\s+)/);
    return parts.map((part, index) => {
      if (part.startsWith('#')) {
        return (
          <span key={index} className="text-[#0a66c2] hover:underline cursor-pointer font-medium">
            {part}
          </span>
        );
      }
      return part;
    });
  };

  const foldLimit = 210;
  const isTooLong = content.length > foldLimit;
  const shouldTruncate = isTooLong && !expanded;

  const displayContent = shouldTruncate
    ? content.substring(0, foldLimit)
    : content;

  return (
    <div
      role="presentation"
      aria-hidden="true"
      className="border border-border/80 bg-card rounded-xl shadow-md max-w-[550px] mx-auto overflow-hidden text-foreground font-sans text-left transition-all duration-300 hover:shadow-lg"
    >
      {/* LinkedIn Header */}
      <div className="p-4 flex items-start justify-between">
        <div className="flex gap-3">
          <div className="w-12 h-12 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center font-bold text-primary select-none text-base">
            {userAvatar.substring(0, 2).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-1">
              <span className="font-semibold text-sm hover:text-primary hover:underline cursor-pointer">
                {userName}
              </span>
              <span className="text-xs text-muted-foreground">• 1st</span>
            </div>
            <p className="text-xs text-muted-foreground line-clamp-1 leading-normal">
              Ghostwriter & Content Strategist | AI Specialist
            </p>
            <div className="flex items-center gap-1 text-[11px] text-muted-foreground mt-0.5">
              <span>1h</span>
              <span>•</span>
              <Globe className="w-3 h-3" />
            </div>
          </div>
        </div>
        <button type="button" className="text-muted-foreground hover:bg-secondary/40 p-1.5 rounded-full transition">
          <MoreHorizontal className="w-5 h-5" />
        </button>
      </div>

      {/* LinkedIn Post Body Text */}
      <div className="px-4 pb-3">
        <p className="text-sm leading-relaxed whitespace-pre-wrap font-sans text-foreground/90">
          {formatHashtags(displayContent)}
          {shouldTruncate && (
            <button
              type="button"
              onClick={() => setExpanded(true)}
              className="text-muted-foreground font-semibold hover:text-primary hover:underline ml-1 text-sm bg-transparent border-0 cursor-pointer"
            >
              ...see more
            </button>
          )}
        </p>
      </div>

      {/* Specialized Media Embed Layouts */}
      {contentType === 'carousel' && (
        <div className="mx-4 mb-4 border border-border bg-secondary/20 rounded-lg p-3.5 flex items-center justify-between shadow-inner">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded bg-[#e8f3fc] border border-[#a0c5e8] flex items-center justify-center text-[#006097]">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-semibold font-sans text-foreground/80 line-clamp-1">
                {Array.isArray(slides) && slides[0]?.headline ? slides[0].headline : 'Document Content Deck'}
              </div>
              <div className="text-[10px] text-muted-foreground mt-0.5">
                {Array.isArray(slides) ? slides.length : 10} slides • PDF
              </div>
            </div>
          </div>
          <div className="flex items-center text-xs text-[#0a66c2] font-semibold hover:underline cursor-pointer gap-0.5">
            <span>Swipe</span>
            <ChevronRight className="w-4 h-4" />
          </div>
        </div>
      )}

      {contentType === 'poll' && (
        <div className="mx-4 mb-4 border border-border bg-secondary/15 rounded-lg p-4 space-y-3">
          <div className="text-sm font-semibold text-foreground/95">
            {pollQuestion || 'Question Preview'}
          </div>
          <div className="space-y-2">
            {pollOptions && Array.isArray(pollOptions) && pollOptions.length > 0 ? (
              pollOptions.map((opt: any, index: number) => (
                <div
                  key={index}
                  className="relative overflow-hidden w-full p-2.5 rounded border border-border bg-secondary/45 text-xs text-foreground/90 hover:bg-secondary/70 transition cursor-pointer font-medium flex items-center justify-between"
                >
                  <span>{opt.text}</span>
                  <span className="text-[10px] text-muted-foreground/60">0%</span>
                </div>
              ))
            ) : (
              <div className="space-y-2">
                <div className="p-2.5 rounded border border-border bg-secondary/45 text-xs text-muted-foreground">Option 1</div>
                <div className="p-2.5 rounded border border-border bg-secondary/45 text-xs text-muted-foreground">Option 2</div>
              </div>
            )}
          </div>
          <div className="text-[10px] text-muted-foreground">
            0 votes • 1 week left
          </div>
        </div>
      )}

      {contentType === 'article' && (
        <div className="mx-4 mb-4 border border-border bg-secondary/20 rounded-lg overflow-hidden flex flex-col shadow-inner cursor-pointer hover:border-muted-foreground/30 transition">
          <div className="aspect-[1.91/1] w-full bg-gradient-to-br from-primary/10 to-indigo-500/10 flex items-center justify-center border-b border-border text-muted-foreground font-semibold text-xs relative">
            <span className="absolute inset-0 bg-cover bg-center opacity-70" />
            <span className="z-10 bg-background/80 backdrop-blur px-3 py-1.5 rounded-md border border-border flex items-center gap-1.5 shadow">
              <FileText className="w-4 h-4 text-[#006097]" />
              LinkedIn Article Preview
            </span>
          </div>
          <div className="p-3.5 space-y-1.5 bg-card">
            <h3 className="text-sm font-bold text-foreground/90 line-clamp-1">
              {articleTitle || 'Untitled Article'}
            </h3>
            <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
              {articleExcerpt || 'Excerpt will show feed context here.'}
            </p>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold pt-1">
              linkedin.com • 5 min read
            </div>
          </div>
        </div>
      )}

      {/* Feature Image Embed */}
      {images && images.length > 0 && typeof images[0] === 'string' && images[0].trim() !== '' && (
        <div className="mx-0 mt-2 mb-0">
          <img 
            src={images[0]} 
            alt="Feature Image" 
            className="w-full object-cover max-h-[500px]" 
            onError={(e) => {
              // Hide image if it fails to load
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        </div>
      )}

      {/* Engagement Actions */}
      <div className="border-t border-border mt-2 p-1 flex items-center justify-between text-muted-foreground text-xs font-semibold px-2 bg-secondary/10">
        <button type="button" className="flex items-center gap-1.5 hover:bg-secondary/50 py-2 px-3.5 rounded transition">
          <ThumbsUp className="w-4 h-4" />
          <span className="hidden sm:inline">Like</span>
        </button>
        <button type="button" className="flex items-center gap-1.5 hover:bg-secondary/50 py-2 px-3.5 rounded transition">
          <MessageSquare className="w-4 h-4" />
          <span className="hidden sm:inline">Comment</span>
        </button>
        <button type="button" className="flex items-center gap-1.5 hover:bg-secondary/50 py-2 px-3.5 rounded transition">
          <Repeat2 className="w-4 h-4" />
          <span className="hidden sm:inline">Repost</span>
        </button>
        <button type="button" className="flex items-center gap-1.5 hover:bg-secondary/50 py-2 px-3.5 rounded transition">
          <Send className="w-4 h-4" />
          <span className="hidden sm:inline">Send</span>
        </button>
      </div>
    </div>
  );
};
