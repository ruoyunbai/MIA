import { KnowledgeBase } from '../components/KnowledgeBase';
import type { OpenEditorPayload } from '../hooks/useEditorModal';

interface KnowledgePageProps {
  onOpenEditor: (state: OpenEditorPayload) => void;
}

export function KnowledgePage({ onOpenEditor }: KnowledgePageProps) {
  return <KnowledgeBase onOpenEditor={onOpenEditor} />;
}
