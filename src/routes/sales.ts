import { Express, Request, Response } from 'express';
import { Database } from 'sqlite';

interface SaleItem {
    produtoId: number;
    nomeProduto: string;
    quantidade: number;
    precoUnitario: number;
    totalItem: number;
}

interface Sale {
    id?: number;
    data: string;
    cliente?: string | null;
    itens: SaleItem[]; 
    valor_total: number;
    forma_pagamento: string;
    status_venda: 'Pendente' | 'Concluída' | 'Cancelada';
}

const checkDb = (db: Database) => (req: Request, res: Response, next: Function) => {
    if (!db) {
        return res.status(503).json({ error: 'Database connection error.' });
    }
    next();
};

async function updateStockForNewSale(db: Database, items: SaleItem[]): Promise<void> {
    for (const item of items) {
        const productId = Number(item.produtoId);
        const quantity = Number(item.quantidade);

        if (isNaN(productId) || productId <= 0 || isNaN(quantity) || quantity <= 0) {
            throw new Error('Estrutura de item de venda inválida: produtoId ou quantidade ausente/inválida.');
        }

        const product = await db.get(`
            SELECT nome, quantidade_em_estoque FROM products WHERE id = ?
        `, productId);
        
        if (!product) {
            throw new Error(`Produto ID ${productId} não encontrado.`);
        }
        
        if (product.quantidade_em_estoque < quantity) {
            throw new Error(`Estoque insuficiente para o produto ${product.nome}. Disponível: ${product.quantidade_em_estoque}, Solicitado: ${quantity}.`);
        }

        await db.run(`
            UPDATE products 
            SET quantidade_em_estoque = quantidade_em_estoque - ? 
            WHERE id = ?
        `, [quantity, productId]);
    }
}


export function registerSalesRoutes(app: Express, db: Database) {
    const dbCheck = checkDb(db);
    console.log('   -> Rotas de Vendas registradas com sucesso.');

    app.post('/sales', dbCheck, async (req: Request<{}, {}, Sale>, res: Response) => {
        const { data, cliente, itens, valor_total, forma_pagamento, status_venda } = req.body;
        
        if (!data || !itens || typeof valor_total !== 'number' || !forma_pagamento || !status_venda) {
            return res.status(400).json({ error: 'Os campos data, itens, valor_total, forma_pagamento e status_venda são obrigatórios.' });
        }

        const clienteFinal = cliente ?? null;
        let itensParaProcessar: SaleItem[];
        
        if (typeof itens === 'string') {
            try {
                itensParaProcessar = JSON.parse(itens);
                if (!Array.isArray(itensParaProcessar)) {
                    throw new Error('Itens não é um array após o parsing.');
                }
            } catch (e) {
                return res.status(400).json({ error: 'Campo "itens" inválido ou mal formatado.' });
            }
        } else {
            itensParaProcessar = itens;
        }
        
        const itensJson = JSON.stringify(itensParaProcessar);

        try {
            await db.run('BEGIN TRANSACTION');

            await updateStockForNewSale(db, itensParaProcessar);

            const result = await db.run(`
                INSERT INTO sales (data, cliente, itens, valor_total, forma_pagamento, status_venda) 
                VALUES (?, ?, ?, ?, ?, ?)
            `, [data, clienteFinal, itensJson, valor_total, forma_pagamento, status_venda]);
            
            await db.run('COMMIT');

            if (!result || !result.lastID) { 
                 return res.status(500).json({ error: 'Erro ao obter ID da nova venda.' });
            }
            
            const newSale = await db.get('SELECT * FROM sales WHERE id = ?', result.lastID);
            
            if (newSale && newSale.itens && typeof newSale.itens === 'string') {
                newSale.itens = JSON.parse(newSale.itens);
            }
            
            res.status(201).json(newSale);
            
        } catch (error) {
            await db.run('ROLLBACK');
            console.error(error);
            
            const errorMessage = error instanceof Error ? error.message : 'Erro interno ao cadastrar venda.';
            
            if (errorMessage.includes('Estoque insuficiente') || errorMessage.includes('Estrutura de item')) {
                return res.status(400).json({ error: errorMessage });
            }
            
            res.status(500).json({ error: 'Erro ao cadastrar venda.' });
        }
    });

    app.get('/sales', dbCheck, async (req: Request, res: Response) => {
        try {
            const sales = await db.all('SELECT * FROM sales');
            const processedSales = sales.map(sale => {
                if (sale.itens && typeof sale.itens === 'string') {
                    sale.itens = JSON.parse(sale.itens);
                }
                return sale;
            });
            res.json(processedSales);
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Erro ao buscar vendas.' });
        }
    });

    app.get('/sales/:id', dbCheck, async (req: Request<{ id: string }>, res: Response) => {
        const id = parseInt(req.params.id);
        try {
            const sale = await db.get('SELECT * FROM sales WHERE id = ?', id);
            if (sale) {
                if (sale.itens && typeof sale.itens === 'string') {
                    sale.itens = JSON.parse(sale.itens);
                }
                res.json(sale);
            } else {
                res.status(404).json({ error: 'Venda não encontrada.' });
            }
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Erro ao buscar venda.' });
        }
    });

    app.put('/sales/:id', dbCheck, async (req: Request<{ id: string }, {}, Partial<Sale>>, res: Response) => {
        const id = parseInt(req.params.id);
        const updates = req.body as Partial<Sale>;
        
        if (Object.keys(updates).length === 0) {
            return res.status(400).json({ error: 'Nenhum campo de atualização foi fornecido.' });
        }

        try {
            const existingSale = await db.get('SELECT * FROM sales WHERE id = ?', id);
            if (!existingSale) {
                return res.status(404).json({ error: 'Venda não encontrada para atualização.' });
            }

            const fields = Object.keys(updates)
                .filter(key => key !== 'id')
                .map(key => {
                    if (key === 'itens' && Array.isArray((updates as any)[key])) {
                        (updates as any)[key] = JSON.stringify((updates as any)[key]);
                    }
                    return `${key} = ?`;
                }).join(', ');

            const values = Object.keys(updates)
                .filter(key => key !== 'id')
                .map(key => (updates as any)[key]);

            values.push(id);

            await db.run(`
                UPDATE sales SET ${fields} WHERE id = ?
            `, values);
            
            const updatedSale = await db.get('SELECT * FROM sales WHERE id = ?', id);
            
            if (updatedSale && updatedSale.itens && typeof updatedSale.itens === 'string') {
                updatedSale.itens = JSON.parse(updatedSale.itens);
            }
            
            res.json(updatedSale);

        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Erro ao atualizar venda.' });
        }
    });

    app.delete('/sales/:id', dbCheck, async (req: Request<{ id: string }>, res: Response) => {
        const id = parseInt(req.params.id);
        try {
            const result = await db.run('DELETE FROM sales WHERE id = ?', id);
            
            if (result && result.changes && result.changes > 0) { 
                res.status(204).send(); 
            } else {
                res.status(404).json({ error: 'Venda não encontrada para exclusão.' });
            }
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Erro ao excluir venda.' });
        }
    });
}