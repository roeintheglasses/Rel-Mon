"use client";

import { useState } from "react";
import { format, formatDistanceToNow } from "date-fns";
import { useUser } from "@clerk/nextjs";
import {
  useComments,
  useCreateComment,
  useUpdateComment,
  useDeleteComment,
  Comment,
} from "@/hooks/use-comments";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  MessageSquare,
  MoreVertical,
  Edit2,
  Trash2,
  Loader2,
  Send,
} from "lucide-react";

function getInitials(firstName: string | null, lastName: string | null, email: string) {
  if (firstName || lastName) {
    return `${firstName?.[0] || ""}${lastName?.[0] || ""}`.toUpperCase();
  }
  return email.slice(0, 2).toUpperCase();
}

function getUserName(firstName: string | null, lastName: string | null, email: string) {
  if (firstName || lastName) {
    return `${firstName || ""} ${lastName || ""}`.trim();
  }
  return email;
}

interface CommentItemProps {
  comment: Comment;
  releaseId: string;
  isOwner: boolean;
}

function CommentItem({ comment, releaseId, isOwner }: CommentItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const updateComment = useUpdateComment();
  const deleteComment = useDeleteComment();

  const handleSaveEdit = async () => {
    if (!editContent.trim()) return;

    try {
      await updateComment.mutateAsync({
        releaseId,
        commentId: comment.id,
        content: editContent,
      });
      setIsEditing(false);
    } catch (error) {
      console.error("Failed to update comment:", error);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteComment.mutateAsync({
        releaseId,
        commentId: comment.id,
      });
      setShowDeleteDialog(false);
    } catch (error) {
      console.error("Failed to delete comment:", error);
    }
  };

  return (
    <div className="flex gap-3 group">
      <Avatar className="h-8 w-8 flex-shrink-0">
        <AvatarImage src={comment.user.avatarUrl || undefined} />
        <AvatarFallback className="text-xs">
          {getInitials(comment.user.firstName, comment.user.lastName, comment.user.email)}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm">
            {getUserName(comment.user.firstName, comment.user.lastName, comment.user.email)}
          </span>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
              </span>
            </TooltipTrigger>
            <TooltipContent>
              {format(new Date(comment.createdAt), "PPpp")}
            </TooltipContent>
          </Tooltip>
          {comment.isEdited && (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="text-xs text-muted-foreground">(edited)</span>
              </TooltipTrigger>
              <TooltipContent>
                Edited {comment.editedAt && format(new Date(comment.editedAt), "PPpp")}
              </TooltipContent>
            </Tooltip>
          )}
        </div>

        {isEditing ? (
          <div className="mt-2 space-y-2">
            <Textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="min-h-[80px]"
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleSaveEdit}
                disabled={updateComment.isPending || !editContent.trim()}
              >
                {updateComment.isPending && (
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                )}
                Save
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setIsEditing(false);
                  setEditContent(comment.content);
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-sm mt-1 whitespace-pre-wrap">{comment.content}</p>
        )}
      </div>

      {isOwner && !isEditing && (
        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setIsEditing(true)}>
                <Edit2 className="h-4 w-4 mr-2" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => setShowDeleteDialog(true)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Comment</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete this comment? This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  className="bg-destructive hover:bg-destructive/90"
                >
                  {deleteComment.isPending && (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  )}
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}
    </div>
  );
}

interface CommentsSectionProps {
  releaseId: string;
}

export function CommentsSection({ releaseId }: CommentsSectionProps) {
  const { user } = useUser();
  const [newComment, setNewComment] = useState("");

  const { data: comments, isLoading, error } = useComments(releaseId);
  const createComment = useCreateComment();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    try {
      await createComment.mutateAsync({
        releaseId,
        content: newComment,
      });
      setNewComment("");
    } catch (error) {
      console.error("Failed to create comment:", error);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          <CardTitle className="text-lg">Comments</CardTitle>
          {comments && comments.length > 0 && (
            <span className="text-sm text-muted-foreground">
              ({comments.length})
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* New comment form */}
        <form onSubmit={handleSubmit} className="space-y-2">
          <Textarea
            placeholder="Add a comment..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            className="min-h-[80px]"
          />
          <div className="flex justify-end">
            <Button
              type="submit"
              size="sm"
              disabled={createComment.isPending || !newComment.trim()}
            >
              {createComment.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Post Comment
            </Button>
          </div>
        </form>

        {/* Comments list */}
        <div className="space-y-4 pt-4 border-t">
          {isLoading && (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          )}

          {error && (
            <p className="text-sm text-destructive text-center py-4">
              Failed to load comments
            </p>
          )}

          {!isLoading && !error && comments?.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No comments yet. Be the first to comment!
            </p>
          )}

          {comments?.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              releaseId={releaseId}
              isOwner={user?.id === comment.user.id}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
