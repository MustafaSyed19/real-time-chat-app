import {
  addDoc,
  setDoc,
  collection,
  getDoc,
  getDocs,
  doc,
  serverTimestamp,
  writeBatch,
} from "firebase/firestore";
import { db } from "./config";

export const createChat = async (memberIDs: Array<string>) => {
  console.log("🚀 createChat called with:", memberIDs);
  
  if (memberIDs.length < 2) {
    console.log("❌ Not enough members (need at least 2)");
    return;
  }
  
  let chatID;

  //create dms
  if (memberIDs.length == 2) {
    console.log("📱 Creating DM chat");
    chatID = await createDMChat(memberIDs);
  }
  //create group-chat
  else {
    console.log("👥 Creating group chat");
    chatID = await createGroupChat(memberIDs);
  }
  
  console.log("✅ Chat created successfully with ID:", chatID);
  return chatID;
};

const createDMChat = async (memberIDs: Array<string>) => {
  console.log("🔍 Starting DM chat creation process");
  
  /*Goal here is to query the chats all the users are in and if they have any overlapping chats return that chat rather than 
    the new chat that they want to create */
  //define path to the chats both users are in
  const member1Ref = collection(db, "users", memberIDs[0], "chats");
  const member2Ref = collection(db, "users", memberIDs[1], "chats");

  console.log("📊 Fetching existing chats for both users");
  //get all the chats in the collection
  const member1Snapshot = await getDocs(member1Ref);
  const member2Snapshot = await getDocs(member2Ref);

  console.log(`📋 User 1 has ${member1Snapshot.docs.length} chats`);
  console.log(`📋 User 2 has ${member2Snapshot.docs.length} chats`);

  //all the direct message chats that each user is apart of
  const member1Chats = member1Snapshot.docs
    .filter((doc) => {
      return doc.data()?.chatType === "direct";
    })
    .map((doc) => doc.id);
  const member2Chats = member2Snapshot.docs
    .filter((doc) => {
      return doc.data()?.chatType === "direct";
    })
    .map((doc) => doc.id);

  console.log(`💬 User 1 has ${member1Chats.length} direct message chats`);
  console.log(`💬 User 2 has ${member2Chats.length} direct message chats`);

  //find the overlap between all the chats that the members are in
  const overlap = member1Chats.find((id) => member2Chats.includes(id));
  if (overlap) {
    console.log("🔄 Found existing DM chat:", overlap);
    return overlap;
  } else {
    console.log("🆕 No existing DM found, creating new chat");
    
    //create the chat in the chats collection
    const chatRef = collection(db, "chats");
    const docRef = await addDoc(chatRef, {
      chatType: "direct",
      participants: [...memberIDs],
      createdAt: serverTimestamp(),
      isDeleted: false,
    });

    console.log("📝 Main chat document created with ID:", docRef.id);

    //fetch the usernames to name the groupchats
    const userRef = collection(db, "users");
    console.log("👤 Fetching usernames...");
    const username1 = (await getDoc(doc(userRef, memberIDs[0]))).data()
      ?.username;
    const username2 = (await getDoc(doc(userRef, memberIDs[1]))).data()
      ?.username;

    console.log(`👤 User 1 username: ${username1}`);
    console.log(`👤 User 2 username: ${username2}`);

    const batch = writeBatch(db);

    //add this chat to the chats user1 is apart of
    const user1Ref = doc(db, "users", memberIDs[0], "chats", docRef.id);
    batch.set(user1Ref, {
      chatType: "direct",
      isMuted: false,
      unreadCount: 0,
      chatName: username2,
    });

    //add this chat to the chats user2 is apart of
    const user2Ref = doc(db, "users", memberIDs[1], "chats", docRef.id);
    batch.set(user2Ref, {
      chatType: "direct",
      isMuted: false,
      unreadCount: 0,
      chatName: username1,
    });

    console.log("🔄 Committing batch operations for user chat documents");
    //return the chatID
    await batch.commit();
    console.log("✅ DM chat setup completed");
    return docRef.id;
  }
};

const createGroupChat = async (memberIDs: Array<string>) => {
  console.log(`👥 Starting group chat creation with ${memberIDs.length} members`);
  
  //fetch the usernames of each member
  let usernames = new Array<string>();
  console.log("👤 Fetching usernames for all members...");
  
  for (let x = 0; x < memberIDs.length; x++) {
    const usersRef = collection(db, "users");
    const username = (await getDoc(doc(usersRef, memberIDs[x]))).data()
      ?.username;
    usernames.push(username);
    console.log(`👤 Member ${x + 1}: ${username}`);
  }

  let chatName = usernames.join(", ");
  console.log(`📝 Group chat name: "${chatName}"`);

  //create the chat in the chats collection
  const chatsRef = collection(db, "chats");
  const newChat = await addDoc(chatsRef, {
    chatType: "group",
    participants: [...memberIDs],
    createdAt: serverTimestamp(),
    isDeleted: false,
    chatName: chatName,
  });

  console.log("📝 Main group chat document created with ID:", newChat.id);

  const chatID = newChat.id;
  const batch = writeBatch(db);
  
  console.log("🔄 Adding chat to each user's chat list...");
  //create the chat on the users side
  for (let x = 0; x < memberIDs.length; x++) {
    const memberChatsRef = doc(db, "users", memberIDs[x], "chats", chatID);
    batch.set(memberChatsRef, {
      chatType: "group",
      isMuted: false,
      unreadCount: 0,
      chatName: chatName,
    });
    console.log(`✅ Added chat to user ${x + 1}'s chat list`);
  }
  
  console.log("🔄 Committing batch operations for user chat documents");
  await batch.commit();
  console.log("✅ Group chat setup completed");

  return chatID;
};





const main = async () => {
  console.log("🧪 Starting test...");
  try {
    const result = await createChat([
      "AwvRbDc2grYOTQ82QfgksXwXACi2",
      "9VFD0RyPGUev5w0HhkigjwMl6853",
      "68QcFBYk00h7FvyNzzzJ"
    ]);
    console.log("🎉 Test completed successfully! Chat ID:", result);
  } catch (error) {
    console.error("❌ Test failed:", error);
  }
};
main();