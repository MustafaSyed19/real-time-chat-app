/* Notes on how I'm going to implement the posts: 
- ?-> = optional, -> = mandatory
- makePosts -> Each post can only be of image format (storage limitations), a lot of stored data as fields,
as well as a subcollection of comments, each post will be stored in firebase storage
Posts __
      postID__
            subcollections: 
            Comments__
                commentID_
                    content: string
                    commenterID: string
                    createdAt: timestamp 
                    likes: Array<string> 
                    editedAt:timestamp
                    parentCommentID:string
            Likes__
                userID__
                    likedAt:timeStamp
            fields:
            createdAt:timestamp
            likeCount:number
            recentLikers:Array<string> FIXED LENGTH STACK
            imageURL:string
            description:string
            posterID: string 
            commentCount: number
            tags:Array<string> 
            isHidden:boolean
    store saves on a user side 
    __users
        __userID 
            fields: 
            posts:Array<string> 
            collections: 
Saves__ 
	saveID_
		userID:string
		PostID:string
		SavedAT:timestamp
		
- hidePosts -> update the isHidden flag
- deletePosts -> delete the document based on the postID 
- likePost -> like the post based on the postID and userID, store it in the subcollection. this allows like and unlike. 
- commentPost -> comment on the post and list it under the subcollection 
- editComment -> edit the comments content and modify the edited at field 
- likeComment ?-> add the current user to the likes list of the comments subcollection. This allows like and unlike 
- replyComment ?-> This is actually the same thing as comment post it is an optional field in commentPost 
- savePost -> to save a post we store it on the user side, this acts as like and unlike 
- getPosts -> gets all the posts that a user has posted. 
- getComments -> gets all the comments that have been made on a post based on the postID 
- getLikes -> gets all the likes that have been made on a post based on the postID
- getCommentLikes -> gets all the likes that have been made on a comment based on the commentID
- reccomendPosts?-> this is in the future probably using tags 
*/

import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
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

const makePost = async (
  userID: string,
  file: File,
  description: string,
  tags: Array<string>
) => {
  try {
    if (!file || !file.type.startsWith("image/")) {
      console.error("❌ Invalid file type:", file.type);
      throw new Error("Invalid file type. Only images are allowed.");
    }
    const filePath = `Post/${file.name}${crypto.randomUUID()}`;
    console.log("📁 Generated file path:", filePath);

    const fileRef = ref(storage, filePath);
    console.log("📤 Uploading file to storage");

    //store image at the file path
    await uploadBytes(fileRef, file);
    console.log("✅ File uploaded successfully");

    console.log("🔗 Getting download URL");
    const imageURL = await getDownloadURL(fileRef);
    console.log("✅ Download URL retrieved:", imageURL);

    const postRef = collection(db, "posts");
    const docRef = await addDoc(postRef, {
      createdAt: serverTimestamp(),
      imageURL: imageURL,
      likeCount: 0,
      commentCount: 0,
      recentLikers: [],
      description: description,
      posterID: userID,
      tags: tags,
      isHidden: false,
    });
    const postID = (await getDoc(docRef)).data()?.id;

    const userRef = doc(db, "users", userID);
    await updateDoc(userRef, {
      posts: arrayUnion(postID),
    });
  } catch (error) {
    console.error("❌ Error in makePost:", error);
    throw error;
  }
};
const hidePost = async(postID: string) => {
  try {
    const docRef = doc(db,"posts",postID); 
    const docSnap = await getDoc(docRef);
    if(!docSnap.exists())
    { 
        console.error("❌ post does not exist")
    }

    const hideStatus = docSnap.data()?.isHidden; 
    await updateDoc(docRef, 
        { 
            isHidden:!hideStatus
        }
    )
} catch (error) {
    console.error("❌ Error in hidePost:", error);
    throw error;
  }
};
const deletePost = async(postID: string) => {
  try {
    const docRef= doc(db,"posts",postID);
    const docSnap = await getDoc(docRef); 
    if(!docSnap.exists())
    { 
        console.error("❌ post does not exist")
    }
    await deleteDoc(docRef);

    const userID = docSnap.data()?.posterID; 
    const userRef=doc(db,"users",userID);

    await updateDoc(userRef,
        { 
            posts:arrayRemove(postID)
        }
    )
  } catch (error) {
    console.error("❌ Error in deletePost:", error);
    throw error;
  }
};

//TODO TODO TODO TODO 
const likePost = async(userID: string, postID: string) => {

  try {
    //check if doc exists
    const docRef= doc(db,"posts",postID);
    const docSnap = await getDoc(docRef); 
    if(!docSnap.exists())
    { 
        console.error("❌ post does not exist")
    }

    //check if doc has already been liked 
    const likeRef = doc(docRef,"likes",userID); 
    const likeData = await getDoc(likeRef); 
    if(likeData.exists())
    { 
      //delete the likes subcollection 
      await deleteDoc(likeRef); 

      //Adjust the fields accordingly 
      await updateDoc(docRef, 
        { 
          likeCount:increment(-1), 
        }
      )
    }
    else
    { 
      //add to the likes subcollection 
      await setDoc(likeRef,
        { 
          likedAt:serverTimestamp()
        }
      ); 
      //adjust the fields accordingly 
        await updateDoc(docRef, 
        { 
          likeCount:increment(1), 
        }
      )
    }
  } catch (error) {
    console.error("❌ Error in likePost:", error);
    throw error;
  }
};


const commentPost = async(postID:string, commenterID:string, content:string,parentCommentID?:string) => {
  try {
    const commentRef = collection(db,"posts",postID,"comments")
    await addDoc(commentRef,
      { 
        content:content, 
        commenterID:commenterID, 
        createdAt:serverTimestamp(), 
        likes:[], 
        ...(parentCommentID && {parentCommentID:parentCommentID})
      }
    )
    const docRef = doc(db,"posts",postID); 
    await updateDoc(docRef, 
      { 
        commentCount:increment(1), 
      }
    )
  } catch (error) {
    console.error("❌ Error in commentPost:", error);
    throw error;
  }
};
const editComment = async(postID:string,commentID:string,content:string ) => {
  try {
    const commentRef = doc(db,"posts",postID,"comments",commentID);

    const comment = await getDoc(commentRef); 
    
    if(!comment.exists())
    { 
      console.error("The comment does not exist")
      return; 
    }

    await updateDoc(commentRef, 
      { 
        content:content,
        editedAt:serverTimestamp(), 
      }
    )
  } catch (error) {
    console.error("❌ Error in editPost:", error);
    throw error;
  }
};
const likeComment = async(postID:string,commentID:string,likerID:string) => {
  try {
    const commentRef = doc(db,"posts",postID,"comments",commentID);

    const comment = await getDoc(commentRef); 
    
    if(!comment.exists())
    { 
      console.error("The comment does not exist")
      return; 
    }

    await updateDoc(commentRef, 
      { 
        likes:arrayUnion(likerID)
      }
    )
  } catch (error) {
    console.error("❌ Error in likeComment:", error);
    throw error;
  }
};
const savePost = async(userID: string, postID: string) => {
  try {
    const saveRef = collection(db,"saves"); 
    await addDoc(saveRef, 
      {
        userID:userID, 
        postID:postID,
        savedAt:serverTimestamp()
      }
    )
  } catch (error) {
    console.error("❌ Error in savePost:", error);
    throw error;
  }
};

const getSaves = async(userID:string)=>
{ 
  const saveRef = collection(db,"saves"); 
  const q =query(
    saveRef, 
    orderBy("savedAt"), 
    where("userID","==",userID)
  );
  const saveSnapshot = await getDocs(q);
  
  const saves = saveSnapshot.docs.map((doc,index)=> 
  { 
    const savesMeta = { 
      saveID:doc.id, 
      postID:doc.data().postID,
      userID:userID,
    }
    console.log(`📨 [${index}] Message ID: ${doc.id}, data:`, savesMeta);
    return savesMeta; 
  })
  return saves; 

}

const getPosts = async(userID: string) => {
  try {
    const postRef = collection(db,"posts");
    const q = query(postRef, 
      orderBy("createdAt"), 
      where("posterID","==",userID)
    );
    const postsSnapshot = await getDocs(q); 
    const posts = postsSnapshot.docs.map((doc,index)=> 
    { 
      const postMeta =
      { 
        id: doc.id, 
        ...(doc.data())
      }
      return postMeta
    })

    return posts;
  } catch (error) {
    console.error("❌ Error in getPosts:", error);
    throw error;
  }
};
const getComments = async(postID: string) => {
  try {
    const commentRef = collection(db,"posts",postID,"comments"); 
    const userComments = await getDocs(commentRef);
    userComments.docs.map((doc,index)=> 
    { 
      const userComment = 
      { 
        id:doc.id,
        ...(doc.data())
      }
      return userComment;
    }) 
    return userComments; 
  } catch (error) {
    console.error("❌ Error in getComments:", error);
    throw error;
  }
};
//TODOTODOTODOTODOTODO
const getLikes = async(postID: string) => {
  try {
    const docRef= doc(db,"posts",postID);
    const docSnap = await getDoc(docRef); 
    if(!docSnap.exists())
    { 
        console.error("❌ post does not exist")
    }
    const likeRef = collection(docRef,"likes"); 

    const postSnapshot = await getDoc(docRef)

    const q = query(likeRef, 
      orderBy("likedAt")
    ); 

    const likeSnapshot = await getDocs(q);
    
    const likes = likeSnapshot.docs.map((doc,index)=> 
    { 
      const userLike = 
      { 
        id:doc.id, 
        likedAt:doc.data()?.likedAt,
      }
      return userLike
    })
    const likeCount = postSnapshot.data()?.likeCount;
    return {likes,likeCount};
  } catch (error) {
    console.error("❌ Error in getLikes:", error);
    throw error;
  }
};


const getCommentLikes = async(postID:string,commentID: string) => {
  try {
    const commentRef = doc(db,"posts",postID,"comments",commentID)
    const commentSnapshot = await getDoc(commentRef);
    const commentLikes = commentSnapshot.data()?.likes; 
    return commentLikes; 
  } catch (error) {
    console.error("❌ Error in getCommentLikes:", error);
    throw error;
  }
};
