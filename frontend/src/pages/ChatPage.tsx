import { ChatInterface } from '../components/ChatInterface';
import styles from './ChatPage.module.css';

export function ChatPage() {
  return (
    <div className={styles.page}>
      <ChatInterface />
    </div>
  );
}
