import { Express, Request, Response } from 'express';
import { Pool } from 'pg';

export function registerReportRoutes(app: Express, db: Pool) {
    app.get('/reports/dashboard', async (req: Request, res: Response) => {
        try {
            const sales = await db.query('SELECT valor_total FROM sales WHERE status_venda = $1', ['Concluída']);
            const products = await db.query('SELECT COUNT(*) as total FROM products');
            
            const totalRevenue = sales.rows.reduce((acc, curr) => acc + curr.valor_total, 0);
            
            res.json({
                totalRevenue,
                totalProducts: parseInt(products.rows[0].total),
                totalSales: sales.rowCount
            });
        } catch (error) {
            res.status(500).json({ error: 'Erro ao gerar relatório.' });
        }
    });
}