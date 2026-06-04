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

export class PdfGeneratorService {
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
        let activeTheme: CarouselTheme = {
          primaryColor: '#0284C7',
          backgroundColor: '#F8FAFC',
          textColor: '#0F172A',
          accentColor: '#64748B',
          authorName: 'LinkedPulse AI',
          authorHandle: '@linkedpulse'
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

        // Create a document with 1080x1080 slide dimensions for LinkedIn
        const doc = new PDFDocument({
          size: [1080, 1080],
          margin: 0,
          info: {
            Title: activeTitle || 'LinkedIn Carousel',
            Creator: 'LinkedPulse AI'
          }
        });

        // Register custom fonts to avoid Vercel serverless built-in AFM font loading issues
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

        const buffers: Buffer[] = [];
        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => {
          const pdfData = Buffer.concat(buffers);
          resolve(pdfData);
        });
        doc.on('error', (err) => {
          reject(err);
        });

        const safeSlides = Array.isArray(slides) ? slides : [];

        // Sort slides by number just in case
        const sortedSlides = [...safeSlides].sort((a, b) => (a.slideNumber || 0) - (b.slideNumber || 0));

        sortedSlides.forEach((slide, index) => {
          if (index > 0) {
            doc.addPage();
          }

          // 1. Draw Global Background
          doc.rect(0, 0, 1080, 1080).fill(activeTheme.backgroundColor);

          // 2. Draw Progress Bar (at the top of each slide)
          this.drawProgressBar(doc, index + 1, sortedSlides.length, activeTheme);

          // 3. Draw Global Footer
          this.drawFooter(doc, slide, index + 1, sortedSlides.length, activeTheme, regularFont, boldFont);

          // 4. Render Specific Slide Layouts
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

        // Ensure there is at least one page if slides are empty
        if (sortedSlides.length === 0) {
          doc.rect(0, 0, 1080, 1080).fill(activeTheme.backgroundColor);
          doc.fontSize(40).fillColor(activeTheme.textColor).font(boldFont).text('No slides generated', 100, 450, { align: 'center' });
        }

        // Finalize the PDF and end the stream
        doc.end();
      } catch (error) {
        logger.error('Error generating PDF:', error);
        reject(error);
      }
    });
  }

  private static drawProgressBar(
    doc: PDFKit.PDFDocument,
    current: number,
    total: number,
    theme: CarouselTheme
  ) {
    if (total <= 1) return;
    
    const startX = 100;
    const endX = 980;
    const width = endX - startX;
    const y = 50;
    const height = 6;
    
    // Draw background track (low opacity accent)
    doc.save();
    doc.roundedRect(startX, y, width, height, 3)
       .fillColor(theme.accentColor)
       .fillOpacity(0.15)
       .fill();
    doc.restore();
    
    // Draw active track
    const activeWidth = (current / total) * width;
    doc.save();
    doc.roundedRect(startX, y, activeWidth, height, 3)
       .fillColor(theme.primaryColor)
       .fill();
    doc.restore();
  }

  private static drawCoverSlide(
    doc: PDFKit.PDFDocument,
    slide: SlideData,
    theme: CarouselTheme,
    regularFont: string,
    boldFont: string
  ) {
    // Top-right background design accent (large abstract circle)
    doc.save();
    doc.circle(950, 150, 300)
       .fillColor(theme.primaryColor)
       .fillOpacity(0.08)
       .fill();
    doc.restore();

    // Bottom-left background design accent (smaller circle)
    doc.save();
    doc.circle(100, 950, 200)
       .fillColor(theme.primaryColor)
       .fillOpacity(0.04)
       .fill();
    doc.restore();

    // Left decorative brand bar
    doc.save();
    doc.roundedRect(100, 220, 16, 120, 8)
       .fillColor(theme.primaryColor)
       .fill();
    doc.restore();

    // Author brand label at top
    doc.fontSize(24)
       .fillColor(theme.primaryColor)
       .font(boldFont)
       .text(theme.authorName.toUpperCase(), 130, 225, { characterSpacing: 1.5 });
       
    doc.fontSize(20)
       .fillColor(theme.accentColor)
       .font(regularFont)
       .text(theme.authorHandle, 130, 255);

    // Title text
    doc.fontSize(72)
       .fillColor(theme.textColor)
       .font(boldFont)
       .text(slide.headline || '', 100, 390, {
         width: 880,
         align: 'left',
         lineGap: 18
       });

    // Swipe prompt at bottom
    const yPosition = Math.max(doc.y + 60, 750);
    
    doc.save();
    doc.roundedRect(100, yPosition, 260, 56, 12)
       .fillColor(theme.primaryColor)
       .fill();
       
    doc.fontSize(22)
       .fillColor('#FFFFFF')
       .font(boldFont)
       .text('SWIPE LEFT  ▶', 100, yPosition + 17, {
         width: 260,
         align: 'center',
         characterSpacing: 1
       });
    doc.restore();
  }

  private static formatBodyText(text: any): string {
    if (!text) return '';
    
    let strText = '';
    if (Array.isArray(text)) {
      strText = text.map(item => typeof item === 'string' ? item : JSON.stringify(item)).join('\n');
    } else if (typeof text === 'object') {
      strText = text.body || text.text || text.content || JSON.stringify(text);
    } else {
      strText = String(text);
    }

    return strText.split('\n').map(line => {
      const trimmed = line.trim();
      if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
        return `•  ${trimmed.substring(2)}`;
      } else if (trimmed.startsWith('*') || trimmed.startsWith('-')) {
        return `•  ${trimmed.substring(1)}`;
      }
      return line;
    }).join('\n');
  }

  private static drawContentSlide(
    doc: PDFKit.PDFDocument,
    slide: SlideData,
    theme: CarouselTheme,
    regularFont: string,
    boldFont: string
  ) {
    // Subtle background circle accent
    doc.save();
    doc.circle(980, 540, 150)
       .fillColor(theme.primaryColor)
       .fillOpacity(0.03)
       .fill();
    doc.restore();

    // Small category/context tag at top
    doc.fontSize(18)
       .fillColor(theme.primaryColor)
       .font(boldFont)
       .text(theme.authorName.toUpperCase(), 100, 110, { characterSpacing: 1 });

    // Title
    doc.fontSize(50)
       .fillColor(theme.textColor)
       .font(boldFont)
       .text(slide.headline || '', 100, 140, {
         width: 880,
         align: 'left',
         lineGap: 10
       });

    const currentY = doc.y;

    // Accent line below title
    doc.save();
    doc.roundedRect(100, currentY + 25, 80, 6, 3)
       .fillColor(theme.primaryColor)
       .fill();
    doc.restore();

    // Body
    if (slide.body) {
      const formattedBody = this.formatBodyText(slide.body);
      doc.fontSize(34)
         .fillColor(theme.textColor)
         .font(regularFont)
         .text(formattedBody, 100, currentY + 65, {
           width: 880,
           align: 'left',
           lineGap: 16
         });
    }
  }

  private static drawQuoteSlide(
    doc: PDFKit.PDFDocument,
    slide: SlideData,
    theme: CarouselTheme,
    regularFont: string,
    boldFont: string,
    italicFont: string
  ) {
    // Giant quotation mark in background
    doc.save();
    doc.fontSize(320)
       .fillColor(theme.primaryColor)
       .fillOpacity(0.08)
       .font(boldFont)
       .text('“', 80, 100, { lineGap: 0 });
    doc.restore();

    // Left vertical border accent for quotes
    doc.save();
    doc.roundedRect(100, 280, 8, 400, 4)
       .fillColor(theme.primaryColor)
       .fill();
    doc.restore();

    // Quote text (using headline)
    doc.fontSize(42)
       .fillColor(theme.textColor)
       .font(italicFont)
       .text(slide.headline || '', 140, 310, {
         width: 800,
         align: 'left',
         lineGap: 18
       });

    const quoteEndY = doc.y;

    // Quote Author (using body)
    if (slide.body) {
      doc.fontSize(30)
         .fillColor(theme.accentColor)
         .font(boldFont)
         .text(`— ${slide.body}`, 140, quoteEndY + 35, {
           width: 800,
           align: 'left'
         });
    }
  }

  private static drawCtaSlide(
    doc: PDFKit.PDFDocument,
    slide: SlideData,
    theme: CarouselTheme,
    regularFont: string,
    boldFont: string
  ) {
    // 1. Draw card shadow (offset dark rectangle)
    doc.save();
    doc.roundedRect(104, 204, 880, 620, 24)
       .fillColor('#000000')
       .fillOpacity(0.15)
       .fill();
    doc.restore();

    // 2. Draw card background using primary color
    doc.save();
    doc.roundedRect(100, 200, 880, 620, 24)
       .fillColor(theme.primaryColor)
       .fill();
    doc.restore();

    // Decorative circle inside card
    doc.save();
    doc.circle(850, 300, 180)
       .fillColor('#FFFFFF')
       .fillOpacity(0.05)
       .fill();
    doc.restore();

    // Title inside card
    doc.fontSize(56)
       .fillColor('#FFFFFF')
       .font(boldFont)
       .text(slide.headline || '', 150, 290, {
         width: 780,
         align: 'center',
         lineGap: 14
       });

    const ctaY = doc.y;

    // Divider inside card
    doc.save();
    doc.rect(490, ctaY + 30, 100, 4).fillColor('#FFFFFF').fillOpacity(0.5).fill();
    doc.restore();

    // Body inside card
    if (slide.body) {
      const formattedBody = this.formatBodyText(slide.body);
      doc.fontSize(36)
         .fillColor('#FFFFFF')
         .font(regularFont)
         .text(formattedBody, 150, ctaY + 70, {
           width: 780,
           align: 'center',
           lineGap: 12
         });
    }
    
    // Bottom Handle Banner
    doc.fontSize(22)
       .fillColor('#FFFFFF')
       .font(boldFont)
       .text(theme.authorHandle.toUpperCase(), 150, 740, {
         width: 780,
         align: 'center',
         characterSpacing: 1.5
       });
  }

  private static drawFooter(
    doc: PDFKit.PDFDocument,
    slide: SlideData,
    current: number,
    total: number,
    theme: CarouselTheme,
    regularFont: string,
    boldFont: string
  ) {
    // Suppress footer on cover
    if (slide.type === 'cover') return;

    // Small footer separator line (subtle)
    doc.save();
    doc.rect(100, 940, 880, 1)
       .fillColor(theme.accentColor)
       .fillOpacity(0.2)
       .fill();
    doc.restore();

    // Author Name & Handle (left-aligned)
    doc.fontSize(22)
       .fillColor(theme.accentColor)
       .font(boldFont)
       .text(theme.authorHandle, 100, 965, { align: 'left' });

    // Page count (right-aligned)
    const pageText = `${current.toString().padStart(2, '0')} / ${total.toString().padStart(2, '0')}`;
    doc.fontSize(22)
       .fillColor(theme.accentColor)
       .font(regularFont)
       .text(pageText, 880, 965, { align: 'right' });
  }
}
