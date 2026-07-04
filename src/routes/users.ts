import { Express } from 'express';
import { Pool } from 'pg';
import jwt from 'jsonwebtoken';

export function registerUserRoutes(app: Express, db: Pool) {
    app.post('/auth/google', async (req, res) => {
        const { email, nome, foto, google_id } = req.body;
        try {
            if (!email) return res.status(400).json({ error: 'Email obrigatório' });
            
            const result = await db.query('SELECT id, status FROM users WHERE email = $1', [email]);
            let user = result.rows[0];

            if (!user) {
                await db.query(
                    `INSERT INTO users (id, email, nome, foto, google_id, status) VALUES ($1, $2, $3, $4, $5, 'pendente')`,
                    [google_id, email, nome, foto, google_id]
                );
                return res.status(403).json({ message: 'Aguarde aprovação', status: 'pendente' });
            }

            if (user.status === 'pendente') {
                return res.status(403).json({ error: 'Acesso pendente de aprovação.' });
            }

            const token = jwt.sign(
                { id: user.id, status: user.status }, 
                process.env.JWT_SECRET as string, 
                { expiresIn: '7d' }
            );

            res.status(200).json({ token, email, status: user.status });
        } catch (error: any) {
            console.error("Erro em /auth/google:", error);
            res.status(500).json({ error: 'Erro interno', details: error.message || error });
        }
    });

    app.get('/admin/users/pending', async (req, res) => {
        try {
            const result = await db.query("SELECT * FROM users WHERE status = 'pendente'");
            res.status(200).json(result.rows);
        } catch (error) {
            res.status(500).json({ error: 'Erro ao buscar' });
        }
    });

    app.post('/admin/users/decide', async (req, res) => {
        const { id, action } = req.body;
        try {
            if (action === 'aprovado') {
                await db.query('UPDATE users SET status = $1 WHERE id = $2', ['aprovado', id]);
            } else {
                await db.query('DELETE FROM users WHERE id = $1', [id]);
            }
            res.status(200).json({ message: 'Sucesso' });
        } catch (error) {
            res.status(500).json({ error: 'Erro ao processar' });
        }
    });
}