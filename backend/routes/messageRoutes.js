const express = require("express");
const {
  allMessages,
  sendMessage,
  editMessage,
  deleteMessage
} = require("../controllers/messageControllers");
const { protect } = require("../middleware/authMiddleware");
const upload = require("../config/multerConfig");

const router = express.Router();

// Get all messages for a chat
router.route("/:chatId").get(protect, allMessages);

// Send message with file uploads (support multiple files)
router.route("/").post(protect, upload.array('files', 5), sendMessage);

// Edit message
router.route("/:messageId").put(protect, editMessage);

// Delete message
router.route("/:messageId").delete(protect, deleteMessage);

module.exports = router;
