const express = require("express");
const {
  allMessages,
  sendMessage,
  editMessage,
  deleteMessage,
  markMessagesAsRead,
  markMessageAsDelivered,
  addReaction
} = require("../controllers/messageControllers");
const { protect } = require("../middleware/authMiddleware");
const upload = require("../config/multerConfig");

const router = express.Router();

// Get all messages for a chat
router.route("/:chatId").get(protect, allMessages);

// Send message with file uploads
router.route("/").post(protect, upload.array('files', 5), sendMessage);

// Edit message
router.route("/:messageId").put(protect, editMessage);

// Delete message
router.route("/:messageId").delete(protect, deleteMessage);

// Mark messages as read
router.route("/:chatId/read").put(protect, markMessagesAsRead);

// Mark message as delivered
router.route("/:messageId/delivered").put(protect, markMessageAsDelivered);

// Add reaction to message
router.route("/:messageId/reaction").post(protect, addReaction);

module.exports = router;
