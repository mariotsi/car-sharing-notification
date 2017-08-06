import {parseEmailBody, emailsToFilter, fillTemplate} from './util';
import * as nodeUtil from 'util';
import * as firebase from './classes/Firebase';
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

const checkNewEmails = async (telegramId: number, pageToken?: string) => {
  try {
    const response: Gmail.response = await emails.listPromisified({
      auth: oAuth.getClient(),
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
    if (!isDev && !firebase.localSavedIds.size) {
      const snapshot = await firebase.onceValue('emailIds');
      console.log('Getting updated Ids from DB, from now on using cache');
      (Object.keys(snapshot.val() || {}) || []).map(firebase.localSavedIds.add);
    }
    await filterNewMessages(telegramId, response.messages, response.nextPageToken);
  } catch (e) {
    console.log('The API returned an error: ' + e);
  }
};

async function filterNewMessages(telegramId: number, messages: Gmail.email[], nextPageToken: string) {
  await Promise.all(
    messages.reduce((acc, {id}) => {
      if (!firebase.localSavedIds.has(id)) {
        // console.log('new message', message);
        firebase.localSavedIds.add(id);
        acc.push(handleNewMessage(id, telegramId));
      }
      return acc;
    }, [])
  );
  !!nextPageToken && checkNewEmails(telegramId, nextPageToken);
}

async function handleNewMessage(messageId: string, telegramId: number) {
  const email = await getEmail(messageId, telegramId);

  parseEmailBody(email);
  if (email.parsedData.error) {
    firebase.set(`emailIds/${email.id}`, email.parsedData);
    return;
  }
  sendNotification(email.parsedData);
}

const sendNotification = (parsedData: Interfaces.parsedData) => {
  const message = fillTemplate(parsedData);
  bot.sendMessage(message);
  firebase.set(`emailIds/${parsedData.id}`, parsedData);
};

const getEmail = async (emailId: string, telegramId: number) => {
  console.log('New email', emailId);
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
