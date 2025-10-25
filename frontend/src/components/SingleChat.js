import { FormControl } from "@chakra-ui/react";
import { Input } from "@chakra-ui/react";
import { Box, Text } from "@chakra-ui/react";
import { HStack, Button } from "@chakra-ui/react";
import "./styles.css";
import { IconButton, Spinner, useToast, Badge } from "@chakra-ui/react";
import FileUpload from "./FileUpload";
import { getSender, getSenderFull } from "../config/ChatLogics";
import { useEffect, useState, useRef } from "react";
import axios from "axios";
import { ArrowBackIcon } from "@chakra-ui/icons";
import ProfileModal from "./miscellaneous/ProfileModal";
import ScrollableChat from "./ScrollableChat";
import io from "socket.io-client";
import UpdateGroupChatModal from "./miscellaneous/UpdateGroupChatModal";
import { ChatState } from "../Context/ChatProvider";

const ENDPOINT = process.env.REACT_APP_API_URL || "http://localhost:5000";
var socket, selectedChatCompare;

const SingleChat = ({ fetchAgain, setFetchAgain }) => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const [socketConnected, setSocketConnected] = useState(false);
  const [typing, setTyping] = useState(false);
  const [istyping, setIsTyping] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);
  const [editingMessage, setEditingMessage] = useState(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [showFileUpload, setShowFileUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState({});
  
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  
  const toast = useToast();

  const { selectedChat, setSelectedChat, user, notification, setNotification } = ChatState();

  const fetchMessages = async () => {
    if (!selectedChat) return;

    try {
      const config = {
        headers: {
          Authorization: `Bearer ${user.token}`,
        },
      };

      setLoading(true);

      const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";
      const { data } = await axios.get(
        `${API_URL}/api/message/${selectedChat._id}`,
        config
      );
      setMessages(data);
      setLoading(false);

      socket.emit("join chat", selectedChat._id);
      
      // Mark messages as read
      markMessagesAsRead();
    } catch (error) {
      toast({
        title: "Error Occured!",
        description: "Failed to Load the Messages",
        status: "error",
        duration: 5000,
        isClosable: true,
        position: "bottom",
      });
      setLoading(false);
    }
  };

  // Mark messages as read
  const markMessagesAsRead = async () => {
    if (!selectedChat) return;

    try {
      const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";
      const config = {
        headers: {
          Authorization: `Bearer ${user.token}`,
        },
      };

      const { data } = await axios.put(
        `${API_URL}/api/message/${selectedChat._id}/read`,
        {},
        config
      );

      if (data.messageIds && data.messageIds.length > 0) {
        // Emit socket event for read receipts
        socket.emit("messages read", {
          chatId: selectedChat._id,
          userId: user._id,
          messageIds: data.messageIds
        });

        // Update local messages
        setMessages(prevMessages =>
          prevMessages.map(msg => {
            if (data.messageIds.includes(msg._id) && !msg.readBy.includes(user._id)) {
              return { ...msg, readBy: [...msg.readBy, user._id] };
            }
            return msg;
          })
        );
      }
    } catch (error) {
      console.error("Error marking messages as read:", error);
    }
  };

  const sendMessage = async (event) => {
    if (event.key === "Enter" && (newMessage || selectedFiles.length > 0)) {
      socket.emit("stop typing", selectedChat._id);
      setUploading(true);
      
      try {
        const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";
        
        if (editingMessage) {
          const config = {
            headers: {
              "Content-type": "application/json",
              Authorization: `Bearer ${user.token}`,
            },
          };
          
          const { data } = await axios.put(
            `${API_URL}/api/message/${editingMessage._id}`,
            { content: newMessage },
            config
          );
          
          setMessages(messages.map(msg => 
            msg._id === editingMessage._id ? data : msg
          ));
          
          socket.emit("message edited", data);
          setEditingMessage(null);
        } else {
          const formData = new FormData();
          formData.append('content', newMessage);
          formData.append('chatId', selectedChat._id);
          if (replyingTo) {
            formData.append('replyTo', replyingTo._id);
          }
          
          selectedFiles.forEach((file) => {
            formData.append('files', file);
          });
          
          const config = {
            headers: {
              Authorization: `Bearer ${user.token}`,
              'Content-Type': 'multipart/form-data',
            },
          };
          
          const { data } = await axios.post(
            `${API_URL}/api/message`,
            formData,
            config
          );
          
          socket.emit("new message", data);
          setMessages([...messages, data]);
        }
        
        setNewMessage("");
        setSelectedFiles([]);
        setShowFileUpload(false);
        setReplyingTo(null);
        setUploading(false);
        
      } catch (error) {
        console.error("Error sending/editing message:", error);
        setUploading(false);
        toast({
          title: "Error Occurred!",
          description: error.response?.data?.message || "Failed to send the Message",
          status: "error",
          duration: 5000,
          isClosable: true,
          position: "bottom",
        });
      }
    }
  };

  const handleReply = (message) => {
    setReplyingTo(message);
    setEditingMessage(null);
  };

  const handleEdit = (message) => {
    setEditingMessage(message);
    setNewMessage(message.content);
    setReplyingTo(null);
  };

  const cancelReply = () => {
    setReplyingTo(null);
    setEditingMessage(null);
    setNewMessage("");
    setSelectedFiles([]);
    setShowFileUpload(false);
  };

  const handleFilesSelect = (files) => {
    setSelectedFiles(prev => [...prev, ...files]);
  };

  const handleRemoveFile = (index) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handlePaste = (e) => {
    const items = e.clipboardData.items;
    const files = [];
    
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.indexOf('image') !== -1) {
        const file = item.getAsFile();
        if (file) {
          files.push(file);
        }
      }
    }
    
    if (files.length > 0) {
      handleFilesSelect(files);
      toast({
        title: "Images pasted",
        description: `${files.length} image(s) ready to send`,
        status: "success",
        duration: 2000,
        isClosable: true,
      });
    }
  };

  const scrollToBottom = (behavior = 'smooth') => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior, block: 'end' });
    }
  };

  // Socket setup
  useEffect(() => {
    socket = io(ENDPOINT);
    socket.emit("setup", user);
    socket.on("connected", () => setSocketConnected(true));
    socket.on("typing", () => setIsTyping(true));
    socket.on("stop typing", () => setIsTyping(false));
    
    // Listen for online/offline status
    socket.on("user online", (userId) => {
      setOnlineUsers(prev => ({ ...prev, [userId]: true }));
    });
    
    socket.on("user offline", ({ userId, lastSeen }) => {
      setOnlineUsers(prev => ({ ...prev, [userId]: false }));
    });
    
    // Listen for read status updates
    socket.on("messages read status", ({ chatId, userId, messageIds }) => {
      if (selectedChat && selectedChat._id === chatId) {
        setMessages(prevMessages =>
          prevMessages.map(msg => {
            if (messageIds.includes(msg._id) && !msg.readBy.includes(userId)) {
              return { ...msg, readBy: [...msg.readBy, userId] };
            }
            return msg;
          })
        );
      }
    });
    
    // eslint-disable-next-line
  }, []);

  useEffect(() => {
    fetchMessages();
    selectedChatCompare = selectedChat;
    // eslint-disable-next-line
  }, [selectedChat]);

  useEffect(() => {
    if (!loading && messages.length > 0) {
      setTimeout(() => {
        scrollToBottom('auto');
      }, 100);
    }
  }, [messages, loading]);

  useEffect(() => {
    if (selectedChat && !loading) {
      setTimeout(() => {
        scrollToBottom('auto');
      }, 100);
    }
  }, [selectedChat]);

  const handleScroll = () => {
    if (messagesContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
      setShowScrollButton(!isNearBottom);
    }
  };

  useEffect(() => {
    socket.on("message recieved", (newMessageRecieved) => {
      if (
        !selectedChatCompare ||
        selectedChatCompare._id !== newMessageRecieved.chat._id
      ) {
        if (!notification.includes(newMessageRecieved)) {
          setNotification([newMessageRecieved, ...notification]);
          setFetchAgain(!fetchAgain);
        }
      } else {
        setMessages([...messages, newMessageRecieved]);
        // Auto mark as read if chat is open
        markMessagesAsRead();
      }
    });
    
    socket.on("message updated", (updatedMessage) => {
      setMessages(prevMessages =>
        prevMessages.map(msg =>
          msg._id === updatedMessage._id ? updatedMessage : msg
        )
      );
    });
  });

  const typingHandler = (e) => {
    setNewMessage(e.target.value);

    if (!socketConnected) return;

    if (!typing) {
      setTyping(true);
      socket.emit("typing", selectedChat._id);
    }
    let lastTypingTime = new Date().getTime();
    var timerLength = 3000;
    setTimeout(() => {
      var timeNow = new Date().getTime();
      var timeDiff = timeNow - lastTypingTime;
      if (timeDiff >= timerLength && typing) {
        socket.emit("stop typing", selectedChat._id);
        setTyping(false);
      }
    }, timerLength);
  };

  // Get online status
  const getOnlineStatus = () => {
    if (selectedChat && !selectedChat.isGroupChat) {
      const otherUser = selectedChat.users.find(u => u._id !== user._id);
      return onlineUsers[otherUser._id];
    }
    return false;
  };

  return (
    <>
      {selectedChat ? (
        <Box
          display="flex"
          flexDir="column"
          h="100%"
          w="100%"
        >
          {/* Header */}
          <Box
            fontSize={{ base: "28px", md: "30px" }}
            pb={3}
            px={2}
            fontFamily="Work sans"
            display="flex"
            justifyContent={{ base: "space-between" }}
            alignItems="center"
            flexShrink={0}
          >
            <HStack>
              <IconButton
                display={{ base: "flex", md: "none" }}
                icon={<ArrowBackIcon />}
                onClick={() => setSelectedChat("")}
                aria-label="Go back"
              />
              <Box>
                <Text>
                  {!selectedChat.isGroupChat ? (
                    getSender(user, selectedChat.users)
                  ) : (
                    selectedChat.chatName.toUpperCase()
                  )}
                </Text>
                {!selectedChat.isGroupChat && (
                  <Text fontSize="xs" color="gray.500">
                    {getOnlineStatus() ? (
                      <Badge colorScheme="green">Online</Badge>
                    ) : (
                      "Offline"
                    )}
                  </Text>
                )}
              </Box>
            </HStack>
            {messages &&
              (!selectedChat.isGroupChat ? (
                <ProfileModal
                  user={getSenderFull(user, selectedChat.users)}
                />
              ) : (
                <UpdateGroupChatModal
                  fetchMessages={fetchMessages}
                  fetchAgain={fetchAgain}
                  setFetchAgain={setFetchAgain}
                />
              ))}
          </Box>

          {/* Messages Container */}
          <Box
            display="flex"
            flexDir="column"
            justifyContent="flex-end"
            p={3}
            bg="#E8E8E8"
            flex={1}
            borderRadius="lg"
            overflowY="hidden"
            minH={0}
          >
            {loading ? (
              <Spinner
                size="xl"
                w={20}
                h={20}
                alignSelf="center"
                margin="auto"
              />
            ) : (
              <Box 
                ref={messagesContainerRef}
                flex={1} 
                overflowY="auto" 
                position="relative"
                onScroll={handleScroll}
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
                <ScrollableChat 
                  messages={messages} 
                  onReply={handleReply}
                  onEdit={handleEdit}
                  currentUser={user}
                />
                
                <div ref={messagesEndRef} />
                
                {showScrollButton && (
                  <IconButton
                    position="absolute"
                    bottom="20px"
                    right="20px"
                    size="md"
                    colorScheme="blue"
                    borderRadius="full"
                    boxShadow="lg"
                    onClick={() => scrollToBottom('smooth')}
                    aria-label="Scroll to bottom"
                    icon={<Text fontSize="lg">↓</Text>}
                    _hover={{ transform: "scale(1.1)" }}
                    transition="all 0.2s ease"
                  />
                )}
              </Box>
            )}
          </Box>

          {/* Input Container */}
          <Box p={3} bg="white" flexShrink={0}>
            {replyingTo && (
              <Box
                bg="blue.50"
                p={2}
                borderRadius="md"
                mb={2}
                borderLeft="3px solid"
                borderLeftColor="blue.400"
              >
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Box>
                    <Text fontSize="sm" fontWeight="bold" color="blue.600">
                      Replying to {replyingTo.sender.name}
                    </Text>
                    <Text fontSize="xs" color="gray.600" noOfLines={1}>
                      {replyingTo.content}
                    </Text>
                  </Box>
                  <IconButton
                    size="sm"
                    icon={<Text>×</Text>}
                    onClick={cancelReply}
                    aria-label="Cancel reply"
                  />
                </Box>
              </Box>
            )}

            {editingMessage && (
              <Box
                bg="yellow.50"
                p={2}
                borderRadius="md"
                mb={2}
                borderLeft="3px solid"
                borderLeftColor="yellow.400"
              >
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <HStack>
                    <Text fontSize="sm" fontWeight="bold" color="yellow.600">
                      ✏️ Editing message
                    </Text>
                    <Text fontSize="xs" color="yellow.500">
                      Press Enter to save, or click × to cancel
                    </Text>
                  </HStack>
                  <IconButton
                    size="sm"
                    icon={<Text>×</Text>}
                    onClick={cancelReply}
                    aria-label="Cancel edit"
                    colorScheme="yellow"
                    variant="ghost"
                  />
                </Box>
              </Box>
            )}

            {showFileUpload && (
              <Box mb={3}>
                <FileUpload
                  onFilesSelect={handleFilesSelect}
                  onRemoveFile={handleRemoveFile}
                  selectedFiles={selectedFiles}
                />
              </Box>
            )}

            <FormControl id="message-input" isRequired>
              {istyping && (
                <Box mb={2} ml={0}>
                  <Spinner size="sm" color="blue.500" />
                  <Text fontSize="xs" color="gray.500" ml={2} display="inline">
                    typing...
                  </Text>
                </Box>
              )}

              <HStack spacing={2}>
                <Input
                  variant="filled"
                  bg="#E0E0E0"
                  placeholder={
                    editingMessage 
                      ? "Edit your message..." 
                      : replyingTo 
                      ? `Reply to ${replyingTo.sender.name}...` 
                      : "Enter a message.."
                  }
                  value={newMessage}
                  onChange={typingHandler}
                  onKeyDown={sendMessage}
                  onPaste={handlePaste}
                  disabled={uploading}
                />
                <Button
                  size="md"
                  colorScheme="blue"
                  variant="ghost"
                  onClick={() => setShowFileUpload(!showFileUpload)}
                  aria-label="Attach files"
                >
                  📎
                </Button>
                {(newMessage || selectedFiles.length > 0) && (
                  <Button
                    size="md"
                    colorScheme="blue"
                    onClick={() => sendMessage({ key: "Enter" })}
                    isLoading={uploading}
                    loadingText="Sending..."
                  >
                    Send
                  </Button>
                )}
              </HStack>
            </FormControl>
          </Box>
        </Box>
      ) : (
        <Box display="flex" alignItems="center" justifyContent="center" h="100%" bg="gray.50" borderRadius="lg">
          <Text fontSize="3xl" pb={3} fontFamily="Work sans">
            Click on a user to start chatting
          </Text>
        </Box>
      )}
    </>
  );
};

export default SingleChat;
