import {MongoClient} from 'mongodb';

let users: any;
// let messages;
// Connection url
const url = 'mongodb://localhost:27017/csn';

async function load() {
  try {
    const db = await MongoClient.connect(url);
    // console.log(await db.listCollections({}).toArray());
    users = db.collection('users');
    // messages = db.collection('messages');
  } catch (e) {
    console.log('Error connecting to Mongo', e);
  }
}

export async function getUsers(telegramId?: number) {
  if (!users) {
    await load();
  }
  try {
    const query: any = {
      active: {$ne: false},
    };
    if (telegramId) {
      query.telegramId = telegramId;
    }
    return (await users.find(query)).toArray();
  } catch (e) {
    console.log('Error retrieving users', e);
  }
}

export async function updateUser(user: any) {
  return users.updateOne({telegramId: user.telegramId}, user, {upsert: true});
}
