import * as db from './db';

const users: Map<number, any> = new Map();

async function loadUsers() {
  const dbUsers = await db.getUsers();
  dbUsers.forEach((item) => users.set(item.telegramId, item));
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
      users.set(telegramId, (await db.getUsers(telegramId))[0]);
    }
    return users.get(telegramId);
  } catch (e) {
    console.log('Error retrieving user ' + telegramId, e);
  }
}

async function updateUser(user: any) {
  try {
    await db.updateUser(user);
    users.set(user.telegramId, user);
  } catch (e) {
    console.log('Error updating user ' + user.telegramId, e);
  }
}

export {loadUsers, users as list, getUser, updateUser};
