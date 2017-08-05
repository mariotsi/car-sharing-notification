// / <reference path="typings/Interfaces.ts" />
'use strict';
import * as admin from 'firebase-admin';
import * as http from 'http';
import startEmailScanning from './emailHandler.js';

const GoogleAuth = require('google-auth-library');

// Initialize Firebase
admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env['FIREBASE:projectId'],
    clientEmail: process.env['FIREBASE:clientEmail'],
    privateKey: parseKey(process.env['FIREBASE:privateKey']),
  }),
  databaseURL: process.env['FIREBASE:databaseURL'],
});
const db = admin.database();
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

http
  .createServer(function(req, res) {
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

function parseKey(key: string) {
  try {
    return JSON.parse(key);
  } catch (e) {
    return key;
  }
}

startEmailScanning(jwtClient, db);
