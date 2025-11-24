import { useState, type FormEvent, type MouseEvent } from "react";
import { X, Eye, EyeOff } from "lucide-react";
import styles from "./AuthModal.module.css";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: (user: { email: string; name: string }) => void;
}

export function AuthModal({ isOpen, onClose, onLogin }: AuthModalProps) {
  const [activeTab, setActiveTab] = useState<"qrcode" | "phone" | "email">("email");
  const [showPassword, setShowPassword] = useState(false);
  const [isRegister, setIsRegister] = useState(false);

  const [formData, setFormData] = useState({
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    name: "",
    code: "",
  });

  if (!isOpen) return null;

  const handleBackdropClick = (e: MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();

    if (isRegister) {
      const userName = formData.name || formData.email.split("@")[0] || "新用户";
      const userEmail = formData.email || `user${Date.now()}@example.com`;
      onLogin({ email: userEmail, name: userName });
      onClose();
    } else {
      let userName = "";
      let userEmail = "";

      if (activeTab === "email") {
        userName = formData.email.split("@")[0] || "用户";
        userEmail = formData.email || "demo@example.com";
      } else if (activeTab === "phone") {
        userName = "用户" + (formData.phone.slice(-4) || "0000");
        userEmail = formData.phone + "@phone.com";
      } else {
        userName = "扫码用户";
        userEmail = "qrcode@example.com";
      }

      onLogin({ email: userEmail, name: userName });
      onClose();
    }
  };

  return (
    <div className={styles.overlay} onClick={handleBackdropClick}>
      <div className={styles.modal}>
        <button onClick={onClose} className={styles.closeButton}>
          <X size={18} />
        </button>

        <div className={styles.tabs}>
          <button
            type="button"
            className={`${styles.tabButton} ${activeTab === "qrcode" ? styles.tabActive : ""}`}
            onClick={() => setActiveTab("qrcode")}
          >
            扫码登录
          </button>
          <button
            type="button"
            className={`${styles.tabButton} ${activeTab === "phone" ? styles.tabActive : ""}`}
            onClick={() => setActiveTab("phone")}
          >
            手机登录
          </button>
          <button
            type="button"
            className={`${styles.tabButton} ${activeTab === "email" ? styles.tabActive : ""}`}
            onClick={() => setActiveTab("email")}
          >
            邮箱登录
          </button>
        </div>

        {activeTab === "qrcode" && (
          <form onSubmit={handleSubmit}>
            <div style={{ textAlign: "center", padding: "1rem 0" }}>
              <p className={styles.helperText}>打开 抖音 或 抖店 扫码</p>
              <div className={styles.qrcodeBox} style={{ marginTop: "1rem" }}>
                <p>二维码占位</p>
              </div>
              <p className={styles.helperText} style={{ marginTop: "0.75rem" }}>
                授权登录将会获取你在第三方平台的昵称、头像、手机号
              </p>
              <button type="submit" className={styles.primaryButton} style={{ width: "100%", marginTop: "1rem" }}>
                模拟扫码登录
              </button>
            </div>
          </form>
        )}

        {activeTab === "phone" && (
          <form onSubmit={handleSubmit} className={styles.form}>
            <input
              type="tel"
              className={styles.input}
              placeholder="请输入手机号"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />

            <div className={styles.inputRow}>
              <input
                type="text"
                className={styles.input}
                placeholder="请输入验证码"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              />
              <button type="button" className={styles.secondaryButton} style={{ whiteSpace: "nowrap" }}>
                获取验证码
              </button>
            </div>

            <button type="submit" className={styles.primaryButton}>
              登录
            </button>

            <p className={styles.helperText}>
              未注册手机号验证后自动登录，登录即代表同意{" "}
              <a href="#">服务协议</a> 和 <a href="#">隐私条款</a>
            </p>
          </form>
        )}

        {activeTab === "email" && (
          <form onSubmit={handleSubmit} className={styles.form}>
            {isRegister && (
              <input
                type="text"
                className={styles.input}
                placeholder="请输入用户名"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            )}

            <input
              type="email"
              className={styles.input}
              placeholder="请输入邮箱"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
            />

            <div className={styles.passwordField}>
              <input
                type={showPassword ? "text" : "password"}
                className={styles.input}
                placeholder="密码（演示模式，任意密码即可）"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              />
              <button
                type="button"
                className={styles.togglePassword}
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            {isRegister && (
              <input
                type={showPassword ? "text" : "password"}
                className={styles.input}
                placeholder="确认密码"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
              />
            )}

            <button type="submit" className={styles.primaryButton}>
              {isRegister ? "注册并登录" : "登录"}
            </button>

            <button type="button" className={styles.ghostButton} onClick={() => setIsRegister(!isRegister)}>
              {isRegister ? "已有账号？去登录" : "没有账号？立即注册"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
