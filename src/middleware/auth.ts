import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;

    if (!authHeader) return res.status(401).json({ error: 'Token não fornecido' });

    const parts = authHeader.split(' ');
    if (parts.length !== 2) return res.status(401).json({ error: 'Erro no token' });

    const [scheme, token] = parts;
    if (!/^Bearer$/i.test(scheme)) return res.status(401).json({ error: 'Token malformatado' });

    jwt.verify(token, process.env.JWT_SECRET as string, (err, decoded: any) => {
        if (err) return res.status(401).json({ error: 'Token inválido' });
        
        (req as any).userId = decoded.id;
        (req as any).userStatus = decoded.status;
        return next();
    });
};

export const adminMiddleware = (req: Request, res: Response, next: NextFunction) => {
    const status = (req as any).userStatus;
    if (status !== 'aprovado' && status !== 'admin') {
        return res.status(403).json({ error: 'Acesso negado' });
    }
    next();
};