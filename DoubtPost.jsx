"use client"
import { Button } from '@/components/ui/button';
import { db } from '@/configs/db';
import { CommunityPosts, PostVotes, PostReplies } from '@/configs/schema';
import { useUser } from '@clerk/nextjs';
import { eq, and } from 'drizzle-orm';
import Image from 'next/image';
import React, { useState, useEffect } from 'react';
import { HiArrowUp, HiArrowDown, HiPencil, HiTrash } from "react-icons/hi2";
import { Textarea } from '@/components/ui/textarea';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

function DoubtPost({ post, onVoteChange }) {
  const { user, isLoaded } = useUser();
  const [userVote, setUserVote] = useState(null);
  const [voteCount, setVoteCount] = useState(0);
  const [showReply, setShowReply] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  const [replies, setReplies] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(post.content);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [editingReplyId, setEditingReplyId] = useState(null);
  const [editedReplyContent, setEditedReplyContent] = useState('');
  const [showDeleteReplyDialog, setShowDeleteReplyDialog] = useState(null);

  useEffect(() => {
    if (isLoaded && user && post.id) {
      fetchVoteStatus();
      fetchReplies();
    }
  }, [isLoaded, user, post.id]);

  const fetchVoteStatus = async () => {
    if (!user) return;
    
    const votes = await db.select().from(PostVotes)
      .where(eq(PostVotes.postId, post.id));
    
    const userVoteRecord = votes.find(v => v.userEmail === user?.primaryEmailAddress?.emailAddress);
    setUserVote(userVoteRecord?.voteType || null);
    setVoteCount(votes.reduce((acc, v) => acc + (v.voteType === 'up' ? 1 : -1), 0));
  };

  const fetchReplies = async () => {
    const result = await db.select().from(PostReplies)
      .where(eq(PostReplies.postId, post.id))
      .orderBy(PostReplies.createdAt);
    setReplies(result);
  };

  const handleVote = async (voteType) => {
    if (!user) return;

    const existingVote = await db.select().from(PostVotes)
      .where(and(
        eq(PostVotes.postId, post.id),
        eq(PostVotes.userEmail, user.primaryEmailAddress.emailAddress)
      ));

    if (existingVote.length > 0) {
      if (existingVote[0].voteType === voteType) {
        await db.delete(PostVotes)
          .where(eq(PostVotes.id, existingVote[0].id));
      } else {
        await db.update(PostVotes)
          .set({ voteType })
          .where(eq(PostVotes.id, existingVote[0].id));
      }
    } else {
      await db.insert(PostVotes).values({
        postId: post.id,
        userEmail: user.primaryEmailAddress.emailAddress,
        voteType
      });
    }

    fetchVoteStatus();
    onVoteChange();
  };

  const handleReply = async () => {
    if (!user || !replyContent.trim()) return;

    await db.insert(PostReplies).values({
      postId: post.id,
      content: replyContent,
      userEmail: user.primaryEmailAddress.emailAddress,
      userName: user.fullName,
      userImage: user.imageUrl,
      createdAt: new Date().toISOString()
    });

    setReplyContent('');
    setShowReply(false);
    fetchReplies();
  };

  const handleEditPost = async () => {
    if (!user || user.primaryEmailAddress.emailAddress !== post.userEmail) return;
    
    await db.update(CommunityPosts)
      .set({ content: editedContent })
      .where(eq(CommunityPosts.id, post.id));
    
    setIsEditing(false);
    onVoteChange(); // Refresh posts
  };

  const handleDeletePost = async () => {
    if (!user || user.primaryEmailAddress.emailAddress !== post.userEmail) return;
    
    await db.delete(PostReplies)
      .where(eq(PostReplies.postId, post.id));
    
    await db.delete(PostVotes)
      .where(eq(PostVotes.postId, post.id));
    
    await db.delete(CommunityPosts)
      .where(eq(CommunityPosts.id, post.id));
    
    setShowDeleteDialog(false);
    onVoteChange(); // Refresh posts
  };

  const handleEditReply = async (replyId) => {
    if (!user) return;
    
    await db.update(PostReplies)
      .set({ content: editedReplyContent })
      .where(eq(PostReplies.id, replyId));
    
    setEditingReplyId(null);
    setEditedReplyContent('');
    fetchReplies();
  };

  const handleDeleteReply = async (replyId) => {
    if (!user) return;
    
    await db.delete(PostReplies)
      .where(eq(PostReplies.id, replyId));
    
    setShowDeleteReplyDialog(null);
    fetchReplies();
  };

  if (!isLoaded) {
    return <div>Loading...</div>;
  }

  return (
    <div className="border rounded-lg p-4 space-y-4">
      <div className="flex gap-4">
        <Image
          src={post.userImage}
          alt={post.userName}
          width={40}
          height={40}
          className="rounded-full"
        />
        <div className="flex-1">
          <div className="flex justify-between items-start">
            <h3 className="font-semibold">{post.userName}</h3>
            {user?.primaryEmailAddress?.emailAddress === post.userEmail && (
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsEditing(!isEditing)}
                >
                  <HiPencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowDeleteDialog(true)}
                >
                  <HiTrash className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
          
          {isEditing ? (
            <div className="mt-2 space-y-2">
              <Textarea
                value={editedContent}
                onChange={(e) => setEditedContent(e.target.value)}
                rows={3}
              />
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsEditing(false)}>
                  Cancel
                </Button>
                <Button onClick={handleEditPost}>Save</Button>
              </div>
            </div>
          ) : (
            <p className="text-gray-600">{post.content}</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleVote('up')}
            className={userVote === 'up' ? 'text-green-500' : ''}
            disabled={!user}
          >
            <HiArrowUp />
          </Button>
          <span>{voteCount}</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleVote('down')}
            className={userVote === 'down' ? 'text-red-500' : ''}
            disabled={!user}
          >
            <HiArrowDown />
          </Button>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowReply(!showReply)}
          disabled={!user}
        >
          Reply
        </Button>
      </div>

      {showReply && (
        <div className="space-y-2">
          <Textarea
            placeholder="Write your reply..."
            value={replyContent}
            onChange={(e) => setReplyContent(e.target.value)}
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowReply(false)}>
              Cancel
            </Button>
            <Button onClick={handleReply}>Reply</Button>
          </div>
        </div>
      )}

      {replies.length > 0 && (
        <div className="space-y-3 pl-8 mt-4 border-l">
          {replies.map((reply) => (
            <div key={reply.id} className="flex gap-3">
              <div className="flex-shrink-0">
                <Image
                  src={reply.userImage}
                  alt={reply.userName}
                  width={32}
                  height={32}
                  className="rounded-full w-8 h-8 object-cover"
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start">
                  <h4 className="font-semibold text-sm truncate">{reply.userName}</h4>
                  {user?.primaryEmailAddress?.emailAddress === reply.userEmail && (
                    <div className="flex gap-2 flex-shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditingReplyId(reply.id);
                          setEditedReplyContent(reply.content);
                        }}
                      >
                        <HiPencil className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowDeleteReplyDialog(reply.id)}
                      >
                        <HiTrash className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </div>
                
                {editingReplyId === reply.id ? (
                  <div className="mt-2 space-y-2">
                    <Textarea
                      value={editedReplyContent}
                      onChange={(e) => setEditedReplyContent(e.target.value)}
                      rows={2}
                    />
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditingReplyId(null);
                          setEditedReplyContent('');
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleEditReply(reply.id)}
                      >
                        Save
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-gray-600 break-words">{reply.content}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Post Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Post</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this post? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeletePost}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Reply Dialog */}
      <AlertDialog 
        open={showDeleteReplyDialog !== null} 
        onOpenChange={() => setShowDeleteReplyDialog(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Reply</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this reply? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => handleDeleteReply(showDeleteReplyDialog)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default DoubtPost; 