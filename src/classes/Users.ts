import * as db from './db';
import bot from './CSBot';
import OAuth from './OAuth';
import User from './User';

const users: Map<number, any> = new Map();

async function loadUsers() {
  const dbUsers: User[] = await db.getUsers();
  console.log('DB_USER', dbUsers);
  dbUsers.forEach((item) => users.set(Number(item.telegramId), item));
  /* users.set(Number(process.env['TELEGRAM:clientId']), {
    tokens2: {
      access_token: '',
      token_type: 'Bearer',
      expiry_date: 1502025966777,  
    },
  });*/
}

async function getUser(telegramId: number) {
  try {
    if (!users.has(telegramId)) {
      const dbUser = (await db.getUsers(telegramId))[0];
      if (dbUser) {
        users.set(telegramId, dbUser);
      } else {
        return null;
      }
    }
    return users.get(telegramId);
  } catch (e) {
    console.log(`Error retrieving user ${telegramId}`, e);
  }
}

async function updateUser(user: any, updateInfo?: any) {
  try {
    if (typeof user === 'number') {
      user = Object.assign(await getUser(user), updateInfo);
    }
    await db.updateUser(user);
    users.set(Number(user.telegramId), user);
  } catch (e) {
    console.log(`Error updating user ${user.telegramId}`, e);
  }
}

async function deactivate(telegramId: number) {
  await updateUser(telegramId, { active: false });
}

async function handleStart(user: any) {
  const localUser = await getUser(user.telegramId);
  if (localUser && !localUser.authInProgress) {
    // He is a recurring user
    localUser.active = true;
    updateUser(localUser);
    return bot.sendMessage(`Welcome back ${localUser.firstName} 🎉`, localUser.telegramId);
    // TODO check if still authenticated
  }
  await OAuth.authenticateUser(user);
}

export { loadUsers, users as list, getUser, updateUser, deactivate, handleStart };
