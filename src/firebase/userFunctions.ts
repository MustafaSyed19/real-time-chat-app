/*this file will be used to make modifications to the users account including followers, 
following, profilePictureUrl and preferences */

import { collection, query, where, getDocs, doc, updateDoc, arrayRemove, arrayUnion, getDoc, setDoc } from "firebase/firestore"
import { db } from "./config"


/*search for a user based on the starting letters of the search */
const searchUser = async(username:string) => 
{ 
    const usersref = collection(db, "users")
    const q =  query(
        usersref, 
        where("username",">=",username),
        where("username","<",username+"\uf8ff")
    );
    const querySnapshot  = await getDocs(q); 
    return querySnapshot; 
}

//this allows you to follow a user 
const followUser = async(userID:string, friendID:string) => 
{ 
    const userDocRef = doc(db, "users", userID)
    await updateDoc(userDocRef, 
        { 
            following: arrayUnion(friendID)
        }
    );

    const friendDocRef = doc(db,"users",friendID)
        await updateDoc(friendDocRef, 
        { 
            followers: arrayUnion(friendID)
        }
    );
}

//this allows you to unfollow a user 

const unFollowUser = async(userID:string, friendID:string) => 
{ 
    const userDocRef = doc(db, "users", userID)
    await updateDoc(userDocRef, 
        { 
            following: arrayRemove(friendID)
        }
    );

    const friendDocRef = doc(db,"users",friendID)
        await updateDoc(friendDocRef, 
        { 
            followers: arrayRemove(friendID)
        }
    );
}

//this allows you to retrieve the users that follow a profile 
const getFollowers= async(userID:string) => 
{ 
    const userDocRef = doc(db,"users",userID)
    const q  =  await getDoc(userDocRef)
    return q.data()?.followers 
}

//this allows you to retrieve the users that you follow 
const getFollowing = async(userID:string)=> 
{ 
    const userDocRef = doc(db,"users",userID)
    const q  =  await getDoc(userDocRef)
    return q.data()?.following 
}

/* These functions will be used to update a users account in some sort of way that really has no functional 
impact on anything else*/

//updates a users bio with the param string
const updateBio = async(userID:string, bio:string)=> 
{ 
    const userDocRef = doc(db,"users",userID)
    await setDoc(userDocRef, {"bio": bio}); 
}

//updates the users profile picture with a picture that has been uploaded
const updateProfilePic = ()=> 
{ 

}




//TODO 
const getNotification = ()=> 
{ 
    
}

//try this later if possible for now this is damn hard 
const suggestUsersToFollow = ()=> 
{ 

}


