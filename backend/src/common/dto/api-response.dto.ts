export interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
}

export const buildSuccessResponse = <T>(
  data: T,
  message = 'success',
): ApiResponse<T> => ({
  code: 0,
  message,
  data,
});
