import { getEnvValue, parseKey } from '../util';
import * as admin from 'firebase-admin';

// Initialize Firebase
admin.initializeApp({
  credential: admin.credential.cert({
    // @ts-ignore
    project_id: getEnvValue('FIREBASE_projectId'),
    client_email: getEnvValue('FIREBASE_clientEmail'),
    private_key: parseKey(getEnvValue('FIREBASE_privateKey')),
  }),
  databaseURL: process.env['FIREBASE_databaseURL'],
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

const localSavedIds = new Set<string>();

// export default firebaseDb;
export default { set, onceValue, localSavedIds };
