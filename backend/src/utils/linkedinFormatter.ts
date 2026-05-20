export interface AuditCheck {
  label: string;
  passed: boolean;
  message: string;
}

export interface FormatAuditResult {
  score: number;
  checks: AuditCheck[];
}

export class LinkedInFormatter {
  /**
   * Collapse triple empty lines to double empty lines (keeps clean breathing room without spam spacing)
   */
  static cleanLineBreaks(body: string): string {
    if (!body) return '';
    // Replace 3 or more consecutive newlines with exactly 2 newlines (1 empty line)
    return body.replace(/\n{3,}/g, '\n\n');
  }

  /**
   * Run algorithm compliance and B2B audit checks on the content
   */
  static auditPost(body: string, contentType: string, firstComment?: string): FormatAuditResult {
    const checks: AuditCheck[] = [];
    const lowerBody = (body || '').toLowerCase();

    // 1. Link in body check (reach penalty)
    const hasLinkInBody = /(https?:\/\/[^\s]+)/g.test(body);
    checks.push({
      label: 'No Links in Body',
      passed: !hasLinkInBody,
      message: !hasLinkInBody 
        ? 'Passed: Links are kept in the first comment (maintains ~40% higher reach).' 
        : 'Warning: Links in the body prompt the algorithm to reduce reach. Move URLs to the first comment.'
    });

    // 2. Hashtag quota check (3-5 tags optimal)
    const hashtagCount = (body.match(/#[a-zA-Z0-9_]+/g) || []).length;
    let hashtagPassed = false;
    let hashtagMsg = '';
    
    if (contentType === 'article') {
      hashtagPassed = hashtagCount <= 3;
      hashtagMsg = hashtagPassed
        ? `Passed: Article contains ${hashtagCount} hashtags (optimal: 0-3).`
        : `Warning: Article contains ${hashtagCount} hashtags (optimal: 0-3).`;
    } else {
      hashtagPassed = hashtagCount >= 3 && hashtagCount <= 5;
      hashtagMsg = hashtagPassed
        ? `Passed: Post contains ${hashtagCount} hashtags (optimal: 3-5).`
        : `Warning: Post contains ${hashtagCount} hashtags (optimal: 3-5). Currently: ${hashtagCount}.`;
    }
    checks.push({
      label: 'Hashtag Optimization',
      passed: hashtagPassed,
      message: hashtagMsg
    });

    // 3. Dense Paragraphs check (Max 3 lines before newline)
    const paragraphs = body.split('\n').map(p => p.trim()).filter(Boolean);
    let denseParagraphCount = 0;
    paragraphs.forEach(p => {
      // Estimate lines (roughly 80 chars per line)
      if (p.length > 240) {
        denseParagraphCount++;
      }
    });
    checks.push({
      label: 'Readability & Spacing',
      passed: denseParagraphCount === 0,
      message: denseParagraphCount === 0
        ? 'Passed: All paragraphs are short and easy to read (max 3 lines on mobile).'
        : `Warning: Found ${denseParagraphCount} paragraphs that are too dense. Add line breaks to improve mobile reading.`
    });

    // 4. Hook window check (First 210 characters should be engaging)
    const firstParagraph = paragraphs[0] || '';
    const hookPassed = firstParagraph.length > 0 && firstParagraph.length <= 210;
    checks.push({
      label: 'Hook Density',
      passed: hookPassed,
      message: hookPassed
        ? 'Passed: Hook is concise and visible above the fold.'
        : 'Warning: First paragraph is too long or missing. Keep it under 210 characters so users don\'t have to click "See more" immediately.'
    });

    // 5. CTA presence check
    const hasCta = lowerBody.includes('comment') || 
                   lowerBody.includes('agree') || 
                   lowerBody.includes('thoughts') || 
                   lowerBody.includes('link') || 
                   lowerBody.includes('vote') ||
                   lowerBody.includes('below') ||
                   lowerBody.includes('read') ||
                   lowerBody.includes('pdf');
    checks.push({
      label: 'Call to Action (CTA)',
      passed: hasCta,
      message: hasCta
        ? 'Passed: Clear Call to Action detected at the end.'
        : 'Warning: No clear call to action detected. Add a question or link prompt at the end to drive engagement.'
    });

    // Calculate score (out of 100)
    const passedCount = checks.filter(c => c.passed).length;
    const score = Math.round((passedCount / checks.length) * 100);

    return {
      score,
      checks
    };
  }
}
