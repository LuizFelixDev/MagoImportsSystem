import { Express, Request, Response } from 'express';
import { Pool } from 'pg';

interface SaleItem {
    produtoId: number;
    quantidade: number;
}

interface Sale {
    data: string;
    cliente?: string | null;
    itens: SaleItem[] | string;
    valor_total: number;
    forma_pagamento: string;
    status_venda: string;
}

export function registerSalesRoutes(app: Express, db: Pool) {
    app.post('/sales', async (req: Request<{}, {}, Sale>, res: Response) => {
        const { data, cliente, itens, valor_total, forma_pagamento, status_venda } = req.body;
        const client = await db.connect();

        try {
            await client.query('BEGIN');

            const itensParaProcessar: SaleItem[] = typeof itens === 'string' ? JSON.parse(itens) : itens;

            for (const item of itensParaProcessar) {
                const prodRes = await client.query('SELECT quantidade_em_estoque, nome FROM products WHERE id = $1', [item.produtoId]);
                if (prodRes.rows.length === 0 || prodRes.rows[0].quantidade_em_estoque < item.quantidade) {
                    throw new Error(`Estoque insuficiente: ${prodRes.rows[0]?.nome || item.produtoId}`);
                }
                await client.query('UPDATE products SET quantidade_em_estoque = quantidade_em_estoque - $1 WHERE id = $2', [item.quantidade, item.produtoId]);
            }

            const result = await client.query(`
                INSERT INTO sales (data, cliente, itens, valor_total, forma_pagamento, status_venda)
                VALUES ($1, $2, $3, $4, $5, $6) RETURNING *
            `, [data, cliente || null, JSON.stringify(itensParaProcessar), valor_total, forma_pagamento, status_venda]);

            await client.query('COMMIT');
            res.status(201).json(result.rows[0]);
        } catch (error: any) {
            await client.query('ROLLBACK');
            res.status(400).json({ error: error.message });
        } finally {
            client.release();
        }
    });

    app.get('/sales', async (req: Request, res: Response) => {
        try {
            const result = await db.query('SELECT * FROM sales');
            const sales = result.rows.map(s => ({ ...s, itens: JSON.parse(s.itens) }));
            res.json(sales);
        } catch (error) {
            res.status(500).json({ error: 'Erro ao buscar vendas.' });
        }
    });
}