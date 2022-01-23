import * as rp from 'request-promise';
import bot from './CSBot';
import * as Users from './Users';
import * as db from './db';
const clients = new Map();
import { google } from 'googleapis';
import { getEnvValue } from '../util';

const BIT_LY_API = 'https://api-ssl.bitly.com/v3/shorten';

const oauth2Client = new google.auth.OAuth2(
  getEnvValue('OAUTH_clientId'),
  getEnvValue('OAUTH_clientSecret'),
  getEnvValue('OAUTH_redirectUrl')
);

const getOAuthUrl = async (telegramId: number | string) => {
  const longUrl = oauth2Client.generateAuthUrl({
    // 'online' (default) or 'offline' (gets refresh_token)
    access_type: 'offline',
    // If you only need one scope you can pass it as a string
    scope: ['https://www.googleapis.com/auth/gmail.readonly'],
    // Optional property that passes state parameters to redirect URI
    state: `${telegramId}`,
  });
  try {
    const res = await rp({
      uri: BIT_LY_API,
      qs: {
        access_token: getEnvValue('BIT_LY_token'),
        longUrl,
      },
      json: true,
    });
    if (res.status_code < 300) {
      return res.data.url;
    }
    console.log(`[${telegramId}] Bit.ly Error`, res);
  } catch (e) {
    console.error(`[${telegramId}] Error while generating OAuth Url`, e);
  }
};

const getAndSaveTokens = async (authCode: string, telegramId: number) => {
  try {
    console.log(`[${telegramId}] Using AuthCode ${authCode}`);
    const { tokens } = await oauth2Client.getToken(authCode);
    console.log(`[${telegramId}] Exchanged AuthCode for Google OAuth Tokens`);
    const user = await Users.getUser(telegramId);
    user.authInProgress = false;
    user.tokens = tokens;
    user.authDate = new Date().toISOString();
    await Users.updateUser(user);
    console.log(`[${telegramId}] Now authenticated`);
    // Now tokens contains an access_token and an optional refresh_token. Save them.
    // oauth2Client.setCredentials(tokens);
    // return oauth2Client;
    return user;
  } catch (e) {
    console.error(`[${telegramId}] Error during token exchange. AuthCode ${authCode}`, JSON.stringify(e));
  }
};

const getClient = (userId: any, tokens: any) => {
  if (clients.has(userId)) {
    clients.get(userId).setCredentials({ ...tokens, forceRefreshOnFailure: true });
  } else {
    const newClient = new google.auth.OAuth2(
      getEnvValue('OAUTH_clientId'),
      getEnvValue('OAUTH_clientSecret'),
      getEnvValue('OAUTH_redirectUrl')
    );
    newClient.setCredentials({ ...tokens, forceRefreshOnFailure: true });
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

export default { getOAuthUrl, getAndSaveTokens, getClient, authenticateUser };
