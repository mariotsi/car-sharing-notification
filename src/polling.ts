import checkNewEmails from './emailHandler';
import OAuth from './classes/OAuth';
import * as Users from './classes/Users';
import User from './classes/User';

const checkSingleUserEmail = async (user: User) => {
  if (!user.active) {
    console.log(`[${user.telegramId}] Inactive user.`);
    return;
  }

  if (user.tokens?.access_token) {
    console.log(`[${user.telegramId}] START Checking emails`);
    await checkNewEmails(user, OAuth.getClient(user.telegramId, user.tokens));
    console.log(`[${user.telegramId}] STOP Emails checked`);
  } else if (!user.authInProgress) {
    console.log(`[${user.telegramId}] Not authenticated. Asking to reauth`);
    OAuth.authenticateUser(user);
  } else {
    console.log(`[${user.telegramId}] Not authenticated. Authentication floq in progress`);
  }
};

async function chronTask() {
  console.log('START Chron task');
  await Array.from(Users.list).reduce(async (previousPromise, [, user]) => {
    await previousPromise;
    return checkSingleUserEmail(user);
  }, Promise.resolve());

  console.log('STOP Chron task');
  scheduleChronTask();
}

function scheduleChronTask() {
  setTimeout(chronTask, 300000); // 5min
}

async function startUp() {
  await Users.loadUsers();
  chronTask();
}

export default startUp;
