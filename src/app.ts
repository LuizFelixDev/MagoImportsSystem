import express, { Request, Response } from 'express';
import { openDb } from './configDB.js'; 
import { setupRoutes } from './routes/routes.js';
import { Database } from 'sqlite';
import cors from 'cors';
import helmet from 'helmet';
import 'dotenv/config';

const app = express();
const PORT = process.env.PORT || 2020; 

app.use(helmet());
app.use(express.json({ limit: '50mb' }));
app.use(cors());

async function startServer() {
  try {
    const db: Database = await openDb(); 
    console.log('Banco de Dados inicializado com sucesso.');

    setupRoutes(app, db);

    app.get('/', (req: Request, res: Response) => {
      res.status(200).json({
        message: 'API TypeScript Protegida!',
        status: 'online'
      });
    });

    app.listen(PORT, () => {
      console.log(`Servidor rodando na porta ${PORT}`);
    });

  } catch (error) {
    console.error('Erro ao iniciar a aplicação:', error);
    process.exit(1);
  }
}

startServer();