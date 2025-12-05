import express, { Request, Response } from 'express';
import { openDb } from './configDB.js'; 
import { setupRoutes } from './routes/routes.js';
import { Database } from 'sqlite';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 2020; 

// AUMENTO DO LIMITE: Adicionado { limit: '50mb' } para suportar imagens Base64 grandes
app.use(express.json({ limit: '50mb' }));
app.use(cors());

async function startServer() {
  try {
    const db: Database = await openDb(); 
    console.log('Banco de Dados inicializado com sucesso.');

    setupRoutes(app, db);
    console.log('Todas as rotas (CRUDs) registradas com sucesso.');

    app.get('/', (req: Request, res: Response) => {
      res.status(200).json({
        message: 'API TypeScript em execução!',
        status: 'online',
        database: 'conectado'
      });
    });

    app.listen(PORT, () => {
      console.log(`Servidor rodando na porta ${PORT}`);
      console.log(`Rotas de CRUD para Produtos disponíveis em http://localhost:${PORT}/products`);
      console.log(`Rotas de CRUD para Vendas disponíveis em http://localhost:${PORT}/sales`);
    });

  } catch (error) {
    console.error('Erro ao iniciar a aplicação:', error);
    process.exit(1);
  }
}

startServer();