'use client';

import React, { useEffect, useRef } from 'react';
import Quill from 'quill';
import 'quill/dist/quill.snow.css';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export default function RichTextEditor({ value, onChange, placeholder }: RichTextEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const quillRef = useRef<Quill | null>(null);
  const isInternalChange = useRef(false);

  useEffect(() => {
    if (containerRef.current && !quillRef.current) {
      const editor = new Quill(containerRef.current, {
        theme: 'snow',
        placeholder: placeholder || 'Write something amazing...',
        modules: {
          toolbar: [
            [{ header: [1, 2, 3, 4, 5, 6, false] }],
            ['bold', 'italic', 'underline', 'strike'],
            [{ color: [] }, { background: [] }],
            [{ list: 'ordered' }, { list: 'bullet' }, { align: [] }],
            ['link', 'image', 'video'],
            ['clean'],
          ],
        },
      });

      editor.on('text-change', () => {
        isInternalChange.current = true;
        onChange(editor.root.innerHTML);
        setTimeout(() => { isInternalChange.current = false; }, 0);
      });

      quillRef.current = editor;
    }
  }, [placeholder, onChange]);

  useEffect(() => {
    if (quillRef.current) {
      const currentContent = quillRef.current.root.innerHTML;
      // Only update if the content is truly different and NOT triggered by our own typing
      if (currentContent !== value && !isInternalChange.current) {
        quillRef.current.root.innerHTML = value || '';
      }
    }
  }, [value]);

  return (
    <div className="rich-text-editor">
      <div ref={containerRef} className="h-64 sm:h-80 bg-white" />
      <style jsx global>{`
        .ql-container {
          font-family: inherit;
          font-size: 1rem;
        }
        .ql-editor {
          min-height: 16rem;
        }
      `}</style>
    </div>
  );
}
