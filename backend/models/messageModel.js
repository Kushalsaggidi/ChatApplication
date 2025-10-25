const mongoose = require("mongoose");

const messageSchema = mongoose.Schema(
  {
    sender: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    content: { type: String, trim: true },
    chat: { type: mongoose.Schema.Types.ObjectId, ref: "Chat" },
    readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    replyTo: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "Message",
      default: null 
    },
    reactions: [{
      user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      emoji: { type: String, required: true }
    }],
    isEdited: { type: Boolean, default: false },
    editedAt: { type: Date }
  },
  { timestamps: true }
);

const Message = mongoose.model("Message", messageSchema);
module.exports = Message;
