const { text } = require('modules/helloWorld');

module.exports = app => {
  app.get('/', (req, res) => {
    if (req.session.isPopulated) {
      return res.send(`Welcome ${req.session.username}`);
    }
    return res.send(text);
  });
};
