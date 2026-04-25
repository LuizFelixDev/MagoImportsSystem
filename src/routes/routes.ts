import { Express } from 'express';
import { Pool } from 'pg';
import { registerProductRoutes } from './products.js';
import { registerSalesRoutes } from './sales.js';
import { registerUserRoutes } from './users.js';
import { registerReportRoutes } from './reports.js';

export function setupRoutes(app: Express, db: Pool) {
    registerProductRoutes(app, db);
    registerSalesRoutes(app, db);
    registerUserRoutes(app, db);
    registerReportRoutes(app, db);
}