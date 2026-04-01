"use client";

import ReactMarkdown from "react-markdown";

export function MarkdownContent({ content }: { content: string }) {
  return (
    <ReactMarkdown
      components={{
        p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
        strong: ({ children }) => <strong className="font-semibold text-[#ededed]">{children}</strong>,
        em: ({ children }) => <em className="italic text-[#bbb]">{children}</em>,
        ul: ({ children }) => <ul className="list-disc pl-4 mb-2 space-y-1">{children}</ul>,
        ol: ({ children }) => <ol className="list-decimal pl-4 mb-2 space-y-1">{children}</ol>,
        li: ({ children }) => <li className="text-[#ccc]">{children}</li>,
        h1: ({ children }) => <h1 className="text-[15px] font-bold text-[#ededed] mb-2 mt-3">{children}</h1>,
        h2: ({ children }) => <h2 className="text-[14px] font-bold text-[#ededed] mb-1.5 mt-2">{children}</h2>,
        h3: ({ children }) => <h3 className="text-[13px] font-semibold text-[#ededed] mb-1 mt-2">{children}</h3>,
        code: ({ children, className }) => {
          const isBlock = className?.includes("language-");
          if (isBlock) {
            return (
              <pre className="rounded-md p-3 my-2 overflow-x-auto text-[12px]" style={{ backgroundColor: "#1a1a1a" }}>
                <code className="text-[#3ecf8e]">{children}</code>
              </pre>
            );
          }
          return (
            <code className="text-[12px] px-1 py-0.5 rounded text-[#3ecf8e]" style={{ backgroundColor: "#1a1a1a" }}>
              {children}
            </code>
          );
        },
        blockquote: ({ children }) => (
          <blockquote className="border-l-2 border-[#3ecf8e]/40 pl-3 my-2 text-[#888] italic">{children}</blockquote>
        ),
        hr: () => <hr className="border-[#333] my-3" />,
        a: ({ href, children }) => (
          <a href={href} target="_blank" rel="noopener noreferrer" className="text-[#3ecf8e] underline hover:text-[#5ae0a8]">
            {children}
          </a>
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  );
}
