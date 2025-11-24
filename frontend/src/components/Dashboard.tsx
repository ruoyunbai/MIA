import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, MessageSquare, FileText, AlertCircle } from 'lucide-react';

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
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600">总提问数</p>
            <MessageSquare className="w-5 h-5 text-blue-500" />
          </div>
          <p className="text-2xl text-gray-900 mb-1">{totalQuestions}</p>
          <p className="text-xs text-green-600 flex items-center gap-1">
            <TrendingUp className="w-3 h-3" />
            +12% 本周
          </p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600">知识文档</p>
            <FileText className="w-5 h-5 text-purple-500" />
          </div>
          <p className="text-2xl text-gray-900 mb-1">{totalDocuments}</p>
          <p className="text-xs text-gray-500">4个业务分类</p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600">命中率</p>
            <TrendingUp className="w-5 h-5 text-green-500" />
          </div>
          <p className="text-2xl text-gray-900 mb-1">94.2%</p>
          <p className="text-xs text-green-600">+2.3% 较上周</p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600">零命中问题</p>
            <AlertCircle className="w-5 h-5 text-orange-500" />
          </div>
          <p className="text-2xl text-gray-900 mb-1">{zeroHitQuestions.length}</p>
          <p className="text-xs text-orange-600">需补充知识</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Question Frequency Chart */}
        <div className="col-span-2 bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-gray-900 mb-4">高频问题 Top 10</h3>
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
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-gray-900 mb-4">知识点热力分布</h3>
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
          
          <div className="mt-4 space-y-2">
            {categoryHeatData.map(item => (
              <div key={item.name} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded" style={{ backgroundColor: item.color }}></div>
                  <span className="text-gray-700">{item.name}</span>
                </div>
                <span className="text-gray-900">{item.value} 次</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Zero Hit Questions */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-gray-900 mb-1">零命中问题列表</h3>
            <p className="text-sm text-gray-500">这些问题未能在知识库中找到匹配内容，建议补充相关文档</p>
          </div>
          <AlertCircle className="w-6 h-6 text-orange-500" />
        </div>
        
        <div className="space-y-3">
          {zeroHitQuestions.map((item, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between p-4 bg-orange-50 border border-orange-200 rounded-lg hover:bg-orange-100 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-orange-200 rounded-full flex items-center justify-center">
                  <span className="text-sm text-orange-700">{idx + 1}</span>
                </div>
                <p className="text-gray-900">{item.question}</p>
              </div>
              <p className="text-sm text-gray-500">{item.timestamp}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
