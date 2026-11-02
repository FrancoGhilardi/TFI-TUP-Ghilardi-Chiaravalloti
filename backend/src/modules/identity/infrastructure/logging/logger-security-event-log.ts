import { Injectable, Logger } from "@nestjs/common";
import { SecurityEventLog } from "../../application/ports/security-event-log.js";

/** Writes security events to the application log as warnings. */
@Injectable()
export class LoggerSecurityEventLog extends SecurityEventLog {
  private readonly logger = new Logger(LoggerSecurityEventLog.name);

  refreshTokenReused(userId: string): void {
    this.logger.warn(`Refresh token reused; all sessions revoked for user ${userId}`);
  }
}
