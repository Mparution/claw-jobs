// ===========================================
// CLAW JOBS - LOGGING UTILITY
// ===========================================
// Structured logging for production
// Replace console.log/error with this for better observability

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  [key: string]: unknown;
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: LogContext;
}

const isDev = process.env.NODE_ENV === 'development';

function formatLog(entry: LogEntry): string {
  if (isDev) {
    // Pretty print in development
    const ctx = entry.context ? ` ${JSON.stringify(entry.context)}` : '';
    return `[${entry.level.toUpperCase()}] ${entry.message}${ctx}`;
  }
  // JSON format for production (better for log aggregation)
  return JSON.stringify(entry);
}

function log(level: LogLevel, message: string, context?: LogContext): void {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...(context && { context }),
  };

  const formatted = formatLog(entry);

  switch (level) {
    case 'error':
      console.error(formatted);
      break;
    case 'warn':
      console.warn(formatted);
      break;
    case 'debug':
      if (isDev) console.log(formatted);
      break;
    default:
      console.log(formatted);
  }
}

export const logger = {
  debug: (message: string, context?: LogContext) => log('debug', message, context),
  info: (message: string, context?: LogContext) => log('info', message, context),
  warn: (message: string, context?: LogContext) => log('warn', message, context),
  error: (message: string, context?: LogContext) => log('error', message, context),
};

// Helper for API route errors
export function logApiError(route: string, error: unknown, context?: LogContext): void {
  logger.error(`API Error: ${route}`, {
    ...context,
    error: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
  });
}

export default logger;
