'use strict';
const admin = require("firebase-admin");
const google = require('googleapis');
const googleAuth = require('google-auth-library');
const gmail = google.gmail('v1');

//Initialize Firebase
admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_projectId,
    clientEmail: process.env.FIREBASE_clientEmail,
    privateKey: process.env.FIREBASE_privateKey
  }),
  databaseURL: process.env.FIREBASE_databaseURL
});
const db = admin.database();
let emails = null;


// Initialize JWT Auth
const auth = new googleAuth();
const jwtClient = new auth.JWTClient(
  process.env.JWT_client_email,
  null,
  process.env.JWT_private_key,
  // Scopes can be specified either as an array or as a single, space-delimited string
  ['https://mail.google.com/'],
  // User to impersonate (leave empty if no impersonation needed)
  process.env.JWT_IMPERSONATE);

jwtClient.authorize((err, tokens) => {
  if (err) {
    return console.log(err);
  }

  emails = gmail.users.messages;
  emails.list({
    auth: jwtClient,
    userId: 'me',
    labelIds: process.env.GMAIL_LABEL
  }, (err, response) => {
    if (err) {
      console.log('The API returned an error: ' + err);
      return;
    }
    const messagesId = response.messages.map(message => message.id);
    let savedIds = null;
    db.ref('emailIds').once('value').then(function (snapshot) {
      savedIds = snapshot.val();
      for (let messageId of messagesId) {
        if (!(messageId in savedIds)) {
          console.log('new message', messageId);
          handleNewMessage(messageId);
          db.ref(`emailIds/${messageId}`).set('sending');
        }
      }
    });
  });
});

function handleNewMessage(messageId) {
  getEmail(messageId).then(extractData);
}

const getEmail = emailId =>
  new Promise((resolve, reject) => {
    emails.get({
      auth: jwtClient,
      userId: 'me',
      id: emailId
    }, (err, response) => {
      if (err) {
        console.log('The API returned an error: ' + err);
        return reject(err);
      }
      let bodyData = response.payload.body.data;
      if (!bodyData){
       bodyData =  (response.payload.parts.find(item => item.mimeType = 'text/plain').body || {}).data;
      }
      return resolve({
        sender: response.payload.headers.find(item => item.name === 'From'),
        body: Buffer.from(bodyData, 'base64').toString()
      });
    })
  })

const extractData = data => {
  let strategy = /@(.+)\..*/.exec(data.sender.value)[1];
  
}

