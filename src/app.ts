import express, { Request, Response, NextFunction } from 'express';
import * as helmet from 'helmet';
import cors from 'cors';
import 'dotenv/config';
import { openDb } from './configDB.js';
import { setupRoutes } from './routes/routes.js';

const app = express();
const PORT = process.env.PORT || 2020;

app.use((helmet as any).default());
app.use(express.json({ limit: '10mb' }));
app.use(cors({
    origin: process.env.FRONTEND_URL || '*'
}));

async function startServer() {
  try {
    const db = await openDb();
    
    setupRoutes(app, db);

    app.get('/', (req: Request, res: Response) => {
      res.status(200).json({ message: 'Mago Imports API Online', status: 'online' });
    });

    app.use((err: any, req: Request, res: Response, next: NextFunction) => {
        console.error(err.stack);
        res.status(500).json({ error: 'Erro interno no servidor.' });
    });

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    process.exit(1);
  }
}

startServer();