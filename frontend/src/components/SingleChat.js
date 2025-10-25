import { FormControl } from "@chakra-ui/react";
import { Input } from "@chakra-ui/react";
import { Box, Text } from "@chakra-ui/react";
import "./styles.css";
import { IconButton, Spinner, useToast } from "@chakra-ui/react";
import { getSender, getSenderFull } from "../config/ChatLogics";
import { useEffect, useState } from "react";
import axios from "axios";
import { ArrowBackIcon } from "@chakra-ui/icons";
import ProfileModal from "./miscellaneous/ProfileModal";
import ScrollableChat from "./ScrollableChat";
import animationData from "../animations/typing.json";

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
  const toast = useToast();

  const defaultOptions = {
    loop: true,
    autoplay: true,
    animationData: animationData,
    rendererSettings: {
      preserveAspectRatio: "xMidYMid slice",
    },
  };

  const { selectedChat, setSelectedChat, user, notification, setNotification } =
    ChatState();

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
    } catch (error) {
      toast({
        title: "Error Occured!",
        description: "Failed to Load the Messages",
        status: "error",
        duration: 5000,
        isClosable: true,
        position: "bottom",
      });
    }
  };

  const sendMessage = async (event) => {
    if (event.key === "Enter" && newMessage) {
      socket.emit("stop typing", selectedChat._id);
      try {
        const config = {
          headers: {
            "Content-type": "application/json",
            Authorization: `Bearer ${user.token}`,
          },
        };
        
        const messageContent = newMessage;
        setNewMessage("");
        setReplyingTo(null);
        setEditingMessage(null);
        
        const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";
        const { data } = await axios.post(
          `${API_URL}/api/message`,
          {
            content: messageContent,
            chatId: selectedChat,
            replyTo: replyingTo?._id || null,
          },
          config
        );
        socket.emit("new message", data);
        setMessages([...messages, data]);
      } catch (error) {
        toast({
          title: "Error Occurred!",
          description: "Failed to send the Message",
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
  };

  useEffect(() => {
    socket = io(ENDPOINT);
    socket.emit("setup", user);
    socket.on("connected", () => setSocketConnected(true));
    socket.on("typing", () => setIsTyping(true));
    socket.on("stop typing", () => setIsTyping(false));

    // eslint-disable-next-line
  }, []);

  useEffect(() => {
    fetchMessages();

    selectedChatCompare = selectedChat;
    // eslint-disable-next-line
  }, [selectedChat]);

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
      }
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
          <Text
            fontSize={{ base: "28px", md: "30px" }}
            pb={3}
            px={2}
            fontFamily="Work sans"
            display="flex"
            justifyContent={{ base: "space-between" }}
            alignItems="center"
            flexShrink={0}
          >
            <IconButton
              display={{ base: "flex", md: "none" }}
              icon={<ArrowBackIcon />}
              onClick={() => setSelectedChat("")}
              aria-label="Go back"
            />
            {messages &&
              (!selectedChat.isGroupChat ? (
                <>
                  {getSender(user, selectedChat.users)}
                  <ProfileModal
                    user={getSenderFull(user, selectedChat.users)}
                  />
                </>
              ) : (
                <>
                  {selectedChat.chatName.toUpperCase()}
                  <UpdateGroupChatModal
                    fetchMessages={fetchMessages}
                    fetchAgain={fetchAgain}
                    setFetchAgain={setFetchAgain}
                  />
                </>
              ))}
          </Text>

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
              <div className="messages" style={{ flex: 1, overflowY: "auto" }}>
                <ScrollableChat 
                  messages={messages} 
                  onReply={handleReply}
                  onEdit={handleEdit}
                />
              </div>
            )}
          </Box>

          {/* Input Container */}
          <Box p={3} bg="white" flexShrink={0}>
            {/* Reply Preview */}
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

            {/* Edit Mode */}
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
                  <Text fontSize="sm" fontWeight="bold" color="yellow.600">
                    Editing message
                  </Text>
                  <IconButton
                    size="sm"
                    icon={<Text>×</Text>}
                    onClick={cancelReply}
                    aria-label="Cancel edit"
                  />
                </Box>
              </Box>
            )}

            <FormControl id="message-input" isRequired>
              {istyping && (
                <Box mb={2} ml={0}>
                  <Spinner size="sm" color="blue.500" />
                </Box>
              )}

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
              />
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
