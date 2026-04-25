import { Express, Request, Response } from 'express';
import { Pool } from 'pg';

interface Product {
    id?: number;
    nome: string;
    descricao?: string;
    categoria?: string;
    subcategoria?: string;
    marca?: string;
    modelo?: string;
    material?: string;
    cor?: string;
    tamanho?: string;
    quantidade_em_estoque: number;
    estoque_minimo: number;
    preco: number;
    preco_promocional?: number;
    peso?: number;
    imagens?: string[];
    data_de_cadastro?: string;
    ativo: 0 | 1;
}

const checkDb = (db: Pool) => (req: Request, res: Response, next: Function) => {
    if (!db) return res.status(503).json({ error: 'Database connection error.' });
    next();
};

export function registerProductRoutes(app: Express, db: Pool) {
    const dbCheck = checkDb(db);

    app.post('/products', dbCheck, async (req: Request<{}, {}, Product>, res: Response) => {
        const { 
            nome, descricao, categoria, subcategoria, marca, modelo, material, cor, tamanho, 
            quantidade_em_estoque, estoque_minimo, preco, preco_promocional, peso, imagens, ativo 
        } = req.body;
        
        if (!nome || typeof preco !== 'number' || typeof quantidade_em_estoque !== 'number' || typeof ativo !== 'number') {
            return res.status(400).json({ error: 'Campos obrigatórios ausentes.' });
        }

        const data_de_cadastro = new Date().toISOString();
        const imagensJson = imagens ? JSON.stringify(imagens) : null;
        
        try {
            const result = await db.query(`
                INSERT INTO products (
                    nome, descricao, categoria, subcategoria, marca, modelo, material, cor, tamanho, 
                    quantidade_em_estoque, estoque_minimo, preco, preco_promocional, peso, imagens, data_de_cadastro, ativo
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
                RETURNING *
            `, [
                nome, descricao, categoria, subcategoria, marca, modelo, material, cor, tamanho,
                quantidade_em_estoque, estoque_minimo, preco, preco_promocional, peso, imagensJson, data_de_cadastro, ativo
            ]);
            
            res.status(201).json(result.rows[0]);
        } catch (error) {
            res.status(500).json({ error: 'Erro ao cadastrar produto.' });
        }
    });

    app.get('/products', dbCheck, async (req: Request, res: Response) => {
        try {
            const result = await db.query('SELECT * FROM products');
            res.json(result.rows);
        } catch (error) {
            res.status(500).json({ error: 'Erro ao buscar produtos.' });
        }
    });

    app.get('/products/:id', dbCheck, async (req: Request<{ id: string }>, res: Response) => {
        try {
            const result = await db.query('SELECT * FROM products WHERE id = $1', [req.params.id]);
            if (result.rows.length > 0) {
                const product = result.rows[0];
                if (product.imagens) product.imagens = JSON.parse(product.imagens);
                res.json(product);
            } else {
                res.status(404).json({ error: 'Produto não encontrado.' });
            }
        } catch (error) {
            res.status(500).json({ error: 'Erro ao buscar produto.' });
        }
    });

    app.delete('/products/:id', dbCheck, async (req: Request<{ id: string }>, res: Response) => {
        try {
            const result = await db.query('DELETE FROM products WHERE id = $1', [req.params.id]);
            if (result.rowCount && result.rowCount > 0) {
                res.status(204).send();
            } else {
                res.status(404).json({ error: 'Produto não encontrado.' });
            }
        } catch (error) {
            res.status(500).json({ error: 'Erro ao excluir produto.' });
        }
    });
}