const { request } = require('modules/util');
const joi = require('joi');
const ID = require('modules/id');
const { locationTypeIDs, fileTypeIDs } = require('modules/constants');

// prettier-ignore
const schema = joi.object({
  page: joi.number().integer().min(0).required()
});

const feed = async (trx, { query, filter, page, userID }) => {
  const textQuery = (query || '').trim();
  if (textQuery.replace(/[#@]/g, '').length < 1) {
    return { status: 'ok', posts: [] };
  }

  const tagQuery = `%${textQuery.replace(/#/g, '')}%`;
  const userQuery = `%${textQuery.replace(/@/g, '')}%`;
  const locationQuery = `%${textQuery}%`;

  let queryWhere = '';
  let queryItems = [];

  let searchVisualData = {};

  switch (filter) {
    case 'tag':
      queryWhere = `
        (pt.postID = p.postID AND t.tagID = pt.tagID AND t.text COLLATE latin1_general_ci LIKE ?)
      `;
      queryItems = [tagQuery];
      searchVisualData = {
        header: `#${textQuery.replace('#', '')}`,
        html: 'Searching posts with a <b>tag</b>',
      };
      break;
    case 'location':
      const locationID = ID.location.decode(textQuery)[0];
      if (!locationID) return { status: 'ok', posts: [] };
      queryWhere = `
        (l.locationID = ?)
      `;
      queryItems = [locationID];
      searchVisualData = {
        header: null,
        html: 'Searching posts from a <b>location</b>',
      };
      break;
    case 'user':
      queryWhere = `
        (username COLLATE utf8mb4_general_ci LIKE ?)
      `;
      queryItems = [userQuery];
      searchVisualData = {
        header: `@${textQuery.replace('@', '')}`,
        html: 'Searching posts by a <b>user</b>',
      };
      break;
    default:
      queryWhere = `
        (username COLLATE utf8mb4_general_ci LIKE ?) OR
        (pt.postID = p.postID AND t.tagID = pt.tagID AND t.text COLLATE latin1_general_ci LIKE ?) OR
        (l.name COLLATE utf8mb4_general_ci LIKE ? OR l.address COLLATE utf8mb4_general_ci LIKE ?)
      `;
      queryItems = [userQuery, tagQuery, locationQuery, locationQuery];
      searchVisualData = {
        header: textQuery,
        html: 'Searching for users, tags & locations',
      };
      break;
  }

  const [result] = await trx.execute(
    `SELECT
      p.postID,
      p.locationID,
      p.text,
      p.createdAt,
      JSON_OBJECT(
        'username', u.username,
        'displayName', u.displayName,
        'image', uf.fileID
        ${userID ? `,'following', f.followerID` : ''}
      ) as user,
      JSON_OBJECT(
        'locationTypeID', l.locationTypeID,
        'name', l.name,
        'address', l.address,
        'fileID', lf.fileID
      ) as location
    FROM post p
    JOIN user u ON u.userID = p.userID
    ${
      userID
        ? 'LEFT JOIN follower f ON f.followerID = ? AND f.userID = u.userID'
        : ''
    }
    JOIN location l ON l.locationID = p.locationID
    LEFT JOIN userFile uf ON uf.userID = u.userID
    LEFT JOIN postTag pt ON pt.postID = p.postID
    LEFT JOIN tag t ON t.tagID = pt.tagID
    LEFT JOIN locationFile lf ON lf.locationID = p.locationID
    WHERE
      u.userID = p.userID AND
      l.locationID = p.locationID AND
      (
        ${queryWhere}
      )
    GROUP BY p.postID
    ORDER BY p.createdAt
    DESC LIMIT ?, ?`,
    [...(userID ? [userID] : []), ...queryItems, Number(page) * 10, 10]
  );

  if (!result.length) {
    return { status: 'ok', posts: [], search: searchVisualData };
  }

  const [image] = await trx.query(
    'SELECT pf.fileID, pf.postID, f.fileTypeID, f.mimeType FROM postFile pf, file f WHERE pf.postID IN (?) AND f.fileID = pf.fileID',
    [result.map(x => x.postID)]
  );

  // Add visual name location search
  if (filter === 'location') {
    searchVisualData.header = JSON.parse(result[0].location).name;
  }

  // Convert numerical id to a hash id
  const posts = result.map(x => {
    const location = JSON.parse(x.location);
    const media = image
      .filter(y => y.postID == x.postID)
      .map(x => {
        let type = null;
        if (x.fileTypeID === fileTypeIDs.IMAGE) type = 'image';
        if (x.fileTypeID === fileTypeIDs.VIDEO) type = 'video';
        return { fileID: ID.file.encode(x.fileID), type, mimeType: x.mimeType };
      });

    // Set the location icon
    let icon = 'map-marker';
    if (location) {
      if (location.locationTypeID === locationTypeIDs.PARK)
        icon = 'nature-people';
      if (location.locationTypeID === locationTypeIDs.PEAK)
        icon = 'image-filter-hdr';
      if (location.locationTypeID === locationTypeIDs.ATTRACTION) icon = 'star';
      if (location.locationTypeID === locationTypeIDs.INFORMATION)
        icon = 'information';
    }

    const user = JSON.parse(x.user);

    return {
      ...x,
      postID: ID.post.encode(Number(x.postID)),
      media,
      user: {
        ...user,
        image: ID.file.encode(user.image),
        following: !!Number(user.following),
      },
      location: location
        ? {
            ...location,
            icon,
            fileID: location.fileID ? ID.file.encode(location.fileID) : null,
          }
        : null,
    };
  });

  return { status: 'ok', posts, search: searchVisualData };
};

// Express POST middleware
const post = request(async (trx, req, res) => {
  const valid = joi.validate(req.body, schema);
  if (valid.error) {
    return { status: 'validation error', error: valid.error };
  }

  return await feed(trx, {
    ...req.params,
    ...req.body,
    userID: req.session.userID,
  });
});

// Express GET middleware
const get = request(async (trx, req, res) => {
  const status = await feed(trx, {
    ...req.params,
    userID: req.session.userID,
    page: 0,
  });

  res.render('index', {
    posts: status.posts,
    search: status.search,
  });
});

module.exports = {
  post,
  get,
};
