import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type MouseEvent,
  type PointerEvent,
} from "react";
import { X, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { login, register, requestVerificationCode } from "../api/user";
import { setAuthToken } from "../utils/authToken";
import styles from "./AuthModal.module.css";
import type { User } from "../store/useStore";

const VERIFICATION_COOLDOWN = 60;

const createInitialFormData = () => ({
  email: "",
  phone: "",
  password: "",
  confirmPassword: "",
  name: "",
  code: "",
});

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: (user: User) => void;
}

export function AuthModal({ isOpen, onClose, onLogin }: AuthModalProps) {
  const [activeTab, setActiveTab] = useState<"qrcode" | "phone" | "email">("email");
  const [showPassword, setShowPassword] = useState(false);
  const [isRegister, setIsRegister] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState(createInitialFormData);
  const [isCodeSent, setIsCodeSent] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [isSendingCode, setIsSendingCode] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const pointerDownInsideRef = useRef(false);
  const normalizedEmail = formData.email.trim().toLowerCase();
  const trimmedVerificationCode = formData.code.trim();

  useEffect(() => {
    if (resendCooldown <= 0 || typeof window === "undefined") return;
    const timer = window.setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [resendCooldown]);

  const resetState = () => {
    setFormData(createInitialFormData());
    setShowPassword(false);
    setIsRegister(false);
    setIsCodeSent(false);
    setResendCooldown(0);
    setIsSendingCode(false);
    setActiveTab("email");
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  if (!isOpen) return null;

  const isEmailBaseInvalid = !normalizedEmail || !formData.password;
  const isRegisterInvalid =
    !isCodeSent ||
    trimmedVerificationCode.length < 6 ||
    !formData.confirmPassword ||
    formData.password !== formData.confirmPassword;
  const isEmailSubmitDisabled =
    isSubmitting || isEmailBaseInvalid || (isRegister && isRegisterInvalid);
  const resendButtonLabel = isCodeSent ? "重新发送验证码" : "获取验证码";
  const resendButtonText =
    resendCooldown > 0 ? `${resendButtonLabel} (${resendCooldown}s)` : resendButtonLabel;

  const handleBackdropPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (!modalRef.current) return;
    pointerDownInsideRef.current = modalRef.current.contains(event.target as Node);
  };

  const handleBackdropClick = (event: MouseEvent<HTMLDivElement>) => {
    if (!modalRef.current) return;
    const clickedInside = modalRef.current.contains(event.target as Node);
    const startedInside = pointerDownInsideRef.current;
    pointerDownInsideRef.current = false;

    if (clickedInside || startedInside) {
      return;
    }

    handleClose();
  };

  const handleSendCode = async () => {
    if (!isRegister) {
      toast.info("请切换到注册模式获取验证码");
      return;
    }
    if (resendCooldown > 0 || isSendingCode) return;

    if (!normalizedEmail) {
      toast.error("请先输入邮箱");
      return;
    }

    setIsSendingCode(true);
    try {
      await requestVerificationCode({
        email: normalizedEmail,
        name: formData.name || undefined,
      });
      toast.success("验证码已发送至邮箱，请查收");
      setFormData((prev) => ({ ...prev, email: normalizedEmail }));
      setIsCodeSent(true);
      setResendCooldown(VERIFICATION_COOLDOWN);
    } catch (error) {
      console.error("发送验证码失败", error);
    } finally {
      setIsSendingCode(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (activeTab !== "email") {
      toast.info("当前仅支持邮箱登录，请切换到邮箱登录方式");
      return;
    }

    if (!normalizedEmail || !formData.password) {
      toast.error("请输入邮箱和密码");
      return;
    }

    if (isRegister && formData.password !== formData.confirmPassword) {
      toast.error("两次输入的密码不一致");
      return;
    }

    if (isRegister) {
      if (trimmedVerificationCode.length < 6) {
        toast.error("请输入 6 位验证码");
        return;
      }
      if (!isCodeSent) {
        toast.error("请先获取验证码");
        return;
      }
    }

    setIsSubmitting(true);

    try {
      if (isRegister) {
        await register({
          email: normalizedEmail,
          password: formData.password,
          name: formData.name || undefined,
          verificationCode: trimmedVerificationCode,
        });
        toast.success("注册成功，正在登录");
      }

      const authResult = await login({
        email: normalizedEmail,
        password: formData.password,
      });
      setAuthToken(authResult.token);
      onLogin(authResult.user);
      handleClose();
    } catch (error) {
      console.error("登录失败", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className={styles.overlay}
      onPointerDown={handleBackdropPointerDown}
      onClick={handleBackdropClick}
    >
      <div className={styles.modal} ref={modalRef}>
        <button onClick={handleClose} className={styles.closeButton}>
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
              <button
                type="submit"
                className={styles.primaryButton}
                style={{ width: "100%", marginTop: "1rem" }}
                disabled={isSubmitting}
              >
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

            <button type="submit" className={styles.primaryButton} disabled={isSubmitting}>
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

            {isRegister && (
              <div className={styles.inputRow}>
                <input
                  type="text"
                  className={styles.input}
                  placeholder="请输入邮箱验证码"
                  value={formData.code}
                  onChange={(e) =>
                    setFormData({ ...formData, code: e.target.value.replace(/\s/g, "") })
                  }
                  maxLength={6}
                  inputMode="numeric"
                />
                <button
                  type="button"
                  className={styles.secondaryButton}
                  onClick={handleSendCode}
                  disabled={isSendingCode || resendCooldown > 0 || !normalizedEmail}
                  style={{ whiteSpace: "nowrap" }}
                >
                  {resendButtonText}
                </button>
              </div>
            )}

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

            <button type="submit" className={styles.primaryButton} disabled={isEmailSubmitDisabled}>
              {isRegister ? "注册并登录" : "登录"}
            </button>

            <button
              type="button"
              className={styles.ghostButton}
              onClick={() => {
                setIsRegister(!isRegister);
                setIsCodeSent(false);
                setResendCooldown(0);
                setFormData((prev) => ({ ...prev, code: "" }));
              }}
            >
              {isRegister ? "已有账号？去登录" : "没有账号？立即注册"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
