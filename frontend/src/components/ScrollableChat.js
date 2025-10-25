import { Avatar, Box, Text, IconButton, Menu, MenuButton, MenuList, MenuItem, useToast, HStack, VStack, Button, Image, Link, Badge } from "@chakra-ui/react";
import { Tooltip } from "@chakra-ui/react";
import { ChevronDownIcon, CopyIcon, EditIcon, DeleteIcon, DownloadIcon } from "@chakra-ui/icons";
import ScrollableFeed from "react-scrollable-feed";
import {
  isLastMessage,
  isSameSender,
  isSameSenderMargin,
  isSameUser,
} from "../config/ChatLogics";
import { ChatState } from "../Context/ChatProvider";
import { useState } from "react";
import axios from "axios";

const ScrollableChat = ({ messages, onReply, onEdit }) => {
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
          Authorization: `Bearer ${user.token}`,
        },
      };
      await axios.post(`${API_URL}/api/message/${messageId}/reaction`, { emoji }, config);
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

  return (
    <Box 
      height="100%" 
      overflowY="auto" 
      css={{
        '&::-webkit-scrollbar': {
          width: '6px',
        },
        '&::-webkit-scrollbar-track': {
          background: '#f1f1f1',
          borderRadius: '10px',
        },
        '&::-webkit-scrollbar-thumb': {
          background: '#888',
          borderRadius: '10px',
        },
        '&::-webkit-scrollbar-thumb:hover': {
          background: '#555',
        },
        scrollBehavior: 'smooth',
      }}
    >
      {messages &&
        messages.map((m, i) => (
          <div 
            style={{ display: "flex" }} 
            key={m._id}
            onMouseEnter={() => setHoveredMessage(m._id)}
            onMouseLeave={() => setHoveredMessage(null)}
          >
            {(isSameSender(messages, m, i, user._id) ||
              isLastMessage(messages, i, user._id)) && (
              <Tooltip label={m.sender.name} placement="bottom-start" hasArrow>
                <Avatar
                  mt="7px"
                  mr={1}
                  size="sm"
                  cursor="pointer"
                  name={m.sender.name}
                  src={m.sender.pic}
                />
              </Tooltip>
            )}
            <VStack align="start" spacing={1} maxWidth="75%" ml={isSameSenderMargin(messages, m, i, user._id)}>
              {/* Reply Preview */}
              {m.replyTo && (
                <Box
                  bg="gray.100"
                  p={2}
                  borderRadius="md"
                  borderLeft="3px solid"
                  borderLeftColor="blue.400"
                  fontSize="sm"
                  color="gray.600"
                  maxWidth="100%"
                >
                  <Text fontWeight="bold" fontSize="xs">
                    {m.replyTo.sender.name}
                  </Text>
                  <Text noOfLines={2}>
                    {m.replyTo.content}
                  </Text>
                </Box>
              )}
              
              {/* Message Content */}
              <Box
                position="relative"
                className={`chat-message ${m.sender._id === user._id ? 'sent' : 'received'}`}
                style={{
                  marginTop: isSameUser(messages, m, i, user._id) ? 3 : 10,
                  boxShadow: "0 1px 2px rgba(0,0,0,0.1)",
                  transition: "all 0.2s ease",
                }}
              >
                {/* Message Content */}
                {m.content && <Text>{m.content}</Text>}
                
                {/* File Attachments */}
                {m.attachments && m.attachments.length > 0 && (
                  <VStack spacing={2} align="start" mt={2}>
                    {m.attachments.map((attachment, index) => (
                      <Box key={index} maxW="200px">
                        {attachment.fileType.startsWith('image/') ? (
                          <Image
                            src={`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}${attachment.fileUrl}`}
                            alt={attachment.fileName}
                            borderRadius="md"
                            maxH="200px"
                            objectFit="cover"
                            cursor="pointer"
                            onClick={() => window.open(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}${attachment.fileUrl}`, '_blank')}
                          />
                        ) : (
                          <Box
                            p={3}
                            bg="gray.100"
                            borderRadius="md"
                            border="1px solid"
                            borderColor="gray.200"
                            cursor="pointer"
                            _hover={{ bg: "gray.200" }}
                            onClick={() => window.open(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}${attachment.fileUrl}`, '_blank')}
                          >
                            <HStack spacing={2}>
                              <Text fontSize="lg">
                                {attachment.fileType.startsWith('video/') ? '🎥' :
                                 attachment.fileType.startsWith('audio/') ? '🎵' :
                                 attachment.fileType.includes('pdf') ? '📄' :
                                 attachment.fileType.includes('zip') ? '📦' : '📎'}
                              </Text>
                              <VStack align="start" spacing={0}>
                                <Text fontSize="sm" fontWeight="medium" noOfLines={1}>
                                  {attachment.fileName}
                                </Text>
                                <Text fontSize="xs" color="gray.500">
                                  {(attachment.fileSize / 1024).toFixed(1)} KB
                                </Text>
                              </VStack>
                            </HStack>
                          </Box>
                        )}
                      </Box>
                    ))}
                  </VStack>
                )}
                
                {m.isEdited && (
                  <Text fontSize="xs" color="gray.500" fontStyle="italic">
                    (edited)
                  </Text>
                )}
                
                {/* Message Actions */}
                {hoveredMessage === m._id && (
                  <HStack
                    position="absolute"
                    top="-35px"
                    right={m.sender._id === user._id ? "0" : "auto"}
                    left={m.sender._id === user._id ? "auto" : "0"}
                    bg="white"
                    borderRadius="lg"
                    boxShadow="lg"
                    p={2}
                    spacing={1}
                    opacity={0.95}
                    transform="translateY(0)"
                    transition="all 0.2s ease-in-out"
                    zIndex={10}
                  >
                    <Tooltip label="Reply" placement="top">
                      <IconButton
                        size="sm"
                        icon={<Text fontSize="sm">↩</Text>}
                        onClick={() => onReply && onReply(m)}
                        aria-label="Reply"
                        colorScheme="blue"
                        variant="ghost"
                        _hover={{ bg: "blue.100" }}
                      />
                    </Tooltip>
                    <Tooltip label="Copy" placement="top">
                      <IconButton
                        size="sm"
                        icon={<CopyIcon />}
                        onClick={() => copyToClipboard(m.content)}
                        aria-label="Copy"
                        colorScheme="gray"
                        variant="ghost"
                        _hover={{ bg: "gray.100" }}
                      />
                    </Tooltip>
                    <Tooltip label="React" placement="top">
                      <Menu>
                        <MenuButton 
                          as={IconButton} 
                          size="sm" 
                          icon={<Text fontSize="sm">😀</Text>} 
                          aria-label="React"
                          colorScheme="yellow"
                          variant="ghost"
                          _hover={{ bg: "yellow.100" }}
                        />
                        <MenuList>
                          <MenuItem onClick={() => addReaction(m._id, "👍")}>👍 Like</MenuItem>
                          <MenuItem onClick={() => addReaction(m._id, "❤️")}>❤️ Love</MenuItem>
                          <MenuItem onClick={() => addReaction(m._id, "😂")}>😂 Laugh</MenuItem>
                          <MenuItem onClick={() => addReaction(m._id, "😮")}>😮 Wow</MenuItem>
                          <MenuItem onClick={() => addReaction(m._id, "😢")}>😢 Sad</MenuItem>
                          <MenuItem onClick={() => addReaction(m._id, "😡")}>😡 Angry</MenuItem>
                        </MenuList>
                      </Menu>
                    </Tooltip>
                    {m.sender._id === user._id && (
                      <>
                        <Tooltip label="Edit" placement="top">
                          <IconButton
                            size="sm"
                            icon={<EditIcon />}
                            onClick={() => onEdit && onEdit(m)}
                            aria-label="Edit"
                            colorScheme="green"
                            variant="ghost"
                            _hover={{ bg: "green.100" }}
                          />
                        </Tooltip>
                        <Tooltip label="Delete" placement="top">
                          <IconButton
                            size="sm"
                            icon={<DeleteIcon />}
                            onClick={() => deleteMessage(m._id)}
                            aria-label="Delete"
                            colorScheme="red"
                            variant="ghost"
                            _hover={{ bg: "red.100" }}
                          />
                        </Tooltip>
                      </>
                    )}
                  </HStack>
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
                    <Button
                      key={emoji}
                      size="xs"
                      variant="outline"
                      onClick={() => addReaction(m._id, emoji)}
                    >
                      {emoji} {count}
                    </Button>
                  ))}
                </HStack>
              )}
              
              {/* Timestamp */}
              <Text fontSize="xs" color="gray.500" ml={2}>
                {formatTime(m.createdAt)}
              </Text>
            </VStack>
          </div>
        ))}
    </Box>
  );
};

export default ScrollableChat;
