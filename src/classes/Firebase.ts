import {parseKey} from '../util';
import * as admin from 'firebase-admin';

const localSavedIds = new Set();
// Initialize Firebase
admin.initializeApp({
  credential: admin.credential.cert({
    project_id: process.env['FIREBASE:projectId'],
    client_email: process.env['FIREBASE:clientEmail'],
    private_key: parseKey(process.env['FIREBASE:privateKey']),
  }),
  databaseURL: process.env['FIREBASE:databaseURL'],
});
const firebaseDb = admin.database();

function set(where: string, what: any) {
  firebaseDb.ref(where).set(what);
}

function once(where: string, what: any = 'value') {
  return firebaseDb.ref(where).once(what);
}

function onceValue(where: string) {
  return once(where);
}

export default firebaseDb;
export {set, onceValue, localSavedIds};
