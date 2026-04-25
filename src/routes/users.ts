import { Express } from 'express';
import { Database } from 'sqlite';
import jwt from 'jsonwebtoken';

export function registerUserRoutes(app: Express, db: Database) {
    app.post('/auth/google', async (req, res) => {
        const { email, nome, foto, google_id } = req.body;
        try {
            if (!email) return res.status(400).json({ error: 'Email obrigatório' });
            
            let user = await db.get('SELECT id, status FROM users WHERE email = ?', [email]);

            if (!user) {
                await db.run(
                    `INSERT INTO users (id, email, nome, foto, google_id, status) VALUES (?, ?, ?, ?, ?, 'pendente')`,
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
        } catch (error) {
            res.status(500).json({ error: 'Erro interno' });
        }
    });

    app.get('/admin/users/pending', async (req, res) => {
        try {
            const pending = await db.all("SELECT * FROM users WHERE status = 'pendente'");
            res.status(200).json(pending);
        } catch (error) {
            res.status(500).json({ error: 'Erro ao buscar' });
        }
    });

    app.post('/admin/users/decide', async (req, res) => {
        const { id, action } = req.body;
        try {
            if (action === 'aprovado') {
                await db.run('UPDATE users SET status = ? WHERE id = ?', ['aprovado', id]);
            } else {
                await db.run('DELETE FROM users WHERE id = ?', [id]);
            }
            res.status(200).json({ message: 'Sucesso' });
        } catch (error) {
            res.status(500).json({ error: 'Erro ao processar' });
        }
    });
}