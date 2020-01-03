const functions = require('firebase-functions');
const FBAuth = require('./util/fbAuth');
const app =require('express')();
// const firebase = require('firebase');
const {
    getAllShouts,
    postOneShout, 
    getShout,
    commentOnShout
} = require('./handlers/shouts');

const {
    signup,
    login,
    uploadImage,
    addUserDetails,
    getAuthenticatedUser
} = require('./handlers/users');

//shout routes
app.get('/shouts',getAllShouts);
app.post('/newShout',FBAuth, postOneShout);
app.get('/newShout/:shoutId', getShout);

//TODO delete shout
//TODO like a shout
//TODO unlike shout
//TODO comment on a shout
app.post('/newShout/:shoutId/comment', FBAuth, commentOnShout)


//users routes
app.post('/signup',signup);
app.post('/login',login);
app.post('/user/image',FBAuth, uploadImage);
app.post('/user',FBAuth, addUserDetails);
app.get('/user', FBAuth,getAuthenticatedUser);


exports.api =functions.region('us-central1').https.onRequest(app);

