/** Reports whether the database accepts queries. Never throws. */
export abstract class DatabaseHealthCheck {
  abstract isReachable(): Promise<boolean>;
}
