import { 
  Avatar, Box, Text, IconButton, Menu, MenuButton, 
  MenuList, MenuItem, useToast, HStack, VStack, 
  Image, Link, Badge 
} from "@chakra-ui/react";
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
    <ScrollableFeed forceScroll={true}>
      {messages &&
        messages.map((m, i) => (
          <Box
            key={m._id}
            display="flex"
            flexDirection="column"
            mb={2}
            onMouseEnter={() => setHoveredMessage(m._id)}
            onMouseLeave={() => setHoveredMessage(null)}
          >
            <Box display="flex" alignItems="flex-end">
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

              <Box
                position="relative"
                maxW="75%"
                ml={isSameSenderMargin(messages, m, i, user._id)}
                mt={isSameUser(messages, m, i) ? 1 : 3}
              >
                {/* Reply Preview */}
                {m.replyTo && (
                  <Box
                    bg={m.sender._id === user._id ? "#9ac9e3" : "#9de8c7"}
                    p={2}
                    borderRadius="md"
                    mb={1}
                    fontSize="xs"
                    borderLeft="2px solid"
                    borderLeftColor={m.sender._id === user._id ? "#4A90E2" : "#4CAF50"}
                  >
                    <Text fontWeight="bold">{m.replyTo.sender.name}</Text>
                    <Text noOfLines={1}>{m.replyTo.content}</Text>
                  </Box>
                )}

                {/* Message Content */}
                <Box
                  bg={m.sender._id === user._id ? "#BEE3F8" : "#B9F5D0"}
                  borderRadius="20px"
                  p="10px 15px"
                  position="relative"
                >
                  {m.content && <Text>{m.content}</Text>}

                  {/* File Attachments */}
                  {m.files && m.files.length > 0 && (
                    <VStack align="start" mt={m.content ? 2 : 0} spacing={2}>
                      {m.files.map((file, index) => (
                        <Box key={index}>
                          {file.mimetype.startsWith('image/') ? (
                            <Image
                              src={`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/${file.path}`}
                              alt={file.originalName}
                              maxH="200px"
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
                            >
                              <Text fontSize="lg">
                                {file.mimetype.startsWith('video/') ? '🎥' :
                                 file.mimetype.startsWith('audio/') ? '🎵' :
                                 file.mimetype.includes('pdf') ? '📄' : '📎'}
                              </Text>
                              <Box>
                                <Text fontSize="sm">{file.originalName}</Text>
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

                  {m.isEdited && (
                    <Text fontSize="xs" color="gray.500" mt={1}>
                      (edited)
                    </Text>
                  )}

                  {/* Message Actions */}
                  {hoveredMessage === m._id && (
                    <HStack
                      position="absolute"
                      top="-25px"
                      right="0"
                      bg="white"
                      boxShadow="md"
                      borderRadius="md"
                      p={1}
                      spacing={0}
                    >
                      <IconButton
                        size="xs"
                        icon={<Text>↩</Text>}
                        onClick={() => onReply && onReply(m)}
                        aria-label="Reply"
                        colorScheme="blue"
                        variant="ghost"
                        _hover={{ bg: "blue.100" }}
                      />

                      <IconButton
                        size="xs"
                        icon={<CopyIcon />}
                        onClick={() => copyToClipboard(m.content)}
                        aria-label="Copy"
                        colorScheme="gray"
                        variant="ghost"
                        _hover={{ bg: "gray.100" }}
                      />

                      <Menu>
                        <MenuButton
                          as={IconButton}
                          size="xs"
                          icon={<Text>😀</Text>}
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

                      {m.sender._id === user._id && (
                        <>
                          <IconButton
                            size="xs"
                            icon={<EditIcon />}
                            onClick={() => onEdit && onEdit(m)}
                            aria-label="Edit"
                            colorScheme="green"
                            variant="ghost"
                            _hover={{ bg: "green.100" }}
                          />

                          <IconButton
                            size="xs"
                            icon={<DeleteIcon />}
                            onClick={() => deleteMessage(m._id)}
                            aria-label="Delete"
                            colorScheme="red"
                            variant="ghost"
                            _hover={{ bg: "red.100" }}
                          />
                        </>
                      )}
                    </HStack>
                  )}
                </Box>

                {/* Reactions */}
                {m.reactions && m.reactions.length > 0 && (
                  <HStack mt={1} spacing={1}>
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
                      >
                        {emoji} {count}
                      </Badge>
                    ))}
                  </HStack>
                )}

                {/* Timestamp */}
                <Text fontSize="10px" color="gray.500" mt={1}>
                  {formatTime(m.createdAt)}
                </Text>
              </Box>
            </Box>
          </Box>
        ))}
    </ScrollableFeed>
  );
};

export default ScrollableChat;
