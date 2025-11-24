import { KnowledgeBase } from '../components/KnowledgeBase';
import { useRootOutletContext } from '../routes/RootLayout';
import styles from '../App.module.css';

export function KnowledgePage() {
  const { openEditor } = useRootOutletContext();
  return (
    <div className={styles.contentPanel}>
      <KnowledgeBase onOpenEditor={openEditor} />
    </div>
  );
}
