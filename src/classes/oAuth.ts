import * as nodeUtil from 'util';
import * as rp from 'request-promise';
import bot from './CSBot';
import * as Users from './Users';
import * as db from './db';
const clients = new Map();
const {google} = require('googleapis');

const bitlyUrl = 'https://api-ssl.bitly.com/v3/shorten';

const OAuth2 =  new google.auth.OAuth2;
const oauth2Client = new OAuth2(
    process.env['OAUTH_clientId'],
    process.env['OAUTH_clientSecret'],
    process.env['OAUTH_redirectUrl']
);


// emails.listPromisified = nodeUtil.promisify(emails.list);

const getOAuthUrl = async (telegramId: number | string) => {
  const longUrl = oauth2Client.generateAuthUrl({
    // 'online' (default) or 'offline' (gets refresh_token)
    access_type: 'offline',
    // If you only need one scope you can pass it as a string
    scope: ['https://www.googleapis.com/auth/gmail.readonly'],
    // Optional property that passes state parameters to redirect URI
    state: {telegramId},
  });
  try {
    const res = await rp({
      uri: bitlyUrl,
      qs: {
        access_token: process.env['BIT_LY_token'],
        longUrl,
      },
      json: true,
    });
    if (res.status_code < 300) {
      return res.data.url;
    }
    console.log('Bit.ly error', res);
  } catch (e) {
    console.error('Bit.ly error', e);
  }
};

const getAndSaveTokens = async (code: string, telegramId: number) => {
  try {
    const {tokens} = await oauth2Client.getToken(code);
    console.log(`User ${telegramId} correctly exchanged code for token`);
    const user = await Users.getUser(telegramId);
    user.authInProgress = false;
    user.tokens = tokens;
    user.authDate = new Date().toISOString();
    await Users.updateUser(user);
    console.log(`User ${telegramId} now is authenticated`);
    // Now tokens contains an access_token and an optional refresh_token. Save them.
    // oauth2Client.setCredentials(tokens);
    // return oauth2Client;
    return user;
  } catch (e) {
    console.error('Error during token exchange', JSON.stringify(e));
  }
};

const getClient = (userId: any, tokens: any) => {
  if (clients.has(userId)) {
    clients.get(userId).setCredentials(tokens);
  } else {
    const newClient = new OAuth2(
        process.env['OAUTH:clientId'],
        process.env['OAUTH:clientSecret'],
        process.env['OAUTH:redirectUrl']
    );
    newClient.setCredentials(tokens);
    clients.set(userId, newClient);
  }
  return clients.get(userId);
};

async function authenticateUser(user: any, expired?: boolean) {
  if (expired && typeof user === 'number') {
    user = await Users.getUser(user);
    user.tokens = undefined;
  }
  console.log(`Asking ${user.telegramId} to authenticate`);
  await bot.sendLoginMessage(user.telegramId, expired);
  user.authInProgress = true;
  user.active = true;
  if (!user.joined) {
    user.joined = new Date().toISOString();
  }
  await db.updateUser(user);
}

export {getOAuthUrl, getAndSaveTokens, getClient, authenticateUser};
