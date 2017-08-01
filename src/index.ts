// / <reference path="typings/Interfaces.ts" />
'use strict';
import * as util from 'util';
import * as admin from 'firebase-admin';
import * as http from 'http';
import {strategyMap} from './strategyMap.js';
import CSBot from './CSBot.js';
import Email from './classes/Email.js';

const google = require('googleapis');
const GoogleAuth = require('google-auth-library');
const emails = google.gmail('v1').users.messages;
emails.getPromisified = util.promisify(emails.get);
emails.listPromisified = util.promisify(emails.list);
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

function handleNewMessage(messageId: string) {
  getEmail(messageId)
    .then(extractData, (data) => db.ref(`emailIds/${data.id}`).set({error: 'No body found'}))
    .then(sendNotification, (data) => db.ref(`emailIds/${data.id}`).set(data));
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
  }
};

const extractData = (data: { id: string; sender: { value: string }; date: { value: string }; body: string }) =>
  new Promise((resolve, reject) => {
    let strategy = /@(.+)\..*/.exec(data.sender.value)[1];
    let regexs;
    const parsedData: Interfaces.parsedData = {};
    for (let regex of Object.keys((regexs = (strategyMap[strategy] || {regexs: null}).regexs || {}))) {
      let result;
      while ((result = regexs[regex].exec(data.body)) != null) {
        result.shift();
        result[0] = result[0].replace(',', '.');
        // Sum due to double invoices in some email
        parsedData[regex] = parsedData[regex]
          ? (parseFloat(parsedData[regex]) + parseFloat(result[0])).toFixed(2)
          : result[0];
      }
      // resetting the Regex due to \g flag
      regexs[regex].lastIndex = 0;
    }
    if (Object.keys(parsedData).length && parsedData.total) {
      parsedData.longName = strategyMap[strategy].longName;
      parsedData.id = data.id;
      parsedData.strategy = strategy;
      parsedData.sender = data.sender.value;
      parsedData.date = data.date.value;
      console.log(`Email from ${data.sender.value} id: ${parsedData.id} - Sending notification`, parsedData);
      return resolve(parsedData);
    } else if (!parsedData.total) {
      console.log(`Email from ${data.sender.value} id: ${data.id} - No total found`, parsedData);
      return reject({
        id: data.id,
        sender: data.sender.value,
        date: data.date.value,
        error: 'No total found',
        parsedData: parsedData,
        longName: (strategyMap[strategy] || {longName: null}).longName || 'Unidentified',
      });
    } else {
      console.log(`Email from ${data.sender.value} id: ${data.id} - No data found`, data);
      return reject({
        id: data.id,
        error: 'No data found',
        data: data,
        longName: (strategyMap[strategy] || {longName: null}).longName || 'Unidentified',
        sender: data.sender.value,
        date: data.date.value,
      });
    }
  });

const parseTemplate = (context: Interfaces.parsedData) => {
  if (!context) {
    return 'Errore nel parseTemplate -> context null';
  }
  let template = strategyMap[context.strategy].template;
  if (context.total) {
    context.total = context.total.replace('.', ',');
  }
  if (!!context.type && context.type.includes('MP3')) {
    // Enjoy Piaggio MP3
    template = strategyMap[context.strategy].templateScooter;
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
