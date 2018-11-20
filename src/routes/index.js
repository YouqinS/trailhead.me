const userRoutes = require('./userRoutes');
const commentRoutes = require('./commentRoutes');
const feedRoutes = require('./feedRoutes');
const followersRoutes = require('./followersRoutes');
const reactRoutes = require('./reactRoutes');
const postRoutes = require('./postRoutes');
const fileRoutes = require('./fileRoutes');

module.exports = [
  userRoutes,
  commentRoutes,
  followersRoutes,
  feedRoutes,
  reactRoutes,
  postRoutes,
  fileRoutes,
];
