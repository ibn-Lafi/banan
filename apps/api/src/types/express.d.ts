import type { UserRole, UserStatus } from "@banan/types";

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        company_id: string;
        username: string;
        full_name: string;
        role: UserRole;
        status: UserStatus;
      };
    }
  }
}

export {};
