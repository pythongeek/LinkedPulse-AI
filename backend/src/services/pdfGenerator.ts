import PDFDocument = require('pdfkit');
import { logger } from '../utils/logger';
import path = require('path');

export interface SlideData {
  slideNumber: number;
  type?: 'cover' | 'content' | 'quote' | 'cta' | string;
  headline: string;
  body?: string;
}

export interface CarouselTheme {
  primaryColor: string;
  backgroundColor: string;
  textColor: string;
  accentColor: string;
  authorName: string;
  authorHandle: string;
}

// ─── Color Helpers ───────────────────────────────────────────────────────────

/** Parse a hex color string (#RRGGBB or #RGB) into [r, g, b] 0-255. */
function hexToRgb(hex: string): [number, number, number] {
  let h = hex.replace('#', '');
  if (h.length === 3) {
    h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  }
  const num = parseInt(h, 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

/** Convert [r, g, b] 0-255 back to a hex string. */
function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  return (
    '#' +
    clamp(r).toString(16).padStart(2, '0') +
    clamp(g).toString(16).padStart(2, '0') +
    clamp(b).toString(16).padStart(2, '0')
  );
}

/** Linearly interpolate between two colors at ratio t ∈ [0, 1]. */
function lerpColor(c1: string, c2: string, t: number): string {
  const [r1, g1, b1] = hexToRgb(c1);
  const [r2, g2, b2] = hexToRgb(c2);
  return rgbToHex(
    r1 + (r2 - r1) * t,
    g1 + (g2 - g1) * t,
    b1 + (b2 - b1) * t
  );
}

/** Darken a hex color by a percentage (0-100). */
function darken(hex: string, percent: number): string {
  const [r, g, b] = hexToRgb(hex);
  const f = 1 - percent / 100;
  return rgbToHex(r * f, g * f, b * f);
}

// ─── Gradient Helper ─────────────────────────────────────────────────────────

/**
 * Draw a vertical gradient rectangle by filling many 2px-tall horizontal strips.
 * Each strip is filled with the interpolated color between `colorTop` and
 * `colorBottom`. This is the PDFKit-compatible way to simulate CSS gradients.
 */
function drawGradientRect(
  doc: PDFKit.PDFDocument,
  x: number,
  y: number,
  w: number,
  h: number,
  colorTop: string,
  colorBottom: string,
  roundedRadius?: number
): void {
  const stripHeight = 2;
  const steps = Math.ceil(h / stripHeight);

  // If rounded corners are requested we clip first, then fill strips inside.
  if (roundedRadius && roundedRadius > 0) {
    doc.save();
    doc.roundedRect(x, y, w, h, roundedRadius).clip();
  }

  for (let i = 0; i < steps; i++) {
    const t = i / Math.max(steps - 1, 1);
    const sy = y + i * stripHeight;
    const sh = Math.min(stripHeight, y + h - sy);
    if (sh <= 0) break;
    doc.rect(x, sy, w, sh).fill(lerpColor(colorTop, colorBottom, t));
  }

  if (roundedRadius && roundedRadius > 0) {
    doc.restore();
  }
}

// ─── Text Helpers ────────────────────────────────────────────────────────────

/**
 * Clamp text so it never renders below `maxY`.
 * Measures line-by-line and truncates with "…" when needed.
 */
function clampText(
  doc: PDFKit.PDFDocument,
  text: string,
  x: number,
  y: number,
  opts: PDFKit.Mixins.TextOptions & { lineGap?: number },
  maxY: number,
  font: string,
  fontSize: number
): void {
  doc.font(font).fontSize(fontSize);

  const width = opts.width || 880;
  const lineGap = opts.lineGap || 0;
  const lineHeight = doc.currentLineHeight(true) + lineGap;

  const lines = text.split('\n');
  let curY = y;

  for (let li = 0; li < lines.length; li++) {
    const line = lines[li];
    // PDFKit wraps long lines; estimate the number of wrapped visual lines
    const measured = doc.widthOfString(line, { width });
    const wrappedCount = Math.max(1, Math.ceil(measured / width));
    const blockH = wrappedCount * lineHeight;

    if (curY + blockH > maxY) {
      // Not enough room — render truncated
      const remaining = maxY - curY;
      const fitLines = Math.max(1, Math.floor(remaining / lineHeight));

      // Trim visible text + add ellipsis
      const words = line.split(' ');
      let truncated = '';
      for (const w of words) {
        const candidate = truncated ? truncated + ' ' + w : w;
        const cw = doc.widthOfString(candidate + '…', { width });
        const cLines = Math.max(1, Math.ceil(cw / width));
        if (cLines > fitLines) break;
        truncated = candidate;
      }
      doc.text((truncated || line.substring(0, 40)) + '…', x, curY, {
        width,
        lineGap,
        align: opts.align || 'left',
      });
      return; // stop
    }

    doc.text(line, x, curY, {
      width,
      lineGap,
      align: opts.align || 'left',
      continued: false,
    });
    curY = doc.y;
  }
}

// ─── Service ─────────────────────────────────────────────────────────────────

export class PdfGeneratorService {
  private static readonly MAX_SLIDES = 20;

  /**
   * Generates a PDF buffer from an array of slides
   */
  static async generateCarouselPdf(
    slides: SlideData[],
    themeOrTitle?: CarouselTheme | string,
    title?: string
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        // ── Validate slide count ──────────────────────────────────────
        if (Array.isArray(slides) && slides.length > this.MAX_SLIDES) {
          throw new Error(
            `Carousel cannot exceed ${this.MAX_SLIDES} slides. Received ${slides.length}.`
          );
        }

        // ── Resolve theme ─────────────────────────────────────────────
        let activeTheme: CarouselTheme = {
          primaryColor: '#0284C7',
          backgroundColor: '#F8FAFC',
          textColor: '#0F172A',
          accentColor: '#64748B',
          authorName: 'LinkedPulse AI',
          authorHandle: '@linkedpulse',
        };

        let activeTitle = '';

        if (themeOrTitle) {
          if (typeof themeOrTitle === 'string') {
            activeTitle = themeOrTitle;
          } else {
            activeTheme = {
              primaryColor: themeOrTitle.primaryColor || activeTheme.primaryColor,
              backgroundColor: themeOrTitle.backgroundColor || activeTheme.backgroundColor,
              textColor: themeOrTitle.textColor || activeTheme.textColor,
              accentColor: themeOrTitle.accentColor || activeTheme.accentColor,
              authorName: themeOrTitle.authorName || activeTheme.authorName,
              authorHandle: themeOrTitle.authorHandle || activeTheme.authorHandle,
            };
            if (title) activeTitle = title;
          }
        }

        // ── Create document ───────────────────────────────────────────
        const doc = new PDFDocument({
          size: [1080, 1080],
          margin: 0,
          info: {
            Title: activeTitle || 'LinkedIn Carousel',
            Creator: 'LinkedPulse AI',
          },
        });

        // ── Register fonts ────────────────────────────────────────────
        let regularFont = 'Helvetica';
        let boldFont = 'Helvetica-Bold';
        let italicFont = 'Helvetica-Oblique';

        try {
          let fontDir = path.join(process.cwd(), 'backend', 'src', 'assets', 'fonts');
          if (process.cwd().endsWith('backend')) {
            fontDir = path.join(process.cwd(), 'src', 'assets', 'fonts');
          }
          const regularFontPath = path.join(fontDir, 'Arial.ttf');
          const boldFontPath = path.join(fontDir, 'Arial-Bold.ttf');
          const italicFontPath = path.join(fontDir, 'Arial-Italic.ttf');

          doc.registerFont('CustomFont', regularFontPath);
          doc.registerFont('CustomFont-Bold', boldFontPath);
          doc.registerFont('CustomFont-Italic', italicFontPath);
          regularFont = 'CustomFont';
          boldFont = 'CustomFont-Bold';
          italicFont = 'CustomFont-Italic';
        } catch (fontErr) {
          logger.error('Failed to register custom fonts, falling back to standard Helvetica', fontErr);
        }

        // ── Stream setup ──────────────────────────────────────────────
        const buffers: Buffer[] = [];
        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => {
          const pdfData = Buffer.concat(buffers);
          resolve(pdfData);
        });
        doc.on('error', (err) => {
          reject(err);
        });

        // ── Process slides ────────────────────────────────────────────
        const safeSlides = Array.isArray(slides) ? slides : [];
        const sortedSlides = [...safeSlides].sort(
          (a, b) => (a.slideNumber || 0) - (b.slideNumber || 0)
        );

        sortedSlides.forEach((slide, index) => {
          if (index > 0) {
            doc.addPage();
          }

          // 1. Gradient background (subtle top-to-bottom darken)
          const bgTop = activeTheme.backgroundColor;
          const bgBottom = darken(activeTheme.backgroundColor, 6);
          drawGradientRect(doc, 0, 0, 1080, 1080, bgTop, bgBottom);

          // 2. Progress dots
          this.drawProgressDots(doc, index + 1, sortedSlides.length, activeTheme);

          // 3. Footer (not on cover)
          this.drawFooter(doc, slide, index + 1, sortedSlides.length, activeTheme, regularFont, boldFont);

          // 4. Slide content
          const slideType = slide.type ? slide.type.toLowerCase() : 'content';
          switch (slideType) {
            case 'cover':
              this.drawCoverSlide(doc, slide, activeTheme, regularFont, boldFont);
              break;
            case 'quote':
              this.drawQuoteSlide(doc, slide, activeTheme, regularFont, boldFont, italicFont);
              break;
            case 'cta':
              this.drawCtaSlide(doc, slide, activeTheme, regularFont, boldFont);
              break;
            default:
              this.drawContentSlide(doc, slide, activeTheme, regularFont, boldFont);
          }
        });

        // Fallback for empty slides array
        if (sortedSlides.length === 0) {
          drawGradientRect(doc, 0, 0, 1080, 1080, activeTheme.backgroundColor, darken(activeTheme.backgroundColor, 6));
          doc
            .fontSize(40)
            .fillColor(activeTheme.textColor)
            .font(boldFont)
            .text('No slides generated', 100, 450, { align: 'center', width: 880 });
        }

        doc.end();
      } catch (error) {
        logger.error('Error generating PDF:', error);
        reject(error);
      }
    });
  }

  // ─── Progress Dots (replaces continuous bar) ─────────────────────────────

  private static drawProgressDots(
    doc: PDFKit.PDFDocument,
    current: number,
    total: number,
    theme: CarouselTheme
  ): void {
    if (total <= 1) return;

    const dotRadius = 7;
    const activeDotRadius = 9;
    const spacing = 28;
    const totalWidth = (total - 1) * spacing;
    const startX = (1080 - totalWidth) / 2;
    const y = 46;

    for (let i = 0; i < total; i++) {
      const cx = startX + i * spacing;
      const isCurrent = i + 1 === current;
      const isCompleted = i + 1 < current;
      const r = isCurrent ? activeDotRadius : dotRadius;

      doc.save();
      if (isCompleted || isCurrent) {
        doc.circle(cx, y, r).fillColor(theme.primaryColor).fill();
      } else {
        doc
          .circle(cx, y, r)
          .fillColor(theme.accentColor)
          .fillOpacity(0.2)
          .fill();
      }
      doc.restore();
    }
  }

  // ─── Cover Slide ─────────────────────────────────────────────────────────

  private static drawCoverSlide(
    doc: PDFKit.PDFDocument,
    slide: SlideData,
    theme: CarouselTheme,
    regularFont: string,
    boldFont: string
  ): void {
    // Subtle full-page gradient overlay (primary tint)
    drawGradientRect(
      doc,
      0, 0, 1080, 1080,
      lerpColor(theme.backgroundColor, theme.primaryColor, 0.04),
      lerpColor(theme.backgroundColor, theme.primaryColor, 0.10)
    );

    // ── Decorative circles top-right (overlapping, very low opacity) ──
    doc.save();
    doc.circle(920, 120, 220).fillColor(theme.primaryColor).fillOpacity(0.05).fill();
    doc.restore();

    doc.save();
    doc.circle(1000, 200, 160).fillColor(theme.primaryColor).fillOpacity(0.04).fill();
    doc.restore();

    // ── Branded pill badge (author name) ──
    const pillText = theme.authorName.toUpperCase();
    doc.font(boldFont).fontSize(20);
    const pillTextW = doc.widthOfString(pillText, { characterSpacing: 1.5 });
    const pillW = pillTextW + 48;
    const pillH = 46;
    const pillX = 100;
    const pillY = 180;

    doc.save();
    doc.roundedRect(pillX, pillY, pillW, pillH, pillH / 2)
       .fillColor(theme.primaryColor)
       .fill();
    doc.restore();

    doc.fontSize(20)
       .fillColor('#FFFFFF')
       .font(boldFont)
       .text(pillText, pillX + 24, pillY + 13, {
         width: pillW - 48,
         characterSpacing: 1.5,
       });

    // ── Large headline (center area) ──
    const headlineY = 300;
    doc.fontSize(68)
       .fillColor(theme.textColor)
       .font(boldFont);

    clampText(
      doc,
      slide.headline || '',
      100,
      headlineY,
      { width: 880, align: 'left', lineGap: 20 },
      760,
      boldFont,
      68
    );

    // ── "SWIPE LEFT ▶" pill button at bottom ──
    const swipeY = 840;
    const swipeW = 290;
    const swipeH = 58;
    const swipeX = 100;

    doc.save();
    doc.roundedRect(swipeX, swipeY, swipeW, swipeH, swipeH / 2)
       .fillColor(theme.primaryColor)
       .fill();
    doc.restore();

    doc.fontSize(22)
       .fillColor('#FFFFFF')
       .font(boldFont)
       .text('SWIPE LEFT  ▶', swipeX, swipeY + 17, {
         width: swipeW,
         align: 'center',
         characterSpacing: 1,
       });
  }

  // ─── Content Slide ───────────────────────────────────────────────────────

  private static drawContentSlide(
    doc: PDFKit.PDFDocument,
    slide: SlideData,
    theme: CarouselTheme,
    regularFont: string,
    boldFont: string
  ): void {
    // ── Circled step number (top-left) ──
    const circleX = 148;
    const circleY = 130;
    const circleR = 40;

    doc.save();
    doc.circle(circleX, circleY, circleR).fillColor(theme.primaryColor).fill();
    doc.restore();

    const numStr = String(slide.slideNumber || '');
    doc.fontSize(32)
       .fillColor('#FFFFFF')
       .font(boldFont)
       .text(numStr, circleX - 20, circleY - 16, {
         width: 40,
         align: 'center',
       });

    // ── Headline ──
    const headlineY = 200;
    doc.fontSize(46)
       .fillColor(theme.textColor)
       .font(boldFont)
       .text(slide.headline || '', 100, headlineY, {
         width: 880,
         align: 'left',
         lineGap: 10,
       });

    const afterHeadlineY = doc.y;

    // ── Accent underline bar ──
    doc.save();
    doc.roundedRect(100, afterHeadlineY + 16, 80, 7, 3.5)
       .fillColor(theme.primaryColor)
       .fill();
    doc.restore();

    // ── Body text with styled bullets & numbered lists ──
    if (slide.body) {
      const formattedBody = this.formatBodyText(slide.body);
      const bodyY = afterHeadlineY + 50;

      clampText(
        doc,
        formattedBody,
        100,
        bodyY,
        { width: 880, align: 'left', lineGap: 16 },
        890,
        regularFont,
        34
      );
    }
  }

  // ─── Quote Slide ─────────────────────────────────────────────────────────

  private static drawQuoteSlide(
    doc: PDFKit.PDFDocument,
    slide: SlideData,
    theme: CarouselTheme,
    regularFont: string,
    boldFont: string,
    italicFont: string
  ): void {
    // ── Giant decorative quotation mark ──
    doc.save();
    doc.fontSize(420)
       .fillColor(theme.primaryColor)
       .fillOpacity(0.06)
       .font(boldFont)
       .text('\u201C', 60, 40, { lineGap: 0 });
    doc.restore();

    // ── Left vertical accent bar ──
    doc.save();
    doc.roundedRect(100, 280, 8, 400, 4)
       .fillColor(theme.primaryColor)
       .fill();
    doc.restore();

    // ── Quote text ──
    doc.font(italicFont).fontSize(40).fillColor(theme.textColor);
    clampText(
      doc,
      slide.headline || '',
      140,
      310,
      { width: 800, align: 'left', lineGap: 20 },
      750,
      italicFont,
      40
    );

    const quoteEndY = doc.y;

    // ── Attribution ──
    if (slide.body) {
      doc.fontSize(28)
         .fillColor(theme.accentColor)
         .font(boldFont)
         .text(`— ${slide.body}`, 140, quoteEndY + 35, {
           width: 800,
           align: 'left',
         });
    }

    // ── Subtle decorative circle bottom-right ──
    doc.save();
    doc.circle(960, 920, 140)
       .fillColor(theme.primaryColor)
       .fillOpacity(0.04)
       .fill();
    doc.restore();
  }

  // ─── CTA Slide ───────────────────────────────────────────────────────────

  private static drawCtaSlide(
    doc: PDFKit.PDFDocument,
    slide: SlideData,
    theme: CarouselTheme,
    regularFont: string,
    boldFont: string
  ): void {
    const cardX = 80;
    const cardY = 160;
    const cardW = 920;
    const cardH = 680;
    const cardR = 28;

    // ── Card shadow ──
    doc.save();
    doc.roundedRect(cardX + 6, cardY + 8, cardW, cardH, cardR)
       .fillColor('#000000')
       .fillOpacity(0.18)
       .fill();
    doc.restore();

    // ── Gradient-filled card (primary → darker primary) ──
    const gradTop = theme.primaryColor;
    const gradBottom = darken(theme.primaryColor, 22);
    drawGradientRect(doc, cardX, cardY, cardW, cardH, gradTop, gradBottom, cardR);

    // ── Decorative circle inside card ──
    doc.save();
    doc.roundedRect(cardX, cardY, cardW, cardH, cardR).clip();
    doc.circle(cardX + cardW - 80, cardY + 100, 200)
       .fillColor('#FFFFFF')
       .fillOpacity(0.06)
       .fill();
    doc.restore();

    // ── Headline ──
    doc.fontSize(52)
       .fillColor('#FFFFFF')
       .font(boldFont)
       .text(slide.headline || '', cardX + 60, cardY + 100, {
         width: cardW - 120,
         align: 'center',
         lineGap: 14,
       });

    const headY = doc.y;

    // ── White divider line (50% opacity) ──
    const dividerW = 120;
    const dividerX = cardX + (cardW - dividerW) / 2;
    doc.save();
    doc.rect(dividerX, headY + 28, dividerW, 3)
       .fillColor('#FFFFFF')
       .fillOpacity(0.5)
       .fill();
    doc.restore();

    // ── Body text ──
    if (slide.body) {
      const formattedBody = this.formatBodyText(slide.body);
      doc.fontSize(34)
         .fillColor('#FFFFFF')
         .font(regularFont)
         .text(formattedBody, cardX + 60, headY + 68, {
           width: cardW - 120,
           align: 'center',
           lineGap: 12,
         });
    }

    // ── Author handle (letter-spaced, bottom of card) ──
    const handleY = cardY + cardH - 68;
    doc.fontSize(20)
       .fillColor('#FFFFFF')
       .fillOpacity(0.8)
       .font(boldFont)
       .text(theme.authorHandle.toUpperCase(), cardX + 60, handleY, {
         width: cardW - 120,
         align: 'center',
         characterSpacing: 3,
       });
    // Reset opacity
    doc.fillOpacity(1);
  }

  // ─── Footer ──────────────────────────────────────────────────────────────

  private static drawFooter(
    doc: PDFKit.PDFDocument,
    slide: SlideData,
    current: number,
    total: number,
    theme: CarouselTheme,
    regularFont: string,
    boldFont: string
  ): void {
    // No footer on cover slides
    if (slide.type === 'cover') return;

    // Thin separator line at Y=940
    doc.save();
    doc.rect(100, 940, 880, 1)
       .fillColor(theme.accentColor)
       .fillOpacity(0.2)
       .fill();
    doc.restore();

    // Author handle (left-aligned, accent color)
    doc.fontSize(22)
       .fillColor(theme.accentColor)
       .font(boldFont)
       .text(theme.authorHandle, 100, 960, { align: 'left', width: 440 });

    // Page counter (right-aligned)
    const pageText = `${current.toString().padStart(2, '0')} / ${total.toString().padStart(2, '0')}`;
    doc.fontSize(22)
       .fillColor(theme.accentColor)
       .font(regularFont)
       .text(pageText, 540, 960, { align: 'right', width: 440 });
  }

  // ─── Body Text Formatter ─────────────────────────────────────────────────

  private static formatBodyText(text: any): string {
    if (!text) return '';

    let strText = '';
    if (Array.isArray(text)) {
      strText = text
        .map((item) => (typeof item === 'string' ? item : JSON.stringify(item)))
        .join('\n');
    } else if (typeof text === 'object') {
      strText = text.body || text.text || text.content || JSON.stringify(text);
    } else {
      strText = String(text);
    }

    // Normalise double newlines → single newline (spacing handled by lineGap)
    strText = strText.replace(/\n{2,}/g, '\n');

    return strText
      .split('\n')
      .map((line) => {
        const trimmed = line.trim();

        // Markdown bullets: * or -
        if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
          return `    ▸  ${trimmed.substring(2)}`;
        }
        if (trimmed.startsWith('*') || trimmed.startsWith('-')) {
          return `    ▸  ${trimmed.substring(1).trim()}`;
        }

        // Numbered lists: "1. ", "2. ", …
        const numberedMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
        if (numberedMatch) {
          const num = numberedMatch[1];
          const rest = numberedMatch[2];
          return `    ${num}.  ${rest}`;
        }

        return line;
      })
      .join('\n');
  }
}
