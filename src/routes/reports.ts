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

    app.get('/reports/sales/by-status', authMiddleware, async (req: Request, res: Response) => {
        try {
            const result = await db.query(
                'SELECT status_venda, COUNT(*) as count, SUM(valor_total) as total_valor FROM sales GROUP BY status_venda'
            );
            const formatted = result.rows.map(r => ({
                status_venda: r.status_venda,
                count: parseInt(r.count),
                total_valor: parseFloat(r.total_valor) || 0
            }));
            res.json(formatted);
        } catch (error) {
            res.status(500).json({ error: 'Erro ao gerar relatório por status.' });
        }
    });

    app.get('/reports/inventory/full', authMiddleware, async (req: Request, res: Response) => {
        try {
            const productsResult = await db.query('SELECT * FROM products');
            
            let totalItems = 0;
            let critical = 0;
            let warning = 0;

            for (const p of productsResult.rows) {
                const stock = Number(p.quantidade_em_estoque);
                const min = Number(p.estoque_minimo);
                totalItems += stock;
                if (stock <= min) {
                    critical++;
                } else if (stock <= min * 1.5) {
                    warning++;
                }
            }

            res.json({
                all: productsResult.rows,
                summary: {
                    totalItems,
                    critical,
                    warning
                }
            });
        } catch (error) {
            res.status(500).json({ error: 'Erro ao gerar relatório de estoque.' });
        }
    });

    app.get('/reports/procurement/suggested', authMiddleware, async (req: Request, res: Response) => {
        try {
            const result = await db.query(
                'SELECT id, nome, quantidade_em_estoque, estoque_minimo FROM products WHERE quantidade_em_estoque <= estoque_minimo'
            );
            const suggested = result.rows.map(p => {
                const stock = Number(p.quantidade_em_estoque);
                const min = Number(p.estoque_minimo);
                return {
                    id: p.id,
                    nome: p.nome,
                    quantidade_em_estoque: stock,
                    estoque_minimo: min,
                    necessidade_reposicao: min - stock
                };
            });
            res.json(suggested);
        } catch (error) {
            res.status(500).json({ error: 'Erro ao gerar sugestões de reposição.' });
        }
    });

    app.get('/reports/products/performance', authMiddleware, async (req: Request, res: Response) => {
        const { startDate, endDate } = req.query;
        try {
            const salesRes = await db.query(
                "SELECT itens FROM sales WHERE status_venda = 'Concluída' AND data >= $1 AND data <= $2",
                [startDate, endDate]
            );
            const productsRes = await db.query("SELECT id, nome FROM products");
            
            const salesCount: { [key: number]: number } = {};
            for (const p of productsRes.rows) {
                salesCount[p.id] = 0;
            }

            for (const row of salesRes.rows) {
                const itens = typeof row.itens === 'string' ? JSON.parse(row.itens) : row.itens;
                if (Array.isArray(itens)) {
                    for (const item of itens) {
                        const pid = Number(item.produtoId);
                        if (salesCount[pid] !== undefined) {
                            salesCount[pid] += Number(item.quantidade);
                        } else {
                            salesCount[pid] = Number(item.quantidade);
                        }
                    }
                }
            }

            const performanceList = productsRes.rows.map(p => ({
                id: p.id,
                nome: p.nome,
                total: salesCount[p.id] || 0
            }));

            const bestSellers = [...performanceList].sort((a, b) => b.total - a.total);
            const worstSellers = [...performanceList].sort((a, b) => a.total - b.total);

            res.json({
                bestSellers,
                worstSellers
            });
        } catch (error) {
            res.status(500).json({ error: 'Erro ao gerar relatório de performance.' });
        }
    });
}