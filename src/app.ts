import express, { Request, Response } from 'express';
import { openDb } from './configDB.js'; 

const app = express();
const PORT = process.env.PORT || 2020;

app.use(express.json());

async function startServer() {
  try {
    await openDb();
    console.log('Banco de Dados inicializado com sucesso.');

    app.get('/', (req: Request, res: Response) => {
      res.status(200).json({
        message: 'API TypeScript em execução!',
        status: 'online',
        database: 'conectado'
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