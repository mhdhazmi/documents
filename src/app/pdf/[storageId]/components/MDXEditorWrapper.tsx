import dynamic from 'next/dynamic'

// Dynamically import MDXEditor to avoid SSR issues
const MDXEditorComponent = dynamic(
  () => import('@mdxeditor/editor').then((mod) => {
    const { MDXEditor } = mod
    return function MDXEditorWrapper({ markdown, onChange }: { markdown: string, onChange: (markdown: string) => void }) {
      return (
        <MDXEditor 
          markdown={markdown}
          onChange={onChange}
          contentEditableClassName="prose max-w-full text-black bg-white/90 p-3 rounded-lg border border-emerald-800/20 min-h-[200px] max-h-[300px] overflow-y-auto shadow-inner"
        />
      )
    }
  }),
  { ssr: false }
)

interface MDXEditorWrapperProps {
  markdown: string;
  onChange: (markdown: string) => void;
}

// This wrapper component is needed to handle the dynamic import
const MDXEditorWrapper = ({ markdown, onChange }: MDXEditorWrapperProps) => {
  return <MDXEditorComponent markdown={markdown} onChange={onChange} />
}

export default MDXEditorWrapper 