const functions = require('firebase-functions');
const FBAuth = require('./util/fbAuth');
const app =require('express')();
const {db} =require('./util/admin');
// const firebase = require('firebase');
const {
    getAllShouts,
    postOneShout, 
    getShout,
    commentOnShout,
    likeShout,
    unLikeShout,
    deleteShout
} = require('./handlers/shouts');

const {
    signup,
    login,
    uploadImage,
    addUserDetails,
    getAuthenticatedUser,
    getUserDetails,
    markNotificationsRead
} = require('./handlers/users');

//shout routes
app.get('/shouts',getAllShouts);
app.post('/newShout',FBAuth, postOneShout);
app.get('/newShout/:shoutId', getShout);

//TODO delete shout
//TODO like a shout
//TODO unlike shout
//TODO comment on a shout
app.post('/newShout/:shoutId/comment', FBAuth, commentOnShout);
app.delete('/newShout/:shoutId',FBAuth, deleteShout);
app.get('/newShout/:shoutId/likeShout', FBAuth, likeShout);
app.get('/newShout/:shoutId/unLikeShout', FBAuth, unLikeShout);



//users routes
app.post('/signup',signup);
app.post('/login',login);
app.post('/user/image',FBAuth, uploadImage);
app.post('/user',FBAuth, addUserDetails);
app.get('/user', FBAuth,getAuthenticatedUser);
app.get('/user/:handle', getUserDetails);
app.post('/notifications',FBAuth, markNotificationsRead)


exports.api =functions.region('us-central1').https.onRequest(app);

exports.createNotificationOnLike = functions
.region('us-central1')
.firestore.document('likes/{id}')
.onCreate((snapshot) =>{
    return db
    .doc(`/shouts/${snapshot.data().shoutId}`)
    .get()
    .then(doc =>{
        if(
            doc.exists &&
            doc.data().userHandle !== snapshot.data().userHandle
           ){
            return db.doc(`/notifications/${snapshot.id}`).set({
                createdAt: new Date().toISOString(),
                recepient:doc.data().userHandle,
                sender:snapshot.data().userHandle,
                type:'like',
                read: false,
                shoutId: doc.id
            });
        }
    })
    .catch((err) =>console.error(err));
});

exports.deleteNotificationOnUnLike = functions.region('us-central1')
.firestore.document('likes/{id}')
.onDelete((snapshot)=>{
    db.doc(`/notifications/${snapshot.id}`)
    .delete()
    .catch(err=>{
        console.error(err)
        return;
    });
});


exports.createNotificationOnComment = functions
.region('us-central1')
.firestore.document('comments/{id}')
.onCreate((snapshot)=>{
db.doc(`/shouts/${snapshot.data().shoutId}`)
.get()
.then(doc =>{
    if(doc.exists &&
        doc.data().userHandle !== snapshot.data().userHandle
        ){
        return db.doc(`/notifications/${snapshot.id}`).set({
            createdAt: new Date().toISOString(),
            recepient:doc.data().userHandle,
            sender:snapshot.data().userHandle,
            type:'comment',
            read: false,
            shoutId: doc.id
        });
    }
})
.catch(err =>{
    console.error(err);
    return;
});
});

