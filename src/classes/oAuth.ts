import * as nodeUtil from 'util';
import * as rp from 'request-promise';
import bot from './CSBot';
import * as Users from './Users';

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
    const user = Users.list.get(telegramId);
    user.authInProgress = false;
    user.tokens = tokens;
    // Now tokens contains an access_token and an optional refresh_token. Save them.
    // oauth2Client.setCredentials(tokens);
    // return oauth2Client;
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

function authenticateUser(telegramId: number) {
  bot.sendLoginMessage(telegramId);
}

export {getOAuthUrl, getAndSaveTokens, getClient, setCredentials, authenticateUser};
