import { Express } from 'express';
import { Database } from 'sqlite';

export function registerUserRoutes(app: Express, db: Database) {
    app.post('/auth/google', async (req, res) => {
        const { token } = req.body;
        try {
            const googleRes = await fetch(`https://www.googleapis.com/oauth2/v3/userinfo?access_token=${token}`);
            const payload = await googleRes.json();

            if (!payload.email) return res.status(401).json({ error: 'Token inválido' });
            
            const user = await db.get('SELECT status FROM users WHERE email = ?', [payload.email]);

            if (!user) {
                await db.run(
                    `INSERT INTO users (id, email, nome, foto, google_id, status) VALUES (?, ?, ?, ?, ?, 'pendente')`,
                    [payload.sub, payload.email, payload.name, payload.picture, payload.sub]
                );
                return res.status(403).json({ message: 'Aguarde aprovação', status: 'pendente' });
            }

            if (user.status === 'pendente') {
                return res.status(403).json({ error: 'Acesso pendente de aprovação.' });
            }

            res.status(200).json({ user: payload, status: user.status });
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