import { Express, Request, Response } from 'express';
import { Database } from 'sqlite';

// Interfaces para tipagem dos resultados dos relatórios
interface ProductReport {
    nome: string;
    quantidade_em_estoque: number;
    preco: number;
}

interface SaleStatusReport {
    status_venda: string;
    count: number;
    total_valor: number;
}

// Middleware para verificar a conexão com o banco de dados (copiado de products/sales.ts)
const checkDb = (db: Database) => (req: Request, res: Response, next: Function) => {
    if (!db) {
        return res.status(503).json({ error: 'Database connection error.' });
    }
    next();
};

export function registerReportRoutes(app: Express, db: Database) {
    const dbCheck = checkDb(db);
    console.log('   -> Rotas de Relatórios registradas com sucesso.');

    // Objetivo: Listar produtos ativos com quantidade em estoque abaixo de um limite.
    app.get('/reports/products/low-stock', dbCheck, async (req: Request, res: Response) => {
        // Define um limite de estoque baixo (exemplo: 5 unidades)
        const lowStockThreshold = 5; 

        try {
            const lowStockProducts: ProductReport[] = await db.all(`
                SELECT nome, quantidade_em_estoque, preco 
                FROM products 
                WHERE quantidade_em_estoque <= ? AND ativo = 1
                ORDER BY quantidade_em_estoque ASC
            `, lowStockThreshold);

            res.json({
                threshold: lowStockThreshold,
                count: lowStockProducts.length,
                products: lowStockProducts
            });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Erro ao gerar relatório de estoque baixo.' });
        }
    });

    // Objetivo: Agrupar vendas pelo status (Pendente, Concluída, Cancelada) e somar os totais.
    app.get('/reports/sales/by-status', dbCheck, async (req: Request, res: Response) => {
        try {
            const salesByStatus: SaleStatusReport[] = await db.all(`
                SELECT status_venda, COUNT(id) as count, SUM(valor_total) as total_valor 
                FROM sales 
                GROUP BY status_venda
            `);

            const processedReport = salesByStatus.map(row => ({
                status_venda: row.status_venda,
                count: Number(row.count),
                total_valor: Number(row.total_valor)
            }));

            res.json(processedReport);
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Erro ao gerar relatório de vendas por status.' });
        }
    });
    
    // Objetivo: Listar vendas em um determinado período e fornecer um resumo total.
    app.get('/reports/sales/period', dbCheck, async (req: Request, res: Response) => {
        const { startDate, endDate } = req.query; 

        if (!startDate || !endDate) {
            return res.status(400).json({ error: 'Os parâmetros startDate e endDate são obrigatórios.' });
        }
        
        try {
            // A query utiliza o campo 'data' da tabela 'sales' para filtrar.
            const salesInPeriod = await db.all(`
                SELECT id, data, cliente, valor_total, forma_pagamento, status_venda
                FROM sales 
                WHERE data BETWEEN ? AND ? 
                ORDER BY data DESC
            `, [startDate, endDate]);
            
            const totalValue = salesInPeriod.reduce((sum, sale) => sum + sale.valor_total, 0);

            res.json({
                periodo: { startDate, endDate },
                total_vendas: salesInPeriod.length,
                valor_total_arrecadado: totalValue,
                vendas: salesInPeriod
            });

        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Erro ao gerar relatório de vendas por período.' });
        }
    });
}