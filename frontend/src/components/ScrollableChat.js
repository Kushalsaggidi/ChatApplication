import { 
  Avatar, Box, Text, IconButton, Menu, MenuButton, 
  MenuList, MenuItem, useToast, HStack, VStack, 
  Image, Link, Badge 
} from "@chakra-ui/react";
import { Tooltip } from "@chakra-ui/react";
import { CopyIcon, EditIcon, DeleteIcon, CheckIcon } from "@chakra-ui/icons";
import ScrollableFeed from "react-scrollable-feed";
import {
  isLastMessage,
  isSameSender,
  isSameUser,
} from "../config/ChatLogics";
import { ChatState } from "../Context/ChatProvider";
import { useState } from "react";
import axios from "axios";

const ScrollableChat = ({ messages, onReply, onEdit, currentUser }) => {
  const { user } = ChatState();
  const toast = useToast();
  const [hoveredMessage, setHoveredMessage] = useState(null);

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copied to clipboard",
        status: "success",
        duration: 2000,
        isClosable: true,
      });
    } catch (err) {
      toast({
        title: "Failed to copy",
        status: "error",
        duration: 2000,
        isClosable: true,
      });
    }
  };

  const addReaction = async (messageId, emoji) => {
    try {
      const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";
      const config = {
        headers: {
          "Content-type": "application/json",
          Authorization: `Bearer ${user.token}`,
        },
      };
      await axios.post(`${API_URL}/api/message/${messageId}/reaction`, { emoji }, config);
      toast({
        title: "Reaction added",
        status: "success",
        duration: 1000,
        isClosable: true,
      });
    } catch (error) {
      console.error("Error adding reaction:", error);
    }
  };

  const deleteMessage = async (messageId) => {
    try {
      const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";
      const config = {
        headers: {
          Authorization: `Bearer ${user.token}`,
        },
      };
      await axios.delete(`${API_URL}/api/message/${messageId}`, config);
      toast({
        title: "Message deleted",
        status: "success",
        duration: 2000,
        isClosable: true,
      });
    } catch (error) {
      console.error("Error deleting message:", error);
      toast({
        title: "Failed to delete message",
        status: "error",
        duration: 2000,
        isClosable: true,
      });
    }
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getMessageStatus = (message) => {
    if (!message.sender || message.sender._id !== user._id) {
      return null;
    }

    const isRead = message.readBy && message.readBy.length > 1;
    const isDelivered = message.deliveredTo && message.deliveredTo.length > 1;

    if (isRead) {
      return (
        <HStack spacing={0} color="blue.500">
          <CheckIcon boxSize={3} />
          <CheckIcon boxSize={3} ml={-1} />
        </HStack>
      );
    } else if (isDelivered) {
      return (
        <HStack spacing={0} color="gray.500">
          <CheckIcon boxSize={3} />
          <CheckIcon boxSize={3} ml={-1} />
        </HStack>
      );
    } else {
      return <CheckIcon boxSize={3} color="gray.400" />;
    }
  };

  const scrollToMessage = (messageId) => {
    const element = document.getElementById(`message-${messageId}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // Highlight effect
      element.style.backgroundColor = 'rgba(255, 255, 0, 0.3)';
      setTimeout(() => {
        element.style.backgroundColor = 'transparent';
      }, 1500);
    }
  };

  return (
    <ScrollableFeed forceScroll={true}>
      {messages &&
        messages.map((m, i) => {
          const isSentByMe = m.sender._id === user._id;
          
          return (
            <Box
              key={m._id}
              id={`message-${m._id}`}
              display="flex"
              flexDirection="column"
              alignItems={isSentByMe ? "flex-end" : "flex-start"}
              mb={3}
              px={2}
              onMouseEnter={() => setHoveredMessage(m._id)}
              onMouseLeave={() => setHoveredMessage(null)}
              transition="background-color 0.3s ease"
            >
              <HStack 
                spacing={2} 
                alignItems="flex-end"
                flexDirection={isSentByMe ? "row-reverse" : "row"}
                w="100%"
                justifyContent={isSentByMe ? "flex-end" : "flex-start"}
              >
                {/* Avatar for received messages */}
                {!isSentByMe && (
                  isSameSender(messages, m, i, user._id) ||
                  isLastMessage(messages, i, user._id)
                ) ? (
                  <Tooltip label={m.sender.name} placement="bottom-start" hasArrow>
                    <Avatar
                      size="sm"
                      cursor="pointer"
                      name={m.sender.name}
                      src={m.sender.pic}
                    />
                  </Tooltip>
                ) : !isSentByMe ? (
                  <Box w="32px" /> // Spacer for alignment
                ) : null}

                <VStack
                  align={isSentByMe ? "flex-end" : "flex-start"}
                  spacing={1}
                  maxW="75%"
                  position="relative"
                >
                  {/* Sender Name (only for received messages in group chats) */}
                  {!isSentByMe && (
                    <Text fontSize="xs" color="gray.600" fontWeight="500" ml={2}>
                      {m.sender.name}
                    </Text>
                  )}

                  {/* Reply Preview - Shows which message this is replying to */}
                  {m.replyTo && (
                    <Box
                      bg={isSentByMe ? "rgba(135, 206, 235, 0.3)" : "rgba(144, 238, 144, 0.3)"}
                      p={2}
                      borderRadius="md"
                      mb={1}
                      fontSize="xs"
                      borderLeft="3px solid"
                      borderLeftColor={isSentByMe ? "#4A90E2" : "#4CAF50"}
                      cursor="pointer"
                      onClick={() => m.replyTo._id && scrollToMessage(m.replyTo._id)}
                      _hover={{ opacity: 0.8 }}
                      maxW="100%"
                    >
                      <HStack spacing={2}>
                        <Text fontSize="10px" color="gray.500">↩</Text>
                        <VStack align="start" spacing={0}>
                          <Text fontWeight="bold" color={isSentByMe ? "#2B6CB0" : "#2F855A"} fontSize="xs">
                            {m.replyTo.sender?.name || "User"}
                          </Text>
                          <Text noOfLines={2} color="gray.700" fontSize="xs">
                            {m.replyTo.content || "[Attachment]"}
                          </Text>
                        </VStack>
                      </HStack>
                    </Box>
                  )}

                  {/* Message Bubble */}
                  <Box
                    bg={isSentByMe ? "#BEE3F8" : "#B9F5D0"}
                    borderRadius="lg"
                    p={3}
                    position="relative"
                    boxShadow="sm"
                    borderBottomRightRadius={isSentByMe ? "2px" : "lg"}
                    borderBottomLeftRadius={isSentByMe ? "lg" : "2px"}
                  >
                    {/* Message Content */}
                    {m.content && (
                      <Text 
                        color="gray.800" 
                        wordBreak="break-word" 
                        whiteSpace="pre-wrap"
                      >
                        {m.content}
                      </Text>
                    )}

                    {/* File Attachments */}
                    {m.files && m.files.length > 0 && (
                      <VStack align="start" mt={m.content ? 2 : 0} spacing={2}>
                        {m.files.map((file, index) => (
                          <Box key={index} w="100%">
                            {file.mimetype.startsWith('image/') ? (
                              <Image
                                src={`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/${file.path}`}
                                alt={file.originalName}
                                maxH="200px"
                                maxW="100%"
                                borderRadius="md"
                                cursor="pointer"
                                onClick={() => window.open(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/${file.path}`, '_blank')}
                              />
                            ) : (
                              <Link
                                href={`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/${file.path}`}
                                isExternal
                                display="flex"
                                alignItems="center"
                                gap={2}
                                p={2}
                                bg="whiteAlpha.500"
                                borderRadius="md"
                                _hover={{ bg: "whiteAlpha.700" }}
                              >
                                <Text fontSize="2xl">
                                  {file.mimetype.startsWith('video/') ? '🎥' :
                                   file.mimetype.startsWith('audio/') ? '🎵' :
                                   file.mimetype.includes('pdf') ? '📄' : '📎'}
                                </Text>
                                <Box flex={1}>
                                  <Text fontSize="sm" fontWeight="500">{file.originalName}</Text>
                                  <Text fontSize="xs" color="gray.600">
                                    {(file.size / 1024).toFixed(1)} KB
                                  </Text>
                                </Box>
                              </Link>
                            )}
                          </Box>
                        ))}
                      </VStack>
                    )}

                    {/* Message Actions on Hover */}
                    {hoveredMessage === m._id && (
                      <HStack
                        position="absolute"
                        top="-30px"
                        right={isSentByMe ? "0" : "auto"}
                        left={isSentByMe ? "auto" : "0"}
                        bg="white"
                        boxShadow="lg"
                        borderRadius="full"
                        p={1}
                        spacing={0}
                        zIndex={10}
                      >
                        <IconButton
                          size="xs"
                          icon={<Text fontSize="md">↩</Text>}
                          onClick={() => onReply && onReply(m)}
                          aria-label="Reply"
                          colorScheme="blue"
                          variant="ghost"
                          borderRadius="full"
                        />

                        <IconButton
                          size="xs"
                          icon={<CopyIcon />}
                          onClick={() => copyToClipboard(m.content)}
                          aria-label="Copy"
                          colorScheme="gray"
                          variant="ghost"
                          borderRadius="full"
                        />

                        <Menu>
                          <MenuButton
                            as={IconButton}
                            size="xs"
                            icon={<Text fontSize="md">😀</Text>}
                            aria-label="React"
                            colorScheme="yellow"
                            variant="ghost"
                            borderRadius="full"
                          />
                          <MenuList minW="150px">
                            <MenuItem onClick={() => addReaction(m._id, "👍")}>👍 Like</MenuItem>
                            <MenuItem onClick={() => addReaction(m._id, "❤️")}>❤️ Love</MenuItem>
                            <MenuItem onClick={() => addReaction(m._id, "😂")}>😂 Laugh</MenuItem>
                            <MenuItem onClick={() => addReaction(m._id, "😮")}>😮 Wow</MenuItem>
                            <MenuItem onClick={() => addReaction(m._id, "😢")}>😢 Sad</MenuItem>
                            <MenuItem onClick={() => addReaction(m._id, "😡")}>😡 Angry</MenuItem>
                          </MenuList>
                        </Menu>

                        {m.sender._id === user._id && (
                          <>
                            <IconButton
                              size="xs"
                              icon={<EditIcon />}
                              onClick={() => onEdit && onEdit(m)}
                              aria-label="Edit"
                              colorScheme="green"
                              variant="ghost"
                              borderRadius="full"
                            />

                            <IconButton
                              size="xs"
                              icon={<DeleteIcon />}
                              onClick={() => deleteMessage(m._id)}
                              aria-label="Delete"
                              colorScheme="red"
                              variant="ghost"
                              borderRadius="full"
                            />
                          </>
                        )}
                      </HStack>
                    )}

                    {/* Edited Badge */}
                    {m.isEdited && (
                      <Text fontSize="10px" color="gray.500" mt={1} fontStyle="italic">
                        edited
                      </Text>
                    )}
                  </Box>

                  {/* Reactions */}
                  {m.reactions && m.reactions.length > 0 && (
                    <HStack spacing={1} mt={1}>
                      {Object.entries(
                        m.reactions.reduce((acc, reaction) => {
                          acc[reaction.emoji] = (acc[reaction.emoji] || 0) + 1;
                          return acc;
                        }, {})
                      ).map(([emoji, count]) => (
                        <Badge
                          key={emoji}
                          cursor="pointer"
                          onClick={() => addReaction(m._id, emoji)}
                          colorScheme="gray"
                          fontSize="xs"
                          borderRadius="full"
                          px={2}
                        >
                          {emoji} {count}
                        </Badge>
                      ))}
                    </HStack>
                  )}

                  {/* Timestamp and Status */}
                  <HStack spacing={1} fontSize="10px" color="gray.500" mt={1}>
                    <Text>{formatTime(m.createdAt)}</Text>
                    {getMessageStatus(m)}
                  </HStack>
                </VStack>
              </HStack>
            </Box>
          );
        })}
    </ScrollableFeed>
  );
};

export default ScrollableChat;
