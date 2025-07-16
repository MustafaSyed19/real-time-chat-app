import {
  addDoc,
  arrayUnion,
  collection,
  getDoc,
  getDocs,
  doc,
  serverTimestamp,
  writeBatch,
  updateDoc,
  arrayRemove,
  setDoc,
  deleteDoc,
  CollectionReference,
  type DocumentData,
} from "firebase/firestore";
import { db, storage } from "./config";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";

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

export const createDMChat = async (memberIDs: Array<string>) => {
  console.log("🔍 Starting DM chat creation process");
  console.log("📋 Member IDs:", memberIDs);

  try {
    /*Goal here is to query the chats all the users are in and if they have any overlapping chats return that chat rather than 
      the new chat that they want to create */
    //define path to the chats both users are in
    const member1Ref = collection(db, "users", memberIDs[0], "chats");
    const member2Ref = collection(db, "users", memberIDs[1], "chats");

    console.log("📊 Fetching existing chats for both users");
    console.log("🔍 Member 1 path:", `users/${memberIDs[0]}/chats`);
    console.log("🔍 Member 2 path:", `users/${memberIDs[1]}/chats`);

    //get all the chats in the collection
    const member1Snapshot = await getDocs(member1Ref);
    const member2Snapshot = await getDocs(member2Ref);

    console.log(`📋 User 1 has ${member1Snapshot.docs.length} chats`);
    console.log(`📋 User 2 has ${member2Snapshot.docs.length} chats`);

    //all the direct message chats that each user is apart of
    const member1Chats = member1Snapshot.docs
      .filter((doc) => {
        const chatType = doc.data()?.chatType;
        console.log(`🔍 User 1 chat ${doc.id} type:`, chatType);
        return chatType === "direct";
      })
      .map((doc) => doc.id);

    const member2Chats = member2Snapshot.docs
      .filter((doc) => {
        const chatType = doc.data()?.chatType;
        console.log(`🔍 User 2 chat ${doc.id} type:`, chatType);
        return chatType === "direct";
      })
      .map((doc) => doc.id);

    console.log(
      `💬 User 1 has ${member1Chats.length} direct message chats:`,
      member1Chats
    );
    console.log(
      `💬 User 2 has ${member2Chats.length} direct message chats:`,
      member2Chats
    );

    //find the overlap between all the chats that the members are in
    const overlap = member1Chats.find((id) => member2Chats.includes(id));
    console.log("🔍 Checking for overlap between chats...");

    if (overlap) {
      console.log("🔄 Found existing DM chat:", overlap);
      return overlap;
    } else {
      console.log("🆕 No existing DM found, creating new chat");

      //create the chat in the chats collection
      const chatRef = collection(db, "chats");
      console.log("📝 Adding new chat document to collection");

      const docRef = await addDoc(chatRef, {
        chatType: "direct",
        participants: [...memberIDs],
        createdAt: serverTimestamp(),
        isArchived: false,
      });

      console.log("📝 Main chat document created with ID:", docRef.id);

      //fetch the usernames to name the groupchats
      const userRef = collection(db, "users");
      console.log("👤 Fetching usernames...");

      const user1Doc = await getDoc(doc(userRef, memberIDs[0]));
      const user2Doc = await getDoc(doc(userRef, memberIDs[1]));

      const username1 = user1Doc.data()?.username;
      const username2 = user2Doc.data()?.username;

      console.log(`👤 User 1 username: ${username1}`);
      console.log(`👤 User 2 username: ${username2}`);

      if (!username1 || !username2) {
        console.warn("⚠️ Warning: Missing usernames", { username1, username2 });
      }

      const batch = writeBatch(db);

      //add this chat to the chats user1 is apart of
      const user1Ref = doc(db, "users", memberIDs[0], "chats", docRef.id);
      console.log("📝 Adding chat to user 1's chat list:", user1Ref.path);
      batch.set(user1Ref, {
        chatType: "direct",
        isMuted: false,
        unreadCount: 0,
        chatName: username2,
      });

      //add this chat to the chats user2 is apart of
      const user2Ref = doc(db, "users", memberIDs[1], "chats", docRef.id);
      console.log("📝 Adding chat to user 2's chat list:", user2Ref.path);
      batch.set(user2Ref, {
        chatType: "direct",
        isMuted: false,
        unreadCount: 0,
        chatName: username1,
      });

      console.log("🔄 Committing batch operations for user chat documents");
      //return the chatID
      await batch.commit();
      console.log("✅ DM chat setup completed successfully");
      return docRef.id;
    }
  } catch (error) {
    console.error("❌ Error in createDMChat:", error);
    throw error;
  }
};

const createGroupChat = async (memberIDs: Array<string>) => {
  console.log(
    `👥 Starting group chat creation with ${memberIDs.length} members`
  );
  console.log("📋 Member IDs:", memberIDs);

  try {
    //fetch the usernames of each member
    let usernames = new Array<string>();
    console.log("👤 Fetching usernames for all members...");

    for (let x = 0; x < memberIDs.length; x++) {
      console.log(
        `👤 Fetching username for member ${x + 1}/${memberIDs.length}: ${
          memberIDs[x]
        }`
      );
      const usersRef = collection(db, "users");
      const userDoc = await getDoc(doc(usersRef, memberIDs[x]));
      const username = userDoc.data()?.username;

      if (!username) {
        console.warn(`⚠️ Warning: No username found for user ${memberIDs[x]}`);
      }

      usernames.push(username);
      console.log(`👤 Member ${x + 1}: ${username}`);
    }

    let chatName = usernames.join(", ");
    console.log(`📝 Group chat name: "${chatName}"`);

    //create the chat in the chats collection
    const chatsRef = collection(db, "chats");
    console.log("📝 Adding new group chat document to collection");

    const newChat = await addDoc(chatsRef, {
      chatType: "group",
      participants: [...memberIDs],
      createdAt: serverTimestamp(),
      isArchived: false,
      chatName: chatName,
    });

    console.log("📝 Main group chat document created with ID:", newChat.id);

    const chatID = newChat.id;
    const batch = writeBatch(db);

    console.log("🔄 Adding chat to each user's chat list...");
    //create the chat on the users side
    for (let x = 0; x < memberIDs.length; x++) {
      const memberChatsRef = doc(db, "users", memberIDs[x], "chats", chatID);
      console.log(
        `📝 Adding chat to user ${x + 1}'s chat list: ${memberChatsRef.path}`
      );

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
    console.log("✅ Group chat setup completed successfully");

    return chatID;
  } catch (error) {
    console.error("❌ Error in createGroupChat:", error);
    throw error;
  }
};

export const addMember = async (chatID: string, memberID: string) => {
  console.log("👥 addMember called with:", { chatID, memberID });

  try {
    //get chatType
    const chatRef = doc(db, "chats", chatID);
    console.log("🔍 Fetching chat document:", chatRef.path);

    const chatDoc = await getDoc(chatRef);
    const chatType = chatDoc.data()?.chatType;
    console.log("📋 Chat type:", chatType);

    let retID;

    //for dms
    if (chatType === "direct") {
      console.log("📱 Processing DM member addition");
      retID = await dmAddMember(chatID, memberID);
    }

    //for group-chats
    if (chatType === "group") {
      console.log("👥 Processing group chat member addition");
      retID = await groupAddMember(chatID, memberID);
    }

    console.log("✅ addMember completed, returning ID:", retID);
    return retID;
  } catch (error) {
    console.error("❌ Error in addMember:", error);
    throw error;
  }
};

const dmAddMember = async (chatID: string, memberID: string) => {
  console.log("📱➡️👥 Converting DM to group chat, adding member:", memberID);

  try {
    /* When adding a member to a dm, it will create a group chat and return it's ID*/
    //fetch the members from the original chat
    const chatRef = doc(db, "chats", chatID);
    console.log("🔍 Fetching original chat data:", chatRef.path);

    const chatData = await getDoc(chatRef);
    const participants = chatData.data()?.participants;
    console.log("👥 Original participants:", participants);

    if (participants?.includes(memberID)) {
      console.log("ℹ️ Member already in chat, returning existing chat ID");
      return chatID;
    }

    const users = [...participants, memberID];
    console.log("👥 New group participants:", users);

    //create a new group chat with the members
    const newChatID = await createGroupChat(users);
    console.log("✅ DM to group conversion completed, new chat ID:", newChatID);
    return newChatID;
  } catch (error) {
    console.error("❌ Error in dmAddMember:", error);
    throw error;
  }
};

const groupAddMember = async (chatID: string, memberID: string) => {
  console.log("👥 Adding member to group chat:", { chatID, memberID });

  try {
    /*when adding members to a group chat it will simply add them to the same chat  */
    //add the new member to the same chat
    const chatRef = doc(db, "chats", chatID);
    console.log("🔍 Fetching chat data:", chatRef.path);

    //get chatName
    const chatDoc = await getDoc(chatRef);
    const chatName = chatDoc.data()?.chatName;
    console.log("📝 Chat name:", chatName);

    console.log("🔄 Adding member to participants array");
    await updateDoc(chatRef, {
      participants: arrayUnion(memberID),
    });

    console.log("📝 Creating user chat document");
    const userRef = doc(db, "users", memberID, "chats", chatID);
    console.log("📝 User chat document path:", userRef.path);

    await setDoc(userRef, {
      chatName: chatName,
      chatType: "group",
      isMuted: false,
      unreadCount: 0,
    });

    console.log("✅ Group member addition completed");
    return chatID;
  } catch (error) {
    console.error("❌ Error in groupAddMember:", error);
    throw error;
  }
};

export const removeMember = async (chatID: string, memberID: string) => {
  console.log("👥 removeMember called with:", { chatID, memberID });

  try {
    //for group-chats
    const chatRef = doc(db, "chats", chatID);
    console.log("🔍 Removing member from participants array");

    await updateDoc(chatRef, {
      participants: arrayRemove(memberID),
    });

    //delete the chat if there are no members are apart of it
    console.log("🔍 Checking remaining participants");
    const updatedChatDoc = await getDoc(chatRef);
    const participants = updatedChatDoc.data()?.participants;
    console.log("📋 Remaining participants:", participants);

    if (participants?.length === 0) {
      console.log("🗑️ No participants remaining, deleting chat");
      await deleteDoc(chatRef);
    }

    //remove chat on the userSide
    const userRef = doc(db, "users", memberID, "chats", chatID);
    console.log("🗑️ Deleting user chat document:", userRef.path);
    await deleteDoc(userRef);

    console.log("✅ Member removal completed");
    return chatID;
  } catch (error) {
    console.error("❌ Error in removeMember:", error);
    throw error;
  }
};

export const archiveChat = async (chatID: string) => {
  console.log("📦 archiveChat called with:", chatID);

  try {
    const chatRef = doc(db, "chats", chatID);
    console.log("🔍 Fetching current archive status");

    //fetches archived status
    const chatDoc = await getDoc(chatRef);
    const currentStatus = chatDoc.data()?.isArchived;
    console.log("📋 Current archive status:", currentStatus);

    const newStatus = !currentStatus;
    console.log("📋 Setting archive status to:", newStatus);

    //update the doc depending on current status
    await updateDoc(chatRef, {
      isArchived: newStatus,
    });

    console.log("✅ Archive status updated successfully");
    return;
  } catch (error) {
    console.error("❌ Error in archiveChat:", error);
    throw error;
  }
};

export const sendMessage = async (
  chatID: string,
  senderID: string,
  content: any,
  type: string,
  replyID?: string
) => {
  console.log("💬 sendMessage called with:", {
    chatID,
    senderID,
    type,
    contentType: typeof content,
  });

  try {
    //reference to add fields to the chat and to add messages to the messages collection
    const chatRef = doc(db, "chats", chatID);
    const messageRef = collection(db, "chats", chatID, "messages");
    console.log("📝 Message collection path:", messageRef.path);

    let newRef;

    //update messageRef
    if (type === "text") {
      console.log("📝 Sending text message");
      newRef = await sendTextMessage(messageRef, content, senderID, replyID);
    } else if (type === "image") {
      console.log("🖼️ Sending image message");
      newRef = await sendImageMessage(
        chatID,
        messageRef,
        content,
        senderID,
        replyID
      );
    } else {
      console.log("❌ Invalid message type:", type);
      return;
    }

    console.log("📝 Message document created with ID:", newRef.id);
    const messageDoc = await getDoc(newRef);
    const messageData = messageDoc.data();
    console.log("📋 Message data:", messageData);

    //update chatRef
    console.log("🔄 Updating chat with last message info");
    await updateDoc(chatRef, {
      lastMessageTimestamp: messageData?.timestamp,
      lastMessage: messageData?.content,
    });

    console.log("✅ Message sent successfully");
    return chatID;
  } catch (error) {
    console.error("❌ Error in sendMessage:", error);
    throw error;
  }
};

const sendTextMessage = async (
  messageRef: CollectionReference<DocumentData, DocumentData>,
  content: String,
  senderID: string,
  replyID?: string
) => {
  console.log("📝 Creating text message document");
  console.log("📋 Message content length:", content.length);

  try {
    const docRef = await addDoc(messageRef, {
      content: content,
      type: "text",
      timestamp: serverTimestamp(),
      senderID: senderID,
      isEdited: false,
      isDeleted: false,
      replyID: replyID,
    });

    console.log("✅ Text message document created with ID:", docRef.id);
    return docRef;
  } catch (error) {
    console.error("❌ Error in sendTextMessage:", error);
    throw error;
  }
};

const sendImageMessage = async (
  chatID: string,
  messageRef: CollectionReference<DocumentData, DocumentData>,
  file: File,
  senderID: string,
  replyID?: string
) => {
  console.log("🖼️ Processing image message");
  console.log("📋 File info:", {
    name: file.name,
    size: file.size,
    type: file.type,
  });

  try {
    //upload file to firebase storage and retrieve the link to it
    if (!file || !file.type.startsWith("image/")) {
      console.error("❌ Invalid file type:", file.type);
      throw new Error("Invalid file type. Only images are allowed.");
    }

    //generates a file path for the image
    const filePath = `${chatID}/${senderID}/${
      file.name
    }/${crypto.randomUUID()}`;
    console.log("📁 Generated file path:", filePath);

    const fileRef = ref(storage, filePath);
    console.log("📤 Uploading file to storage");

    //store image at the file path
    await uploadBytes(fileRef, file);
    console.log("✅ File uploaded successfully");

    //retrive image url
    console.log("🔗 Getting download URL");
    const imageURL = await getDownloadURL(fileRef);
    console.log("✅ Download URL retrieved:", imageURL);

    //add that link to the content of the message and
    console.log("📝 Creating image message document");
    const docRef = await addDoc(messageRef, {
      content: imageURL,
      type: "image",
      timestamp: serverTimestamp(),
      senderID: senderID,
      isEdited: false,
      isDeleted: false,
      replyID: replyID,
    });

    console.log("✅ Image message document created with ID:", docRef.id);
    return docRef;
  } catch (error) {
    console.error("❌ Error in sendImageMessage:", error);
    throw error;
  }
};

//can only edit data of type text
export const editMessage = async () => {};

export const deleteMessage = async () => {};
export const getChats = async () => {};
export const getMessages = async () => {};

const main = async () => {
  console.log("🧪 Starting test...");
  try {
    const result = sendMessage();
  } catch (error) {
    console.error("❌ Test failed:", error);
  }
  return;
};
main();
