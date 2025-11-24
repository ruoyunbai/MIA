import { Dashboard } from '../components/Dashboard';
import styles from '../App.module.css';

export function DashboardPage() {
  return (
    <div className={styles.contentPanel}>
      <Dashboard />
    </div>
  );
}
