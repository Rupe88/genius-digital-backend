'use client';

import React, { useRef, useEffect, useState } from 'react';

// Import Quill CSS statically - Next.js handles this
import 'quill/dist/quill.snow.css';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  error?: string;
  helperText?: string;
}

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  placeholder = 'Enter description...',
  className = '',
  error,
  helperText,
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const quillRef = useRef<any>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    if (!mounted || !editorRef.current || quillRef.current) return;

    // Dynamically import Quill only on client side
    import('quill').then((QuillModule) => {
      const Quill = QuillModule.default;

      const toolbarOptions = [
        [{ header: [1, 2, 3, false] }],
        ['bold', 'italic', 'underline', 'strike'],
        [{ list: 'ordered' }, { list: 'bullet' }],
        [{ indent: '-1' }, { indent: '+1' }],
        [{ color: [] }, { background: [] }],
        ['link', 'image', 'video'],
        ['clean'],
      ];

      const quill = new Quill(editorRef.current!, {
        theme: 'snow',
        placeholder,
        modules: {
          toolbar: toolbarOptions,
        },
      });

      // Set initial content
      if (value) {
        quill.root.innerHTML = value;
      }

      // Handle content changes
      quill.on('text-change', () => {
        const html = quill.root.innerHTML;
        onChangeRef.current(html);
      });

      quillRef.current = quill;
    });

    return () => {
      if (quillRef.current) {
        quillRef.current = null;
      }
    };
  }, [mounted, placeholder]);

  // Update Quill content when value prop changes (but not from user input)
  useEffect(() => {
    if (quillRef.current && value !== quillRef.current.root.innerHTML) {
      const selection = quillRef.current.getSelection();
      quillRef.current.root.innerHTML = value || '';
      if (selection) {
        quillRef.current.setSelection(selection);
      }
    }
  }, [value]);

  if (!mounted) {
    return (
      <div className={className}>
        <div className="h-[300px] border border-[var(--border)] rounded-lg p-4 bg-[var(--muted)] animate-pulse flex items-center justify-center">
          <span className="text-[var(--muted-foreground)]">Loading editor...</span>
        </div>
        {error && (
          <p className="text-sm text-[var(--error)] mt-1">{error}</p>
        )}
        {helperText && !error && (
          <p className="text-sm text-[var(--muted-foreground)] mt-1">{helperText}</p>
        )}
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="rich-text-editor-wrapper">
        <div ref={editorRef} />
        <style jsx global>{`
          .rich-text-editor-wrapper .ql-toolbar {
            border: 1px solid var(--border);
            border-radius: 0.5rem 0.5rem 0 0;
            background: var(--muted);
          }
          .rich-text-editor-wrapper .ql-container {
            border: 1px solid var(--border);
            border-top: none;
            border-radius: 0 0 0.5rem 0.5rem;
            min-height: 200px;
            background: var(--background);
            color: var(--foreground);
          }
          .rich-text-editor-wrapper .ql-editor {
            min-height: 200px;
            color: var(--foreground);
          }
          .rich-text-editor-wrapper .ql-editor.ql-blank::before {
            color: var(--muted-foreground);
            font-style: normal;
          }
          .rich-text-editor-wrapper .ql-stroke {
            stroke: var(--foreground);
          }
          .rich-text-editor-wrapper .ql-fill {
            fill: var(--foreground);
          }
          .rich-text-editor-wrapper .ql-picker-label {
            color: var(--foreground);
          }
          .rich-text-editor-wrapper .ql-active {
            color: var(--primary-700);
          }
          .rich-text-editor-wrapper .ql-picker-options {
            background: var(--background);
            border: 1px solid var(--border);
          }
          .rich-text-editor-wrapper .ql-toolbar button:hover,
          .rich-text-editor-wrapper .ql-toolbar button:focus,
          .rich-text-editor-wrapper .ql-toolbar button.ql-active {
            color: var(--primary-700);
          }
        `}</style>
      </div>
      {error && (
        <p className="text-sm text-[var(--error)] mt-1">{error}</p>
      )}
      {helperText && !error && (
        <p className="text-sm text-[var(--muted-foreground)] mt-1">{helperText}</p>
      )}
    </div>
  );
};

