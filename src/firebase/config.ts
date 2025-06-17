//This file just sets up the firebase stuff for the app : ) 

import {initializeApp} from 'firebase/app'; 
import {getAuth} from 'firebase/auth'; 
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyB-wMvqWnvMyy17GuND6_39kK__PwQB3lQ",
  authDomain: "real-time-chat-app-ad441.firebaseapp.com",
  projectId: "real-time-chat-app-ad441",
  storageBucket: "real-time-chat-app-ad441.firebasestorage.app",
  messagingSenderId: "609186077456",
  appId: "1:609186077456:web:8f901ab11ef1b8f7ece395",
  measurementId: "G-K03ZCBDNS1"
};

export const app = initializeApp(firebaseConfig); 
export const auth = getAuth(app);
export const db = getFirestore(app);

