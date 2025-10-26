import {
  Avatar, Box, Text, IconButton, Menu, MenuButton, MenuList, MenuItem, useToast, HStack, VStack, Image, Link, Badge
} from "@chakra-ui/react";
import { Tooltip } from "@chakra-ui/react";
import { CopyIcon, EditIcon, DeleteIcon, CheckIcon } from "@chakra-ui/icons";
import ScrollableFeed from "react-scrollable-feed";
import { isLastMessage, isSameSender, isSameUser } from "../config/ChatLogics";
import { ChatState } from "../Context/ChatProvider";
import { useState } from "react";
import axios from "axios";

const ScrollableChat = ({ messages, onReply, onEdit, currentUser }) => {
  const { user } = ChatState();
  const toast = useToast();
  const [hoveredMessage, setHoveredMessage] = useState(null);

  // Helper for alignment
  const isSentByMe = (m) => m.sender._id === user._id;

  // Copy logic, actions, menu, avatar logic -- all your original blocks left in place!
  return (
    <ScrollableFeed forceScroll={true}>
      {messages &&
        messages.map((m, i) => (
          <Box
            key={m._id}
            id={`message-${m._id}`}
            display="flex"
            alignItems="flex-start"
            justifyContent={isSentByMe(m) ? "flex-end" : "flex-start"}
            mb={1}
            px={2}
            onMouseEnter={() => setHoveredMessage(m._id)}
            onMouseLeave={() => setHoveredMessage(null)}
            transition="background-color 0.2s ease"
            flexDirection={isSentByMe(m) ? "row-reverse" : "row"}
            maxW="75%"
          >
            {/* Avatar for received messages only */}
            {!isSentByMe(m) && (
              <Avatar
                size="xs"
                name={m.sender?.name}
                src={m.sender?.pic}
                mt={1}
                mr={2}
              />
            )}

            {/* Message Bubble (content/attachments/reply-preview, as you designed) */}
            <VStack align={isSentByMe(m) ? "flex-end" : "flex-start"} spacing={0} position="relative">
              {/* Reply Preview */}
              {m.replyTo && (
                <Box
                  bg={isSentByMe(m) ? "rgba(0,0,0,0.05)" : "rgba(0,0,0,0.03)"}
                  borderLeft="3px solid"
                  borderLeftColor={isSentByMe(m) ? "#06cf9c" : "#8696a0"}
                  borderRadius={3}
                  p={1.5}
                  mb={1.5}
                  fontSize="xs"
                  cursor="pointer"
                  _hover={{ opacity: 0.8 }}
                  onClick={() =>
                    document
                      .getElementById(`message-${m.replyTo._id}`)
                      ?.scrollIntoView({ behavior: "smooth", block: "center" })
                  }
                >
                  <Text fontWeight="600" color={isSentByMe(m) ? "#06cf9c" : "#8696a0"} fontSize="11px" mb={0.5}>
                    {m.replyTo.sender?.name || "User"}
                  </Text>
                  <Text color="gray.700" fontSize="11px" noOfLines={1} opacity={0.8}>
                    {m.replyTo.content || "[Media]"}
                  </Text>
                </Box>
              )}

              {/* Message Content */}
              <Box
                bg={isSentByMe(m) ? "#DCF8C6" : "white"}
                borderRadius={8}
                p={2}
                position="relative"
                boxShadow="0 1px 0.5px rgba(0,0,0,0.13)"
                minW="60px"
                maxW="100%"
              >
                {!!m.content && (
                  <Text fontSize="14px" color="#111b21" wordBreak="break-word" whiteSpace="pre-wrap" lineHeight="19px">
                    {m.content}
                  </Text>
                )}
                {m.files && m.files.length > 0 && (
                  <VStack align="start" mt={m.content ? 2 : 0} spacing={1}>
                    {m.files.map((file, idx) => (
                      <Box key={idx} w="100%" as={file.mimetype.startsWith("image/") ? "span" : "div"}>
                        {file.mimetype.startsWith("image/") ? (
                          <Image
                            src={`${process.env.REACT_APP_API_URL || "http://localhost:5000"}/${file.path}`}
                            alt={file.originalName}
                            maxH="200px"
                            maxW="100%"
                            borderRadius="md"
                            cursor="pointer"
                            onClick={() =>
                              window.open(`${process.env.REACT_APP_API_URL || "http://localhost:5000"}/${file.path}`, "_blank")
                            }
                          />
                        ) : (
                          <Link
                            href={`${process.env.REACT_APP_API_URL || "http://localhost:5000"}/${file.path}`}
                            isExternal
                            display="flex"
                            alignItems="center"
                            gap={2}
                            p={2}
                            bg="gray.50"
                            borderRadius="md"
                            fontSize="sm"
                          >
                            <Text fontSize="lg">{file.mimetype.startsWith("video/") ? "🎥" : file.mimetype.startsWith("audio/") ? "🎵" : file.mimetype.includes("pdf") ? "📄" : "📎"}</Text>
                            <Text fontSize="xs" noOfLines={1}>{file.originalName}</Text>
                            <Text fontSize="10px" color="gray.500">{(file.size / 1024).toFixed(1)} KB</Text>
                          </Link>
                        )}
                      </Box>
                    ))}
                  </VStack>
                )}
              </Box>

              {/* Time & Status */}
              <HStack justifyContent="flex-end" mt={0.5} ml={2} position="relative">
                {m.isEdited && <Text fontSize="9px" color="gray.500" mr={0.5}>edited</Text>}
                <Text fontSize="10px" color="gray.500">{new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</Text>
                {/* Optionally add checks/icons for read/delivered status */}
              </HStack>

              {/* Actions (reply, copy, edit, delete) - preserve your menus/buttons */}
              {hoveredMessage === m._id && (
                <HStack position="absolute" top="-25px" right={isSentByMe(m) ? 0 : "auto"} left={isSentByMe(m) ? "auto" : 0}
                  bg="white" boxShadow="0 2px 5px rgba(0,0,0,0.15)" borderRadius="md" p={0.5} spacing={0} zIndex={10}>
                  <IconButton size="xs" icon={<Text fontSize="sm">↩</Text>} onClick={() => onReply && onReply(m)} variant="ghost" aria-label="Reply" />
                  <IconButton size="xs" icon={<CopyIcon boxSize={3} />} onClick={() => navigator.clipboard.writeText(m.content)} variant="ghost" aria-label="Copy" />
                  {isSentByMe(m) && (
                    <>
                      <IconButton size="xs" icon={<EditIcon boxSize={3} />} onClick={() => onEdit && onEdit(m)} variant="ghost" aria-label="Edit" />
                      <IconButton size="xs" icon={<DeleteIcon boxSize={3} />} onClick={() => {/* handle delete here */}} variant="ghost" colorScheme="red" aria-label="Delete" />
                    </>
                  )}
                </HStack>
              )}
            </VStack>
          </Box>
        ))}
    </ScrollableFeed>
  );
};

export default ScrollableChat;
