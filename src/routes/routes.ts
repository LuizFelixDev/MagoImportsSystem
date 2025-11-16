import { Express } from 'express';
import { Database } from 'sqlite';
import { registerProductRoutes } from './products.js';
import { registerSaleRoutes } from './sales.js'; 

function registerUserRoutes(app: Express, db: Database) {
    console.log("   -> Rotas de Usuários (Placeholder)");
}

export function setupRoutes(app: Express, db: Database) {
    registerProductRoutes(app, db);
    registerSaleRoutes(app, db); 
    
    registerUserRoutes(app, db); 
}