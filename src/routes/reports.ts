import { Express, Request, Response } from 'express';
import { Database } from 'sqlite';

const checkDb = (db: Database) => (req: Request, res: Response, next: Function) => {
    if (!db) return res.status(503).json({ error: 'Database connection error.' });
    next();
};

export function registerReportRoutes(app: Express, db: Database) {
    const dbCheck = checkDb(db);

    app.get('/reports/inventory/full', dbCheck, async (req: Request, res: Response) => {
        try {
            const allProducts = await db.all(`
                SELECT 
                    nome, 
                    quantidade_em_estoque, 
                    preco,
                    estoque_minimo,
                    data_criacao
                FROM products 
                WHERE ativo = 1
                ORDER BY quantidade_em_estoque ASC
            `);

            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            const isoDate = thirtyDaysAgo.toISOString();

            const stagnantProducts = await db.all(`
                SELECT nome, quantidade_em_estoque, data_criacao 
                FROM products 
                WHERE ativo = 1 AND data_criacao <= ? AND quantidade_em_estoque > 0
                ORDER BY data_criacao ASC
            `, [isoDate]);

            res.json({
                all: allProducts,
                stagnant: stagnantProducts,
                summary: {
                    totalItems: allProducts.reduce((acc, p) => acc + p.quantidade_em_estoque, 0),
                    critical: allProducts.filter(p => p.quantidade_em_estoque <= p.estoque_minimo).length,
                    warning: allProducts.filter(p => p.quantidade_em_estoque > p.estoque_minimo && p.quantidade_em_estoque <= p.estoque_minimo + 3).length
                }
            });
        } catch (error) {
            res.status(500).json({ error: 'Erro ao processar dados de estoque.' });
        }
    });

    app.get('/reports/products/low-stock', dbCheck, async (req: Request, res: Response) => {
        try {
            const products = await db.all(`
                SELECT nome, quantidade_em_estoque, preco FROM products 
                WHERE quantidade_em_estoque <= 5 AND ativo = 1
                ORDER BY quantidade_em_estoque ASC
            `);
            res.json({ count: products.length, products });
        } catch (error) {
            res.status(500).json({ error: 'Erro interno' });
        }
    });

    app.get('/reports/sales/by-status', dbCheck, async (req: Request, res: Response) => {
        try {
            const report = await db.all(`
                SELECT status_venda, COUNT(id) as count, SUM(valor_total) as total_valor 
                FROM sales GROUP BY status_venda
            `);
            res.json(report);
        } catch (error) {
            res.status(500).json({ error: 'Erro interno' });
        }
    });

    app.get('/reports/sales/ranking', dbCheck, async (req: Request, res: Response) => {
        try {
            const ranking = await db.all(`
                SELECT cliente as item_nome, COUNT(id) as total_vendas, SUM(valor_total) as receita
                FROM sales GROUP BY cliente ORDER BY total_vendas DESC
            `);
            res.json(ranking);
        } catch (error) {
            res.status(500).json({ error: 'Erro interno' });
        }
    });
}