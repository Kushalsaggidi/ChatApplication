const asyncHandler = require("express-async-handler");
const Message = require("../models/messageModel");
const User = require("../models/userModel");
const Chat = require("../models/chatModel");

const allMessages = asyncHandler(async (req, res) => {
  try {
    const messages = await Message.find({ chat: req.params.chatId })
      .populate("sender", "name pic email")
      .populate("chat")
      .populate("replyTo")
      .populate({
        path: "replyTo",
        populate: {
          path: "sender",
          select: "name pic"
        }
      })
      .populate("readBy", "name pic email")
      .populate("deliveredTo", "name pic email");
    res.json(messages);
  } catch (error) {
    res.status(400);
    throw new Error(error.message);
  }
});

const sendMessage = asyncHandler(async (req, res) => {
  const { content, chatId, replyTo } = req.body;

  if ((!content || content.trim() === "") && (!req.files || req.files.length === 0)) {
    console.log("Invalid data passed into request");
    return res.sendStatus(400);
  }

  let filesArray = [];
  if (req.files && req.files.length > 0) {
    filesArray = req.files.map(file => ({
      filename: file.filename,
      originalName: file.originalname,
      path: file.path,
      mimetype: file.mimetype,
      size: file.size
    }));
  }

  var newMessage = {
    sender: req.user._id,
    content: content || "",
    chat: chatId,
    files: filesArray,
    deliveredTo: [req.user._id] // Mark as delivered to sender
  };

  if (replyTo) {
    newMessage.replyTo = replyTo;
  }

  try {
    var message = await Message.create(newMessage);

    message = await message.populate("sender", "name pic");
    message = await message.populate("chat");
    message = await message.populate("replyTo");
    message = await User.populate(message, {
      path: "chat.users",
      select: "name pic email",
    });

    await Chat.findByIdAndUpdate(chatId, { latestMessage: message });

    res.json(message);
  } catch (error) {
    res.status(400);
    throw new Error(error.message);
  }
});

const editMessage = asyncHandler(async (req, res) => {
  const { messageId } = req.params;
  const { content } = req.body;

  if (!content || content.trim() === "") {
    res.status(400);
    throw new Error("Message content cannot be empty");
  }

  const message = await Message.findById(messageId);

  if (!message) {
    res.status(404);
    throw new Error("Message not found");
  }

  if (message.sender.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error("User not authorized to edit this message");
  }

  message.content = content;
  message.isEdited = true;
  message.editedAt = Date.now();

  const updatedMessage = await message.save();

  const populatedMessage = await Message.findById(updatedMessage._id)
    .populate("sender", "name pic")
    .populate("chat")
    .populate("replyTo");

  res.json(populatedMessage);
});

const deleteMessage = asyncHandler(async (req, res) => {
  const { messageId } = req.params;

  const message = await Message.findById(messageId);

  if (!message) {
    res.status(404);
    throw new Error("Message not found");
  }

  if (message.sender.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error("User not authorized to delete this message");
  }

  await message.remove();
  res.json({ message: "Message deleted successfully" });
});

// NEW: Mark messages as read
const markMessagesAsRead = asyncHandler(async (req, res) => {
  const { chatId } = req.params;
  const userId = req.user._id;

  try {
    // Find all messages in the chat that haven't been read by this user
    const messages = await Message.find({
      chat: chatId,
      sender: { $ne: userId }, // Not sent by this user
      readBy: { $ne: userId }   // Not already read by this user
    });

    // Update all unread messages
    await Message.updateMany(
      {
        chat: chatId,
        sender: { $ne: userId },
        readBy: { $ne: userId }
      },
      {
        $addToSet: { readBy: userId }
      }
    );

    res.json({ 
      success: true, 
      count: messages.length,
      messageIds: messages.map(m => m._id)
    });
  } catch (error) {
    res.status(400);
    throw new Error(error.message);
  }
});

// NEW: Mark message as delivered
const markMessageAsDelivered = asyncHandler(async (req, res) => {
  const { messageId } = req.params;
  const userId = req.user._id;

  try {
    const message = await Message.findById(messageId);

    if (!message) {
      res.status(404);
      throw new Error("Message not found");
    }

    // Add user to deliveredTo if not already there
    if (!message.deliveredTo.includes(userId)) {
      message.deliveredTo.push(userId);
      await message.save();
    }

    res.json({ success: true });
  } catch (error) {
    res.status(400);
    throw new Error(error.message);
  }
});

// NEW: Add reaction to message
const addReaction = asyncHandler(async (req, res) => {
  const { messageId } = req.params;
  const { emoji } = req.body;
  const userId = req.user._id;

  try {
    const message = await Message.findById(messageId);

    if (!message) {
      res.status(404);
      throw new Error("Message not found");
    }

    // Check if user already reacted
    const existingReaction = message.reactions.find(
      r => r.user.toString() === userId.toString()
    );

    if (existingReaction) {
      // Update existing reaction
      existingReaction.emoji = emoji;
    } else {
      // Add new reaction
      message.reactions.push({ user: userId, emoji });
    }

    await message.save();

    const populatedMessage = await Message.findById(message._id)
      .populate("sender", "name pic")
      .populate("reactions.user", "name pic");

    res.json(populatedMessage);
  } catch (error) {
    res.status(400);
    throw new Error(error.message);
  }
});

module.exports = { 
  allMessages, 
  sendMessage, 
  editMessage, 
  deleteMessage,
  markMessagesAsRead,
  markMessageAsDelivered,
  addReaction
};
