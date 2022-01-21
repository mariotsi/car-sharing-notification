// / <reference path="typings/Interfaces.ts" />
'use strict';
import base64url from 'base64url';
import * as http from 'http';
import * as url from 'url';
// import {parseKey} from './util';
import * as querystring from 'querystring';
import startUp from './polling';
/*
const GoogleAuth = require('google-auth-library');

const jwtPrivateKey = parseKey(process.env['JWT:privateKey']);
// Initialize JWT Auth
const auth = new GoogleAuth();
const jwtClient = new auth.JWTClient(
  process.env['JWT:clientEmail'],
  null,
  jwtPrivateKey,
  // Scopes can be specified either as an array or as a single, space-delimited string
  ['https://mail.google.com/'],
  // User to impersonate (leave empty if no impersonation needed)
  process.env['JWT:impersonate']
);
*/
http
    .createServer(async function(req, res) {
      const pathName = url.parse(req.url).pathname;
      const query = querystring.parse('' + url.parse(req.url).query);
      if (pathName === '/oauth_cb') {
      // https://core.telegram.org/bots#deep-linking
        const redirectionTarget = `https://telegram.me/car_sharing_bot?start=${base64url.encode(query.code)}`;
        res.writeHead(302, {
          Location: redirectionTarget,
        });
        console.log(redirectionTarget);
        res.end();
      /* request.get(`https://telegram.me/car_sharing_bot?start=${query.code}`,{},(e,a)=>{
              console.log(a);
              res.end(`Server is up on ${req.headers.host} ${JSON.stringify(query)}`)

            }
            );*/
      }
      res.writeHead(200, {'Content-Type': 'text/plain'});
      res.end('Server is up');
    })
    .listen(process.env.PORT || 5000, () => {
      console.log('Server listening on port: ', process.env.PORT || 5000);
    });

setInterval(() => {
  // Keep-Alive Heroku App
  http.get('http://car-sharing-notification.herokuapp.com/');
  console.log('Calling itself to keep the instance running.');
}, 300000);

startUp();
