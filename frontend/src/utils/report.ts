import type { SuccessResponse } from '../types/api';

type AnalysisData = SuccessResponse['data'];

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function capitalize(s?: string): string {
  if (!s) return '';
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function formatReportAsText(data: AnalysisData): string {
  const lines: string[] = [];

  lines.push('SOCIAL MEDIA CONTENT ANALYSIS');
  lines.push('═'.repeat(40));
  lines.push('');

  lines.push(`Platform: ${capitalize(data.platform)}`);
  lines.push(`Post URL: ${data.canonicalPostUrl}`);
  lines.push(`Media Type: ${data.mediaType}`);
  lines.push('');

  if (data.publicContext.authorLabel) {
    lines.push(`Author: ${data.publicContext.authorLabel}`);
  }
  if (data.publicContext.caption) {
    lines.push(`Caption: ${data.publicContext.caption}`);
  }
  lines.push('');

  const img = data.image;
  if (img) {
    lines.push('IMAGE METADATA');
    lines.push(`  Type: ${img.contentType}`);
    if (img.width > 0 && img.height > 0) {
      lines.push(`  Dimensions: ${img.width} × ${img.height}`);
    }
    lines.push(`  Size: ${formatBytes(img.bytes)}`);
    lines.push('');
  }

  lines.push('SUMMARY');
  lines.push(data.analysis.summary);
  lines.push('');

  lines.push('WHAT WORKS');
  for (const s of data.analysis.visual_strengths) {
    lines.push(`  • ${s}`);
  }
  lines.push('');

  lines.push('WHAT TO IMPROVE');
  for (const o of data.analysis.improvement_opportunities) {
    lines.push(`  • ${o}`);
  }
  lines.push('');

  const acc = data.analysis.accessibility;
  lines.push('ACCESSIBILITY');
  lines.push(`  Alt Text: ${acc.alt_text}`);
  lines.push(`  Readability: ${capitalize(acc.readability.replace('_', ' '))}`);
  lines.push(`  Contrast: ${acc.contrast_observation}`);
  lines.push(`  Text Density: ${acc.text_density_observation}`);
  lines.push('');

  lines.push('CAPTION SUGGESTION');
  lines.push(data.analysis.caption_recommendation);
  lines.push('');

  lines.push('SUGGESTED CALL TO ACTION');
  lines.push(data.analysis.call_to_action);
  lines.push('');

  lines.push(`CONFIDENCE: ${capitalize(data.analysis.confidence)}`);
  lines.push('');

  if (data.analysis.limitations.length > 0) {
    lines.push('LIMITATIONS');
    for (const l of data.analysis.limitations) {
      lines.push(`  • ${l}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}
