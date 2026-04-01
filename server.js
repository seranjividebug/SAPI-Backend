require('dotenv').config();
const app = require('./app');

const start = async () => {
  try {
    const port = process.env.PORT || 5000;
    await app.listen({ port, host: '0.0.0.0' });
    app.log.info(`Server running on port ${port}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
