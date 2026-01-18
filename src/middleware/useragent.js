import useragent from 'express-useragent';

/**
 * User agent parsing middleware
 */
export const useragentMiddleware = (req, res, next) => {
  // Parse user agent
  useragent.express()(req, res, next);
};
