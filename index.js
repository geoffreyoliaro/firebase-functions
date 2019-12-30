const functions = require('firebase-functions');
const admin = require('firebase-admin');
const app =require('express')();
const firebase = require('firebase');


const firebaseConfig = {
    apiKey: "AIzaSyAo5Cbp7Y78f9LzxHUJsSfBEwpa0oWr2Hk",
    authDomain: "chatterb-b5f90.firebaseapp.com",
    databaseURL: "https://chatterb-b5f90.firebaseio.com",
    projectId: "chatterb-b5f90",
    storageBucket: "chatterb-b5f90.appspot.com",
    messagingSenderId: "687176465904",
    appId: "1:687176465904:web:35cdf35e81039206d6f135",
    measurementId: "G-F48L3CXRF2"
  };

firebase.initializeApp(firebaseConfig);
admin.initializeApp();
const db = admin.firestore();
 

app.get('/shouts',(req,res)=>{
    db
    .collection('shouts')
    .orderBy('createdAt','desc')
    .get()
    .then(data=>{
        let shouts = [];
        data.forEach(doc=>{
            shouts.push({
                shoutId: doc.id,
                body: doc.data().body,
                userHandle:doc.data().userHandle,
                createdAt:doc.data().createdAt
            });
        });
        return res.json(shouts);
    })
    .catch(err => console.error(err));
})


app.post('/newShout',(req,res)=>{
    const newShout = {
        body:req.body,
        userHandle: req.body.userHandle,
        createdAt: new Date().toISOString()
    };
    db
        .collection('shouts')
        .add(newShout)
        .then(doc =>{
            res.json({message:`document ${doc.id} created successfully`});
        })
        .catch(err =>{
            res.status(500).json({error:'something went wrong'});
            console.error(err);

        })
});

app.post('/signup',(req,res)=>{
    const newUser ={
        email:req.body.email,
        password:req.body.password,
        confirmPassword:req.body.confirmPassword,
        handle:req.body.handle,
    };
    let token, userId;
    db.doc(`/users/${newUser.handle}`)
    .get()
    .then(doc=>{
        if(doc.exists){
            return res.status(400).json({handle:'this handle is already taken'});
        }else{
            return firebase
            .auth()
            .createUserWithEmailAndPassword(newUser.email, newUser.password);
            
        }
    })
    .then((data)=>{
        userId = data.user.uid;
        return data.user.getIdToken();
    })
    .then((idToken)=>{
        token = idToken;
        const userCredentials = {
            handle: newUser.handle,
            email:newUser.email,
            createdAt:new Date().toISOString(),
            userId
        };
       return db.doc(`/users/${newUser.handle}`).set(userCredentials);
    })
    .then(()=>{
        return res.status(201).json({token})
    })

    .catch(err=>{
        console.error(err);
        return res.status(500).json({error:err.code});
    })
    //TODO validate data
     
});
//https://baseurl.com/api/

exports.api =functions.https.onRequest(app);

