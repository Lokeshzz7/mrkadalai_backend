import aj from "../config/arcjet.js";

const arjectMiddleware = async (req, res, next) => {
    try {
        // ! Currently not using arcjet for dev use bt need to remove for the produciton for using the arcjet
        if (
            process.env.NODE_ENV !== 'production' &&
            req.path === '/api/v1/auth/me'
        ) {
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