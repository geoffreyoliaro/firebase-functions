const {db} = require('../util/admin');
const firebase  = require('firebase');
const config =require('../util/config');
const {validateSignupData,validateLoginData} = require('../util/validators');

firebase.initializeApp(config);


exports.signup = (req,res)=>{
    const newUser ={
        email:req.body.email,
        password:req.body.password,
        confirmPassword:req.body.confirmPassword,
        handle:req.body.handle,
    };
    const {valid,errors} =validateSignupData(newUser);
        if(!valid)return res.status(400).json(errors);
   
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
     
}

exports.login =(req,res)=>{
    const user ={
        email:req.body.email,
        password:req.body.password
    };
    
    const {valid,errors} =validateLoginData(user);
        if(!valid)return res.status.json(errors);
    

    firebase.auth().signInWithEmailAndPassword(user.email,user.password)
        .then(data=>{
            return data.user.getIdToken();
        })
        .then((token)=>{
            return res.json({token});
        })
        .catch(err=>{
            console.error(err);
            if(err.code ==='auth/wrong-password'){
                return res.status(403).json({general:'Wrong credentials, please try again'});
            }
            else return res.status(500).json({error: err.code});
        })
};
