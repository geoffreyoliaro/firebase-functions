const {db,admin} = require('../util/admin');
const firebase  = require('firebase');
const config =require('../util/config');
const {validateSignupData,validateLoginData,reduceUserDetails} = require('../util/validators');

firebase.initializeApp(config);


//signup user
exports.signup = (req,res)=>{
    const newUser ={
        email:req.body.email,
        password:req.body.password,
        confirmPassword:req.body.confirmPassword,
        handle:req.body.handle,
    };
    const {valid,errors} =validateSignupData(newUser);
        if(!valid)return res.status(400).json(errors);
   
    const noImg = 'no-image.png'; 
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
            imageUrl:`https://firebasestorage.googleapis.com/v0/b/${config.storageBucket}/0/${noImg}?alt=media`,
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
    
     
}

//login user
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
//Get any users details
exports.getUserDetails = (req,res)=>{
    let userData = {};
    db.doc(`/users/${req.params.handle}`).get()
    .then(doc =>{
        if(doc.exists){
            userData.user =doc.data();
            return db.collection('shouts').where('userHandle','==',req.params.handle)
                .orderBy('createdAt','desc')
                .get();
        }else{
            return res.status(404).json({error:'user not found'});

        }
    })
    .then(data=>{
        userData.shouts =[];
        data.forEach(doc=>{
            userData.shouts.push({
                body:doc.data().body,
                createdAt:doc.data().createdAt,
                userHandle:doc.data().userHandle,
                userImage:doc.data().userImage,
                likeCount:doc.data().likeCount,
                commentCount:doc.data().commentCount,
                shoutId:doc.id
            })
        });
        return res.json(userData);
    })
    .catch(err=>{
        console.error(err);
        return res.status(500).json({error:err.code});
    })

}
//Get own user Details
exports.getAuthenticatedUser =(req, res) =>{
    let userData = {};
    db.doc(`/users/${req.user.handle}`).get()
        .then(doc=>{
            if(doc.exists){
                userData.credentials = doc.data();
                return db.collection('likes').where('userHandle', '==', req.user.handle).get()
            }
        })
        .then(data =>{
            userData.likes = [];
            data.forEach(doc =>{
                userData.likes.push(doc.data());
            });
            return db.collection('notifications').where('recepient', '==', req.user.handle)
                .orderBy('createdAt', 'desc').limit(10).get();
        })
        .then(data=>{
            userData.notifications =[];
            data.forEach(doc=>{
                userData.notifications.push({
                    recepient: doc.data().recepient,
                    sender: doc.data().sender,
                    createdAt: doc.data().createdAt,
                    shoutId: doc.data().shoutId,
                    type: doc.data().type,
                    read: doc.data().read,
                    notificationId: doc.id,

                });
                return res.json(userData);

            })
        })
        .catch(err =>{
            console.error(err);
            return res.status(500).json({error: err.code});
        });

}

//add user Details
exports.addUserDetails =(req,res)=>{
    let userDetails = reduceUserDetails(req.body);

    db.doc(`/users/${req.user.handle}`).update(userDetails)
        .then(()=>{
            return res.json({message:'Details added successfully'})
        })
        .catch(err=>{
            console.error(err);
            return res.status(500).json({error:err.code});
        })


}


//upload image
exports.uploadImage = (req,res)=>{
    const Busboy = require('busboy');
    const path = require('path');
    const os = require('os');
    const fs = require('fs');

    const busboy =new Busboy({headers: req.headers});
    
    let imageFileName;
    let imageToBeUploaded = {};

    busboy.on('file',(fieldname, file, filename, encoding, mimetype)=>{
        console.log(fieldname);
        console.log(filename);
        console.log(mimetype);
        if(mimetype !=='image/jpeg' && mimetype !=='image/png' ){
            return res.status(400).json({error:'wrong file type submitted' });
        }
        const imageExtension = filename.split('.')[filename.split('.').length - 1];
        imageFileName = `${Math.round(Math.random()*100000000)}.${imageExtension}`;
        const filePath = path.join(os.tmpdir(),imageFileName);
        imageToBeUploaded = {filePath,mimetype};
        file.pipe(fs.createWriteStream(filePath));
    });
    busboy.on('finish',()=>{
        admin.storage().bucket().upload(imageToBeUploaded.filePath,{
            resumable : false,
            metadata:{
              metadata:{
                  contentType: imageToBeUploaded.mimetype
              }  
            }
        })
        .then(()=>{
            const imageUrl = `https://firebasestorage.googleapis.com/v0/b/${config.storageBucket}/0/${imageFileName}?alt=media`
            return db.doc(`/users/${req.user.handle}`).update({imageUrl});
        })
        .then (()=>{
            return res.json({message:'image uploaded successfully'});
        })
        .catch(err=>{
            console.error(err);
            return res.status(500).json({error: err.code});

        });

    });
    busboy.end(req.rawBody);
}

exports.markNotificationsRead =(req,res)=>{
    let batch = db.batch();
    req.body.forEach(notificationId=>{
        const notification = db.doc(`/notifications/${notificationId}`);
        batch.update(notification, {read:true});
    });
    batch.commit()
    .then(()=>{
        return res.json({message:'Notifications marked read'});
    })
    .catch(err=>{
        console.error(err)
        return res.status(500).json({error:err.code});

    })

}




