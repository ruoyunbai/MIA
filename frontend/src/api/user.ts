import request from '../utils/request';
import type { User } from '../store/useStore';

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload extends LoginPayload {
  name?: string;
  verificationCode: string;
}

export interface LoginResponse {
  token: string;
  user: User;
}

export function login(payload: LoginPayload) {
  return request.post<LoginResponse>('/auth/login', payload);
}

export function register(payload: RegisterPayload) {
  return request.post<User>('/users', payload);
}

export function fetchCurrentUser() {
  return request.get<User>('/users/me');
}

export interface RequestVerificationPayload {
  email: string;
  name?: string;
}

export function requestVerificationCode(payload: RequestVerificationPayload) {
  return request.post<null>('/users/request-verification', payload);
}
