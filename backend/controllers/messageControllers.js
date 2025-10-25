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
      });
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

  // Prepare files array
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
    files: filesArray
  };

  // Add replyTo if provided
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

  // Find the message
  const message = await Message.findById(messageId);

  if (!message) {
    res.status(404);
    throw new Error("Message not found");
  }

  // Check if user is the sender
  if (message.sender.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error("User not authorized to edit this message");
  }

  // Update the message
  message.content = content;
  message.isEdited = true;
  message.editedAt = Date.now();

  const updatedMessage = await message.save();

  // Populate fields
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

  // Check if user is the sender
  if (message.sender.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error("User not authorized to delete this message");
  }

  await message.remove();
  res.json({ message: "Message deleted successfully" });
});

module.exports = { allMessages, sendMessage, editMessage, deleteMessage };
