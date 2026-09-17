import { verifyPassword } from '../../utils/passwd.js';
import global from '../../../../global.js';
import {
  assertExists,
  assertPasswordMatch,
  issueJwtToken,
  validatePassword,
} from '../../utils/auth.js';

export function signAccessToken(user) {
  assertExists(user.username, 'User `username` property not found');
  assertExists(user.password, 'User `password` property not found');
  const userConfig = global.users[user.username];
  if (!userConfig) throw new Error('Password or username not match');
  const isValid = verifyPassword(user.password, userConfig.salt, userConfig.shadow);
  if (!isValid) throw new Error('Password or username not match');
  return issueJwtToken({ id: user.username, role: userConfig.role ?? 'default', expiresIn: '2h' });
}

export function refreshAccessToken(username) {
  const userConfig = global.users[username];
  return issueJwtToken({ id: username, role: userConfig?.role ?? 'default', expiresIn: '2h' });
}

export { assertExists, assertPasswordMatch, validatePassword };

