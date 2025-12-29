import { Injectable } from 'injection-js';
import type { AbstractLoggerService } from './abstract-logger.service';

@Injectable()
export class ConsoleLoggerService implements AbstractLoggerService {
  logError(message: string | object, ...args: any[]): void {
    // biome-ignore lint/suspicious/noConsole: <explanation>
    console.error(message, ...args);
  }

  logWarning(message: string | object, ...args: any[]): void {
    // biome-ignore lint/suspicious/noConsole: <explanation>
    console.warn(message, ...args);
  }

  logDebug(message: string | object, ...args: any[]): void {
    // biome-ignore lint/suspicious/noConsole: <explanation>
    console.debug(message, ...args);
  }
}
