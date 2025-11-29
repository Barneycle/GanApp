import { Dimensions } from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

/**
 * Decodes HTML entities in a string
 */
export const decodeHtml = (value: string | null | undefined): string => {
  if (!value) return '';
  return value
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&copy;/g, '©')
    .replace(/&reg;/g, '®');
};

/**
 * Strips HTML tags from a string, leaving only text content
 */
export const stripHtmlTags = (html: string | null | undefined): string => {
  if (!html) return '';
  return decodeHtml(html).replace(/<[^>]*>/g, '').trim();
};

/**
 * Gets the content width for RenderHTML, accounting for padding
 */
export const getHtmlContentWidth = (padding: number = 32): number => {
  return SCREEN_WIDTH - (padding * 2);
};

/**
 * Default RenderHTML styles configuration for consistent HTML rendering
 */
export const defaultHtmlStyles = {
  baseStyle: {
    fontSize: 16,
    lineHeight: 24,
    color: '#475569',
    paddingVertical: 0,
    paddingHorizontal: 0,
  },
  tagsStyles: {
    p: {
      marginBottom: 12,
      fontSize: 16,
      lineHeight: 24,
      color: '#475569',
    },
    h1: {
      fontSize: 28,
      fontWeight: 'bold' as const,
      marginBottom: 16,
      marginTop: 8,
      color: '#1e293b',
    },
    h2: {
      fontSize: 24,
      fontWeight: 'bold' as const,
      marginBottom: 14,
      marginTop: 8,
      color: '#1e293b',
    },
    h3: {
      fontSize: 20,
      fontWeight: 'bold' as const,
      marginBottom: 12,
      marginTop: 8,
      color: '#1e293b',
    },
    h4: {
      fontSize: 18,
      fontWeight: '600' as const,
      marginBottom: 10,
      marginTop: 8,
      color: '#1e293b',
    },
    ul: {
      marginBottom: 12,
      paddingLeft: 20,
    },
    ol: {
      marginBottom: 12,
      paddingLeft: 20,
    },
    li: {
      marginBottom: 6,
      fontSize: 16,
      lineHeight: 22,
      color: '#475569',
    },
    strong: {
      fontWeight: 'bold' as const,
      color: '#1e293b',
    },
    b: {
      fontWeight: 'bold' as const,
      color: '#1e293b',
    },
    em: {
      fontStyle: 'italic' as const,
    },
    i: {
      fontStyle: 'italic' as const,
    },
    a: {
      color: '#2563eb',
      textDecorationLine: 'underline' as const,
    },
    blockquote: {
      borderLeftWidth: 4,
      borderLeftColor: '#cbd5e1',
      paddingLeft: 16,
      marginVertical: 12,
      fontStyle: 'italic' as const,
      color: '#64748b',
    },
    code: {
      fontFamily: 'monospace',
      backgroundColor: '#f1f5f9',
      paddingHorizontal: 4,
      paddingVertical: 2,
      borderRadius: 4,
      fontSize: 14,
    },
    pre: {
      backgroundColor: '#f1f5f9',
      padding: 12,
      borderRadius: 8,
      marginVertical: 12,
      overflow: 'hidden',
    },
    br: {
      height: 12,
    },
  },
};

