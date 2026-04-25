import { Express, Request, Response } from 'express';
import { Pool } from 'pg';
import { z } from 'zod';
import { authMiddleware, adminMiddleware } from '../middleware/auth.js';

const ProductSchema = z.object({
    nome: z.string().min(1),
    descricao: z.string().optional(),
    categoria: z.string().optional(),
    subcategoria: z.string().optional(),
    marca: z.string().optional(),
    modelo: z.string().optional(),
    material: z.string().optional(),
    cor: z.string().optional(),
    tamanho: z.string().optional(),
    quantidade_em_estoque: z.number().int().nonnegative(),
    estoque_minimo: z.number().int().nonnegative(),
    preco: z.number().positive(),
    preco_promocional: z.number().positive().optional(),
    peso: z.number().positive().optional(),
    imagens: z.array(z.string()).optional(),
    ativo: z.union([z.literal(0), z.literal(1)]).default(1)
});

export function registerProductRoutes(app: Express, db: Pool) {
    app.post('/products', authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
        const validation = ProductSchema.safeParse(req.body);
        if (!validation.success) return res.status(400).json(validation.error);

        const { 
            nome, descricao, categoria, subcategoria, marca, modelo, material, cor, tamanho, 
            quantidade_em_estoque, estoque_minimo, preco, preco_promocional, peso, imagens, ativo 
        } = validation.data;
        
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

    app.get('/products', authMiddleware, async (req: Request, res: Response) => {
        try {
            const result = await db.query('SELECT * FROM products');
            res.json(result.rows);
        } catch (error) {
            res.status(500).json({ error: 'Erro ao buscar produtos.' });
        }
    });

    app.put('/products/:id', authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
        const updates = req.body;
        const fields = Object.keys(updates).filter(key => key !== 'id');
        if (fields.length === 0) return res.status(400).json({ error: 'Nenhum campo para atualizar.' });

        const values = fields.map(key => key === 'imagens' ? JSON.stringify(updates[key]) : updates[key]);
        const setClause = fields.map((field, index) => `${field} = $${index + 1}`).join(', ');
        values.push(req.params.id);

        try {
            const result = await db.query(`UPDATE products SET ${setClause} WHERE id = $${values.length} RETURNING *`, values);
            res.json(result.rows[0]);
        } catch (error) {
            res.status(500).json({ error: 'Erro ao atualizar.' });
        }
    });

    app.delete('/products/:id', authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
        try {
            await db.query('DELETE FROM products WHERE id = $1', [req.params.id]);
            res.status(204).send();
        } catch (error) {
            res.status(500).json({ error: 'Erro ao excluir.' });
        }
    });
}