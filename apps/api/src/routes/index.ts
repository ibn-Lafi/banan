import { Router } from "express";
import { setupRouter } from "./setup.routes.js";
import { authRouter } from "./auth.routes.js";
import { customersRouter } from "./customers.routes.js";
import { categoriesRouter, productsRouter } from "./products.routes.js";
import { invoicesRouter } from "./invoices.routes.js";
import { paymentsRouter } from "./payments.routes.js";
import { returnsRouter } from "./returns.routes.js";
import { reportsRouter } from "./reports.routes.js";
import { usersRouter } from "./users.routes.js";
import { auditLogsRouter } from "./auditLogs.routes.js";
import { companySettingsRouter } from "./companySettings.routes.js";

export const apiRouter = Router();

apiRouter.use("/setup", setupRouter);
apiRouter.use("/auth", authRouter);
apiRouter.use("/customers", customersRouter);
apiRouter.use("/products", productsRouter);
apiRouter.use("/categories", categoriesRouter);
apiRouter.use("/invoices", invoicesRouter);
apiRouter.use("/payments", paymentsRouter);
apiRouter.use("/returns", returnsRouter);
apiRouter.use("/reports", reportsRouter);
apiRouter.use("/users", usersRouter);
apiRouter.use("/audit-logs", auditLogsRouter);
apiRouter.use("/company-settings", companySettingsRouter);
