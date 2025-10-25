const express = require("express");
const {
  allMessages,
  sendMessage,
  addReaction,
  removeReaction,
  editMessage,
  deleteMessage,
} = require("../controllers/messageControllers");
const { protect } = require("../middleware/authMiddleware");
const multer = require("multer");

const router = express.Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

router.route("/:chatId").get(protect, allMessages);
router.route("/").post(protect, upload.array('files', 5), sendMessage);
router.route("/:messageId/reaction").post(protect, addReaction);
router.route("/:messageId/reaction").delete(protect, removeReaction);
router.route("/:messageId").put(protect, editMessage);
router.route("/:messageId").delete(protect, deleteMessage);

module.exports = router;
