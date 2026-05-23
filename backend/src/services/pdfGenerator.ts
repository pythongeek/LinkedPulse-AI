import PDFDocument from 'pdfkit';
import { logger } from '../utils/logger';

export interface SlideData {
  slideNumber: number;
  type?: string;
  headline: string;
  body?: string;
}

export class PdfGeneratorService {
  /**
   * Generates a PDF buffer from an array of slides
   */
  static async generateCarouselPdf(slides: SlideData[], title?: string): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        // Create a document with slide-like dimensions (e.g., 1080x1080 equivalent in PDF points or standard presentation size)
        // Let's use a standard 4:3 presentation size (e.g., 800 x 600) or square (800 x 800) for LinkedIn carousels
        const doc = new PDFDocument({
          size: [800, 800],
          margin: 50,
          info: {
            Title: title || 'LinkedIn Carousel',
            Creator: 'LinkedPulse AI'
          }
        });

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

          // Background (Light grayish blue for professional look)
          doc.rect(0, 0, 800, 800).fill('#F8FAFC');

          // Add a subtle top accent bar
          doc.rect(0, 0, 800, 20).fill('#0284C7');

          // Slide type badge if it's special (like cover or cta)
          if (slide.type && ['cover', 'cta'].includes(slide.type.toLowerCase())) {
            doc.fontSize(16)
               .fillColor('#0284C7')
               .text(slide.type.toUpperCase(), 50, 60, { align: 'right' });
          }

          // Move down and draw Headline
          doc.moveDown(3);
          
          doc.fontSize(48)
             .fillColor('#0F172A')
             .font('Helvetica-Bold')
             .text(slide.headline || '', {
               align: 'center',
               width: 700
             });

          // Move down and draw Body
          if (slide.body) {
            doc.moveDown(1.5);
            doc.fontSize(28)
               .fillColor('#334155')
               .font('Helvetica')
               .text(slide.body, {
                 align: 'center',
                 width: 700,
                 lineGap: 10
               });
          }
          
          // Add a footer with slide number
          const footerText = `${index + 1} / ${sortedSlides.length}`;
          
          // Draw footer text at the bottom
          doc.fontSize(16)
             .fillColor('#94A3B8')
             .text(footerText, 50, 750, { align: 'center' });
        });

        // Ensure there is at least one page if slides are empty
        if (sortedSlides.length === 0) {
          doc.rect(0, 0, 800, 800).fill('#F8FAFC');
          doc.fontSize(40).fillColor('#0F172A').text('No slides generated', 50, 350, { align: 'center' });
        }

        // Finalize the PDF and end the stream
        doc.end();
      } catch (error) {
        logger.error('Error generating PDF:', error);
        reject(error);
      }
    });
  }
}
