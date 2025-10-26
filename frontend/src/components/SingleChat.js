import { FormControl, Input, Box, Text, HStack, Button, IconButton, Spinner, useToast, Badge } from "@chakra-ui/react";
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
import EmojiPicker from 'emoji-picker-react';
import "./styles.css";

const ENDPOINT = process.env.REACT_APP_API_URL || "http://localhost:5000";
let socket;

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
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const messagesEndRef = useRef(null);
  const inputRef = useRef();
  const messagesContainerRef = useRef(null);
  const toast = useToast();

  const { selectedChat, setSelectedChat, user, notification, setNotification } = ChatState();

  useEffect(() => {
    socket = io(ENDPOINT);
    socket.emit("setup", user);

    socket.on("connected", () => setSocketConnected(true));
    socket.on("typing", () => setIsTyping(true));
    socket.on("stop typing", () => setIsTyping(false));
    socket.on("user online", (userId) => setOnlineUsers((prev) => ({ ...prev, [userId]: true })));
    socket.on("user offline", ({ userId }) => setOnlineUsers((prev) => ({ ...prev, [userId]: false })));

    // Real-time message receive (real-time update, no refresh)
    socket.on("message recieved", (newMessageRecieved) => {
      if (!selectedChat || selectedChat._id !== newMessageRecieved.chat._id) {
        if (!notification.some((msg) => msg._id === newMessageRecieved._id)) {
          setNotification([newMessageRecieved, ...notification]);
          setFetchAgain((prev) => !prev);
        }
      } else {
        setMessages((prev) => [...prev, newMessageRecieved]);
        scrollToBottom();
        if (inputRef.current) inputRef.current.focus(); // keep keyboard open
      }
    });

    socket.on("message updated", (updatedMessage) => {
      setMessages((prevMessages) =>
        prevMessages.map((msg) => (msg._id === updatedMessage._id ? updatedMessage : msg))
      );
    });

    return () => {
      socket.disconnect();
    };
    // eslint-disable-next-line
  }, []);

  useEffect(() => {
    if (selectedChat) fetchMessages();
    // eslint-disable-next-line
  }, [selectedChat]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  useEffect(() => {
    if (selectedChat && !loading) scrollToBottom();
  }, [selectedChat, loading]);

  const fetchMessages = async () => {
    if (!selectedChat) return;
    try {
      setLoading(true);
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      const { data } = await axios.get(
        `${ENDPOINT}/api/message/${selectedChat._id}`, config
      );
      setMessages(data);
      setLoading(false);
      socket.emit("join chat", selectedChat._id);
    } catch (error) {
      toast({
        title: "Error Occurred!",
        description: "Failed to Load the Messages",
        status: "error",
        duration: 5000,
        isClosable: true,
        position: "bottom",
      });
      setLoading(false);
    }
  };

  // Supports both enter key & send button
  const sendMessage = async (event) => {
    if (
      (event.key === "Enter" || event.type === "click") &&
      (newMessage.trim() || selectedFiles.length > 0)
    ) {
      socket.emit("stop typing", selectedChat._id);
      setUploading(true);
      try {
        const config = {
          headers: {
            Authorization: `Bearer ${user.token}`,
            "Content-Type": "multipart/form-data",
          },
        };
        const formData = new FormData();
        formData.append("content", newMessage);
        formData.append("chatId", selectedChat._id);
        if (replyingTo) formData.append("replyTo", replyingTo._id);
        selectedFiles.forEach((file) => formData.append("files", file));

        const { data } = await axios.post(`${ENDPOINT}/api/message`, formData, config);
        socket.emit("new message", data);
        setMessages((prev) => [...prev, data]);
        setNewMessage("");
        setSelectedFiles([]);
        setShowFileUpload(false);
        setReplyingTo(null);
        setShowEmojiPicker(false);
        setUploading(false);
        scrollToBottom();
        if (inputRef.current) inputRef.current.focus();
      } catch (error) {
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

  const scrollToBottom = (behavior = "smooth") => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior, block: "end" });
    }
  };

  return (
    <Box display="flex" flexDir="column" h="100%" w="100%">
      {/* Header */}
      <HStack fontSize={{ base: "28px", md: "30px" }} pb={3} px={2}
        fontFamily="Work sans"
        justifyContent="space-between" alignItems="center" flexShrink={0}>
        <IconButton
          display={{ base: "flex", md: "none" }}
          icon={<ArrowBackIcon />}
          onClick={() => setSelectedChat("")}
          aria-label="Go back"
        />
        <Text>
          {!selectedChat?.isGroupChat ? getSender(user, selectedChat?.users) : selectedChat?.chatName?.toUpperCase()}
        </Text>
        {!selectedChat?.isGroupChat &&
          (onlineUsers[getSenderFull(user, selectedChat?.users)?._id] ? (
            <Badge colorScheme="green">Online</Badge>
          ) : (
            <Text fontSize="xs" color="gray.500">Offline</Text>
          ))}
        {selectedChat?.isGroupChat && (
          <UpdateGroupChatModal fetchMessages={fetchMessages} fetchAgain={fetchAgain} setFetchAgain={setFetchAgain} />
        )}
      </HStack>

      {/* Messages Container */}
      <Box
        ref={messagesContainerRef}
        flex="1"
        overflowY="auto"
        p={3}
        bg="E8E8E8"
        borderRadius="lg"
        position="relative"
        minH="0"
        onScroll={() => {
          if (messagesContainerRef.current) {
            const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
            const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
            setShowScrollButton(!isNearBottom);
          }
        }}
        css={{
          scrollbarWidth: "thin",
          scrollbarColor: "#888 #f1f1f1",
        }}
      >
        {loading ? (
          <Spinner size="xl" w={20} h={20} alignSelf="center" margin="auto" />
        ) : (
          <>
            <ScrollableChat messages={messages} currentUser={user} onReply={setReplyingTo} onEdit={setEditingMessage} />
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
                onClick={() => scrollToBottom("smooth")}
                aria-label="Scroll to bottom"
                icon={<Text fontSize="lg">↓</Text>}
                _hover={{ transform: "scale(1.1)" }}
                transition="all 0.2s ease"
              />
            )}
          </>
        )}
      </Box>

      {/* Input Container */}
      {replyingTo &&
        <Box bg="blue.50" p={2} borderRadius="md" mb={2} borderLeft="3px solid" borderLeftColor="blue.400"
          display="flex" justifyContent="space-between" alignItems="center">
          <Text fontSize="sm" fontWeight="bold" color="blue.600">
            Replying to {replyingTo.sender?.name}
          </Text>
          <Text fontSize="xs" color="gray.600" noOfLines={1}>
            {replyingTo.content}
          </Text>
          <IconButton
            icon={<Text>×</Text>}
            size="sm"
            onClick={() => setReplyingTo(null)}
            aria-label="Cancel reply"
          />
        </Box>
      }

      <FormControl id="message-input" isRequired>
        {istyping && (
          <Box mb={2} ml={0}>
            <Spinner size="sm" color="blue.500" />
            <Text fontSize="xs" color="gray.500" ml={2} display="inline">typing...</Text>
          </Box>
        )}
        <Input
          ref={inputRef}
          variant="filled"
          bg="E0E0E0"
          placeholder="Enter a message..."
          value={newMessage}
          onChange={typingHandler}
          onKeyDown={sendMessage}
          disabled={uploading}
          autoFocus
          onFocus={() => setShowEmojiPicker(false)}
        />
        <HStack spacing={2} mt={2}>
          <IconButton
            icon={<Text fontSize="xl">😊</Text>}
            onClick={() => setShowEmojiPicker((prev) => !prev)}
            aria-label="Emoji picker"
            variant="ghost"
            colorScheme="gray"
          />
          {showEmojiPicker && (
            <Box position="absolute" bottom="70px" left="20px" zIndex={1000} boxShadow="lg" borderRadius="md">
              <EmojiPicker onEmojiClick={(emojiObject) =>
                setNewMessage((prev) => prev + emojiObject.emoji)} width={320} height={400}
                searchDisabled skinTonesDisabled
              />
            </Box>
          )}
          <IconButton
            icon={<Text fontSize="xl">📎</Text>}
            onClick={() => { setShowFileUpload((prev) => !prev); setShowEmojiPicker(false); }}
            aria-label="Attach files"
            variant="ghost"
            colorScheme="gray"
          />
          {showFileUpload && (
            <FileUpload onFilesSelect={setSelectedFiles} selectedFiles={selectedFiles} />
          )}
          <IconButton
            icon={<Text fontSize="xl">➤</Text>}
            onClick={sendMessage}
            isLoading={uploading}
            colorScheme="blue"
            aria-label="Send message"
            disabled={!newMessage && selectedFiles.length === 0}
          />
        </HStack>
      </FormControl>
    </Box>
  );
};

export default SingleChat;
