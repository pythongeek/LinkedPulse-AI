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

          // 2. Draw Global Footer
          this.drawFooter(doc, slide, index + 1, sortedSlides.length, activeTheme, regularFont, boldFont);

          // 3. Render Specific Slide Layouts
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

  private static drawCoverSlide(
    doc: PDFKit.PDFDocument,
    slide: SlideData,
    theme: CarouselTheme,
    regularFont: string,
    boldFont: string
  ) {
    // Large accent block on left
    doc.rect(100, 250, 150, 15).fill(theme.primaryColor);

    // Title text
    doc.fontSize(75)
       .fillColor(theme.textColor)
       .font(boldFont)
       .text(slide.headline || '', 100, 320, {
         width: 880,
         align: 'left',
         lineGap: 20
       });
  }

  private static formatBodyText(text: string): string {
    if (!text) return '';
    return text.split('\n').map(line => {
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
    // Title
    doc.fontSize(52)
       .fillColor(theme.textColor)
       .font(boldFont)
       .text(slide.headline || '', 100, 150, {
         width: 880,
         align: 'left',
         lineGap: 10
       });

    const currentY = doc.y;

    // Accent line below title
    doc.rect(100, currentY + 20, 120, 8).fill(theme.primaryColor);

    // Body
    if (slide.body) {
      const formattedBody = this.formatBodyText(slide.body);
      doc.fontSize(36)
         .fillColor(theme.textColor)
         .font(regularFont)
         .text(formattedBody, 100, currentY + 60, {
           width: 880,
           align: 'left',
           lineGap: 14
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
    // Large Quotation Mark
    doc.fontSize(180)
       .fillColor(theme.primaryColor)
       .font(boldFont)
       .text('“', 100, 80, { lineGap: 0 });

    const quoteY = doc.y;

    // Quote text (using headline)
    doc.fontSize(44)
       .fillColor(theme.textColor)
       .font(italicFont)
       .text(slide.headline || '', 120, quoteY + 20, {
         width: 840,
         align: 'left',
         lineGap: 16
       });

    // Quote Author (using body)
    if (slide.body) {
      doc.fontSize(32)
         .fillColor(theme.accentColor)
         .font(boldFont)
         .text(`— ${slide.body}`, 120, doc.y + 35, {
           width: 840,
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
    // Center Card background using primary color
    doc.roundedRect(100, 200, 880, 620, 24).fill(theme.primaryColor);

    // Title inside card
    doc.fontSize(58)
       .fillColor('#FFFFFF')
       .font(boldFont)
       .text(slide.headline || '', 150, 280, {
         width: 780,
         align: 'center',
         lineGap: 15
       });

    const ctaY = doc.y;

    // Divider inside card
    doc.rect(490, ctaY + 30, 100, 4).fill('#FFFFFF');

    // Body inside card
    if (slide.body) {
      const formattedBody = this.formatBodyText(slide.body);
      doc.fontSize(38)
         .fillColor('#FFFFFF')
         .font(regularFont)
         .text(formattedBody, 150, ctaY + 70, {
           width: 780,
           align: 'center',
           lineGap: 12
         });
    }
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

    // Small footer separator line
    doc.rect(100, 940, 880, 2).fill(theme.accentColor);

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
