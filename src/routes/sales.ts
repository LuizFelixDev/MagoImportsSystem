import { Express, Request, Response } from 'express';
import { Pool } from 'pg';

interface SaleItem {
    produtoId: number;
    quantidade: number;
}

export function registerSalesRoutes(app: Express, db: Pool) {
    app.post('/sales', async (req: Request, res: Response) => {
        const { data, cliente, itens, valor_total, forma_pagamento, status_venda } = req.body;
        const client = await db.connect();

        try {
            await client.query('BEGIN');
            const itensParaProcessar: SaleItem[] = typeof itens === 'string' ? JSON.parse(itens) : itens;

            for (const item of itensParaProcessar) {
                const prod = await client.query('SELECT quantidade_em_estoque FROM products WHERE id = $1', [item.produtoId]);
                if (prod.rows[0].quantidade_em_estoque < item.quantidade) throw new Error('Estoque insuficiente');
                await client.query('UPDATE products SET quantidade_em_estoque = quantidade_em_estoque - $1 WHERE id = $2', [item.quantidade, item.produtoId]);
            }

            const result = await client.query(
                'INSERT INTO sales (data, cliente, itens, valor_total, forma_pagamento, status_venda) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
                [data, cliente, JSON.stringify(itensParaProcessar), valor_total, forma_pagamento, status_venda]
            );

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
            res.json(result.rows.map(s => ({ ...s, itens: JSON.parse(s.itens) })));
        } catch (error) {
            res.status(500).json({ error: 'Erro ao buscar vendas.' });
        }
    });

    app.put('/sales/:id', async (req: Request, res: Response) => {
        const { id } = req.params;
        const { data, cliente, itens, valor_total, forma_pagamento, status_venda } = req.body;
        const client = await db.connect();

        try {
            await client.query('BEGIN');

            const existingSaleRes = await client.query('SELECT itens, status_venda FROM sales WHERE id = $1', [id]);
            if (existingSaleRes.rows.length === 0) throw new Error('Venda não encontrada');
            
            const oldSale = existingSaleRes.rows[0];
            const oldItens: SaleItem[] = typeof oldSale.itens === 'string' ? JSON.parse(oldSale.itens) : oldSale.itens;

            if (oldSale.status_venda !== 'Cancelada') {
                for (const item of oldItens) {
                    await client.query('UPDATE products SET quantidade_em_estoque = quantidade_em_estoque + $1 WHERE id = $2', [item.quantidade, item.produtoId]);
                }
            }

            const newItens: SaleItem[] = typeof itens === 'string' ? JSON.parse(itens) : itens;
            if (status_venda !== 'Cancelada') {
                for (const item of newItens) {
                    const prod = await client.query('SELECT quantidade_em_estoque FROM products WHERE id = $1', [item.produtoId]);
                    if (prod.rows.length === 0) throw new Error(`Produto #${item.produtoId} não encontrado`);
                    if (prod.rows[0].quantidade_em_estoque < item.quantidade) throw new Error(`Estoque insuficiente para o produto ${item.produtoId}`);
                    await client.query('UPDATE products SET quantidade_em_estoque = quantidade_em_estoque - $1 WHERE id = $2', [item.quantidade, item.produtoId]);
                }
            }

            await client.query(
                'UPDATE sales SET data = $1, cliente = $2, itens = $3, valor_total = $4, forma_pagamento = $5, status_venda = $6 WHERE id = $7',
                [data, cliente, JSON.stringify(newItens), valor_total, forma_pagamento, status_venda, id]
            );

            await client.query('COMMIT');
            res.json({ success: true, message: 'Venda atualizada com sucesso' });
        } catch (error: any) {
            await client.query('ROLLBACK');
            res.status(400).json({ error: error.message });
        } finally {
            client.release();
        }
    });

    app.delete('/sales/:id', async (req: Request, res: Response) => {
        const { id } = req.params;
        const client = await db.connect();

        try {
            await client.query('BEGIN');

            const existingSaleRes = await client.query('SELECT itens, status_venda FROM sales WHERE id = $1', [id]);
            if (existingSaleRes.rows.length > 0) {
                const oldSale = existingSaleRes.rows[0];
                const oldItens: SaleItem[] = typeof oldSale.itens === 'string' ? JSON.parse(oldSale.itens) : oldSale.itens;

                if (oldSale.status_venda !== 'Cancelada') {
                    for (const item of oldItens) {
                        await client.query('UPDATE products SET quantidade_em_estoque = quantidade_em_estoque + $1 WHERE id = $2', [item.quantidade, item.produtoId]);
                    }
                }
            }

            await client.query('DELETE FROM sales WHERE id = $1', [id]);

            await client.query('COMMIT');
            res.status(204).send();
        } catch (error: any) {
            await client.query('ROLLBACK');
            res.status(400).json({ error: error.message });
        } finally {
            client.release();
        }
    });
}