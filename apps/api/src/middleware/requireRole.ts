import type { NextFunction, Request, Response } from "express";
import type { UserRole } from "@banan/types";
import { ApiError } from "../lib/ApiError.js";

export function requireRole(...roles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(ApiError.unauthorized());
    }
    if (!roles.includes(req.user.role)) {
      return next(ApiError.forbidden());
    }
    next();
  };
}
