// / <reference path="typings/Interfaces.ts" />
'use strict';
import * as nodeUtil from 'util';
import {parseEmailBody, templates} from './util';
import * as admin from 'firebase-admin';
import * as http from 'http';
import CSBot from './classes/CSBot.js';
import Email from './classes/Email.js';

const google = require('googleapis');
const GoogleAuth = require('google-auth-library');
const emails = google.gmail('v1').users.messages;
emails.getPromisified = nodeUtil.promisify(emails.get);
emails.listPromisified = nodeUtil.promisify(emails.list);
const Cron = require('node-cron');
const isDev = process.env.dev === 'true';

const bot = new CSBot(updateIds);
let savedIds: string[] = [];
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

jwtClient.authorize((err: Error) => {
  if (err) {
    return console.log(err);
  }
  Cron.schedule(
    '*/5 * * * * *',
    function() {
      checkNewEmails();
    },
    true
  );
});

const checkNewEmails = (pageToken?: string) => {
  emails.list(
    {
      auth: jwtClient,
      userId: 'me',
      labelIds: process.env['GMAIL:label'],
      pageToken,
      maxResults: isDev ? 10 : 500,
    },
    (err: Error, response: Gmail.response) => {
      if (err) {
        console.log('The API returned an error: ' + err);
        return;
      }

      // Blocking requests on dev env
      if (isDev) {
        response.nextPageToken = null;
      }

      const messagesId = response.messages.map((message) => message.id);
      // let savedIds = null;

      // Using cache after first DB Synch in order to don't exaust the free tier of Firebase DB
      if (!isDev && !savedIds.length) {
        db.ref('emailIds').once('value').then(function(snapshot) {
          console.log('Getting updated Ids from DB, from now on using cache');
          savedIds = Object.keys(snapshot.val() || {}) || [];
          filterNewMessages(messagesId, response.nextPageToken);
        });
      } else {
        filterNewMessages(messagesId, response.nextPageToken);
      }
    }
  );
};

function filterNewMessages(messagesId: string[], nextPageToken: string) {
  !!nextPageToken && setTimeout(() => checkNewEmails(nextPageToken), 500);
  for (let messageId of messagesId) {
    if (!savedIds.includes(messageId)) {
      // console.log('new message', messageId);
      savedIds.push(messageId);
      handleNewMessage(messageId);
    }
  }
}

async function handleNewMessage(messageId: string) {
  const email = await getEmail(messageId);

  parseEmailBody(email);
  if (email.parsedData.error) {
    db.ref(`emailIds/${email.id}`).set(email.parsedData);
    return;
  }
  sendNotification(email.parsedData);
}

const sendNotification = (parsedData: Interfaces.parsedData) => {
  const message = parseTemplate(parsedData);
  bot.sendMessage(message);
  db.ref(`emailIds/${parsedData.id}`).set(parsedData);
};

const getEmail = async (emailId: string) => {
  console.log('New email', emailId);
  db.ref(`emailIds/${emailId}`).set('Processing...');
  try {
    return new Email(
      await emails.getPromisified({
        auth: jwtClient,
        userId: 'me',
        id: emailId,
      })
    );
  } catch (err) {
    console.log('The API returned an error: ' + err);
    db.ref(`emailIds/${emailId}`).set({error: 'Error retrieving email from Gmail'});
  }
};

const parseTemplate = (context: Interfaces.parsedData) => {
  if (!context) {
    return 'Errore nel parseTemplate -> context null';
  }
  let template = templates[context.strategy].template;
  if (context.total) {
    context.total = context.total.replace('.', ',');
  }
  if (!!context.type && context.type.includes('MP3')) {
    // Enjoy Piaggio MP3
    template = templates[context.strategy].templateScooter;
  }
  for (let key of Object.keys(context)) {
    template = template.replace(`#${key}#`, context[key]);
  }
  return template;
};

http
  .createServer(function(req, res) {
    res.writeHead(200, {'Content-Type': 'text/plain'});
    res.end('Server is up');
  })
  .listen(process.env.PORT || 5000, () => {
    console.log('Server listening on port: ', process.env.PORT);
  });

setInterval(function() {
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

function updateIds(callback: () => void) {
  db.ref('emailIds').once('value').then(function(snapshot) {
    console.log('FORCED - Getting updated Ids from DB, from now on using cache');
    savedIds = Object.keys(snapshot.val() || {}) || [];
    callback();
  });
}
