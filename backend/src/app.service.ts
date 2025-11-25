import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class AppService {
  constructor(private dataSource: DataSource) {}

  getHello(): string {
    return 'Hello World!';
  }

  async checkDatabaseConnection(): Promise<string> {
    try {
      if (this.dataSource.isInitialized) {
        await this.dataSource.query('SELECT 1');
        return 'Database connection is healthy';
      } else {
        return 'Database connection is not initialized';
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return `Database connection failed: ${message}`;
    }
  }
}
