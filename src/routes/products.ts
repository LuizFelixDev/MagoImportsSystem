import { Express, Request, Response } from 'express';
import { Database } from 'sqlite';

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

const checkDb = (db: Database) => (req: Request, res: Response, next: Function) => {
    if (!db) {
        return res.status(503).json({ error: 'Database connection error.' });
    }
    next();
};

export function registerProductRoutes(app: Express, db: Database) {
    const dbCheck = checkDb(db);

    app.post('/products', dbCheck, async (req: Request<{}, {}, Product>, res: Response) => {
        const { 
            nome, descricao, categoria, subcategoria, marca, modelo, material, cor, tamanho, 
            quantidade_em_estoque, estoque_minimo, preco, preco_promocional, peso, imagens, ativo 
        } = req.body;
        
        if (!nome || typeof preco !== 'number' || typeof quantidade_em_estoque !== 'number' || typeof ativo !== 'number') {
            return res.status(400).json({ error: 'Os campos nome, preco, quantidade_em_estoque e ativo são obrigatórios.' });
        }

        const data_de_cadastro = new Date().toISOString();
        const imagensJson = imagens ? JSON.stringify(imagens) : null;
        
        try {
            const result = await db.run(`
                INSERT INTO products (
                    nome, descricao, categoria, subcategoria, marca, modelo, material, cor, tamanho, 
                    quantidade_em_estoque, estoque_minimo, preco, preco_promocional, peso, imagens, data_de_cadastro, ativo
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                nome, descricao, categoria, subcategoria, marca, modelo, material, cor, tamanho,
                quantidade_em_estoque, estoque_minimo, preco, preco_promocional, peso, imagensJson, data_de_cadastro, ativo
            ]);
            
            if (!result || !result.lastID) { 
                 return res.status(500).json({ error: 'Erro ao obter ID do novo produto.' });
            }
            
            const newProduct = await db.get('SELECT * FROM products WHERE id = ?', result.lastID);
            res.status(201).json(newProduct);
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Erro ao cadastrar produto.' });
        }
    });

    app.get('/products', dbCheck, async (req: Request, res: Response) => {
        try {
            const products = await db.all('SELECT * FROM products');
            res.json(products);
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Erro ao buscar produtos.' });
        }
    });

    app.get('/products/:id', dbCheck, async (req: Request<{ id: string }>, res: Response) => {
        const id = parseInt(req.params.id);
        try {
            const product = await db.get('SELECT * FROM products WHERE id = ?', id);
            if (product) {
                if (product.imagens) {
                    product.imagens = JSON.parse(product.imagens);
                }
                res.json(product);
            } else {
                res.status(404).json({ error: 'Produto não encontrado.' });
            }
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Erro ao buscar produto.' });
        }
    });

    app.put('/products/:id', dbCheck, async (req: Request<{ id: string }, {}, Partial<Product>>, res: Response) => {
        const id = parseInt(req.params.id);
        const updates = req.body as Partial<Product>;
        
        if (Object.keys(updates).length === 0) {
            return res.status(400).json({ error: 'Nenhum campo de atualização foi fornecido.' });
        }

        try {
            const existingProduct = await db.get('SELECT * FROM products WHERE id = ?', id);
            if (!existingProduct) {
                return res.status(404).json({ error: 'Produto não encontrado para atualização.' });
            }

            const fields = Object.keys(updates)
                .filter(key => key !== 'id')
                .map(key => {
                    if (key === 'imagens' && Array.isArray((updates as any)[key])) {
                        (updates as any)[key] = JSON.stringify((updates as any)[key]);
                    }
                    return `${key} = ?`;
                }).join(', ');

            const values = Object.keys(updates)
                .filter(key => key !== 'id')
                .map(key => (updates as any)[key]);

            values.push(id);

            await db.run(`
                UPDATE products SET ${fields} WHERE id = ?
            `, values);
            
            const updatedProduct = await db.get('SELECT * FROM products WHERE id = ?', id);
            
            if (updatedProduct && updatedProduct.imagens) {
                updatedProduct.imagens = JSON.parse(updatedProduct.imagens);
            }
            
            res.json(updatedProduct);

        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Erro ao atualizar produto.' });
        }
    });

    app.delete('/products/:id', dbCheck, async (req: Request<{ id: string }>, res: Response) => {
        const id = parseInt(req.params.id);
        try {
            const result = await db.run('DELETE FROM products WHERE id = ?', id);
            
            if (result && result.changes && result.changes > 0) { 
                res.status(204).send(); 
            } else {
                res.status(404).json({ error: 'Produto não encontrado para exclusão.' });
            }
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Erro ao excluir produto.' });
        }
    });
}