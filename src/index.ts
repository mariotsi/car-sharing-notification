// / <reference path="typings/Interfaces.ts" />
'use strict';
import base64url from 'base64url';
import * as http from 'http';
import * as url from 'url';
import * as querystring from 'querystring';
import startUp from './polling';
import codesHolder from './util/authCodesStore';
import { v4 as uuidV4 } from 'uuid';

http
  .createServer(async function (req, res) {
    const reqUrl = req.url ?? '';
    const { pathname, query } = url.parse(reqUrl);
    const qs = querystring.parse(query);
    if (pathname === '/oauth_cb') {
      // https://core.telegram.org/bots#deep-linking
      const authCodeKey = uuidV4();
      const telegramId = query.state;
      codesHolder.set(authCodeKey, `${telegramId}|${base64url.encode(qs.code)}`);
      const redirectionTarget = `https://telegram.me/car_sharing_bot?start=${authCodeKey}`;
      res.writeHead(302, {
        Location: redirectionTarget,
      });
      res.end();
    }
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Server is up');
  })
  .listen(process.env.PORT || 5000, () => {
    console.log('Server listening on port: ', process.env.PORT || 5000);
  });

setInterval(() => {
  // Keep-Alive Heroku App every 5 min
  http.get('http://car-sharing-notification.herokuapp.com/');
  console.log('Calling itself to keep the instance running.');
}, 300000);

startUp();
