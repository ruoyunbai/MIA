import request from '../utils/request';

// 示例：定义接口参数类型
export interface ExampleParams {
    id: string;
}

// 示例：定义接口返回类型
export interface ExampleResponse {
    id: string;
    name: string;
}

// 示例：GET 请求
export function getExample(params: ExampleParams) {
    return request.get<ExampleResponse>('/example/path', { params });
}

// 示例：POST 请求
export function postExample(data: any) {
    return request.post('/example/path', data);
}
