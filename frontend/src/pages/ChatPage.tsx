import { ChatFeature } from '../features/chat';
import styles from './ChatPage.module.css';

export function ChatPage() {
  return (
    <div className={styles.page}>
      <ChatFeature />
    </div>
  );
}
