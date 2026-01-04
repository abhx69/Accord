const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).send({ error: 'Unauthorized: No token provided.' });
    }
    const token = authHeader.split('Bearer ')[1];
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded; // Adds { uid, displayName } to the request
        next();
    } catch (error) {
        return res.status(403).send({ error: 'Forbidden: Invalid token.' });
    }
};

module.exports = verifyToken;