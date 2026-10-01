export type LogLevel = 'info' | 'success' | 'warn' | 'error' | 'api' | 'telemetry';
export type LogSource =
  | 'AI Scanner'
  | 'PELP Database'
  | 'Telemetry'
  | 'Calculator'
  | 'Calendar'
  | 'Storage'
  | 'Auth'
  | 'Database'
  | 'Changelog'
  | 'System'
  | 'Console'
  | string;

export interface DevLogEntry {
  id: string;
  timestamp: string; // ISO string
  formattedTime: string; // HH:mm:ss.SSS
  level: LogLevel;
  source: LogSource;
  message: string;
  details?: any;
  durationMs?: number;
  tags?: string[];
}

type LogListener = (logs: DevLogEntry[], newEntry?: DevLogEntry) => void;

class DevLoggerManager {
  private logs: DevLogEntry[] = [];
  private listeners: Set<LogListener> = new Set();
  private maxLogs: number = 500;
  private isInitialized: boolean = false;

  constructor() {
    this.initConsoleInterception();
  }

  private formatTime(date: Date): string {
    const pad = (n: number, z = 2) => String(n).padStart(z, '0');
    return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}.${pad(date.getMilliseconds(), 3)}`;
  }

  private initConsoleInterception() {
    if (typeof window === 'undefined' || this.isInitialized) return;
    this.isInitialized = true;

    // Log initial system boot
    this.log({
      level: 'info',
      source: 'System',
      message: 'PowerForecast Dev Logger initialized (Ready for telemetry & API tracing)',
      details: {
        environment: 'Browser Client',
        timestamp: new Date().toISOString(),
        ai_engine: 'Google Gemini 3.7 Flash + Local Tesseract OCR',
      },
    });

    const originalWarn = console.warn;
    const originalError = console.error;

    console.warn = (...args: any[]) => {
      originalWarn.apply(console, args);
      try {
        const msg = args.map((a) => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ');
        if (!msg.includes('Vite') && !msg.includes('Download the React DevTools')) {
          this.log({
            level: 'warn',
            source: 'Console',
            message: msg.slice(0, 200),
            details: args.length > 1 ? args : args[0],
          });
        }
      } catch {}
    };

    console.error = (...args: any[]) => {
      originalError.apply(console, args);
      try {
        const msg = args.map((a) => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ');
        this.log({
          level: 'error',
          source: 'Console',
          message: msg.slice(0, 250),
          details: args.length > 1 ? args : args[0],
        });
      } catch {}
    };
  }

  private serializeDetails(details: any): any {
    if (!details) return details;
    if (details instanceof Error || (typeof details === "object" && ("message" in details || "name" in details))) {
      return {
        name: details.name || "Error",
        message: details.message || String(details),
        code: (details as any).code,
        stack: details.stack,
        ...details,
      };
    }
    return details;
  }

  public log(entry: Omit<DevLogEntry, 'id' | 'timestamp' | 'formattedTime'>): DevLogEntry {
    const now = new Date();
    const fullEntry: DevLogEntry = {
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp: now.toISOString(),
      formattedTime: this.formatTime(now),
      ...entry,
      details: this.serializeDetails(entry.details),
    };

    this.logs.unshift(fullEntry);
    if (this.logs.length > this.maxLogs) {
      this.logs.pop();
    }

    this.notify(fullEntry);
    return fullEntry;
  }

  public info(source: LogSource, message: string, details?: any, durationMs?: number, tags?: string[]) {
    return this.log({ level: 'info', source, message, details, durationMs, tags });
  }

  public success(source: LogSource, message: string, details?: any, durationMs?: number, tags?: string[]) {
    return this.log({ level: 'success', source, message, details, durationMs, tags });
  }

  public warn(source: LogSource, message: string, details?: any, durationMs?: number, tags?: string[]) {
    return this.log({ level: 'warn', source, message, details, durationMs, tags });
  }

  public error(source: LogSource, message: string, details?: any, durationMs?: number, tags?: string[]) {
    return this.log({ level: 'error', source, message, details, durationMs, tags });
  }

  public api(source: LogSource, message: string, details?: any, durationMs?: number, tags?: string[]) {
    return this.log({ level: 'api', source, message, details, durationMs, tags });
  }

  public telemetry(source: LogSource, message: string, details?: any, durationMs?: number, tags?: string[]) {
    return this.log({ level: 'telemetry', source, message, details, durationMs, tags });
  }

  public getLogs(): DevLogEntry[] {
    return [...this.logs];
  }

  public clear() {
    this.logs = [];
    this.log({
      level: 'info',
      source: 'System',
      message: 'Dev logs cleared by user',
    });
    this.notify();
  }

  public subscribe(listener: LogListener): () => void {
    this.listeners.add(listener);
    listener(this.getLogs());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(newEntry?: DevLogEntry) {
    // Defer listener notifications asynchronously using queueMicrotask or setTimeout
    // to avoid "Cannot update a component while rendering a different component" warnings
    if (typeof queueMicrotask === 'function') {
      queueMicrotask(() => this.dispatchListeners(newEntry));
    } else {
      setTimeout(() => this.dispatchListeners(newEntry), 0);
    }
  }

  private dispatchListeners(newEntry?: DevLogEntry) {
    const current = this.getLogs();
    this.listeners.forEach((listener) => {
      try {
        listener(current, newEntry);
      } catch {}
    });
  }
}

export const devLog = new DevLoggerManager();
