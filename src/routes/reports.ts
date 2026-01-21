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
                SELECT id, nome, quantidade_em_estoque, preco, estoque_minimo, data_de_cadastro as data_criacao
                FROM products 
                WHERE ativo = 1
                ORDER BY quantidade_em_estoque ASC
            `);

            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            const isoDate = thirtyDaysAgo.toISOString();

            const stagnantProducts = await db.all(`
                SELECT nome, quantidade_em_estoque, data_de_cadastro as data_criacao 
                FROM products 
                WHERE ativo = 1 AND data_de_cadastro <= ? AND quantidade_em_estoque > 0
                ORDER BY data_de_cadastro ASC
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

    app.get('/reports/procurement/suggested', dbCheck, async (req: Request, res: Response) => {
        try {
            const productsToBuy = await db.all(`
                SELECT 
                    nome, 
                    quantidade_em_estoque, 
                    estoque_minimo,
                    (estoque_minimo - quantidade_em_estoque) as necessidade_reposicao
                FROM products 
                WHERE ativo = 1 AND quantidade_em_estoque <= estoque_minimo
                ORDER BY (estoque_minimo - quantidade_em_estoque) DESC
            `);
            res.json(productsToBuy);
        } catch (error) {
            res.status(500).json({ error: 'Erro ao gerar relatório de compras.' });
        }
    });

    app.get('/reports/products/performance', dbCheck, async (req: Request, res: Response) => {
        const { startDate, endDate } = req.query;
        try {
            const sales = await db.all(`
                SELECT itens FROM sales 
                WHERE data BETWEEN ? AND ? AND status_venda = 'Concluída'
            `, [startDate || '1970-01-01', endDate || '9999-12-31']);

            const performance: Record<number, { nome: string, total: number }> = {};

            sales.forEach(sale => {
                const itens = JSON.parse(sale.itens);
                itens.forEach((item: any) => {
                    const id = item.produtoId;
                    if (!performance[id]) {
                        performance[id] = { nome: item.nomeProduto, total: 0 };
                    }
                    performance[id].total += item.quantidade;
                });
            });

            const result = Object.values(performance).sort((a, b) => b.total - a.total);
            res.json({
                bestSellers: result.slice(0, 10),
                worstSellers: [...result].reverse().slice(0, 10)
            });
        } catch (error) {
            res.status(500).json({ error: 'Erro ao processar performance.' });
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
}