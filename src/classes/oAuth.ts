import * as nodeUtil from 'util';
import * as rp from 'request-promise';
import bot from './CSBot';
import * as Users from './Users';
import * as db from './db';

const bitlyUrl = 'https://api-ssl.bitly.com/v3/shorten';

const OAuth2 = require('googleapis').auth.OAuth2;
const oauth2Client = new OAuth2(
  process.env['OAUTH:clientId'],
  process.env['OAUTH:clientSecret'],
  process.env['dev'] === 'true' ? process.env['OAUTH:localRedirectUrl'] : process.env['OAUTH:redirectUrl']
);

oauth2Client.getTokenPromisified = nodeUtil.promisify(oauth2Client.getToken);

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
        access_token: process.env['BIT.LY:token'],
        longUrl,
      },
      json: true,
    });
    return res.data.url;
  } catch (e) {
    console.log(JSON.stringify(e));
  }
};

const getAndSaveTokens = async (code: string, telegramId: number) => {
  try {
    const tokens = await oauth2Client.getTokenPromisified(code);
    const user = await Users.getUser(telegramId);
    user.authInProgress = false;
    user.tokens = tokens;
    user.authDate = new Date().toISOString();
    await Users.updateUser(user);
    // Now tokens contains an access_token and an optional refresh_token. Save them.
    // oauth2Client.setCredentials(tokens);
    // return oauth2Client;
    return user;
  } catch (e) {
    console.log('Error during token exchange', e);
  }
};

const setCredentials = (tokens: any) => {
  oauth2Client.setCredentials(tokens);
};

const getClient = () => {
  return oauth2Client;
};

async function authenticateUser(user: any) {
  user.authInProgress = true;
  user.joined = new Date().toISOString();
  await db.updateUser(user);
  await bot.sendLoginMessage(user.telegramId);
}

async function manageNewUser(user: any) {
  if (await Users.getUser(user.telegramId)) {
    // He is a recurring user
    return bot.sendMessage(`Welcome back ${user.firstName} 🎉`, user.telegramId);
    // TODO check if still authenticated
  }
  await authenticateUser(user);
}

export {manageNewUser, getOAuthUrl, getAndSaveTokens, getClient, setCredentials, authenticateUser};
