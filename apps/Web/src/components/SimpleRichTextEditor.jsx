import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import { Bold, Italic, Underline as UnderlineIcon, Link2, List, ListOrdered } from 'lucide-react';
import './richTextEditor.css';

// Lightweight GForms-style editor for survey titles/descriptions.
// Event rationale uses RichTextEditor.jsx (images, colors, alignment).

const isEmptyHtml = (html) => {
  if (!html) return true;
  return html.replace(/<p>(<br\s*\/?>)?<\/p>/gi, '').replace(/\s/g, '') === '';
};

function FormatButton({ active, label, onClick, children }) {
  return (
    <button
      type="button"
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      className={`toolbar-button ${active ? 'is-active' : ''}`}
      title={label}
      aria-label={label}
      aria-pressed={active}
    >
      {children}
    </button>
  );
}

const SimpleRichTextEditor = ({
  value,
  onChange,
  placeholder = 'Enter text...',
  className = '',
  compact = false,
  variant = 'boxed',
}) => {
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const debounceRef = useRef(null);
  const [focused, setFocused] = useState(false);
  const unboxed = variant === 'title' || variant === 'description';

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
        link: false,
        underline: false,
        strike: false,
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        autolink: true,
        HTMLAttributes: {
          rel: 'noopener noreferrer',
          target: '_blank',
        },
      }),
    ],
    content: value || '',
    onUpdate: ({ editor: instance }) => {
      emitChange(instance.getHTML());
    },
    onFocus: () => setFocused(true),
    onBlur: ({ editor: instance }) => {
      emitChange(instance.getHTML(), true);
      window.setTimeout(() => {
        if (!instance.isDestroyed && !instance.isFocused) setFocused(false);
      }, 120);
    },
    editorProps: {
      attributes: {
        class: `focus:outline-none ${compact || unboxed ? 'min-h-[2.5rem]' : 'min-h-[100px]'}`,
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

  const wrapperClass = unboxed
    ? `simple-rich-text-editor-wrapper simple-rte-${variant} ${focused ? 'is-focused' : ''} ${className}`
    : `simple-rich-text-editor-wrapper border border-slate-200 rounded-xl overflow-hidden ${compact ? 'is-compact' : ''} ${className}`;

  if (!editor) {
    return (
      <div className={wrapperClass}>
        <div className="p-4 text-center text-slate-500">Loading editor...</div>
      </div>
    );
  }

  const run = (command) => {
    try {
      command();
    } catch (err) {
      console.error('Error running editor command:', err);
    }
  };

  const setLink = () => {
    const previous = editor.getAttributes('link').href || '';
    const url = window.prompt('Enter URL', previous);
    if (url === null) return;
    if (url.trim() === '') {
      run(() => editor.chain().focus().unsetLink().run());
      return;
    }
    run(() => editor.chain().focus().extendMarkRange('link').setLink({ href: url.trim() }).run());
  };

  const toolbar = (
    <div className="editor-toolbar">
      <FormatButton
        label="Bold"
        active={editor.isActive('bold')}
        onClick={() => run(() => editor.chain().focus().toggleBold().run())}
      >
        {unboxed ? <Bold className="h-4 w-4" /> : <strong>B</strong>}
      </FormatButton>
      <FormatButton
        label="Italic"
        active={editor.isActive('italic')}
        onClick={() => run(() => editor.chain().focus().toggleItalic().run())}
      >
        {unboxed ? <Italic className="h-4 w-4" /> : <em>I</em>}
      </FormatButton>
      <FormatButton
        label="Underline"
        active={editor.isActive('underline')}
        onClick={() => run(() => editor.chain().focus().toggleUnderline().run())}
      >
        {unboxed ? <UnderlineIcon className="h-4 w-4" /> : <u>U</u>}
      </FormatButton>
      {unboxed ? (
        <>
          <span className="toolbar-divider" aria-hidden />
          <FormatButton label="Insert link" active={editor.isActive('link')} onClick={setLink}>
            <Link2 className="h-4 w-4" />
          </FormatButton>
          <FormatButton
            label="Bulleted list"
            active={editor.isActive('bulletList')}
            onClick={() => run(() => editor.chain().focus().toggleBulletList().run())}
          >
            <List className="h-4 w-4" />
          </FormatButton>
          <FormatButton
            label="Numbered list"
            active={editor.isActive('orderedList')}
            onClick={() => run(() => editor.chain().focus().toggleOrderedList().run())}
          >
            <ListOrdered className="h-4 w-4" />
          </FormatButton>
        </>
      ) : null}
    </div>
  );

  return (
    <div
      className={wrapperClass}
      style={{ '--editor-placeholder': JSON.stringify(placeholder) }}
    >
      {unboxed ? (
        <div className={`simple-rte-toolbar ${focused ? 'is-visible' : ''}`}>{toolbar}</div>
      ) : (
        toolbar
      )}
      <EditorContent editor={editor} />
    </div>
  );
};

export default SimpleRichTextEditor;
