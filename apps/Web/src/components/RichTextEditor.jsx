import React, { useCallback, useEffect, useState, Component } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Color } from '@tiptap/extension-color';
import TextAlign from '@tiptap/extension-text-align';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Underline from '@tiptap/extension-underline';
import Highlight from '@tiptap/extension-highlight';
import { supabase } from '../lib/supabaseClient';

// Error Boundary Component
class RichTextEditorErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('RichTextEditor Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className={`border border-red-300 rounded-lg p-4 ${this.props.className || ''}`}>
          <p className="text-red-600 mb-2">Error loading editor. Using fallback.</p>
          <textarea
            value={this.props.value || ''}
            onChange={(e) => this.props.onChange && this.props.onChange(e.target.value)}
            placeholder={this.props.placeholder || 'Enter text...'}
            className="w-full min-h-[150px] px-4 py-3 border rounded-lg"
            rows={6}
          />
        </div>
      );
    }

    return this.props.children;
  }
}

const RichTextEditor = ({ value, onChange, placeholder = "Enter text...", className = "" }) => {
  const [error, setError] = useState(null);
  
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3, 4, 5, 6],
          HTMLAttributes: {
            class: null,
          },
        },
        paragraph: {
          HTMLAttributes: {
            class: null,
          },
        },
        // Disable link and underline from StarterKit since we're adding them separately
        link: false,
        underline: false,
      }),
      Color,
      Highlight.configure({
        multicolor: true,
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph', 'listItem'],
      }),
      Underline,
      Image.configure({
        inline: true,
        allowBase64: true,
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-blue-600 underline',
        },
      }),
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
        class: 'focus:outline-none min-h-[150px] px-4 py-3',
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

  const addImage = useCallback(async () => {
    if (!editor) return;
    
    const input = document.createElement('input');
    input.setAttribute('type', 'file');
    input.setAttribute('accept', 'image/*');
    input.click();

    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;

      try {
        // Upload to Supabase Storage
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `rich-text/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('rich-text-images')
          .upload(filePath, file);

        if (uploadError) {
          console.error('Error uploading image:', uploadError);
          alert('Failed to upload image. Please try again.');
          return;
        }

        const { data: urlData } = supabase.storage
          .from('rich-text-images')
          .getPublicUrl(filePath);

        if (urlData?.publicUrl && editor) {
          editor.chain().focus().setImage({ src: urlData.publicUrl }).run();
        }
      } catch (error) {
        console.error('Error handling image upload:', error);
        alert('Failed to upload image. Please try again.');
      }
    };
  }, [editor]);

  // Show error fallback if there's an error
  if (error) {
    return (
      <div className={`border border-red-300 rounded-lg p-4 ${className}`}>
        <p className="text-red-600 mb-2">Error loading editor: {error}</p>
        <textarea
          value={value || ''}
          onChange={(e) => onChange && onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full min-h-[150px] px-4 py-3 border rounded-lg"
          rows={6}
        />
      </div>
    );
  }

  if (!editor) {
    return (
      <div className={`rich-text-editor-wrapper border border-slate-300 rounded-lg overflow-hidden ${className}`}>
        <div className="p-4 text-center text-slate-500">
          Loading editor...
        </div>
      </div>
    );
  }

  return (
    <div className={`rich-text-editor-wrapper border border-slate-300 rounded-lg overflow-hidden ${className}`}>
      <style>{`
        .rich-text-editor-wrapper .editor-toolbar {
          display: flex;
          flex-wrap: wrap;
          gap: 4px;
          padding: 8px;
          border-bottom: 1px solid rgb(203, 213, 225);
          background: rgb(248, 250, 252);
        }

        .rich-text-editor-wrapper .toolbar-group {
          display: flex;
          gap: 2px;
          padding: 0 4px;
          border-right: 1px solid rgb(203, 213, 225);
        }

        .rich-text-editor-wrapper .toolbar-group:last-child {
          border-right: none;
        }

        .rich-text-editor-wrapper .toolbar-button {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 6px 10px;
          background: white;
          border: 1px solid rgb(203, 213, 225);
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
          color: rgb(51, 65, 85);
          transition: all 0.2s;
        }

        .rich-text-editor-wrapper .toolbar-button:hover {
          background: rgb(241, 245, 249);
          border-color: rgb(148, 163, 184);
        }

        .rich-text-editor-wrapper .toolbar-button.is-active {
          background: rgb(59, 130, 246);
          color: white;
          border-color: rgb(59, 130, 246);
        }

        .rich-text-editor-wrapper .toolbar-select {
          padding: 6px 10px;
          background: white;
          border: 1px solid rgb(203, 213, 225);
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
          color: rgb(51, 65, 85);
          min-width: 120px;
        }

        .rich-text-editor-wrapper .toolbar-select:hover {
          border-color: rgb(148, 163, 184);
        }

        .rich-text-editor-wrapper .ProseMirror {
          outline: none;
          min-height: 150px;
          padding: 16px;
          font-size: 16px;
        }

        .rich-text-editor-wrapper .ProseMirror p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: left;
          color: rgb(148, 163, 184);
          pointer-events: none;
          height: 0;
        }

        .rich-text-editor-wrapper .ProseMirror img {
          max-width: 100%;
          height: auto;
          margin: 16px 0;
        }

        .rich-text-editor-wrapper .ProseMirror a {
          color: rgb(37, 99, 235);
          text-decoration: underline;
        }

        .rich-text-editor-wrapper .ProseMirror p,
        .rich-text-editor-wrapper .ProseMirror h1,
        .rich-text-editor-wrapper .ProseMirror h2,
        .rich-text-editor-wrapper .ProseMirror h3,
        .rich-text-editor-wrapper .ProseMirror h4,
        .rich-text-editor-wrapper .ProseMirror h5,
        .rich-text-editor-wrapper .ProseMirror h6 {
          margin: 0.5em 0;
        }

        .rich-text-editor-wrapper .ProseMirror h1,
        .rich-text-editor-wrapper .ProseMirror h2,
        .rich-text-editor-wrapper .ProseMirror h3,
        .rich-text-editor-wrapper .ProseMirror h4,
        .rich-text-editor-wrapper .ProseMirror h5,
        .rich-text-editor-wrapper .ProseMirror h6 {
          font-weight: 700;
          margin-top: 1em;
          margin-bottom: 0.5em;
        }

        .rich-text-editor-wrapper .ProseMirror p[style*="margin-left"],
        .rich-text-editor-wrapper .ProseMirror h1[style*="margin-left"],
        .rich-text-editor-wrapper .ProseMirror h2[style*="margin-left"],
        .rich-text-editor-wrapper .ProseMirror h3[style*="margin-left"],
        .rich-text-editor-wrapper .ProseMirror h4[style*="margin-left"],
        .rich-text-editor-wrapper .ProseMirror h5[style*="margin-left"],
        .rich-text-editor-wrapper .ProseMirror h6[style*="margin-left"] {
          padding-left: 0;
        }

        .rich-text-editor-wrapper .ProseMirror h1 { font-size: 2em; }
        .rich-text-editor-wrapper .ProseMirror h2 { font-size: 1.5em; }
        .rich-text-editor-wrapper .ProseMirror h3 { font-size: 1.25em; }
        .rich-text-editor-wrapper .ProseMirror h4 { font-size: 1.1em; }
        .rich-text-editor-wrapper .ProseMirror h5 { font-size: 1em; }
        .rich-text-editor-wrapper .ProseMirror h6 { font-size: 0.9em; }

        .rich-text-editor-wrapper .ProseMirror ul,
        .rich-text-editor-wrapper .ProseMirror ol {
          padding-left: 1.5em;
          margin: 0.5em 0;
          list-style-position: outside;
        }

        .rich-text-editor-wrapper .ProseMirror ul {
          list-style-type: disc;
        }

        .rich-text-editor-wrapper .ProseMirror ol {
          list-style-type: decimal;
        }

        .rich-text-editor-wrapper .ProseMirror li {
          display: list-item;
          margin: 0.25em 0;
          padding-left: 0.25em;
        }

        .rich-text-editor-wrapper .ProseMirror li p {
          margin: 0;
          display: inline;
        }

        .rich-text-editor-wrapper .ProseMirror ul[data-type="taskList"] {
          list-style: none;
          padding-left: 0;
        }

        .rich-text-editor-wrapper .ProseMirror ul[data-type="taskList"] li {
          display: flex;
          align-items: flex-start;
        }

        .rich-text-editor-wrapper .ProseMirror ul[data-type="taskList"] li > label {
          flex: 0 0 auto;
          margin-right: 0.5rem;
          user-select: none;
        }

        .rich-text-editor-wrapper .ProseMirror ul[data-type="taskList"] li > div {
          flex: 1 1 auto;
        }

        .rich-text-editor-wrapper .ProseMirror blockquote {
          border-left: 4px solid rgb(203, 213, 225);
          padding-left: 1em;
          margin: 1em 0;
          color: rgb(100, 116, 139);
        }

        .rich-text-editor-wrapper .ProseMirror code {
          background: rgb(241, 245, 249);
          padding: 2px 6px;
          border-radius: 4px;
          font-family: monospace;
        }

        .rich-text-editor-wrapper .ProseMirror pre {
          background: rgb(241, 245, 249);
          padding: 1em;
          border-radius: 4px;
          overflow-x: auto;
        }

        .rich-text-editor-wrapper .ProseMirror[data-text-align="left"] {
          text-align: left;
        }

        .rich-text-editor-wrapper .ProseMirror[data-text-align="center"] {
          text-align: center;
        }

        .rich-text-editor-wrapper .ProseMirror[data-text-align="right"] {
          text-align: right;
        }

        .rich-text-editor-wrapper .ProseMirror[data-text-align="justify"] {
          text-align: justify;
        }
      `}</style>

      {/* Toolbar */}
      <div className="editor-toolbar">
        {/* Heading */}
        <div className="toolbar-group">
          <select
            className="toolbar-select"
            onChange={(e) => {
              try {
                const level = parseInt(e.target.value);
                if (level === 0) {
                  editor.chain().focus().setParagraph().run();
                } else {
                  editor.chain().focus().toggleHeading({ level }).run();
                }
              } catch (err) {
                console.error('Error changing heading:', err);
              }
            }}
            value={
              editor.isActive('heading', { level: 1 }) ? '1' :
              editor.isActive('heading', { level: 2 }) ? '2' :
              editor.isActive('heading', { level: 3 }) ? '3' :
              editor.isActive('heading', { level: 4 }) ? '4' :
              editor.isActive('heading', { level: 5 }) ? '5' :
              editor.isActive('heading', { level: 6 }) ? '6' : '0'
            }
          >
            <option value="0">Normal</option>
            <option value="1">Heading 1</option>
            <option value="2">Heading 2</option>
            <option value="3">Heading 3</option>
            <option value="4">Heading 4</option>
            <option value="5">Heading 5</option>
            <option value="6">Heading 6</option>
          </select>
        </div>

        {/* Text Formatting */}
        <div className="toolbar-group">
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
          <button
            type="button"
            onClick={() => {
              try {
                editor.chain().focus().toggleStrike().run();
              } catch (err) {
                console.error('Error toggling strikethrough:', err);
              }
            }}
            className={`toolbar-button ${editor.isActive('strike') ? 'is-active' : ''}`}
            title="Strikethrough"
          >
            <s>S</s>
          </button>
        </div>

        {/* Text Alignment */}
        <div className="toolbar-group">
          <button
            type="button"
            onClick={() => {
              try {
                editor.chain().focus().setTextAlign('left').run();
              } catch (err) {
                console.error('Error setting alignment:', err);
              }
            }}
            className={`toolbar-button ${editor.isActive({ textAlign: 'left' }) ? 'is-active' : ''}`}
            title="Left Align"
          >
            <svg viewBox="0 0 18 18" width="18" height="18">
              <line x1="3" x2="15" y1="9" y2="9" stroke="currentColor" strokeWidth="2"/>
              <line x1="3" x2="13" y1="14" y2="14" stroke="currentColor" strokeWidth="2"/>
              <line x1="3" x2="9" y1="4" y2="4" stroke="currentColor" strokeWidth="2"/>
            </svg>
          </button>
          <button
            type="button"
            onClick={() => {
              try {
                editor.chain().focus().setTextAlign('center').run();
              } catch (err) {
                console.error('Error setting alignment:', err);
              }
            }}
            className={`toolbar-button ${editor.isActive({ textAlign: 'center' }) ? 'is-active' : ''}`}
            title="Center Align"
          >
            <svg viewBox="0 0 18 18" width="18" height="18">
              <line x1="15" x2="3" y1="9" y2="9" stroke="currentColor" strokeWidth="2"/>
              <line x1="14" x2="4" y1="14" y2="14" stroke="currentColor" strokeWidth="2"/>
              <line x1="12" x2="6" y1="4" y2="4" stroke="currentColor" strokeWidth="2"/>
            </svg>
          </button>
          <button
            type="button"
            onClick={() => {
              try {
                editor.chain().focus().setTextAlign('right').run();
              } catch (err) {
                console.error('Error setting alignment:', err);
              }
            }}
            className={`toolbar-button ${editor.isActive({ textAlign: 'right' }) ? 'is-active' : ''}`}
            title="Right Align"
          >
            <svg viewBox="0 0 18 18" width="18" height="18">
              <line x1="15" x2="3" y1="9" y2="9" stroke="currentColor" strokeWidth="2"/>
              <line x1="15" x2="5" y1="14" y2="14" stroke="currentColor" strokeWidth="2"/>
              <line x1="15" x2="9" y1="4" y2="4" stroke="currentColor" strokeWidth="2"/>
            </svg>
          </button>
          <button
            type="button"
            onClick={() => {
              try {
                editor.chain().focus().setTextAlign('justify').run();
              } catch (err) {
                console.error('Error setting alignment:', err);
              }
            }}
            className={`toolbar-button ${editor.isActive({ textAlign: 'justify' }) ? 'is-active' : ''}`}
            title="Justify"
          >
            <svg viewBox="0 0 18 18" width="18" height="18">
              <line x1="15" x2="3" y1="9" y2="9" stroke="currentColor" strokeWidth="2"/>
              <line x1="15" x2="3" y1="14" y2="14" stroke="currentColor" strokeWidth="2"/>
              <line x1="15" x2="3" y1="4" y2="4" stroke="currentColor" strokeWidth="2"/>
            </svg>
          </button>
        </div>

        {/* Lists */}
        <div className="toolbar-group">
          <button
            type="button"
            onClick={() => {
              try {
                editor.chain().focus().toggleBulletList().run();
              } catch (err) {
                console.error('Error toggling bullet list:', err);
              }
            }}
            className={`toolbar-button ${editor.isActive('bulletList') ? 'is-active' : ''}`}
            title="Bullet List"
          >
            <svg viewBox="0 0 18 18" width="18" height="18">
              <circle cx="3" cy="5" r="1.5" fill="currentColor"/>
              <circle cx="3" cy="9" r="1.5" fill="currentColor"/>
              <circle cx="3" cy="13" r="1.5" fill="currentColor"/>
              <line x1="6" y1="5" x2="15" y2="5" stroke="currentColor" strokeWidth="2"/>
              <line x1="6" y1="9" x2="15" y2="9" stroke="currentColor" strokeWidth="2"/>
              <line x1="6" y1="13" x2="15" y2="13" stroke="currentColor" strokeWidth="2"/>
            </svg>
          </button>
          <button
            type="button"
            onClick={() => {
              try {
                editor.chain().focus().toggleOrderedList().run();
              } catch (err) {
                console.error('Error toggling ordered list:', err);
              }
            }}
            className={`toolbar-button ${editor.isActive('orderedList') ? 'is-active' : ''}`}
            title="Numbered List"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="10" y1="6" x2="21" y2="6"/>
              <line x1="10" y1="12" x2="21" y2="12"/>
              <line x1="10" y1="18" x2="21" y2="18"/>
              <line x1="4" y1="6" x2="4" y2="6"/>
              <line x1="4" y1="12" x2="4" y2="12"/>
              <line x1="4" y1="18" x2="4" y2="18"/>
              <circle cx="4" cy="6" r="1.5" fill="currentColor"/>
              <circle cx="4" cy="12" r="1.5" fill="currentColor"/>
              <circle cx="4" cy="18" r="1.5" fill="currentColor"/>
            </svg>
          </button>
          <button
            type="button"
            onClick={() => {
              try {
                // For lists, use sinkListItem (nested lists)
                if (editor.isActive('bulletList') || editor.isActive('orderedList')) {
                  editor.chain().focus().sinkListItem('listItem').run();
                } else {
                  // For paragraphs and headings, use custom command
                  editor.chain().focus().command(({ tr, state, dispatch }) => {
                    const { from, to } = state.selection;
                    const nodes = [];
                    
                    state.doc.nodesBetween(from, to, (node, pos) => {
                      if (node.type.name === 'paragraph' || node.type.name.startsWith('heading')) {
                        nodes.push({ node, pos });
                      }
                    });
                    
                    if (nodes.length === 0) {
                      const $pos = state.selection.$anchor;
                      const node = $pos.parent;
                      if (node.type.name === 'paragraph' || node.type.name.startsWith('heading')) {
                        nodes.push({ node, pos: $pos.before($pos.depth) });
                      }
                    }
                    
                    nodes.forEach(({ node, pos }) => {
                      const attrs = { ...node.attrs };
                      const currentStyle = attrs.style || '';
                      const marginMatch = currentStyle.match(/margin-left:\s*(\d+)px/);
                      const currentMargin = marginMatch ? parseInt(marginMatch[1]) : 0;
                      const newMargin = currentMargin + 40;
                      
                      let newStyle = '';
                      if (currentStyle) {
                        newStyle = currentStyle.replace(/margin-left:\s*\d+px;?/g, '').trim();
                        if (newStyle && !newStyle.endsWith(';')) {
                          newStyle += ';';
                        }
                        newStyle += ` margin-left: ${newMargin}px;`;
                      } else {
                        newStyle = `margin-left: ${newMargin}px;`;
                      }
                      
                      tr.setNodeMarkup(pos, undefined, {
                        ...attrs,
                        style: newStyle.trim()
                      });
                    });
                    
                    if (dispatch) {
                      dispatch(tr);
                    }
                    return true;
                  }).run();
                }
              } catch (err) {
                console.error('Error indenting:', err);
              }
            }}
            className="toolbar-button"
            title="Indent"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="12" x2="21" y2="12"/>
              <line x1="3" y1="6" x2="21" y2="6"/>
              <line x1="3" y1="18" x2="21" y2="18"/>
              <line x1="9" y1="3" x2="9" y2="21"/>
              <path d="M6 6l3-3 3 3"/>
              <path d="M6 18l3 3 3-3"/>
            </svg>
          </button>
          <button
            type="button"
            onClick={() => {
              try {
                // For lists, use liftListItem (un-nest lists)
                if (editor.isActive('bulletList') || editor.isActive('orderedList')) {
                  editor.chain().focus().liftListItem('listItem').run();
                } else {
                  // For paragraphs and headings, decrease margin-left
                  editor.chain().focus().command(({ tr, state, dispatch }) => {
                    const { from, to } = state.selection;
                    const nodes = [];
                    
                    state.doc.nodesBetween(from, to, (node, pos) => {
                      if (node.type.name === 'paragraph' || node.type.name.startsWith('heading')) {
                        nodes.push({ node, pos });
                      }
                    });
                    
                    if (nodes.length === 0) {
                      const $pos = state.selection.$anchor;
                      const node = $pos.parent;
                      if (node.type.name === 'paragraph' || node.type.name.startsWith('heading')) {
                        nodes.push({ node, pos: $pos.before($pos.depth) });
                      }
                    }
                    
                    nodes.forEach(({ node, pos }) => {
                      const attrs = { ...node.attrs };
                      const currentStyle = attrs.style || '';
                      const marginMatch = currentStyle.match(/margin-left:\s*(\d+)px/);
                      const currentMargin = marginMatch ? parseInt(marginMatch[1]) : 0;
                      
                      if (currentMargin > 0) {
                        const newMargin = Math.max(0, currentMargin - 40);
                        let newStyle = '';
                        
                        if (newMargin > 0) {
                          newStyle = currentStyle
                            .replace(/margin-left:\s*\d+px;?/g, '')
                            .trim();
                          if (newStyle && !newStyle.endsWith(';')) {
                            newStyle += ';';
                          }
                          newStyle += ` margin-left: ${newMargin}px;`;
                        } else {
                          newStyle = currentStyle
                            .replace(/margin-left:\s*\d+px;?/g, '')
                            .trim();
                        }
                        
                        tr.setNodeMarkup(pos, undefined, {
                          ...attrs,
                          style: newStyle.trim() || undefined
                        });
                      }
                    });
                    
                    if (dispatch) {
                      dispatch(tr);
                    }
                    return true;
                  }).run();
                }
              } catch (err) {
                console.error('Error outdenting:', err);
              }
            }}
            className="toolbar-button"
            title="Outdent"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="12" x2="21" y2="12"/>
              <line x1="3" y1="6" x2="21" y2="6"/>
              <line x1="3" y1="18" x2="21" y2="18"/>
              <line x1="15" y1="3" x2="15" y2="21"/>
              <path d="M12 6l-3-3-3 3"/>
              <path d="M12 18l-3 3-3-3"/>
            </svg>
          </button>
        </div>

        {/* Colors */}
        <div className="toolbar-group">
          <input
            type="color"
            onChange={(e) => {
              try {
                editor.chain().focus().setColor(e.target.value).run();
              } catch (err) {
                console.error('Error setting color:', err);
              }
            }}
            value={editor.getAttributes('textStyle').color || '#000000'}
            className="toolbar-button"
            style={{ width: '40px', height: '34px', padding: '2px' }}
            title="Text Color"
          />
          <input
            type="color"
            onChange={(e) => {
              try {
                const color = e.target.value;
                if (color === '#ffffff' || color === '#FFFFFF') {
                  editor.chain().focus().unsetHighlight().run();
                } else {
                  editor.chain().focus().setHighlight({ color }).run();
                }
              } catch (err) {
                console.error('Error setting highlight:', err);
              }
            }}
            value={editor.getAttributes('highlight').color || '#ffffff'}
            className="toolbar-button"
            style={{ width: '40px', height: '34px', padding: '2px' }}
            title="Background Color"
          />
        </div>

        {/* Other */}
        <div className="toolbar-group">
          <button
            type="button"
            onClick={() => {
              try {
                editor.chain().focus().toggleBlockquote().run();
              } catch (err) {
                console.error('Error toggling blockquote:', err);
              }
            }}
            className={`toolbar-button ${editor.isActive('blockquote') ? 'is-active' : ''}`}
            title="Quote"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z"/>
              <path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z"/>
            </svg>
          </button>
          <button
            type="button"
            onClick={addImage}
            className="toolbar-button"
            title="Insert Image"
          >
            <svg viewBox="0 0 18 18" width="18" height="18">
              <rect x="3" y="3" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2"/>
              <circle cx="6" cy="6" r="1.5" fill="currentColor"/>
              <line x1="3" y1="12" x2="7" y2="8" stroke="currentColor" strokeWidth="2"/>
              <line x1="9" y1="8" x2="15" y2="14" stroke="currentColor" strokeWidth="2"/>
            </svg>
          </button>
          <button
            type="button"
            onClick={() => {
              try {
                const url = window.prompt('Enter URL:');
                if (url) {
                  editor.chain().focus().setLink({ href: url }).run();
                }
              } catch (err) {
                console.error('Error setting link:', err);
              }
            }}
            className={`toolbar-button ${editor.isActive('link') ? 'is-active' : ''}`}
            title="Insert Link"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
            </svg>
          </button>
          <button
            type="button"
            onClick={() => {
              try {
                editor.chain().focus().toggleCodeBlock().run();
              } catch (err) {
                console.error('Error toggling code block:', err);
              }
            }}
            className={`toolbar-button ${editor.isActive('codeBlock') ? 'is-active' : ''}`}
            title="Code Block"
          >
            <svg viewBox="0 0 18 18" width="18" height="18">
              <path d="M6 6l-3 3 3 3M12 6l3 3-3 3" stroke="currentColor" strokeWidth="2" fill="none"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Editor Content */}
      <EditorContent editor={editor} data-placeholder={placeholder} />
    </div>
  );
};

// Export wrapped component
const RichTextEditorWithErrorBoundary = (props) => {
  return (
    <RichTextEditorErrorBoundary {...props}>
      <RichTextEditor {...props} />
    </RichTextEditorErrorBoundary>
  );
};

export default RichTextEditorWithErrorBoundary;
