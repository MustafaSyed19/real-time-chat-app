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
            collections: 
            __saves
                docs: 
                postID
- hidePosts -> update the isHidden flag
- deletePosts -> delete the document based on the postID 
- likePost -> like the post based on the postID and userID, store it in the subcollection 
- commentPost -> comment on the post and list it under the subcollection 
- editComment -> edit the comments content and modify the edited at field 
- likeComment ?-> add the current user to the likes list of the comments subcollection 
- replyComment ?-> This is actually the same thing as comment post it is an optional field in commentPost 
- savePost -> to save a post 
- getPosts ->
- getComments -> 
- getLikes -> 
- reccomendPosts?->
*/

const makePost = ()=> 
{ 

}

