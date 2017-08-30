import {parseEmailBody, emailsToFilter, fillTemplate} from './util';
import {isAfter} from 'date-fns';
import * as nodeUtil from 'util';
import * as firebase from './classes/Firebase';
import * as db from './classes/db';
import * as oAuth from './classes/oAuth';

const google = require('googleapis');
const emails = google.gmail('v1').users.messages;
emails.getPromisified = nodeUtil.promisify(emails.get);
emails.listPromisified = nodeUtil.promisify(emails.list);
import Email from './classes/Email.js';
import bot from './classes/CSBot.js';

// const Cron = require('node-cron');
const isDev = process.env.dev === 'true';

// let jwtClient: any;

const checkNewEmails = async (user: any, pageToken?: string) => {
  try {
    const response: Gmail.response = await emails.listPromisified({
      auth: oAuth.getClient(),
      userId: 'me',
      pageToken,
      q: `from:(${emailsToFilter.join('||')})`,
      maxResults: 5,
    });
    // Blocking requests on dev env
    if (isDev && false) {
      response.nextPageToken = null;
    }

    // Using cache after first DB Synch in order to don't exaust the free tier of Firebase DB
    if (!isDev && !firebase.localSavedIds.size) {
      const snapshot = await firebase.onceValue('emailIds');
      console.log('Getting updated Ids from DB, from now on using cache');
      (Object.keys(snapshot.val() || {}) || []).map(firebase.localSavedIds.add);
    }
    await filterNewMessages(user, response.messages, response.nextPageToken);
  } catch (e) {
    console.log('The API returned an error: ' + e);
    if (e.code === 401) {
      await oAuth.authenticateUser(user.telegramId, true);
    }
  }
};

async function filterNewMessages(user: any, messages: Gmail.email[], nextPageToken: string) {
  await Promise.all(
    messages.reduce((acc, {id}) => {
      if (!firebase.localSavedIds.has(id)) {
        // console.log('new message', message);
        firebase.localSavedIds.add(id);
        acc.push(handleNewMessage(id, user));
      }
      return acc;
    }, [])
  );
  !!nextPageToken && checkNewEmails(user, nextPageToken);
}

async function handleNewMessage(messageId: string, user: any) {
  const email = await getEmail(messageId, user.telegramId);

  parseEmailBody(email);
  if (email.parsedData.error) {
    firebase.set(`emailIds/${email.id}`, email.parsedData);
    return;
  }
  if (isAfter(email.date, user.joined)) {
    sendNotification(email.parsedData, user.telegramId);
  } else {
    console.log(`Notification to ${user.telegramId} about email ${email.id} not sent because is too old`);
  }
}

const sendNotification = (parsedData: Interfaces.parsedData, to: number) => {
  const message = fillTemplate(parsedData);
  parsedData.sent = new Date().toISOString();
  bot.sendMessage(message, to);
  db.addNotificationToUser(to, message, parsedData);
  firebase.set(`emailIds/${parsedData.d}`, parsedData);
};

const getEmail = async (emailId: string, telegramId: number) => {
  // console.log(`User ${telegramId} - Got new email ${emailId}`);
  firebase.set(`emailIds/${emailId}`, 'Processing...');
  try {
    return new Email(
      await emails.getPromisified({
        auth: oAuth.getClient(),
        userId: 'me',
        id: emailId,
      }),
      telegramId
    );
  } catch (err) {
    console.log('The API returned an error: ' + err);
    firebase.set(`emailIds/${emailId}`, {error: 'Error retrieving email from Gmail'});
  }
};

export default checkNewEmails;
