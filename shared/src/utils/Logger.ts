/**
 * Logger Service - Sistema de logging com níveis
 * Permite controlar verbosidade em desenvolvimento vs produção
 */

export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3,
}

export class Logger {
  private static level: LogLevel = LogLevel.WARN; // Default: production mode
  private static prefix: string = '';

  /**
   * Define o nível mínimo de logging
   */
  public static setLevel(level: LogLevel): void {
    this.level = level;
    console.log(`📊 Logger level set to: ${LogLevel[level]}`);
  }

  /**
   * Define prefixo para todos os logs (útil para distinguir cliente/servidor)
   */
  public static setPrefix(prefix: string): void {
    this.prefix = prefix;
  }

  /**
   * Log de erro (sempre exibido)
   */
  public static error(...args: any[]): void {
    if (this.level >= LogLevel.ERROR) {
      console.error(`${this.prefix}❌`, ...args);
    }
  }

  /**
   * Log de warning (exibido em WARN ou superior)
   */
  public static warn(...args: any[]): void {
    if (this.level >= LogLevel.WARN) {
      console.warn(`${this.prefix}⚠️`, ...args);
    }
  }

  /**
   * Log de informação (exibido em INFO ou superior)
   */
  public static info(...args: any[]): void {
    if (this.level >= LogLevel.INFO) {
      console.log(`${this.prefix}ℹ️`, ...args);
    }
  }

  /**
   * Log de debug (apenas em modo DEBUG)
   */
  public static debug(...args: any[]): void {
    if (this.level >= LogLevel.DEBUG) {
      console.log(`${this.prefix}🔍`, ...args);
    }
  }

  /**
   * Grupo de logs (debug only)
   */
  public static group(label: string, callback: () => void): void {
    if (this.level >= LogLevel.DEBUG) {
      console.group(`${this.prefix}📁 ${label}`);
      callback();
      console.groupEnd();
    }
  }

  /**
   * Performance timing (debug only)
   */
  public static time(label: string): void {
    if (this.level >= LogLevel.DEBUG) {
      console.time(`${this.prefix}⏱️ ${label}`);
    }
  }

  public static timeEnd(label: string): void {
    if (this.level >= LogLevel.DEBUG) {
      console.timeEnd(`${this.prefix}⏱️ ${label}`);
    }
  }
}
