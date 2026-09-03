import React, { useEffect, useRef, useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import './richTextEditor.css';

const isEmptyHtml = (html) => {
  if (!html) return true;
  return html.replace(/<p>(<br\s*\/?>)?<\/p>/gi, '').replace(/\s/g, '') === '';
};

const SimpleRichTextEditor = ({ value, onChange, placeholder = "Enter text...", className = "", compact = false }) => {
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const debounceRef = useRef(null);

  const emitChange = useCallback((html, immediate = false) => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    const publish = () => {
      try {
        onChangeRef.current?.(html);
      } catch (err) {
        console.error('Error in onChange callback:', err);
      }
    };
    if (immediate) {
      publish();
      return;
    }
    debounceRef.current = setTimeout(publish, 150);
  }, []);

  useEffect(() => () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
  }, []);

  const editor = useEditor({
    immediatelyRender: false,
    shouldRerenderOnTransaction: true,
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
    onUpdate: ({ editor: instance }) => {
      emitChange(instance.getHTML());
    },
    onBlur: ({ editor: instance }) => {
      emitChange(instance.getHTML(), true);
    },
    editorProps: {
      attributes: {
        class: `focus:outline-none px-4 py-3 ${compact ? 'min-h-[48px]' : 'min-h-[100px]'}`,
        'data-placeholder': placeholder,
      },
    },
    autofocus: false,
  });

  useEffect(() => {
    if (!editor || editor.isDestroyed) return;

    const next = value || '';
    const current = editor.getHTML();
    if (next === current || (isEmptyHtml(next) && isEmptyHtml(current))) return;

    try {
      editor.commands.setContent(next, { emitUpdate: false });
    } catch (err) {
      console.error('Error setting editor content:', err);
    }
  }, [value, editor]);

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

