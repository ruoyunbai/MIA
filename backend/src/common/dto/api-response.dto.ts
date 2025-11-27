import type { ApiResponse } from '../../../../shared/api-contracts';

export const buildSuccessResponse = <T>(
  data: T,
  message = 'success',
): ApiResponse<T> => ({
  code: 0,
  message,
  data,
});

export type { ApiResponse };
