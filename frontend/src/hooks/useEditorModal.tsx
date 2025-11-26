import { useEffect, useState, type ReactElement } from 'react';
import { Drawer } from '@arco-design/web-react';
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

  const isOpen = editorState?.isOpen === true;

  useEffect(() => {
    document.body.classList.toggle('kb-editor-open', isOpen);
    return () => document.body.classList.remove('kb-editor-open');
  }, [isOpen]);

  const EditorModal = (
    <Drawer
      className="kb-editor-drawer"
      placement="right"
      width="100%"
      visible={isOpen}
      footer={null}
      closable={false}
      title={null}
      headerStyle={{ display: 'none' }}
      maskClosable={false}
      unmountOnExit
      onCancel={closeEditor}
    >
      {isOpen && editorState ? (
        <RichTextEditor
          title={editorState.title}
          initialContent={editorState.content}
          onSave={(content) => {
            editorState.onSave(content);
            closeEditor();
          }}
          onCancel={closeEditor}
        />
      ) : null}
    </Drawer>
  );

  return {
    editorState,
    openEditor,
    closeEditor,
    EditorModal,
  };
}
