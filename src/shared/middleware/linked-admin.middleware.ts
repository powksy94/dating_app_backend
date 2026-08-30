import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.middleware.js';
import { Admin } from '../../domains/admin/admin.model.js';

// Gates mobile-facing admin actions (event review, etc.) using the regular
// mobile user session (authMiddleware must run first) instead of the
// separate web-admin JWT. Only the account linked to an Admin via
// linkedUserId is allowed through.
export async function linkedAdminMiddleware(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    const admin = await Admin.findOne({ linkedUserId: req.userId });
    if (!admin) {
        res.status(403).json({ message: 'Accès réservé aux administrateurs' });
        return;
    }
    next();
}
