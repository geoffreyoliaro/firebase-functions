const functions = require('firebase-functions');
const FBAuth = require('./util/fbAuth');
const app =require('express')();
// const firebase = require('firebase');
const {getAllShouts,postOneShout} = require('./handlers/shouts');
const {signup,login} = require('./handlers/users');

//shout routes
app.get('/shouts',getAllShouts);
app.post('/newShout',FBAuth, postOneShout);
//users routes
app.post('/signup',signup);
app.post('/login',login)


exports.api =functions.region('us-central1').https.onRequest(app);

