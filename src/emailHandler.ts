import {parseEmailBody, emailsToFilter, fillTemplate} from './util';
import * as nodeUtil from 'util';

const google = require('googleapis');
const emails = google.gmail('v1').users.messages;
emails.getPromisified = nodeUtil.promisify(emails.get);
emails.listPromisified = nodeUtil.promisify(emails.list);
import Email from './classes/Email.js';
import CSBot from './classes/CSBot.js';

const bot = new CSBot(updateIds);
const Cron = require('node-cron');
const isDev = process.env.dev === 'true';
let db: any;
let jwtClient: any;
let savedIds: string[] = [];

const checkNewEmails = async (pageToken?: string) => {
  try {
    const response: Gmail.response = await emails.listPromisified({
      auth: jwtClient,
      userId: 'me',
      pageToken,
      q: `from:(${emailsToFilter.join('||')})`,
      maxResults: isDev ? 10 : 500,
    });
    // Blocking requests on dev env
    if (isDev) {
      response.nextPageToken = null;
    }

    // Using cache after first DB Synch in order to don't exaust the free tier of Firebase DB
    if (!isDev && !savedIds.length) {
      const snapshot = await db.ref('emailIds').once('value');
      console.log('Getting updated Ids from DB, from now on using cache');
      savedIds = Object.keys(snapshot.val() || {}) || [];
    }
    await filterNewMessages(response.messages, response.nextPageToken);
  } catch (e) {
    console.log('The API returned an error: ' + e.message);
  }
};

async function filterNewMessages(messages: Gmail.email[], nextPageToken: string) {
  await Promise.all(
    messages.reduce((acc, {id}) => {
      if (!savedIds.includes(id)) {
        // console.log('new message', message);
        savedIds.push(id);
        acc.push(handleNewMessage(id));
      }
      return acc;
    }, [])
  );
  !!nextPageToken && checkNewEmails(nextPageToken);
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
  const message = fillTemplate(parsedData);
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

async function updateIds(callback: () => void) {
  const snapshot = await db.ref('emailIds').once('value');
  console.log('FORCED - Getting updated Ids from DB, from now on using cache');
  savedIds = Object.keys(snapshot.val() || {}) || [];
  callback();
}

export default function start(jwt: any, firebaseDb: any) {
  db = firebaseDb;
  jwtClient = jwt;
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
}
