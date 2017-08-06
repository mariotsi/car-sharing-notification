import checkNewEmails from './emailHandler';
import * as oAuth from './classes/oAuth';
import * as Users from './classes/Users';

function chronTask() {
  Users.list.forEach(async (v, k) => {
    if (v.tokens && v.tokens.access_token) {
      oAuth.setCredentials(v.tokens);
      await checkNewEmails(k);
    } else if (!v.authInProgress) {
      oAuth.authenticateUser(k);
      v.authInProgress = true;
    }
  });
}

function startChronTask() {
  setInterval(chronTask, 5000);
}

async function startUp() {
  await Users.setUsers();
  startChronTask();
}

export default startUp;
