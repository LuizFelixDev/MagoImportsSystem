import { Express } from 'express';
import { Database } from 'sqlite';
import { OAuth2Client } from 'google-auth-library';

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export function registerUserRoutes(app: Express, db: Database) {
    app.post('/auth/google', async (req, res) => {
        const { token } = req.body;
        try {
            const ticket = await client.verifyIdToken({
                idToken: token,
                audience: process.env.GOOGLE_CLIENT_ID,
            });
            const payload = ticket.getPayload();
            
            await db.run(
                `INSERT INTO users (id, email, nome, foto, google_id) 
                 VALUES (?, ?, ?, ?, ?) 
                 ON CONFLICT(email) DO UPDATE SET nome=excluded.nome, foto=excluded.foto`,
                [payload?.sub, payload?.email, payload?.name, payload?.picture, payload?.sub]
            );

            res.status(200).json({ user: payload });
        } catch (error) {
            res.status(401).json({ error: 'Token inválido' });
        }
    });
}