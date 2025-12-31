import React, { useState, useEffect } from "react";
import {
  Box,
  VStack,
  HStack,
  Text,
  Textarea,
  Button,
  Divider,
  Collapse,
  Alert,
  AlertIcon,
  useToast,
  Spinner,
  Badge,
} from "@chakra-ui/react";
import { api } from "../api";

interface Comment {
  comment: string;
  created_at: string;
  user_id: string;
  timeAgo: string;
}

const CommentSection: React.FC = () => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();

  const loadComments = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get("/api/comments");
      if (response.data.success) {
        setComments(response.data.comments);
      }
    } catch (err) {
      setError("Failed to load comments");
      console.error("Error loading comments:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleLoadClick = () => {
    if (!isOpen) {
      setIsOpen(true);
      loadComments();
    } else {
      setIsOpen(false);
    }
  };

  const handleSubmit = async () => {
    if (!newComment.trim()) {
      toast({
        title: "Comment cannot be empty",
        status: "warning",
        duration: 2000,
        isClosable: true,
      });
      return;
    }

    setSubmitting(true);
    try {
      const response = await api.post("/api/comments", {
        comment: newComment,
      });

      if (response.data.success) {
        toast({
          title: "Comment posted!",
          status: "success",
          duration: 2000,
          isClosable: true,
        });
        setNewComment("");
        loadComments(); // Reload comments to show the new one
      }
    } catch (err: any) {
      const message = err.response?.data?.error || "Failed to post comment";
      toast({
        title: "Error",
        description: message,
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box
      width="100%"
      maxW="800px"
      mx="auto"
      mt={8}
      p={4}
      borderTop="1px solid"
      borderColor="gray.200"
    >
      <VStack spacing={4} align="stretch">
        <HStack justify="space-between" align="center">
          <Text fontSize="lg" fontWeight="semibold">
            💬 Leave feedback
          </Text>
          <Button size="sm" variant="outline" onClick={handleLoadClick}>
            {isOpen ? "Hide Comments" : "Load Comments"}
          </Button>
        </HStack>

        <Collapse in={isOpen} animateOpacity>
          <VStack spacing={4} align="stretch">
            {/* Comment Input */}
            <Box
              p={4}
              borderRadius="md"
              bg="gray.50"
              border="1px solid"
              borderColor="gray.200"
            >
              <VStack spacing={3} align="stretch">
                <Text fontSize="sm" fontWeight="medium">
                  Share your feedback or experience:
                </Text>
                <Textarea
                  placeholder="Write your comment here... (max 300 characters)"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value.slice(0, 300))}
                  maxLength={300}
                  size="sm"
                  resize="none"
                  rows={3}
                />
                <HStack justify="space-between">
                  <Text fontSize="xs" color="gray.500">
                    {newComment.length}/300 characters
                  </Text>
                  <Button
                    size="sm"
                    colorScheme="blue"
                    onClick={handleSubmit}
                    isLoading={submitting}
                    loadingText="Posting..."
                    isDisabled={!newComment.trim() || submitting}
                  >
                    Post Comment
                  </Button>
                </HStack>
              </VStack>
            </Box>

            <Divider />

            {/* Comments List */}
            {loading ? (
              <HStack justify="center" py={4}>
                <Spinner size="md" />
                <Text>Loading comments...</Text>
              </HStack>
            ) : error ? (
              <Alert status="error" borderRadius="md">
                <AlertIcon />
                {error}
              </Alert>
            ) : comments.length === 0 ? (
              <Box textAlign="center" py={8} color="gray.500">
                <Text>No comments yet. Be the first to share feedback!</Text>
              </Box>
            ) : (
              <VStack spacing={3} align="stretch" maxH="400px" overflowY="auto">
                {comments.map((comment, index) => (
                  <Box
                    key={index}
                    p={3}
                    borderRadius="md"
                    bg="white"
                    border="1px solid"
                    borderColor="gray.100"
                    _hover={{ borderColor: "gray.300" }}
                    transition="border-color 0.2s"
                  >
                    <HStack justify="space-between" mb={2}>
                      <HStack spacing={2}>
                        <Badge colorScheme="blue" fontSize="xs">
                          {comment.user_id}
                        </Badge>
                        <Text fontSize="xs" color="gray.500">
                          {comment.timeAgo}
                        </Text>
                      </HStack>
                    </HStack>
                    <Text fontSize="sm" color="gray.700">
                      {comment.comment}
                    </Text>
                  </Box>
                ))}
              </VStack>
            )}
          </VStack>
        </Collapse>
      </VStack>
    </Box>
  );
};

export default CommentSection;
