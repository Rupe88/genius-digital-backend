/**
 * User Agent parsing middleware
 * Compatible with express-useragent v2.x and ESM
 */
import useragent from 'express-useragent';

/**
 * Express middleware for parsing user agent
 * Attaches parsed user agent info to req.useragent
 */
export const useragentMiddleware = (req, res, next) => {
    try {
        const source = req.headers['user-agent'] || '';

        // Handle potential ESM default import issues
        const ua = useragent && useragent.parse ? useragent : (useragent?.default || useragent);

        if (ua && typeof ua.parse === 'function') {
            req.useragent = ua.parse(source);
        } else {
            // Very basic fallback if library is not working as expected
            req.useragent = {
                source,
                isMobile: /mobile/i.test(source),
                isBot: /bot/i.test(source),
                browser: 'Unknown',
                version: 'Unknown'
            };
        }
    } catch (error) {
        console.error('Error in useragentMiddleware:', error);
        req.useragent = { source: req.headers['user-agent'] || '' };
    }

    next();
};
