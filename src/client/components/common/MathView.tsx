import React, { useMemo } from 'react';
import katex from 'katex';

interface MathViewProps {
  text: string;
  className?: string;
  displayMode?: boolean;
}

interface TextChunk {
  type: 'text' | 'inline-math' | 'display-math';
  content: string;
}

/**
 * Splits text into text chunks and LaTeX math expressions.
 * Accurately parses:
 * - Display math: \[...\] or $$...$$
 * - Inline math: \(...\) or $...$
 * Protects against accidental currency parsing ($10, $5.50, lonely $ signs).
 */
function parseMathChunks(input: string): TextChunk[] {
  if (!input) return [];

  const chunks: TextChunk[] = [];
  // Regex to match math delimiters:
  // Group 1: \[ ... \] (display)
  // Group 2: $$ ... $$ (display)
  // Group 3: \( ... \) (inline)
  // Group 4: $ ... $ (inline - must start and end with non-whitespace, not preceded/followed by digits like currency $10)
  const mathRegex = /(?:\\\[([\s\S]*?)\\\])|(?:\$\$([\s\S]*?)\$\$)|(?:\\\(([\s\S]*?)\\\))|(?:\$([^\$\s](?:[^\$]*?[^\$\s])?)\$)/g;

  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = mathRegex.exec(input)) !== null) {
    const matchIndex = match.index;

    // Plain text before this math match
    if (matchIndex > lastIndex) {
      chunks.push({
        type: 'text',
        content: input.slice(lastIndex, matchIndex)
      });
    }

    if (match[1] !== undefined) {
      // \[ ... \]
      chunks.push({ type: 'display-math', content: match[1] });
    } else if (match[2] !== undefined) {
      // $$ ... $$
      chunks.push({ type: 'display-math', content: match[2] });
    } else if (match[3] !== undefined) {
      // \( ... \)
      chunks.push({ type: 'inline-math', content: match[3] });
    } else if (match[4] !== undefined) {
      // $ ... $
      // Check if it's potentially currency (e.g., $10 or $25.00 without any latex symbols)
      const inner = match[4].trim();
      const isPlainCurrency = /^\d+(?:\.\d+)?$/.test(inner);
      if (isPlainCurrency) {
        chunks.push({ type: 'text', content: match[0] });
      } else {
        chunks.push({ type: 'inline-math', content: inner });
      }
    }

    lastIndex = matchIndex + match[0].length;
  }

  // Trailing text
  if (lastIndex < input.length) {
    chunks.push({
      type: 'text',
      content: input.slice(lastIndex)
    });
  }

  return chunks;
}

export const MathView: React.FC<MathViewProps> = ({ text, className = '', displayMode = false }) => {
  const renderedChunks = useMemo(() => {
    if (!text) return null;

    if (displayMode) {
      // Entire text treated as a display formula
      try {
        const html = katex.renderToString(text, {
          displayMode: true,
          throwOnError: false,
          trust: false,
          strict: 'warn'
        });
        return (
          <div
            dir="ltr"
            style={{ unicodeBidi: 'isolate' }}
            className="my-2 overflow-x-auto max-w-full text-center py-1"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        );
      } catch {
        return (
          <div dir="ltr" className="font-mono text-sm text-red-600 bg-red-50 p-2 rounded">
            {text}
          </div>
        );
      }
    }

    const chunks = parseMathChunks(text);

    return chunks.map((chunk, idx) => {
      if (chunk.type === 'text') {
        return <span key={idx}>{chunk.content}</span>;
      }

      const isDisplay = chunk.type === 'display-math';
      try {
        const html = katex.renderToString(chunk.content, {
          displayMode: isDisplay,
          throwOnError: false,
          trust: false,
          strict: 'warn'
        });

        if (isDisplay) {
          return (
            <div
              key={idx}
              dir="ltr"
              style={{ unicodeBidi: 'isolate' }}
              className="my-2 overflow-x-auto max-w-full text-center py-1"
              dangerouslySetInnerHTML={{ __html: html }}
            />
          );
        }

        return (
          <span
            key={idx}
            dir="ltr"
            style={{ unicodeBidi: 'isolate' }}
            className="inline-block px-1 align-baseline"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        );
      } catch {
        return (
          <code key={idx} dir="ltr" className="text-red-500 font-mono text-xs px-1 bg-red-50 rounded">
            {chunk.content}
          </code>
        );
      }
    });
  }, [text, displayMode]);

  return <span className={`math-rendered-container ${className}`}>{renderedChunks}</span>;
};

export default MathView;
