export abstract class DatabaseHealthCheck {
  abstract isReachable(): Promise<boolean>;
}
