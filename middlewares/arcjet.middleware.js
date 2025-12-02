import aj from "../config/arcjet.js";

const arjectMiddleware = async (req, res, next) => {
    try {
        // Bypass Arcjet completely if no key is configured
        if (!process.env.ARCJET_KEY) {
            return next();
        }

        // In production, bypass Arcjet for auth/login routes to avoid false "Bot detected" blocks
        const bypassPaths = [
            '/api/auth/superadmin-signin',
            '/api/auth/admin-signin',
            '/api/auth/staff-signin',
            '/api/auth/signin',
            '/api/auth/signup',
        ];
        if (bypassPaths.includes(req.path)) {
            return next();
        }
        
        const decision = await aj.protect(req, {
            requested: 1,
            key: req.ip || 'anonymous'
        });


        if (decision.isDenied()) {
            if (decision.reason.isRateLimit()) {
                return res.status(429).json({ error: 'Rate Limit exceeded' });
            }

            if (decision.reason.isBot()) {
                return res.status(403).json({ error: 'Bot detected' });
            }

            return res.status(403).json({ error: 'Access denied' });
        }

        next();
    } catch (error) {
        console.log(`Arcjet middleware Error: ${error}`);
        next(error);
    }
};

export default arjectMiddleware;