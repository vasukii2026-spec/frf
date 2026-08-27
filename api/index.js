// Vercel serverless entrypoint. Vercel routes all requests through this
// function (see vercel.json), which simply hands them to the Express app.
const app = require('../server');

module.exports = app;
