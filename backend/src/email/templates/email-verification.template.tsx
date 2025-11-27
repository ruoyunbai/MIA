import { Body, Button, Container, Head, Hr, Html, Preview, Text } from '@react-email/components';
import * as React from 'react';
import type { ReactElement } from 'react';

interface EmailVerificationTemplateProps {
  userName: string;
  verifyUrl?: string;
  code: string;
  expiresInMinutes: number;
}

const containerStyle = {
  backgroundColor: '#ffffff',
  borderRadius: '12px',
  padding: '32px',
  border: '1px solid #f0f0f0',
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
} satisfies React.CSSProperties;

const textStyle = {
  color: '#1f2933',
  fontSize: '14px',
  lineHeight: '22px',
  margin: '8px 0',
} satisfies React.CSSProperties;

const buttonStyle = {
  backgroundColor: '#2563eb',
  color: '#ffffff',
  textDecoration: 'none',
  padding: '12px 24px',
  borderRadius: '8px',
  display: 'inline-block',
  fontWeight: 600,
  fontSize: '14px',
} satisfies React.CSSProperties;

export const EmailVerificationTemplate = ({
  userName,
  verifyUrl,
  code,
  expiresInMinutes,
}: EmailVerificationTemplateProps): ReactElement => (
  <Html>
    <Head />
    <Preview>MIA 邮箱验证</Preview>
    <Body style={{ backgroundColor: '#f5f7fb', padding: '24px' }}>
      <Container style={containerStyle}>
        <Text style={{ ...textStyle, fontSize: '16px', marginTop: 0 }}>
          您好 {userName}，
        </Text>
        <Text style={textStyle}>
          为了验证您的邮箱并保护账号安全，请在 {expiresInMinutes} 分钟内完成以下操作。
        </Text>

        {verifyUrl ? (
          <>
            <Text style={textStyle}>点击下面的按钮即可完成验证：</Text>
            <Button style={buttonStyle} href={verifyUrl}>
              验证邮箱
            </Button>
            <Text style={{ ...textStyle, fontSize: '12px', color: '#6b7280' }}>
              如果按钮无法点击，可复制下方链接到浏览器打开：
            </Text>
            <Text style={{ ...textStyle, fontSize: '12px', wordBreak: 'break-all' }}>
              {verifyUrl}
            </Text>
          </>
        ) : null}

        <Hr style={{ margin: '28px 0', borderColor: '#f0f0f0' }} />
        <Text style={{ ...textStyle, fontWeight: 600 }}>验证码</Text>
        <Text
          style={{
            ...textStyle,
            fontSize: '28px',
            letterSpacing: '8px',
            fontWeight: 700,
            textAlign: 'center',
          }}
        >
          {code}
        </Text>
        <Text style={{ ...textStyle, fontSize: '12px', color: '#6b7280' }}>
          请在系统中输入完整验证码完成验证。
        </Text>

        <Text style={{ ...textStyle, marginTop: '24px' }}>
          如果这不是您的操作，请忽略本邮件。
        </Text>
        <Text style={{ ...textStyle, color: '#9ca3af', fontSize: '12px' }}>
          —— MIA 商家智能助手团队
        </Text>
      </Container>
    </Body>
  </Html>
);
