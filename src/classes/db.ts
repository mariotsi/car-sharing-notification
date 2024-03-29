import { Collection, MongoClient } from 'mongodb';
import { ParsedData } from '../typings/Interfaces';
import { getEnvValue } from '../util';
import User from './User';

let usersColl: Collection<User>;
// let messages;
// Connection url
const url = getEnvValue('MONGODB_URI');
console.log(url);
async function load() {
  try {
    const client = new MongoClient(url);
    await client.connect();
    const db = client.db();
    // console.log(await db.listCollections({}).toArray());
    usersColl = db.collection<User>('users');
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
    if (typeof telegramId === 'boolean' && telegramId) query.active = { $ne: false };
    if (typeof telegramId === 'number') {
      query.telegramId = telegramId;
    }
    return await usersColl.find(query).toArray();
  } catch (e) {
    console.log('Error retrieving users', e);
    return [];
  }
}

export async function getAllUsers() {
  return getUsers(true);
}

export async function addNotificationToUser(telegramId: number, message: string, data: ParsedData) {
  try {
    // Check if we already saved that notification (should happen only in dev mode)
    const alreadySaved = !!(await usersColl.findOne({ telegramId, 'notifications.id': data.id }));
    if (!alreadySaved) {
      usersColl.updateOne({ telegramId }, { $push: { notifications: { id: data.id, message, data } } });
    }
  } catch (e) {
    console.log('Cannot add notification to user', telegramId, message);
  }
}

export async function updateUser(user: any) {
  return usersColl.updateOne({ telegramId: user.telegramId }, { $set: user }, { upsert: true });
}
