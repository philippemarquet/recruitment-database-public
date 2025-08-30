import React, { useMemo } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { cn } from '@/lib/utils';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  minHeight?: string;
}

export const RichTextEditor = React.forwardRef<
  ReactQuill,
  RichTextEditorProps
>(({ value, onChange, placeholder, className, disabled, minHeight = "120px" }, ref) => {
  const modules = useMemo(() => ({
    toolbar: [
      [{ 'header': [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      [{ 'color': [] }, { 'background': [] }],
      ['link'],
      ['clean']
    ]
  }), []);

  const formats = [
    'header', 'font', 'size',
    'bold', 'italic', 'underline', 'strike', 'blockquote',
    'list', 'bullet', 'indent',
    'link', 'color', 'background'
  ];

  return (
    <div 
      className={cn(
        "rich-text-editor border border-input rounded-md overflow-hidden",
        "focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2",
        disabled && "opacity-50 cursor-not-allowed",
        className
      )}
      style={{ minHeight }}
    >
      <ReactQuill
        ref={ref}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        modules={modules}
        formats={formats}
        readOnly={disabled}
        theme="snow"
        style={{
          height: minHeight,
        }}
      />
      <style>{`
        .rich-text-editor .ql-container {
          border: none;
          font-size: 14px;
          min-height: calc(${minHeight} - 42px);
        }
        .rich-text-editor .ql-toolbar {
          border: none;
          border-bottom: 1px solid hsl(var(--border));
          padding: 8px;
        }
        .rich-text-editor .ql-editor {
          min-height: calc(${minHeight} - 42px);
          padding: 12px;
          line-height: 1.5;
        }
        .rich-text-editor .ql-editor.ql-blank::before {
          color: hsl(var(--muted-foreground));
          font-style: normal;
        }
        .rich-text-editor .ql-toolbar .ql-stroke {
          fill: none;
          stroke: hsl(var(--foreground));
        }
        .rich-text-editor .ql-toolbar .ql-fill {
          fill: hsl(var(--foreground));
          stroke: none;
        }
        .rich-text-editor .ql-toolbar .ql-picker {
          color: hsl(var(--foreground));
        }
        .rich-text-editor .ql-snow .ql-tooltip {
          background-color: hsl(var(--background));
          border: 1px solid hsl(var(--border));
          color: hsl(var(--foreground));
        }
        .rich-text-editor .ql-snow .ql-tooltip input[type=text] {
          background-color: hsl(var(--background));
          border: 1px solid hsl(var(--border));
          color: hsl(var(--foreground));
        }
      `}</style>
    </div>
  );
});

RichTextEditor.displayName = "RichTextEditor";