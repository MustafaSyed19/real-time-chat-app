import { log } from "console";
import { auth, db } from "./config";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  deleteUser,
} from "firebase/auth";
import {
  doc,
  setDoc,
  serverTimestamp,
  updateDoc,
  getDoc,
  deleteDoc,
  getFirestore,
} from "firebase/firestore";

export const registerUser = async (
  email: string,
  password: string,
  username: string
) => {
  const usercred = await createUserWithEmailAndPassword(auth, email, password);
  await setDoc(doc(db, "users", usercred.user.uid), {
    email,
    username,
    createdAt: serverTimestamp(),
    lastLogin: serverTimestamp(),
    preferences: {
      notifications: true,
      theme: "dark",
    },
  });
  return usercred.user;
};

export const login = async (email: string, password: string) => {
  const usercred = await signInWithEmailAndPassword(auth, email, password);
  await updateDoc(doc(db, "users", usercred.user.uid), {
    lastLogin: serverTimestamp(),
  });
  return usercred.user;
};

export const removeUser = async (uid: string) => {
  const user = auth.currentUser;
  if (user) {
    try {
      await deleteUser(user);
      console.log("delete user from auth");
    } catch (error) {
        console.error(error);
    }
    try {
      const usercred = await deleteDoc(doc(db, "users", uid));
      console.log("deleted user from firestore");
    } catch (error) {
        console.error(error);
        
    }
    console.log("deleted user");
    return;
  }
  return;
};

export const fetchUserProfile = async (uid: string) => {
  const docRef = doc(db, "users", uid);
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    console.log(docSnap.data());
    return docSnap.data();
  } else {
    console.log("No such document");
    return null;
  }
};
