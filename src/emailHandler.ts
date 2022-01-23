import { parseEmailBody, emailsToFilter, fillTemplate } from './util';
import { isAfter } from 'date-fns';
import firebase from './classes/Firebase';
import * as db from './classes/db';
import OAuth from './classes/OAuth';

import { google, gmail_v1 as gmailTypes } from 'googleapis';
const emails = google.gmail('v1').users.messages;
import Email from './classes/Email.js';
import bot from './classes/CSBot.js';
import { ParsedData } from './typings/Interfaces';

// const Cron = require('node-cron');
const isDev = process.env.dev === 'true';

// let jwtClient: any;
let pagesLoaded = 0;
const MAX_DEV_PAGES = 10;
const checkNewEmails = async (user: any, client: any, pageToken?: string) => {
  try {
    const response = await emails.list({
      auth: client,
      userId: 'me',
      pageToken,
      q: `from:(${emailsToFilter.join('||')})`,
      maxResults: 5,
    });

    // Blocking requests on dev env
    if (isDev) {
      pagesLoaded++;
      if (pagesLoaded >= MAX_DEV_PAGES) {
        response.data.nextPageToken = null;
      }
    }

    // Using cache after first DB Synch in order to don't exaust the free tier of Firebase DB
    if (!isDev && !firebase.localSavedIds.size) {
      console.log('Getting updated Ids from DB...');
      const snapshot = await firebase.onceValue('emailIds');
      (Object.keys(snapshot.val() || {}) || []).map((key) => firebase.localSavedIds.add(key));
      console.log('Local cache filled from firebase, from now on using it');
    }
    await filterNewMessages(client, user, response.data.messages, response.data?.nextPageToken);
  } catch (e) {
    const error = e as { code?: string; message: string };
    console.log(`Error checking new email: ${error.code ? `${error.code} ${error.message}` : e}`);
    if (`${error.code}` === `${401}` || (`${error.code}` == `${400}` && error.message === 'invalid_request')) {
      await OAuth.authenticateUser(user.telegramId, true);
    }
  }
};

async function filterNewMessages(
  client: any,
  user: any,
  messages: gmailTypes.Schema$Message[] = [],
  nextPageToken: string | undefined | null
) {
  await messages.reduce(async (previousPromise, { id }) => {
    await previousPromise;
    let newPromise = Promise.resolve();
    if (!!id && !firebase.localSavedIds.has(id)) {
      firebase.localSavedIds.add(id);
      newPromise = handleNewMessage(client, id, user);
    }
    return newPromise;
  }, Promise.resolve());

  if (nextPageToken) {
    checkNewEmails(user, client, nextPageToken);
  }
}

async function handleNewMessage(client: any, messageId: string, user: any) {
  const email = await getEmail(client, messageId, user.telegramId);
  if (email) {
    console.log(`User ${user.telegramId} - Received email ${messageId} from Gmail. Start parsing`);
    parseEmailBody(email);
    console.log(`User ${user.telegramId} - Email ${messageId} correctly parsed. Email received on ${email.date}}`);
    firebase.set(`emailIds/${email.id}`, email.parsedData);
    if (email.parsedData?.total && isAfter(new Date(email.date), new Date(user.joined))) {
      sendNotification(email.parsedData, user.telegramId);
    } else {
      console.log(`Notification to ${user.telegramId} about email ${email.id} not sent because is too old`);
    }
  } else {
    console.log(`User ${user.telegramId} - Email ${messageId} is no more available`);
  }
}

const sendNotification = (parsedData: ParsedData, to: number) => {
  const message = fillTemplate(parsedData);
  if (!message) {
    return;
  }
  parsedData.sent = new Date().toISOString();
  bot.sendMessage(message, to);
  db.addNotificationToUser(to, message, parsedData);
};

const getEmail = async (client: any, emailId: string, telegramId: number) => {
  console.log(`User ${telegramId} - Asking new email ${emailId} to Gmail`);
  firebase.set(`emailIds/${emailId}`, 'Processing...');
  try {
    const { data } = await emails.get({
      auth: client,
      userId: 'me',
      id: emailId,
    });
    return new Email(data, telegramId);
  } catch (err) {
    console.error(`The API returned an error: ${err}`);
    firebase.set(`emailIds/${emailId}`, { error: 'Error retrieving email from Gmail' });
  }
};

export default checkNewEmails;
