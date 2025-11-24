import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, MessageSquare, FileText, AlertCircle } from 'lucide-react';
import styles from './Dashboard.module.css';

const questionFrequencyData = [
  { question: '差评如何申诉？', count: 45 },
  { question: '如何避免商品违规？', count: 38 },
  { question: '发货超时怎么办？', count: 32 },
  { question: '保证金如何退还？', count: 28 },
  { question: '品牌授权怎么上传？', count: 25 },
  { question: '商品审核不通过原因', count: 22 },
  { question: '如何处理退款纠纷？', count: 19 },
  { question: '店铺扣分如何申诉？', count: 16 },
  { question: '物流异常怎么处理？', count: 14 },
  { question: '评分低如何提升？', count: 12 },
];

const categoryHeatData = [
  { name: '商品管理', value: 156, color: '#3b82f6' },
  { name: '管理总则', value: 98, color: '#8b5cf6' },
  { name: '商家服务', value: 87, color: '#ec4899' },
  { name: '招商入驻', value: 65, color: '#f59e0b' },
];

const zeroHitQuestions = [
  { question: '如何设置店铺优惠券？', timestamp: '2024-11-19 14:32' },
  { question: '直播带货需要什么资质？', timestamp: '2024-11-19 11:15' },
  { question: '精选联盟如何加入？', timestamp: '2024-11-18 16:48' },
  { question: '达人合作流程是什么？', timestamp: '2024-11-18 09:22' },
  { question: '如何申请官方活动？', timestamp: '2024-11-17 15:33' },
];

export function Dashboard() {
  const totalQuestions = questionFrequencyData.reduce((sum, item) => sum + item.count, 0);
  const totalDocuments = categoryHeatData.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className={styles.dashboard}>
      {/* Stats Overview */}
      <div className={styles.statGrid}>
        <div className={styles.statCard}>
          <div className={styles.statHeader}>
            <p className={styles.statTitle}>总提问数</p>
            <MessageSquare size={20} color="#2563eb" />
          </div>
          <p className={styles.statValue}>{totalQuestions}</p>
          <p className={styles.trendPositive}>
            <TrendingUp size={14} />
            +12% 本周
          </p>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statHeader}>
            <p className={styles.statTitle}>知识文档</p>
            <FileText size={20} color="#7c3aed" />
          </div>
          <p className={styles.statValue}>{totalDocuments}</p>
          <p className={styles.statNote}>4个业务分类</p>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statHeader}>
            <p className={styles.statTitle}>命中率</p>
            <TrendingUp size={20} color="#16a34a" />
          </div>
          <p className={styles.statValue}>94.2%</p>
          <p className={styles.trendPositive}>+2.3% 较上周</p>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statHeader}>
            <p className={styles.statTitle}>零命中问题</p>
            <AlertCircle size={20} color="#f97316" />
          </div>
          <p className={styles.statValue}>{zeroHitQuestions.length}</p>
          <p className={styles.trendWarning}>需补充知识</p>
        </div>
      </div>

      <div className={styles.charts}>
        {/* Question Frequency Chart */}
        <div className={styles.chartCard} style={{ gridColumn: 'span 2' }}>
          <h3 className={styles.chartTitle}>高频问题 Top 10</h3>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={questionFrequencyData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis dataKey="question" type="category" width={150} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Category Heat Pie Chart */}
        <div className={styles.chartCard}>
          <h3 className={styles.chartTitle}>知识点热力分布</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={categoryHeatData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {categoryHeatData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>

          <div className={styles.pieLegend}>
            {categoryHeatData.map(item => (
              <div key={item.name} className={styles.pieLegendItem}>
                <div className={styles.legendLabel}>
                  <span className={styles.legendDot} style={{ backgroundColor: item.color }} />
                  <span>{item.name}</span>
                </div>
                <span>{item.value} 次</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Zero Hit Questions */}
      <div className={styles.zeroHitCard}>
        <div className={styles.zeroHeader}>
          <div>
            <h3 className={styles.zeroTitle}>零命中问题列表</h3>
            <p className={styles.zeroSubTitle}>这些问题未命中知识库，建议补充相关文档</p>
          </div>
          <AlertCircle size={28} color="#f97316" />
        </div>

        <div className={styles.zeroList}>
          {zeroHitQuestions.map((item, idx) => (
            <div key={idx} className={styles.zeroItem}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div className={styles.zeroBadge}>{idx + 1}</div>
                <p className={styles.zeroQuestion}>{item.question}</p>
              </div>
              <p className={styles.zeroTime}>{item.timestamp}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
