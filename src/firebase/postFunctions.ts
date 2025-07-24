/*
 * FIREBASE SOCIAL MEDIA PLATFORM - DATABASE OPERATIONS
 *
 * This module handles all CRUD operations for a social media platform built on Firebase.
 *
 * DATABASE STRUCTURE:
 * Posts Collection:
 *   - postID (document ID)
 *     - fields: createdAt, imageURL, likeCount, commentCount, recentLikers, description, posterID, tags, isHidden
 *     - subcollections:
 *       - Comments: commentID -> {content, commenterID, createdAt, likes, editedAt, parentCommentID}
 *       - Likes: userID -> {likedAt}
 *
 * Users Collection:
 *   - userID (document ID)
 *     - fields: posts (array of postIDs)
 *     - subcollections:
 *       - Saves: saveID -> {userID, postID, savedAt}
 *
 * Saves Collection (global):
 *   - saveID -> {userID, postID, savedAt}
 */

import {
  deleteObject,
  getDownloadURL,
  ref,
  uploadBytes,
} from "firebase/storage";
import { db, storage } from "./config";
import {
  addDoc,
  arrayRemove,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  increment,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";

/**
 * Creates a new post with an image upload
 *
 * @param userID - The ID of the user creating the post
 * @param file - The image file to upload (must be image type)
 * @param description - Text description/caption for the post
 * @param tags - Array of tags associated with the post
 *
 * Process:
 * 1. Validates file is an image
 * 2. Uploads image to Firebase Storage
 * 3. Creates post document in Firestore with metadata
 * 4. Updates user's posts array with new post ID
 */
const makePost = async (
  userID: string,
  file: File,
  description: string,
  tags: Array<string>
) => {
  console.log("🚀 makePost called with params:", {
    userID,
    fileName: file?.name,
    description,
    tags,
  });

  try {
    const userRef = doc(db, "users", userID);

    // Validate that the uploaded file is an image
    if (!file || !file.type.startsWith("image/")) {
      console.error("❌ Invalid file type:", file?.type);
      throw new Error("Invalid file type. Only images are allowed.");
    }

    //check if user exists
    const userContent = await getDoc(userRef);
    if (!userContent.exists()) {
      console.error(`❌ User Account ${userID} does not exist`);
      throw new Error("User account does not exist");
    }
    console.log("✅ File validation passed - file type:", file.type);

    // Generate unique file path for storage
    const filePath = `post/${file.name}${crypto.randomUUID()}`;
    console.log("📁 Generated file path:", filePath);

    // Create reference to storage location
    const fileRef = ref(storage, filePath);
    console.log("📤 Uploading file to storage...");

    // Upload the image file to Firebase Storage
    await uploadBytes(fileRef, file);
    console.log("✅ File uploaded successfully to storage");

    // Get the public download URL for the uploaded image
    console.log("🔗 Getting download URL...");
    const imageURL = await getDownloadURL(fileRef);
    console.log("✅ Download URL retrieved:", imageURL);

    // Create the post document in Firestore
    console.log("📝 Creating post document in Firestore...");
    const postRef = collection(db, "posts");
    const postData = {
      createdAt: serverTimestamp(), // Server timestamp for consistency
      imageURL: imageURL,
      imagePath: filePath,
      likeCount: 0, // Initialize counters
      commentCount: 0,
      recentLikers: [], // Array to track recent likers (fixed length stack)
      description: description,
      posterID: userID,
      tags: tags,
      isHidden: false, // Posts are visible by default
    };
    console.log("📄 Post data to be saved:", postData);

    // Add the document and get the generated ID
    const docRef = await addDoc(postRef, postData);
    console.log("✅ Post document created with ID:", docRef.id);

    const postID = docRef.id;
    console.log("📋 Post ID retrieved:", postID);

    // Update the user's posts array to include this new post
    console.log("👤 Updating user's posts array...");
    await updateDoc(userRef, {
      posts: arrayUnion(postID), // Add postID to user's posts array
    });
    console.log("✅ User's posts array updated successfully");
    console.log("🎉 makePost completed successfully");
  } catch (error) {
    console.error("❌ Error in makePost:", error);
    throw error;
  }
};

/**
 * Toggles the visibility status of a post
 *
 * @param postID - The ID of the post to hide/unhide
 *
 * Process:
 * 1. Fetches the current post document
 * 2. Toggles the isHidden field (true becomes false, false becomes true)
 * 3. Updates the document with new visibility status
 */
const hidePost = async (postID: string) => {
  console.log("🔄 hidePost called with postID:", postID);

  try {
    // Get reference to the post document
    const docRef = doc(db, "posts", postID);
    console.log("📖 Fetching post document...");

    // Check if post exists
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) {
      console.error("❌ Post does not exist with ID:", postID);
      throw new Error("Post does not exist");
    }
    console.log("✅ Post document found");

    // Get current hide status and toggle it
    const hideStatus = docSnap.data()?.isHidden;
    console.log("📊 Current hide status:", hideStatus);
    console.log("🔄 Toggling hide status to:", !hideStatus);

    // Update the document with toggled visibility
    await updateDoc(docRef, {
      isHidden: !hideStatus,
    });
    console.log("✅ Hide status updated successfully");
  } catch (error) {
    console.error("❌ Error in hidePost:", error);
    throw error;
  }
};

/**
 * Permanently deletes a post and removes it from user's posts array
 *
 * @param postID - The ID of the post to delete
 *
 * Process:
 * 1. Fetches post to get poster's userID
 * 2. Deletes the post document (including all subcollections)
 * 3. Removes postID from user's posts array
 */
const deletePost = async (postID: string) => {
  console.log("🗑️ deletePost called with postID:", postID);
  try {
    // Get reference to the post document
    const docRef = doc(db, "posts", postID);
    console.log("📖 Fetching post document...");

    // Verify post exists and get poster's userID
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) {
      console.error("❌ Post does not exist with ID:", postID);
      throw new Error("Post does not exist");
    }
    console.log("✅ Post document found");

    // Extract the userID of the person who created the post
    const userID = docSnap.data()?.posterID;
    console.log("👤 Post owner ID:", userID);

    //Get document reference
    const pathRef = docSnap.data()?.imagePath;
    //delete file storage for post in firebase storage
    deleteObject(ref(storage, pathRef));

    // Delete the entire post document (Firestore will handle subcollections in newer versions)
    console.log("🗑️ Deleting post document...");
    await deleteDoc(docRef);
    console.log("✅ Post document deleted successfully");

    // Remove the postID from the user's posts array
    console.log("👤 Updating user's posts array...");
    const userRef = doc(db, "users", userID);
    await updateDoc(userRef, {
      posts: arrayRemove(postID), // Remove postID from user's posts array
    });
    console.log("✅ User's posts array updated successfully");
    console.log("🎉 deletePost completed successfully");
  } catch (error) {
    console.error("❌ Error in deletePost:", error);
    throw error;
  }
};

/**
 * Toggles like status for a post (like/unlike functionality)
 *
 * @param userID - The ID of the user liking/unliking the post
 * @param postID - The ID of the post being liked/unliked
 *
 * Process:
 * 1. Checks if post exists
 * 2. Checks if user has already liked the post
 * 3. If liked: removes like and decrements counter
 * 4. If not liked: adds like and increments counter
 */
const likePost = async (userID: string, postID: string) => {
  console.log("❤️ likePost called with params:", { userID, postID });

  try {
    // Verify the post exists
    const docRef = doc(db, "posts", postID);
    console.log("📖 Checking if post exists...");

    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) {
      console.error("❌ Post does not exist with ID:", postID);
      throw new Error("Post does not exist");
    }
    console.log("✅ Post document found");

    //Check if the user trying to like the post exists
    console.log("👤 Checking if if user exists...");

    const userRef = doc(db, "users", userID);
    const user = await getDoc(userRef);
    if (!user.exists()) {
      console.error("❌ User does not exist with ID:", userID);
      throw new Error("User does not exist");
    }
    console.log("✅ User document found");

    // Check if user has already liked this post by looking in likes subcollection
    const likeRef = doc(docRef, "likes", userID);
    console.log("🔍 Checking if user already liked this post...");

    const likeData = await getDoc(likeRef);
    if (likeData.exists()) {
      // User has already liked - UNLIKE the post
      console.log("💔 User already liked this post - removing like");

      // Remove the like document from subcollection
      await deleteDoc(likeRef);
      console.log("✅ Like document deleted");

      // Decrement the like counter on the main post document
      await updateDoc(docRef, {
        likeCount: increment(-1), // Atomic decrement operation
      });
      console.log("📉 Like count decremented");
    } else {
      // User hasn't liked yet - LIKE the post
      console.log("❤️ User hasn't liked this post - adding like");

      // Create a like document in the subcollection
      await setDoc(likeRef, {
        likedAt: serverTimestamp(), // Record when the like happened
      });
      console.log("✅ Like document created");

      // Increment the like counter on the main post document
      await updateDoc(docRef, {
        likeCount: increment(1), // Atomic increment operation
      });
      console.log("📈 Like count incremented");
    }
    console.log("🎉 likePost completed successfully");
  } catch (error) {
    console.error("❌ Error in likePost:", error);
    throw error;
  }
};

/**
 * Adds a comment to a post (supports replies via parentCommentID)
 *
 * @param postID - The ID of the post being commented on
 * @param commenterID - The ID of the user making the comment
 * @param content - The text content of the comment
 * @param parentCommentID - Optional ID of parent comment (for replies)
 *
 * Process:
 * 1. Creates comment document in post's comments subcollection
 * 2. Increments the post's comment counter
 */
const commentPost = async (
  postID: string,
  commenterID: string,
  content: string,
  parentCommentID?: string
) => {
  console.log("💬 commentPost called with params:", {
    postID,
    commenterID,
    content,
    parentCommentID,
  });

  try {
    console.log("🔎 Check if post exists");

    //Check if post exists
    const postRef = doc(db, "posts", postID);
    const post = await getDoc(postRef);
    if (!post.exists()) {
      console.error("❌ Post does not exist with ID:", postID);
      throw new Error("Post does not exist");
    }

    console.log("✅ post exists");

    console.log("🔎 Check if commenter exists");

    // check if commenter exists
    const userRef = doc(db, "users", commenterID);
    const user = await getDoc(userRef);

    if (!user.exists()) {
      console.error("❌ User does not exist with ID:", commenterID);
      throw new Error("Commenter does not exist");
    }

    console.log("✅ commenter exists");

    // Get reference to the comments subcollection for this post
    const commentRef = collection(db, "posts", postID, "comments");

    if (parentCommentID) {
      //check if parent comment exists
      console.log("🔎 Check if parent comment exists");

      const parentCommentRef = doc(commentRef, parentCommentID);
      const parentComment = await getDoc(parentCommentRef);
      if (!parentComment.exists()) {
        console.error(
          "❌ Parent comment does not exist with ID:",
          parentCommentID
        );
        throw new Error("Parent comment does not exist");
      }
      console.log("✅ parent comment exists");
    }

    // Prepare comment data
    const commentData = {
      content: content,
      commenterID: commenterID,
      createdAt: serverTimestamp(),
      likes: [], // Initialize empty likes array for comment likes
      // Conditionally add parentCommentID if this is a reply
      ...(parentCommentID && { parentCommentID: parentCommentID }),
    };
    console.log("📄 Comment data to be saved:", commentData);

    // Create the comment document
    const docRef = await addDoc(commentRef, commentData);
    console.log("✅ Comment document created with ID:", docRef.id);

    // Increment the comment count on the main post document
    console.log("📈 Incrementing comment count...");
    await updateDoc(postRef, {
      commentCount: increment(1), // Atomic increment
    });
    console.log("✅ Comment count incremented successfully");
    console.log("🎉 commentPost completed successfully");
  } catch (error) {
    console.error("❌ Error in commentPost:", error);
    throw error;
  }
};

/**
 * Edits the content of an existing comment
 *
 * @param postID - The ID of the post containing the comment
 * @param commentID - The ID of the comment to edit
 * @param content - The new content for the comment
 *
 * Process:
 * 1. Verifies comment exists
 * 2. Updates content and sets editedAt timestamp
 */
const editComment = async (
  postID: string,
  commentID: string,
  content: string
) => {
  console.log("✏️ editComment called with params:", {
    postID,
    commentID,
    content,
  });

  try {
    //get reference to post and confirm that it exists
    const postRef = doc(db, "posts", postID);
    console.log("📖 Fetching post document...");
    const post = await getDoc(postRef);
    if (!post.exists) {
      console.error("❌ post does not exist with ID:", postID);
      throw new Error("Post does not exist");
    }
    console.log("✅ Post document found");

    // Get reference to the specific comment document
    const commentRef = doc(db, "posts", postID, "comments", commentID);
    console.log("📖 Fetching comment document...");

    // Verify the comment exists
    const comment = await getDoc(commentRef);
    if (!comment.exists()) {
      console.error("❌ Comment does not exist with ID:", comment);
      throw new Error("Comment does not exist");
    }
    console.log("✅ Comment document found");
    console.log("📝 Current comment data:", comment.data());

    // Prepare update data with new content and edit timestamp
    const updateData = {
      content: content,
      editedAt: serverTimestamp(), // Mark when the comment was edited
    };
    console.log("📄 Update data:", updateData);

    // Update the comment document
    await updateDoc(commentRef, updateData);
    console.log("✅ Comment updated successfully");
    console.log("🎉 editComment completed successfully");
  } catch (error) {
    console.error("❌ Error in editComment:", error);
    throw error;
  }
};

/**
 * Adds a user to a comment's likes array (simple like system for comments)
 *
 * @param postID - The ID of the post containing the comment
 * @param commentID - The ID of the comment being liked
 * @param likerID - The ID of the user liking the comment
 *
 * Note: This implementation only adds likes, doesn't handle unlikes
 * Consider implementing toggle functionality similar to likePost
 */
const likeComment = async (
  postID: string,
  commentID: string,
  likerID: string
) => {
  console.log("❤️ likeComment called with params:", {
    postID,
    commentID,
    likerID,
  });

  try {
    //get reference to post and confirm that it exists
    const postRef = doc(db, "posts", postID);
    console.log("📖 Fetching post document...");
    const post = await getDoc(postRef);
    if (!post.exists) {
      console.error("❌ post does not exist with ID:", postID);
      throw new Error("Post does not exist");
    }
    console.log("✅ Post document found");

    // Get reference to likedID
    const userRef = doc(db, "users", likerID);
    console.log("👤 Fetching user document...");

    const user = await getDoc(userRef);
    if (!user.exists()) {
      console.error("❌ User does not exist with ID:", likerID);
      throw new Error("Liker does not exist");
    }

    console.log("✅ User document found");

    // Get reference to the specific comment document
    const commentRef = doc(db, "posts", postID, "comments", commentID);
    console.log("📖 Fetching comment document...");

    // Verify the comment exists
    const comment = await getDoc(commentRef);
    if (!comment.exists()) {
      console.error("❌ Comment does not exist with ID:", commentID);
      throw new Error("Comment does not exist");
    }
    console.log("✅ Comment document found");
    console.log("📝 Current comment likes:", comment.data()?.likes);

    const likes = comment.data()?.likes; 
    if(likes?.includes(likerID))
    { 
      // remove the user to the likes array
      await updateDoc(commentRef, {
        likes: arrayRemove(likerID), // remove likerID if present
      });
    }
    else
    { 
    // Add the user to the likes array
    await updateDoc(commentRef, {
      likes: arrayUnion(likerID), // Adds likerID to likes array if not already present
    });
    }
    console.log("✅ User added to comment likes array");
    console.log("🎉 likeComment completed successfully");
  } catch (error) {
    console.error("❌ Error in likeComment:", error);
    throw error;
  }
};

/**
 * Saves a post to user's saved collection
 *
 * @param userID - The ID of the user saving the post
 * @param postID - The ID of the post being saved
 *
 * Process:
 * 1. Creates a save document in the global saves collection
 * 2. Records userID, postID, and timestamp
 */
const savePost = async (userID: string, postID: string) => {
  console.log("💾 savePost called with params:", { userID, postID });

  try {
    const userRef = doc(db,"users",userID); 
    const user = await getDoc(userRef); 
    if(!user.exists)
    { 
    console.error("❌ user does not exist with ID:", userID);
      throw new Error("User does not exist");
    }

    const postRef = doc(db,"posts",postID); 
    const post = await getDoc(postRef); 
    if(!post.exists)
    { 
    console.error("❌ post does not exist with ID:", postID);
      throw new Error("Post does not exist");
    }


    // Get reference to the global saves collection
    const saveRef = collection(db, "saves");

    // Prepare save data
    const saveData = {
      userID: userID,
      postID: postID,
      savedAt: serverTimestamp(), // Record when the post was saved
    };
    console.log("📄 Save data to be saved:", saveData);

    // Create the save document
    const docRef = await addDoc(saveRef, saveData);
    console.log("✅ Save document created with ID:", docRef.id);
    console.log("🎉 savePost completed successfully");
  } catch (error) {
    console.error("❌ Error in savePost:", error);
    throw error;
  }
};

/**
* Removes a saved post from the database
* @param saveID - The unique identifier of the save document to delete
* @throws {Error} When the save document doesn't exist or deletion fails
*/
const unSavePost = async(saveID: string) => {
 console.log("💾 unSavePost called with params:", { saveID });
 
 try {
   // Get reference to the save document in Firestore
   console.log("🔍 Creating document reference for saveID:", saveID);
   const saveRef = doc(db, "saves", saveID);
   console.log("✅ Document reference created successfully");
   
   // Check if the save document exists before attempting deletion
   console.log("📖 Fetching document to check if it exists...");
   const save = await getDoc(saveRef);
   console.log("✅ Document fetch completed, exists:", save.exists());
   
   if (!save.exists()) {
     console.error("❌ save does not exist with ID:", saveID);
     throw new Error("Save does not exist");
   }

   // Delete the save document from Firestore
   console.log("🗑️ Attempting to delete document...");
   await deleteDoc(saveRef);
   console.log("✅ Document deleted successfully");
   
 } catch (error) {
   console.error("❌ Error in unSavePost:", error);
    throw error; // Re-throw to allow caller to handle the error
 }
}

/**
 * Retrieves all posts saved by a specific user
 *
 * @param userID - The ID of the user whose saves to retrieve
 * @returns Array of save objects containing saveID, postID, and userID
 *
 * Process:
 * 1. Queries saves collection for documents where userID matches
 * 2. Orders by savedAt timestamp
 * 3. Returns formatted array of save metadata
 */
const getSaves = async (userID: string) => {
  console.log("📋 getSaves called with userID:", userID);

  try {
    // Query the saves collection for this user's saves
    const saveRef = collection(db, "saves");
    const q = query(
      saveRef,
      orderBy("savedAt"), // Order by save timestamp
      where("userID", "==", userID) // Filter by user
    );
    console.log("🔍 Executing query for user saves...");

    // Execute the query
    const saveSnapshot = await getDocs(q);
    console.log("📊 Found", saveSnapshot.docs.length, "saves");

    // Map the documents to a clean format
    const saves = saveSnapshot.docs.map((doc, index) => {
      const savesMeta = {
        saveID: doc.id,
        postID: doc.data().postID,
        userID: userID,
      };
      console.log(`📨 [${index}] Save ID: ${doc.id}, data:`, savesMeta);
      return savesMeta;
    });

    console.log(
      "✅ getSaves completed successfully, returning",
      saves.length,
      "saves"
    );
    return saves;
  } catch (error) {
    console.error("❌ Error in getSaves:", error);
    throw error;
  }
};

/**
 * Retrieves all posts created by a specific user
 *
 * @param userID - The ID of the user whose posts to retrieve
 * @returns Array of post objects with all post data
 *
 * Process:
 * 1. Queries posts collection where posterID matches userID
 * 2. Orders by creation timestamp
 * 3. Returns complete post data including metadata
 */
const getPosts = async (userID: string) => {
  console.log("📋 getPosts called with userID:", userID);

  try {
    // Query posts collection for this user's posts
    const postRef = collection(db, "posts");
    const q = query(
      postRef,
      orderBy("createdAt"), // Order by creation time
      where("posterID", "==", userID) // Filter by post creator
    );
    console.log("🔍 Executing query for user posts...");

    // Execute the query
    const postsSnapshot = await getDocs(q);
    console.log("📊 Found", postsSnapshot.docs.length, "posts");

    // Map documents to include both ID and data
    const posts = postsSnapshot.docs.map((doc, index) => {
      const postMeta = {
        id: doc.id, // Include the document ID
        ...doc.data(), // Spread all the post data
      };
      console.log(`📨 [${index}] Post ID: ${doc.id}, data preview:`, {
        id: postMeta.id,
        description: postMeta.description,
        likeCount: postMeta.likeCount,
        commentCount: postMeta.commentCount,
      });
      return postMeta;
    });

    console.log(
      "✅ getPosts completed successfully, returning",
      posts.length,
      "posts"
    );
    return posts;
  } catch (error) {
    console.error("❌ Error in getPosts:", error);
    throw error;
  }
};

/**
 * Retrieves all comments for a specific post
 *
 * @param postID - The ID of the post whose comments to retrieve
 * @returns Array of comment objects with all comment data
 *
 * Process:
 * 1. Queries the comments subcollection of the specified post
 * 2. Returns all comment data including content, metadata, and likes
 */
const getComments = async (postID: string) => {
  console.log("💬 getComments called with postID:", postID);

  try {
    // Get reference to comments subcollection for this post
    const commentRef = collection(db, "posts", postID, "comments");
    console.log("🔍 Fetching comments for post...");

    // Get all comments (could add ordering here if needed)
    const userComments = await getDocs(commentRef);
    console.log("📊 Found", userComments.docs.length, "comments");

    // Map documents to include both ID and data
    const comments = userComments.docs.map((doc, index) => {
      const userComment = {
        id: doc.id, // Include the comment ID
        ...doc.data(), // Spread all the comment data
      };
      console.log(`💬 [${index}] Comment ID: ${doc.id}, preview:`, {
        id: userComment.id,
        content: userComment?.content?.substring(0, 50) + "...", // Preview first 50 chars
        commenterID: userComment?.commenterID,
        likes: userComment?.likes?.length || 0,
      });
      return userComment;
    });

    console.log(
      "✅ getComments completed successfully, returning",
      comments.length,
      "comments"
    );
    return comments;
  } catch (error) {
    console.error("❌ Error in getComments:", error);
    throw error;
  }
};

/**
 * Retrieves like information for a specific post
 *
 * @param postID - The ID of the post whose likes to retrieve
 * @returns Object containing likes array and likeCount from main document
 *
 * Process:
 * 1. Verifies post exists and gets like count from main document
 * 2. Queries likes subcollection for detailed like data
 * 3. Returns both the subcollection data and the cached count
 */
const getLikes = async (postID: string) => {
  console.log("❤️ getLikes called with postID:", postID);

  try {
    // Verify post exists and get cached like count
    const docRef = doc(db, "posts", postID);
    console.log("📖 Checking if post exists...");

    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) {
      console.error("❌ Post does not exist with ID:", postID);
      throw new Error("Post does not exist");
    }
    console.log("✅ Post document found");

    // Query the likes subcollection for detailed like data
    const likeRef = collection(docRef, "likes");
    const q = query(likeRef, orderBy("likedAt")); // Order by like timestamp

    console.log("🔍 Fetching likes subcollection...");
    const likeSnapshot = await getDocs(q);
    console.log("📊 Found", likeSnapshot.docs.length, "likes in subcollection");

    // Map like documents to useful format
    const likes = likeSnapshot.docs.map((doc, index) => {
      const userLike = {
        id: doc.id, // This is the userID who liked
        likedAt: doc.data()?.likedAt, // When they liked it
      };
      console.log(
        `❤️ [${index}] Like from user: ${doc.id}, likedAt:`,
        userLike.likedAt
      );
      return userLike;
    });

    // Get the cached like count from the main post document
    const likeCount = docSnap.data()?.likeCount;
    console.log("📊 Post like count from document:", likeCount);
    console.log("📊 Actual likes found in subcollection:", likes.length);

    // Return both detailed likes and cached count
    const result = { likes, likeCount };
    console.log("✅ getLikes completed successfully");
    return result;
  } catch (error) {
    console.error("❌ Error in getLikes:", error);
    throw error;
  }
};

/**
 * Retrieves likes for a specific comment
 *
 * @param postID - The ID of the post containing the comment
 * @param commentID - The ID of the comment whose likes to retrieve
 * @returns Array of userIDs who liked the comment
 *
 * Process:
 * 1. Verifies comment exists
 * 2. Returns the likes array from the comment document
 */
const getCommentLikes = async (postID: string, commentID: string) => {
  console.log("❤️ getCommentLikes called with params:", { postID, commentID });

  try {
    // Get reference to the specific comment document
    const commentRef = doc(db, "posts", postID, "comments", commentID);
    console.log("📖 Fetching comment document...");

    // Verify comment exists
    const commentSnapshot = await getDoc(commentRef);
    if (!commentSnapshot.exists()) {
      console.error("❌ Comment does not exist with ID:", commentID);
      throw new Error("Comment does not exist");
    }
    console.log("✅ Comment document found");

    // Extract the likes array from the comment data
    const commentLikes = commentSnapshot.data()?.likes;
    console.log("📊 Comment likes array:", commentLikes);
    console.log("📊 Number of likes:", commentLikes?.length || 0);

    console.log("✅ getCommentLikes completed successfully");
    return commentLikes;
  } catch (error) {
    console.error("❌ Error in getCommentLikes:", error);
    throw error;
  }
};

/**
 * Main function - currently unused but could be used for testing
 * All individual functions are available for import and use
 */

const main = async () => {
  // const userID = '6sx4kPMq1NYzRPebrGaubncjl4H2';
  // const imageURL = 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a9/Example.jpg/320px-Example.jpg';

  // const response = await fetch(imageURL);
  // const arrayBuffer = await response.arrayBuffer();

  // const file = new File([arrayBuffer], 'example.jpg', { type: 'image/jpeg' });

  // const description = 'Example image from Wikimedia';
  // const tags = ['example', 'test', 'upload'];

  try {
    await getCommentLikes("vjmh1rnl5t7YyYXE2Xop","kVwRWMZXSEYaJT7hlTr3");
    console.log("✅ saves gotten");
  } catch (error) {
    console.error("❌ Error uploading post:", error);
  }
};

// Execute main function (currently does nothing)
main();
