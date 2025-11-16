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

export function registerSaleRoutes(app: Express, db: Database) {
    const dbCheck = checkDb(db);
    console.log('   -> Rotas de Vendas registradas com sucesso.');

    app.post('/sales', dbCheck, async (req: Request<{}, {}, Sale>, res: Response) => {
        const { data, cliente, itens, valor_total, forma_pagamento, status_venda } = req.body;
        
        if (!data || !itens || typeof valor_total !== 'number' || !forma_pagamento || !status_venda) {
            return res.status(400).json({ error: 'Os campos data, itens, valor_total, forma_pagamento e status_venda são obrigatórios.' });
        }

        const itensJson = JSON.stringify(itens);
        const clienteFinal = cliente ?? null;
        
        try {
            const result = await db.run(`
                INSERT INTO sales (data, cliente, itens, valor_total, forma_pagamento, status_venda) 
                VALUES (?, ?, ?, ?, ?, ?)
            `, [data, clienteFinal, itensJson, valor_total, forma_pagamento, status_venda]);
            
            if (!result || !result.lastID) { 
                 return res.status(500).json({ error: 'Erro ao obter ID da nova venda.' });
            }
            
            const newSale = await db.get('SELECT * FROM sales WHERE id = ?', result.lastID);
            
            if (newSale && newSale.itens) {
                newSale.itens = JSON.parse(newSale.itens);
            }
            
            res.status(201).json(newSale);
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Erro ao cadastrar venda.' });
        }
    });

    app.get('/sales', dbCheck, async (req: Request, res: Response) => {
        try {
            const sales = await db.all('SELECT * FROM sales');
            const processedSales = sales.map(sale => {
                if (sale.itens) {
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
                if (sale.itens) {
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
            
            if (updatedSale && updatedSale.itens) {
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