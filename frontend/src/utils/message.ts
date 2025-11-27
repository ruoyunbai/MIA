import { Message } from '@arco-design/web-react';
import type { MessageProps } from '@arco-design/web-react';

type MessageContent = MessageProps | string;
type MessageConfig = Parameters<typeof Message.config>[0];

const showMessage = {
  info: (content: MessageContent) => Message.info(content),
  success: (content: MessageContent) => Message.success(content),
  warning: (content: MessageContent) => Message.warning(content),
  error: (content: MessageContent) => Message.error(content),
  loading: (content: MessageContent) => Message.loading(content),
  normal: (content: MessageContent) => Message.normal(content),
};

export const configureGlobalMessage = (config?: MessageConfig) => {
  Message.config(config);
};

export default showMessage;
