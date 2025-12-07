import React, { useCallback, useEffect, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';

const SimpleRichTextEditor = ({ value, onChange, placeholder = "Enter text...", className = "" }) => {
  const [error, setError] = useState(null);
  
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        blockquote: false,
        codeBlock: false,
        horizontalRule: false,
        hardBreak: false,
        // Disable link and underline from StarterKit since we're adding underline separately
        link: false,
        underline: false,
        strike: false,
      }),
      Underline,
    ],
    content: value || '',
    onUpdate: ({ editor }) => {
      if (onChange) {
        try {
          onChange(editor.getHTML());
        } catch (err) {
          console.error('Error in onChange callback:', err);
        }
      }
    },
    editorProps: {
      attributes: {
        class: 'focus:outline-none min-h-[100px] px-4 py-3',
        'data-placeholder': placeholder,
      },
    },
    autofocus: false,
  });

  // Update editor content when value prop changes (but avoid infinite loops)
  useEffect(() => {
    if (!editor) return;
    
    try {
      const currentContent = editor.getHTML();
      // Only update if the value actually changed and is different from current content
      if (value !== undefined && value !== null && value !== currentContent) {
        editor.commands.setContent(value || '');
      }
    } catch (error) {
      console.error('Error setting editor content:', error);
      setError('Failed to update editor content');
    }
  }, [value, editor]);

  // Show error fallback if there's an error
  if (error) {
    return (
      <div className={`border border-red-300 rounded-lg p-4 ${className}`}>
        <p className="text-red-600 mb-2">Error loading editor: {error}</p>
        <textarea
          value={value || ''}
          onChange={(e) => onChange && onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full min-h-[100px] px-4 py-3 border rounded-lg"
          rows={4}
        />
      </div>
    );
  }

  if (!editor) {
    return (
      <div className={`simple-rich-text-editor-wrapper border border-slate-300 rounded-xl overflow-hidden ${className}`}>
        <div className="p-4 text-center text-slate-500">
          Loading editor...
        </div>
      </div>
    );
  }

  return (
    <div className={`simple-rich-text-editor-wrapper border border-slate-200 rounded-xl overflow-hidden ${className}`}>
      <style>{`
        .simple-rich-text-editor-wrapper .editor-toolbar {
          display: flex;
          flex-wrap: wrap;
          gap: 4px;
          padding: 8px;
          border-bottom: 1px solid rgb(203, 213, 225);
          background: rgb(248, 250, 252);
        }

        .simple-rich-text-editor-wrapper .toolbar-button {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 6px 12px;
          background: white;
          border: 1px solid rgb(203, 213, 225);
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 600;
          color: rgb(51, 65, 85);
          transition: all 0.2s;
        }

        .simple-rich-text-editor-wrapper .toolbar-button:hover {
          background: rgb(241, 245, 249);
          border-color: rgb(148, 163, 184);
        }

        .simple-rich-text-editor-wrapper .toolbar-button.is-active {
          background: rgb(59, 130, 246);
          color: white;
          border-color: rgb(59, 130, 246);
        }

        .simple-rich-text-editor-wrapper .ProseMirror {
          outline: none;
          min-height: 100px;
          padding: 16px;
          font-size: 16px;
          color: rgb(30, 41, 59);
        }

        .simple-rich-text-editor-wrapper .ProseMirror p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: left;
          color: rgb(148, 163, 184);
          pointer-events: none;
          height: 0;
        }

        .simple-rich-text-editor-wrapper .ProseMirror p {
          margin: 0.5em 0;
        }

        .simple-rich-text-editor-wrapper .ProseMirror p:first-child {
          margin-top: 0;
        }

        .simple-rich-text-editor-wrapper .ProseMirror p:last-child {
          margin-bottom: 0;
        }
      `}</style>

      {/* Toolbar - Only Bold, Italic, Underline */}
      <div className="editor-toolbar">
        <button
          type="button"
          onClick={() => {
            try {
              editor.chain().focus().toggleBold().run();
            } catch (err) {
              console.error('Error toggling bold:', err);
            }
          }}
          className={`toolbar-button ${editor.isActive('bold') ? 'is-active' : ''}`}
          title="Bold"
        >
          <strong>B</strong>
        </button>
        <button
          type="button"
          onClick={() => {
            try {
              editor.chain().focus().toggleItalic().run();
            } catch (err) {
              console.error('Error toggling italic:', err);
            }
          }}
          className={`toolbar-button ${editor.isActive('italic') ? 'is-active' : ''}`}
          title="Italic"
        >
          <em>I</em>
        </button>
        <button
          type="button"
          onClick={() => {
            try {
              editor.chain().focus().toggleUnderline().run();
            } catch (err) {
              console.error('Error toggling underline:', err);
            }
          }}
          className={`toolbar-button ${editor.isActive('underline') ? 'is-active' : ''}`}
          title="Underline"
        >
          <u>U</u>
        </button>
      </div>

      {/* Editor Content */}
      <EditorContent editor={editor} data-placeholder={placeholder} />
    </div>
  );
};

export default SimpleRichTextEditor;

