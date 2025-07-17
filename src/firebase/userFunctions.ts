/*this file will be used to make modifications to the users account including followers, 
following, profilePictureUrl and preferences */

import {
  collection,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
  arrayRemove,
  arrayUnion,
  getDoc,
} from "firebase/firestore";
import { db, storage } from "./config";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { randomUUID } from "crypto";

/*search for a user based on the starting letters of the search */
//figure out what this means LOL
export const searchUser = async (username: string) => {
  const usersref = collection(db, "users");
  const q = query(
    usersref,
    where("username", ">=", username),
    where("username", "<", username + "\uf8ff")
  );
  const querySnapshot = await getDocs(q);
  const users = querySnapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));

  return users;
};

//this allows you to follow a user
export const followUser = async (userID: string, friendID: string) => {
  const userDocRef = doc(db, "users", userID);
  await updateDoc(userDocRef, {
    following: arrayUnion(friendID),
  });

  const friendDocRef = doc(db, "users", friendID);
  await updateDoc(friendDocRef, {
    followers: arrayUnion(friendID),
  });
};

//this allows you to unfollow a user

export const unFollowUser = async (userID: string, friendID: string) => {
  const userDocRef = doc(db, "users", userID);
  await updateDoc(userDocRef, {
    following: arrayRemove(friendID),
  });

  const friendDocRef = doc(db, "users", friendID);
  await updateDoc(friendDocRef, {
    followers: arrayRemove(friendID),
  });
};

//this allows you to retrieve the users that follow a profile
export const getFollowers = async (userID: string) => {
  const userDocRef = doc(db, "users", userID);
  const q = await getDoc(userDocRef);
  return q.data()?.followers;
};

//this allows you to retrieve the users that you follow
export const getFollowing = async (userID: string) => {
  const userDocRef = doc(db, "users", userID);
  const q = await getDoc(userDocRef);
  return q.data()?.following;
};

/* These functions will be used to update a users account in some sort of way that really has no functional 
impact on anything else*/

//updates a users bio with the param string
export const updateBio = async (userID: string, bio: string) => {
  const userDocRef = doc(db, "users", userID);
  await updateDoc(userDocRef, { bio: bio });
};

//updates the users profile picture with a picture that has been uploaded
const updateProfilePic = async (userID: string, file: File) => {
  if (!file.type.startsWith("image/")) {
    console.log("❌ File is not an image:", file.type);
    return;
  }
  try {
    const path = `/profilePictures/${crypto.randomUUID()}`;
    const storageRef = ref(storage, path);

    console.log("⬆️ uploading file to " + storageRef.fullPath);
    const snapshot = await uploadBytes(storageRef, file);
    console.log("✅ Upload successful. Getting download URL...");

    const downloadURL = await getDownloadURL(snapshot.ref);
    console.log("🔗 Download URL:", downloadURL);

    const userRef = doc(db,"users",userID); 
    await updateDoc(userRef,
        { 
            profilePicture:downloadURL
        }
    );
    return downloadURL
    } catch (error) {
    console.error("❌ Upload failed:", error);
    throw error;
  }
};
//TODO
const getNotification = () => {};

//try this later if possible for now this is damn hard
const suggestUsersToFollow = () => {};

const main = async () => {
  const res = await fetch("https://picsum.photos/200/300");
  const image = await res.blob();
  const file = new File([image], "image", {type: image.type});
  await updateProfilePic("68QcFBYk00h7FvyNzzzJ",file);
};

main();
