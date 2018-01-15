import checkNewEmails from './emailHandler';
import * as oAuth from './classes/oAuth';
import * as Users from './classes/Users';

function chronTask() {
  Users.list.forEach(async (v) => {
    if (v.active) {
      console.log(`Polling user ${v.telegramId}`);
      if (v.tokens && v.tokens.access_token) {
        console.log(`User ${v.telegramId}: authenticated, checking emails`);
        // oAuth.setCredentials(v.telegramId, v.tokens);
        await checkNewEmails(v, oAuth.getClient(v.telegramId, v.tokens));
        console.log(`User ${v.telegramId}: all emails checked`);
      } else if (!v.authInProgress) {
        console.log(`User ${v.telegramId}: not authenticated, asking to reauth`);
        oAuth.authenticateUser(v);
      } else {
        console.log(`User ${v.telegramId}: not authenticated, but auth in progress. Skipping`);
      }
    }
  });
}

function startChronTask() {
  setInterval(chronTask, 5000);
}

async function startUp() {
  await Users.loadUsers();
  startChronTask();
}

export default startUp;
