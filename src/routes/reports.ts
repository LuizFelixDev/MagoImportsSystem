import { Express, Request, Response } from 'express';
import { Pool } from 'pg';
import { authMiddleware } from '../middleware/auth.js';

export function registerReportRoutes(app: Express, db: Pool) {
    app.get('/reports/dashboard', authMiddleware, async (req: Request, res: Response) => {
        try {
            const revenueResult = await db.query('SELECT SUM(valor_total) as total FROM sales WHERE status_venda = $1', ['Concluída']);
            const productsResult = await db.query('SELECT COUNT(*) as total FROM products');
            const salesResult = await db.query('SELECT COUNT(*) as total FROM sales');
            
            res.json({
                totalRevenue: parseFloat(revenueResult.rows[0].total) || 0,
                totalProducts: parseInt(productsResult.rows[0].total),
                totalSales: parseInt(salesResult.rows[0].total)
            });
        } catch (error) {
            res.status(500).json({ error: 'Erro ao gerar relatório.' });
        }
    });
}