import { Request, Response, NextFunction } from "express";
import { logger } from "../config/logger.js";

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction): void {
    logger.error(err.message);
    res.status(500).json({ message: 'Erreur serveur',error: err.message });
}