import { useState, type ReactElement } from 'react';
import { RichTextEditor } from '../components/RichTextEditor';

export interface EditorModalState {
  isOpen: boolean;
  title: string;
  content: string;
  category: string;
  subCategory: string;
  status: 'active' | 'inactive';
  onSave: (content: string) => void;
}

export type OpenEditorPayload = Omit<EditorModalState, 'isOpen'> & { isOpen?: boolean };

interface UseEditorModalResult {
  editorState: EditorModalState | null;
  openEditor: (state: OpenEditorPayload) => void;
  closeEditor: () => void;
  EditorModal: ReactElement | null;
}

export function useEditorModal(): UseEditorModalResult {
  const [editorState, setEditorState] = useState<EditorModalState | null>(null);

  const openEditor = (state: OpenEditorPayload) => {
    setEditorState({
      ...state,
      isOpen: true,
    });
  };

  const closeEditor = () => {
    setEditorState(null);
  };

  const EditorModal =
    editorState?.isOpen === true ? (
      <RichTextEditor
        title={editorState.title}
        initialContent={editorState.content}
        onSave={(content) => {
          editorState.onSave(content);
          closeEditor();
        }}
        onCancel={closeEditor}
      />
    ) : null;

  return {
    editorState,
    openEditor,
    closeEditor,
    EditorModal,
  };
}
