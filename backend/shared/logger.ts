export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

export interface StructuredLogMeta {
  job?: string;
  indicatorId?: string;
  sourceId?: string;
  durationMs?: number;
  rowCount?: number;
  error?: unknown;
  [key: string]: unknown;
}

class Logger {
  private format(level: LogLevel, message: string, meta?: StructuredLogMeta): string {
    const timestamp = new Date().toISOString();
    const metaStr = meta ? ` | ${JSON.stringify(meta)}` : '';
    return `[${timestamp}] [${level}] ${message}${metaStr}`;
  }

  debug(message: string, meta?: StructuredLogMeta): void {
    if (process.env.DEBUG) {
      console.debug(this.format('DEBUG', message, meta));
    }
  }

  info(message: string, meta?: StructuredLogMeta): void {
    console.log(this.format('INFO', message, meta));
  }

  warn(message: string, meta?: StructuredLogMeta): void {
    console.warn(this.format('WARN', message, meta));
  }

  error(message: string, meta?: StructuredLogMeta): void {
    console.error(this.format('ERROR', message, meta));
  }
}

export const logger = new Logger();
