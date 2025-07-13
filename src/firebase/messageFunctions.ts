import {
  collection,
  addDoc,
  updateDoc,
  serverTimestamp,
  doc,
  arrayUnion,
  arrayRemove,
  getDoc,
} from "firebase/firestore";
import { db } from "./config";

export const createChat = async (name: string, members: Array<string>) => {
  const collRef = collection(db, "chats");
  await addDoc(collRef, {
    name: name,
    type: members.length > 1 ? "group" : "direct",
    members: [...members],
    createdAt: serverTimestamp(),
  });
};

export const addGroupMember = async (chatId: string, memberId: string) => {
  const messageExists = chatMessageExists(chatId);
  if (!messageExists) {
    return;
  }
  const docRef = doc(db, "chats", chatId);
  await updateDoc(docRef, {
    members: arrayUnion(memberId),
  });
};

export const removeGroupMember = async (chatId: string, memberId: string) => {
  const messageExists = chatMessageExists(chatId);
  if (!messageExists) {
    return;
  }
  const docRef = doc(db, "chats", chatId);
  await updateDoc(docRef, {
    members: arrayRemove(memberId),
  });
};

export const sendMessage = async (
  chatId: string,
  senderId: string,
  content: string,
  type: string
) => {
  const messageExists = chatMessageExists(chatId);
  if (!messageExists) {
    return;
  }
  const collRef = collection(db, "chats", chatId, "messages");
  await addDoc(collRef, {
    content: content,
    isDeleted: false,
    isEdited: false,
    senderId: senderId,
    timestamp: serverTimestamp(),
    type: type,
  });
};

export const editMessage = async (
  chatId: string,
  messageId: string,
  content: string
) => {
  const messageExists = chatMessageExists(chatId, messageId);
  if (!messageExists) {
    return;
  }
  const docRef = doc(db, "chats", chatId, "messages", messageId);
  await updateDoc(docRef, {
    isEdited: true,
    content: content,
  });
};

export const deleteMessage = async (chatId: string, messageId: string) => {
  const messageExists = chatMessageExists(chatId, messageId);
  if (!messageExists) {
    return;
  }
  const docRef = doc(db, "chats", chatId, "messages", messageId);
  await updateDoc(docRef, {
    isDeleted: true,
  });
};



//checks if the chatId and messageId exist
const chatMessageExists = async (chatId: string, messageId?: string) => {
  let snapshot;
  if (messageId) {
    const docRef = doc(db, "chats", chatId, "messages", messageId);
    snapshot = await getDoc(docRef);
  } else {
    const docRef = doc(db, "chats", chatId);
    snapshot = await getDoc(docRef);
  }
  return snapshot.exists();
};


//get statements 

//gets the chats for a specific user 
const getChats = async (userId:string)=> 
{ 

}

//get messages for a specific chat 
const getMessages = async (chatId:string)=>
{ 

}