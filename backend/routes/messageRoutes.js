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

const router = express.Router();

router.route("/:chatId").get(protect, allMessages);
router.route("/").post(protect, sendMessage);
router.route("/:messageId/reaction").post(protect, addReaction);
router.route("/:messageId/reaction").delete(protect, removeReaction);
router.route("/:messageId").put(protect, editMessage);
router.route("/:messageId").delete(protect, deleteMessage);

module.exports = router;
