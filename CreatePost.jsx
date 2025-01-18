"use client"
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { db } from '@/configs/db';
import { CommunityPosts } from '@/configs/schema';
import { useUser } from '@clerk/nextjs';
import React, { useState } from 'react';

function CreatePost({ isOpen, onClose, onPostCreated }) {
  const [content, setContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useUser();

  const handleSubmit = async () => {
    if (!content.trim()) return;
    
    setIsLoading(true);
    try {
      await db.insert(CommunityPosts).values({
        content: content,
        userEmail: user.primaryEmailAddress.emailAddress,
        userName: user.fullName,
        userImage: user.imageUrl,
        createdAt: new Date().toISOString(),
      });
      
      setContent('');
      onPostCreated();
    } catch (error) {
      console.error('Error creating post:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ask a Question</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Textarea
            placeholder="What's your question?"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={4}
          />
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button 
              onClick={handleSubmit} 
              disabled={isLoading || !content.trim()}
            >
              {isLoading ? 'Posting...' : 'Post Question'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default CreatePost; 