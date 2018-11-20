const db = require('modules/db');

/**
 * Helper to make error handling with Express routes easier
 * @param {Function} action The function for the Express route to run
 */
const request = action => (req, res, next) =>
  new Promise(async () => {
    let connection = null;

    try {
      // Get a new connection to the database
      connection = await db.connection();

      // Start a transaction
      await connection.beginTransaction();

      // Run logic
      const status = await action(connection, req, res, next);

      // Commit changes to the DB
      await connection.commit();

      // Send result, if not already sent
      if (!res.headersSent && status) return res.send(status);
    } catch (e) {
      console.error(e);

      // Rollback transaction
      if (connection) await connection.rollback();
      return res.sendStatus(500);
    } finally {
      // Release the DB connection back into the pool
      if (connection) connection.release();
    }
  });

module.exports = {
  request,
};
