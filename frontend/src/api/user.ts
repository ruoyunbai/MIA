import request from '../utils/request';
import type { User } from '../store/types';

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
  return request.post<LoginResponse, LoginResponse>('/auth/login', payload);
}

export function register(payload: RegisterPayload) {
  return request.post<RegisterPayload, User>('/users', payload);
}

export function fetchCurrentUser() {
  return request.get<User, User>('/users/me');
}

export interface RequestVerificationPayload {
  email: string;
  name?: string;
}

export function requestVerificationCode(payload: RequestVerificationPayload) {
  return request.post<RequestVerificationPayload, null>(
    '/users/request-verification',
    payload,
  );
}
