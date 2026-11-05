"use client";
import { useState } from "react";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import { TableKit } from "@tiptap/extension-table";
import {
  Bold, Heading2, Heading3, ImageIcon, Italic, Link2, List, ListOrdered, Minus, Quote, Redo2, Table as TableIcon, Underline as UnderlineIcon, Undo2, Unlink,
} from "lucide-react";
import { MediaPickerModal } from "./media-picker";
import { cn } from "@/lib/utils";

function Btn({ onClick, active, label, children, disabled }: { onClick: () => void; active?: boolean; label: string; children: React.ReactNode; disabled?: boolean }) {
  return (
    <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={onClick} disabled={disabled} aria-label={label} title={label} aria-pressed={active}
      className={cn("inline-flex h-8 w-8 items-center justify-center rounded text-slate-700 hover:bg-slate-200 disabled:opacity-40", active && "bg-slate-900 text-white hover:bg-slate-800")}>
      {children}
    </button>
  );
}

function Toolbar({ editor, onImage }: { editor: Editor; onImage: () => void }) {
  const link = () => {
    const prev = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Link URL (https://…, /relative-path or mailto:)", prev ?? "https://");
    if (url === null) return;
    if (url === "") { editor.chain().focus().extendMarkRange("link").unsetLink().run(); return; }
    if (!/^(https?:\/\/|\/|mailto:|tel:)/i.test(url)) { window.alert("Links must start with https://, http://, /, mailto: or tel:"); return; }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  };
  const inTable = editor.isActive("table");
  return (
    <div role="toolbar" aria-label="Formatting" className="sticky top-0 z-10 flex flex-wrap items-center gap-0.5 rounded-t border border-slate-300 bg-slate-100 p-1.5">
      <Btn label="Heading 2" active={editor.isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}><Heading2 className="h-4 w-4" /></Btn>
      <Btn label="Heading 3" active={editor.isActive("heading", { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}><Heading3 className="h-4 w-4" /></Btn>
      <span className="mx-1 h-5 w-px bg-slate-300" />
      <Btn label="Bold" active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}><Bold className="h-4 w-4" /></Btn>
      <Btn label="Italic" active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}><Italic className="h-4 w-4" /></Btn>
      <Btn label="Underline" active={editor.isActive("underline")} onClick={() => editor.chain().focus().toggleUnderline().run()}><UnderlineIcon className="h-4 w-4" /></Btn>
      <Btn label="Add or edit link" active={editor.isActive("link")} onClick={link}><Link2 className="h-4 w-4" /></Btn>
      <Btn label="Remove link" disabled={!editor.isActive("link")} onClick={() => editor.chain().focus().unsetLink().run()}><Unlink className="h-4 w-4" /></Btn>
      <span className="mx-1 h-5 w-px bg-slate-300" />
      <Btn label="Bulleted list" active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()}><List className="h-4 w-4" /></Btn>
      <Btn label="Numbered list" active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()}><ListOrdered className="h-4 w-4" /></Btn>
      <Btn label="Quote" active={editor.isActive("blockquote")} onClick={() => editor.chain().focus().toggleBlockquote().run()}><Quote className="h-4 w-4" /></Btn>
      <Btn label="Divider" onClick={() => editor.chain().focus().setHorizontalRule().run()}><Minus className="h-4 w-4" /></Btn>
      <span className="mx-1 h-5 w-px bg-slate-300" />
      <Btn label="Insert image" onClick={onImage}><ImageIcon className="h-4 w-4" /></Btn>
      <Btn label="Insert table" onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}><TableIcon className="h-4 w-4" /></Btn>
      {inTable && (
        <>
          <button type="button" className="rounded px-2 py-1 text-xs font-semibold hover:bg-slate-200" onClick={() => editor.chain().focus().addRowAfter().run()}>+ Row</button>
          <button type="button" className="rounded px-2 py-1 text-xs font-semibold hover:bg-slate-200" onClick={() => editor.chain().focus().addColumnAfter().run()}>+ Col</button>
          <button type="button" className="rounded px-2 py-1 text-xs font-semibold hover:bg-slate-200" onClick={() => editor.chain().focus().deleteRow().run()}>− Row</button>
          <button type="button" className="rounded px-2 py-1 text-xs font-semibold hover:bg-slate-200" onClick={() => editor.chain().focus().deleteColumn().run()}>− Col</button>
          <button type="button" className="rounded px-2 py-1 text-xs font-semibold text-red-700 hover:bg-red-50" onClick={() => editor.chain().focus().deleteTable().run()}>Delete table</button>
        </>
      )}
      <span className="mx-1 h-5 w-px bg-slate-300" />
      <Btn label="Undo" disabled={!editor.can().undo()} onClick={() => editor.chain().focus().undo().run()}><Undo2 className="h-4 w-4" /></Btn>
      <Btn label="Redo" disabled={!editor.can().redo()} onClick={() => editor.chain().focus().redo().run()}><Redo2 className="h-4 w-4" /></Btn>
    </div>
  );
}

export function RichEditor({ name, initialHtml, onChange }: { name: string; initialHtml: string; onChange?: (html: string) => void }) {
  const [html, setHtml] = useState(initialHtml);
  const [picking, setPicking] = useState(false);

  const editor = useEditor({
    immediatelyRender: false,
    shouldRerenderOnTransaction: true,
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3, 4] }, link: { openOnClick: false, autolink: true, HTMLAttributes: { rel: "noopener noreferrer" } } }),
      Image.configure({ HTMLAttributes: { loading: "lazy" } }),
      TableKit.configure({ table: { resizable: false } }),
    ],
    content: initialHtml,
    editorProps: { attributes: { class: "prose-article tiptap px-4 py-3 focus:outline-none", "aria-label": "Article content", role: "textbox", "aria-multiline": "true" } },
    onUpdate: ({ editor: e }) => {
      const out = e.isEmpty ? "" : e.getHTML();
      setHtml(out);
      onChange?.(out);
    },
  });

  return (
    <div>
      <input type="hidden" name={name} value={html} />
      {editor ? <Toolbar editor={editor} onImage={() => setPicking(true)} /> : <div className="h-11 rounded-t border border-slate-300 bg-slate-100" />}
      <div className="rounded-b border border-t-0 border-slate-300 bg-white">
        <EditorContent editor={editor} />
      </div>
      {picking && editor && (
        <MediaPickerModal
          onClose={() => setPicking(false)}
          onPick={(m) => {
            const alt = window.prompt("Alt text for this image (describe it for screen readers and search engines)", m.alt_text ?? "") ?? m.alt_text ?? "";
            editor.chain().focus().setImage({ src: m.url, alt, title: m.caption ?? undefined }).run();
            setPicking(false);
          }}
        />
      )}
    </div>
  );
}
