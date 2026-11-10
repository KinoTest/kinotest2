import Markdown from 'react-markdown'

/** Renders stored Markdown. react-markdown does not render raw HTML, so the text is safe to show. */
export default function MarkdownView({ text }: { text: string }) {
  if (!text.trim()) return null
  return (
    <div className="markdown">
      <Markdown
        components={{
          a: ({ href, children }) => (
            <a href={href} target="_blank" rel="noopener noreferrer">
              {children}
            </a>
          ),
        }}
      >
        {text}
      </Markdown>
    </div>
  )
}
