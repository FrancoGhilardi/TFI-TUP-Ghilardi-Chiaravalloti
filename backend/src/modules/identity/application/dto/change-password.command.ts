export interface ChangePasswordCommand {
  /** The authenticated user, who can only change their own password. */
  userId: string;
  currentPassword: string;
  newPassword: string;
  userAgent?: string;
}
