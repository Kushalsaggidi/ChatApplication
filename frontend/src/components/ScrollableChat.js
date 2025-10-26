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
          <CheckIcon boxSize={2.5} />
          <CheckIcon boxSize={2.5} ml={-1} />
        </HStack>
      );
    } else if (isDelivered) {
      return (
        <HStack spacing={0} color="gray.500">
          <CheckIcon boxSize={2.5} />
          <CheckIcon boxSize={2.5} ml={-1} />
        </HStack>
      );
    } else {
      return <CheckIcon boxSize={2.5} color="gray.400" />;
    }
  };

  const scrollToMessage = (messageId) => {
    const element = document.getElementById(`message-${messageId}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      element.style.backgroundColor = 'rgba(255, 255, 0, 0.2)';
      setTimeout(() => {
        element.style.backgroundColor = 'transparent';
      }, 1000);
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
              alignItems="flex-start"
              justifyContent={isSentByMe ? "flex-end" : "flex-start"}
              mb={1}
              px={2}
              onMouseEnter={() => setHoveredMessage(m._id)}
              onMouseLeave={() => setHoveredMessage(null)}
              transition="background-color 0.2s ease"
            >
              <HStack 
                spacing={1} 
                alignItems="flex-start"
                flexDirection={isSentByMe ? "row-reverse" : "row"}
                maxW="75%"
              >
                {/* Avatar for received messages */}
                {!isSentByMe && (
                  isSameSender(messages, m, i, user._id) ||
                  isLastMessage(messages, i, user._id)
                ) ? (
                  <Avatar
                    size="xs"
                    name={m.sender.name}
                    src={m.sender.pic}
                    mt={1}
                  />
                ) : !isSentByMe ? (
                  <Box w="24px" />
                ) : null}

                <VStack
                  align={isSentByMe ? "flex-end" : "flex-start"}
                  spacing={0}
                  position="relative"
                >
                  {/* Message Bubble */}
                  <Box
                    bg={isSentByMe ? "#DCF8C6" : "white"}
                    borderRadius="8px"
                    p={2}
                    position="relative"
                    boxShadow="0 1px 0.5px rgba(0,0,0,0.13)"
                    minW="60px"
                    maxW="100%"
                  >
                    {/* Compact Reply Preview - WhatsApp Style */}
                    {m.replyTo && (
                      <Box
                        bg={isSentByMe ? "rgba(0,0,0,0.05)" : "rgba(0,0,0,0.05)"}
                        borderLeft="3px solid"
                        borderLeftColor={isSentByMe ? "#06cf9c" : "#8696a0"}
                        borderRadius="3px"
                        p={1.5}
                        mb={1.5}
                        fontSize="xs"
                        cursor="pointer"
                        onClick={() => m.replyTo._id && scrollToMessage(m.replyTo._id)}
                        _hover={{ opacity: 0.8 }}
                      >
                        <Text 
                          fontWeight="600" 
                          color={isSentByMe ? "#06cf9c" : "#8696a0"} 
                          fontSize="11px"
                          mb={0.5}
                        >
                          {m.replyTo.sender?.name || "User"}
                        </Text>
                        <Text 
                          color="gray.700" 
                          fontSize="11px"
                          noOfLines={1}
                          opacity={0.8}
                        >
                          {m.replyTo.content || "[Media]"}
                        </Text>
                      </Box>
                    )}

                    {/* Message Content */}
                    {m.content && (
                      <Text 
                        fontSize="14px"
                        color="#111b21"
                        wordBreak="break-word"
                        whiteSpace="pre-wrap"
                        lineHeight="19px"
                      >
                        {m.content}
                      </Text>
                    )}

                    {/* File Attachments */}
                    {m.files && m.files.length > 0 && (
                      <VStack align="start" mt={m.content ? 2 : 0} spacing={1}>
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
                                bg="gray.50"
                                borderRadius="md"
                                fontSize="sm"
                              >
                                <Text fontSize="lg">
                                  {file.mimetype.startsWith('video/') ? 'ðŸŽ¥' :
                                   file.mimetype.startsWith('audio/') ? 'ðŸŽµ' :
                                   file.mimetype.includes('pdf') ? 'ðŸ“„' : 'ðŸ“Ž'}
                                </Text>
                                <Box>
                                  <Text fontSize="xs" noOfLines={1}>{file.originalName}</Text>
                                  <Text fontSize="10px" color="gray.500">
                                    {(file.size / 1024).toFixed(1)} KB
                                  </Text>
                                </Box>
                              </Link>
                            )}
                          </Box>
                        ))}
                      </VStack>
                    )}

                    {/* Time & Status - WhatsApp style (bottom right corner) */}
                    <HStack 
                      spacing={1} 
                      position="relative"
                      justifyContent="flex-end"
                      mt={0.5}
                      ml={2}
                    >
                      {m.isEdited && (
                        <Text fontSize="9px" color="gray.500" mr={0.5}>
                          edited
                        </Text>
                      )}
                      <Text fontSize="10px" color="gray.500">
                        {formatTime(m.createdAt)}
                      </Text>
                      {getMessageStatus(m)}
                    </HStack>

                    {/* Message Actions - Minimal */}
                    {hoveredMessage === m._id && (
                      <HStack
                        position="absolute"
                        top="-25px"
                        right={isSentByMe ? "0" : "auto"}
                        left={isSentByMe ? "auto" : "0"}
                        bg="white"
                        boxShadow="0 2px 5px rgba(0,0,0,0.15)"
                        borderRadius="md"
                        p={0.5}
                        spacing={0}
                        zIndex={10}
                      >
                        <IconButton
                          size="xs"
                          icon={<Text fontSize="sm">â†©</Text>}
                          onClick={() => onReply && onReply(m)}
                          variant="ghost"
                          aria-label="Reply"
                        />

                        <IconButton
                          size="xs"
                          icon={<CopyIcon boxSize={3} />}
                          onClick={() => copyToClipboard(m.content)}
                          variant="ghost"
                          aria-label="Copy"
                        />

                        <Menu>
                          <MenuButton
                            as={IconButton}
                            size="xs"
                            icon={<Text fontSize="sm">ðŸ˜€</Text>}
                            variant="ghost"
                            aria-label="React"
                          />
                          <MenuList minW="120px" fontSize="sm">
                            <MenuItem onClick={() => addReaction(m._id, "ðŸ‘")}>ðŸ‘</MenuItem>
                            <MenuItem onClick={() => addReaction(m._id, "â¤ï¸")}>â¤ï¸</MenuItem>
                            <MenuItem onClick={() => addReaction(m._id, "ðŸ˜‚")}>ðŸ˜‚</MenuItem>
                            <MenuItem onClick={() => addReaction(m._id, "ðŸ˜®")}>ðŸ˜®</MenuItem>
                          </MenuList>
                        </Menu>

                        {m.sender._id === user._id && (
                          <>
                            <IconButton
                              size="xs"
                              icon={<EditIcon boxSize={3} />}
                              onClick={() => onEdit && onEdit(m)}
                              variant="ghost"
                              aria-label="Edit"
                            />

                            <IconButton
                              size="xs"
                              icon={<DeleteIcon boxSize={3} />}
                              onClick={() => deleteMessage(m._id)}
                              variant="ghost"
                              colorScheme="red"
                              aria-label="Delete"
                            />
                          </>
                        )}
                      </HStack>
                    )}
                  </Box>

                  {/* Reactions - Compact */}
                  {m.reactions && m.reactions.length > 0 && (
                    <HStack spacing={0.5} mt={0.5}>
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
                          fontSize="10px"
                          borderRadius="full"
                          px={1.5}
                          py={0.5}
                          bg="white"
                          boxShadow="sm"
                        >
                          {emoji} {count}
                        </Badge>
                      ))}
                    </HStack>
                  )}
                </VStack>
              </HStack>
            </Box>
          );
        })}
    </ScrollableFeed>
  );
};

export default ScrollableChat;