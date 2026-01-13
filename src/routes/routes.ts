import { Express } from 'express';
import { Database } from 'sqlite';
import { registerProductRoutes } from './products.js';
import { registerSalesRoutes } from './sales.js'; 
import { registerReportRoutes } from './reports.js'; 
import { registerUserRoutes } from './users.js'; 

export function setupRoutes(app: Express, db: Database) {
    registerProductRoutes(app, db);
    registerSalesRoutes(app, db); 
    registerReportRoutes(app, db); 
    registerUserRoutes(app, db); 
}