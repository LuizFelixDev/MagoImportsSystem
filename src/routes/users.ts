import { Express } from 'express';
import { Database } from 'sqlite';

export function registerUserRoutes(app: Express, db: Database) {
    app.post('/auth/google', async (req, res) => {
        const { token } = req.body;
        try {
            // Busca os dados do perfil do usuário diretamente do Google usando o Access Token
            const googleRes = await fetch(`https://www.googleapis.com/oauth2/v3/userinfo?access_token=${token}`);
            const payload = await googleRes.json();

            if (!payload.email) {
                return res.status(401).json({ error: 'Token inválido' });
            }
            
            // Salva ou atualiza no banco SQLite
            await db.run(
                `INSERT INTO users (id, email, nome, foto, google_id) 
                 VALUES (?, ?, ?, ?, ?) 
                 ON CONFLICT(email) DO UPDATE SET nome=excluded.nome, foto=excluded.foto`,
                [payload.sub, payload.email, payload.name, payload.picture, payload.sub]
            );

            res.status(200).json({ user: payload });
        } catch (error) {
            console.error("Erro no Auth:", error);
            res.status(500).json({ error: 'Erro interno no servidor' });
        }
    });
}