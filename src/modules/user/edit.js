const { request } = require('modules/util');
const joi = require('joi');
const ID = require('modules/id');

// prettier-ignore
const schema = joi.object({
  fileIDs: joi.array().items(joi.string().min(4).max(128).alphanum()).min(0).max(1),
  displayName: joi.string().min(1).max(255).allow(''),
  text: joi.string().min(1).max(255).allow(''),
}).required();

module.exports = request(async (trx, req, res) => {
  // Validate the incoming request with Joi
  const valid = joi.validate(req.body, schema);
  if (valid.error) {
    return { status: 'validation error', error: valid.error };
  }

  // Update the user's display name
  if (req.body.displayName != '') {
    await trx.query(
      `
  UPDATE 
    user 
  SET 
    displayName = ?
  WHERE 
    userID = ?;
  `,
      [req.body.displayName, req.session.userID]
    );
  }

  //Select already existing profile picture
  const [profilePicture] = await trx.query(
    'SELECT fileID FROM userFile WHERE userID = ?',
    [req.session.userID]
  );

  // Decode profile picture's file ID for db queries
  const fileID = Number(ID.file.decode(req.body.fileIDs[0]));

  if (fileID) {
    try {
      //If the user has a profile picture, update existing database record
      await trx.execute(
        'UPDATE userFile SET fileID = REPLACE(fileID, ?, ?) WHERE userID = ?;',
        [profilePicture[0].fileID, fileID, req.session.userID]
      );
    } catch (error) {
      //If the user doesn't have a profile picture, insert database record
      await trx.execute(
        'INSERT INTO userFile (userID, fileID) VALUES (?, ?);',
        [req.session.userID, fileID]
      );
    }
  }

  if (req.body.text != '') {
    //Update the users bio
    await trx.execute(
      `
    UPDATE
      user
    SET
      bio = ?
    WHERE
      userID = ?
    ;`,
      [req.body.text, req.session.userID]
    );
  }

  if (fileID) req.session.image = req.body.fileIDs[0];
  if (req.body.displayName != '')
    req.session.displayName = req.body.displayName;
  await req.session.save();

  return { status: 'ok' };
});
