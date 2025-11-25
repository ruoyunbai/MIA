import type { Request } from 'express';

declare module 'multer' {
  export interface StorageEngine {
    _handleFile(
      req: Request,
      file: Express.Multer.File,
      callback: (
        error?: Error | null,
        info?: Partial<Express.Multer.File>,
      ) => void,
    ): void;
    _removeFile(
      req: Request,
      file: Express.Multer.File,
      callback: (error: Error | null) => void,
    ): void;
  }

  export interface Limits {
    fileSize?: number;
  }

  export interface MulterOptions {
    storage?: StorageEngine;
    limits?: Limits;
  }

  export type FileFilterCallback = (
    error: Error | null,
    acceptFile: boolean,
  ) => void;

  export function memoryStorage(): StorageEngine;
}
