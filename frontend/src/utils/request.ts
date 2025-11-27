import axios, {
    type AxiosInstance,
    type AxiosError,
    type InternalAxiosRequestConfig,
    type AxiosResponse,
    type AxiosRequestHeaders
} from 'axios';
import { getAuthToken, clearAuthToken, AUTH_LOGOUT_EVENT } from './authToken';
import notify from './message';
import { markErrorHandled, extractServerMessage } from './error';
import type { ApiResponse } from '../../../shared/api-contracts';

// 创建 axios 实例
const request: AxiosInstance = axios.create({
    // 使用环境变量中的 API 地址，如果没有则默认为 /api
    baseURL: import.meta.env.VITE_API_URL || '/api',
    // 请求超时时间：10秒
    timeout: 10000,
    headers: {
        'Content-Type': 'application/json',
    },
});

// 请求拦截器
request.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
        const token = getAuthToken();
        if (token) {
            const headers: AxiosRequestHeaders = config.headers ?? {};
            headers.Authorization = `Bearer ${token}`;
            config.headers = headers;
        }

        return config;
    },
    (error: AxiosError) => {
        // 处理请求错误
        console.error('Request Error:', error);
        return Promise.reject(error);
    }
);

// 响应拦截器
const handleResponse = (response: AxiosResponse<ApiResponse<unknown>>) => {
        // 对响应数据做点什么
        const res = response.data as ApiResponse<unknown> | Record<string, unknown>;

        // 如果响应类型是 blob 或 arraybuffer (用于文件下载等)，直接返回 response
        if (response.config.responseType === 'blob' || response.config.responseType === 'arraybuffer') {
            return response;
        }

        // 若后端未使用统一响应格式（没有 code 字段），直接返回原始数据
        if (res && typeof res === 'object' && !('code' in res)) {
            return res as unknown;
        }

        // 业务状态码判断
        // 假设后端约定 code === 0 或 200 为成功
        // 请根据实际情况修改这里的判断逻辑
        const codeValue =
            typeof res.code === 'number' ? res.code : Number(res.code);
        const successCode =
            codeValue === 0 ||
            (Number.isFinite(codeValue) && codeValue >= 200 && codeValue < 300);
        if (!successCode) {
            const errorMessage = res.message || '系统错误';
            notify.error(errorMessage);
            const error = new Error(errorMessage);
            markErrorHandled(error);
            return Promise.reject(error);
        }

        // 成功时直接返回 data 数据部分，简化调用方的代码
        return res.data;
};

request.interceptors.response.use(
    // axios 类型定义要求返回 AxiosResponse，但我们希望直接下发 data，
    // 因此这里通过强制转换绕过类型检查，保持调用方拿到解包后的数据。
    handleResponse as unknown as (
        (value: AxiosResponse<ApiResponse<unknown>>) => AxiosResponse<ApiResponse<unknown>> | Promise<AxiosResponse<ApiResponse<unknown>>>
    ),
    (error: AxiosError) => {
        // 处理响应错误
        console.error('Response Error:', error);
        let message = extractServerMessage(error.response?.data) || '未知错误';

        if (error.response) {
            const status = error.response.status;
            switch (status) {
                case 400:
                    message = message || '请求参数错误 (400)';
                    break;
                case 401:
                    message = message || '未授权，请重新登录 (401)';
                    clearAuthToken();
                    if (typeof window !== 'undefined') {
                        window.dispatchEvent(new Event(AUTH_LOGOUT_EVENT));
                    }
                    break;
                case 403:
                    message = message || '拒绝访问 (403)';
                    break;
                case 404:
                    message = message || '请求的资源不存在 (404)';
                    break;
                case 408:
                    message = message || '请求超时 (408)';
                    break;
                case 500:
                    message = message || '服务器内部错误 (500)';
                    break;
                case 502:
                    message = message || '网关错误 (502)';
                    break;
                case 503:
                    message = message || '服务不可用 (503)';
                    break;
                case 504:
                    message = message || '网关超时 (504)';
                    break;
                default:
                    message = message || `连接错误 (${status})`;
            }
        } else if (error.request) {
            message = '网络连接异常，请检查网络设置';
        } else {
            message = error.message;
        }

        // 使用全局消息组件显示错误提示
        notify.error(message);
        markErrorHandled(error);
        error.message = message;

        return Promise.reject(error);
    }
);

export default request;
