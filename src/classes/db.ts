import {MongoClient} from 'mongodb';

let usersColl: any;
// let messages;
// Connection url
const url = 'mongodb://localhost:27017/csn';

async function load() {
  try {
    const db = await MongoClient.connect(url);
    // console.log(await db.listCollections({}).toArray());
    usersColl = db.collection('users');
    // messages = db.collection('messages');
  } catch (e) {
    console.log('Error connecting to Mongo', e);
  }
}

export async function getUsers(telegramId?: number | boolean) {
  if (!usersColl) {
    await load();
  }
  try {
    const query: any = {};
    // if telegramId is boolean and true retrieve all user, also inactive
    if (typeof telegramId === 'boolean' && telegramId) query.active = {$ne: false};
    if (typeof telegramId === 'number') {
      query.telegramId = telegramId;
    }
    return await usersColl.find(query).toArray();
  } catch (e) {
    console.log('Error retrieving users', e);
  }
}

export async function getAllUsers() {
  return getUsers(true);
}

export async function updateUser(user: any) {
  return usersColl.updateOne({telegramId: user.telegramId}, user, {upsert: true});
}
