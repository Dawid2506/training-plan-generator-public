import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { cn } from "@/lib/utils";

/**
 * Markdown rendering for coach answers.
 *
 * Two security decisions are baked in here, and both are decisions to NOT do
 * something:
 *
 * 1. `rehype-raw` is deliberately absent. Without it react-markdown escapes raw
 *    HTML into text, so `<img src=x onerror=...>` renders as literal characters
 *    rather than an element. Adding that plugin would undo it.
 * 2. Images never render. A Markdown image is a zero-click GET, which makes it
 *    the natural exfiltration channel for an injected instruction - the browser
 *    fetches the URL the moment the message appears. The backend already strips
 *    them before persisting; this is the layer that holds if one ever gets
 *    through, and a CSP in nginx is the layer under that.
 */

/** Only same-origin links stay clickable; everything else renders inert. */
const isSafeHref = (href: string): boolean => {
  if (href.startsWith("/") && !href.startsWith("//")) {
    return true;
  }

  try {
    const url = new URL(href, window.location.origin);
    return url.origin === window.location.origin && url.protocol === "https:";
  } catch {
    return false;
  }
};

export interface MarkdownProps {
  children: string;
  className?: string;
}

export function Markdown({ children, className }: MarkdownProps) {
  return (
    <div
      data-slot="markdown"
      className={cn("text-[13.5px] leading-relaxed", className)}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children: content }) => (
            <p className="mb-2 last:mb-0">{content}</p>
          ),
          ul: ({ children: content }) => (
            <ul className="mb-2 list-disc space-y-1 pl-4 last:mb-0 marker:text-muted-foreground">
              {content}
            </ul>
          ),
          ol: ({ children: content }) => (
            <ol className="mb-2 list-decimal space-y-1 pl-4 last:mb-0 marker:text-muted-foreground">
              {content}
            </ol>
          ),
          h1: ({ children: content }) => (
            <h3 className="mt-3 mb-1.5 text-[14px] font-semibold tracking-[-0.01em] first:mt-0">
              {content}
            </h3>
          ),
          h2: ({ children: content }) => (
            <h3 className="mt-3 mb-1.5 text-[14px] font-semibold tracking-[-0.01em] first:mt-0">
              {content}
            </h3>
          ),
          h3: ({ children: content }) => (
            <h3 className="mt-3 mb-1.5 text-[13.5px] font-semibold tracking-[-0.01em] first:mt-0">
              {content}
            </h3>
          ),
          strong: ({ children: content }) => (
            <strong className="font-semibold">{content}</strong>
          ),
          code: ({ children: content }) => (
            <code className="rounded bg-surface-muted px-1 py-0.5 font-mono text-[12.5px]">
              {content}
            </code>
          ),
          pre: ({ children: content }) => (
            <pre className="mb-2 overflow-x-auto rounded-lg bg-surface-muted p-3 text-[12.5px] last:mb-0">
              {content}
            </pre>
          ),
          // Tables can be wider than the bubble, so they scroll inside it
          // rather than pushing the whole conversation sideways.
          table: ({ children: content }) => (
            <div className="mb-2 overflow-x-auto last:mb-0">
              <table className="w-full border-collapse text-[12.5px]">{content}</table>
            </div>
          ),
          th: ({ children: content }) => (
            <th className="border-b border-border bg-surface-muted px-2 py-1.5 text-left font-medium">
              {content}
            </th>
          ),
          td: ({ children: content }) => (
            <td className="tnum border-b border-border px-2 py-1.5">{content}</td>
          ),
          blockquote: ({ children: content }) => (
            <blockquote className="mb-2 border-l-2 border-border pl-3 text-muted-foreground last:mb-0">
              {content}
            </blockquote>
          ),
          img: () => (
            <span className="text-[12px] text-muted-foreground">[image removed]</span>
          ),
          a: ({ href, children: content }) => {
            if (href && isSafeHref(href)) {
              return (
                <a
                  href={href}
                  className="text-primary underline underline-offset-2"
                  rel="noopener noreferrer nofollow"
                >
                  {content}
                </a>
              );
            }

            // Inert, but still readable: the athlete can see where the coach
            // was pointing without the browser ever touching it.
            return (
              <span className="text-muted-foreground underline decoration-dotted underline-offset-2">
                {content}
              </span>
            );
          },
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
