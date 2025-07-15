//This file just sets up the firebase stuff for the app : ) 

import {initializeApp} from 'firebase/app'; 
import {getAuth} from 'firebase/auth'; 
import { getFirestore } from 'firebase/firestore';
import dotenv from 'dotenv'; 
import path from "path"; 

const envPath = path.resolve(process.cwd());
dotenv.config({path: path.resolve(envPath,"..","..",".env")});

const firebaseConfig = {
  apiKey: process.env.apiKey,
  authDomain: process.env.authDomain,
  projectId: process.env.projectId,
  storageBucket: process.env.storageBucket,
  messagingSenderId: process.env.messagingSenderId,
  appId: process.env.appId,
  measurementId: process.env.measurementId
};

export const app = initializeApp(firebaseConfig); 
export const auth = getAuth(app);
export const db = getFirestore(app);

