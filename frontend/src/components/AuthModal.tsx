import { useState, type FormEvent, type MouseEvent } from 'react';
import { X, Eye, EyeOff } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: (user: { email: string; name: string }) => void;
}

export function AuthModal({ isOpen, onClose, onLogin }: AuthModalProps) {
  const [activeTab, setActiveTab] = useState<'qrcode' | 'phone' | 'email'>('email');
  const [showPassword, setShowPassword] = useState(false);
  const [isRegister, setIsRegister] = useState(false);
  
  const [formData, setFormData] = useState({
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    name: '',
    code: '',
  });

  if (!isOpen) return null;

  const handleBackdropClick = (e: MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    
    // 默认登录成功 - 简化验证逻辑
    if (isRegister) {
      const userName = formData.name || formData.email.split('@')[0] || '新用户';
      const userEmail = formData.email || `user${Date.now()}@example.com`;
      onLogin({ email: userEmail, name: userName });
      onClose();
    } else {
      // 登录逻辑 - 默认通过
      let userName = '';
      let userEmail = '';
      
      if (activeTab === 'email') {
        userName = formData.email.split('@')[0] || '用户';
        userEmail = formData.email || 'demo@example.com';
      } else if (activeTab === 'phone') {
        userName = '用户' + (formData.phone.slice(-4) || '0000');
        userEmail = formData.phone + '@phone.com';
      } else {
        // 扫码登录
        userName = '扫码用户';
        userEmail = 'qrcode@example.com';
      }
      
      onLogin({ email: userEmail, name: userName });
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md relative animate-in fade-in zoom-in-95 duration-200">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 transition-colors z-10"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-6">
          <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)} className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-6">
              <TabsTrigger value="qrcode">扫码登录</TabsTrigger>
              <TabsTrigger value="phone">手机登录</TabsTrigger>
              <TabsTrigger value="email">邮箱登录</TabsTrigger>
            </TabsList>

            {/* 扫码登录 */}
            <TabsContent value="qrcode" className="space-y-4">
              <form onSubmit={handleSubmit}>
                <div className="text-center py-8">
                  <p className="text-sm text-gray-600 mb-4">打开 抖音 或 抖店 扫码</p>
                  <div className="w-48 h-48 mx-auto bg-gray-100 rounded-lg flex items-center justify-center">
                    <div className="w-40 h-40 bg-gray-200 rounded flex items-center justify-center">
                      <p className="text-gray-400 text-sm">二维码占位</p>
                    </div>
                  </div>
                  <p className="text-xs text-gray-400 mt-4">
                    授权登录将会获取你在第三方平台的昵称、<br />头像、昵称、手机号
                  </p>
                  <Button type="submit" className="w-full h-12 bg-blue-500 hover:bg-blue-600 mt-6">
                    模拟扫码登录
                  </Button>
                </div>
              </form>
            </TabsContent>

            {/* 手机登录 */}
            <TabsContent value="phone" className="space-y-4">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Input
                    type="tel"
                    placeholder="请输入手机号"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="h-12"
                  />
                </div>

                <div className="flex gap-2">
                  <Input
                    type="text"
                    placeholder="请输入验证码"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    className="h-12"
                  />
                  <Button type="button" variant="outline" className="whitespace-nowrap">
                    获取验证码
                  </Button>
                </div>

                <Button type="submit" className="w-full h-12 bg-blue-500 hover:bg-blue-600">
                  登录
                </Button>

                <p className="text-xs text-gray-500 text-center">
                  未注册手机号验证后自动登录，登录即代表同意{' '}
                  <a href="#" className="text-blue-500">服务协议</a> 和{' '}
                  <a href="#" className="text-blue-500">隐私条款</a>
                </p>
              </form>
            </TabsContent>

            {/* 邮箱登录 */}
            <TabsContent value="email" className="space-y-4">
              <form onSubmit={handleSubmit} className="space-y-4">
                {isRegister && (
                  <div>
                    <Input
                      type="text"
                      placeholder="请输入用户名"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="h-12"
                    />
                  </div>
                )}

                <div>
                  <Input
                    type="email"
                    placeholder="请输入邮箱"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="h-12"
                    required
                  />
                </div>

                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="密码（演示模式，任意密码即可）"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="h-12 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>

                {isRegister && (
                  <div className="relative">
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="确认密码"
                      value={formData.confirmPassword}
                      onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                      className="h-12"
                    />
                  </div>
                )}

                <div className="flex justify-between text-sm">
                  <button type="button" className="text-gray-500 hover:text-gray-700">
                    忘记密码
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsRegister(!isRegister)}
                    className="text-blue-500 hover:text-blue-600"
                  >
                    {isRegister ? '已有账号？去登录' : '立即注册'}
                  </button>
                </div>

                <Button type="submit" className="w-full h-12 bg-blue-500 hover:bg-blue-600">
                  {isRegister ? '注册' : '登录'}
                </Button>

                <p className="text-xs text-gray-500 text-center">
                  {isRegister ? '注册' : '登录'}即代表同意{' '}
                  <a href="#" className="text-blue-500">服务协议</a> 和{' '}
                  <a href="#" className="text-blue-500">隐私条款</a>
                </p>
              </form>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
