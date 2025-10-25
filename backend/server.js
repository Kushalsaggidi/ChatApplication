const express = require("express");
const connectDB = require("./config/db");
const dotenv = require("dotenv");
const cors = require("cors");
const userRoutes = require("./routes/userRoutes");
const chatRoutes = require("./routes/chatRoutes");
const messageRoutes = require("./routes/messageRoutes");
const { notFound, errorHandler } = require("./middleware/errorMiddleware");
const path = require("path");
const User = require("./models/userModel");

dotenv.config();
connectDB();
const app = express();

// CORS Configuration
const corsOptions = {
  origin: [
    "http://localhost:3000",
    "https://chat-application-7f7f.vercel.app",
    "https://chat-application-t3n2.vercel.app",
    "https://chat-application.vercel.app"
  ],
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.use(express.json());

// Serve static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use("/api/user", userRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/message", messageRoutes);

// Deployment
const __dirname1 = path.resolve();

if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname1, "/frontend/build")));

  app.get("*", (req, res) =>
    res.sendFile(path.resolve(__dirname1, "frontend", "build", "index.html"))
  );
} else {
  app.get("/", (req, res) => {
    res.send("API is running..");
  });
}

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

const server = app.listen(
  PORT,
  console.log(`Server running on PORT ${PORT}...`)
);

const io = require("socket.io")(server, {
  pingTimeout: 60000,
  cors: {
    origin: [
      "http://localhost:3000",
      "https://chat-application-7f7f.vercel.app",
      "https://chat-application-t3n2.vercel.app",
      "https://chat-application.vercel.app"
    ],
    credentials: true
  },
});

io.on("connection", (socket) => {
  console.log("Connected to socket.io");

  // User setup and online status
  socket.on("setup", async (userData) => {
    socket.join(userData._id);
    socket.emit("connected");
    
    // Mark user as online
    await User.findByIdAndUpdate(userData._id, {
      isOnline: true,
      socketId: socket.id
    });
    
    // Broadcast online status
    socket.broadcast.emit("user online", userData._id);
  });

  socket.on("join chat", (room) => {
    socket.join(room);
    console.log("User Joined Room: " + room);
  });

  socket.on("typing", (room) => socket.in(room).emit("typing"));
  socket.on("stop typing", (room) => socket.in(room).emit("stop typing"));

  socket.on("new message", (newMessageReceived) => {
    var chat = newMessageReceived.chat;

    if (!chat.users) return console.log("chat.users not defined");

    chat.users.forEach((user) => {
      if (user._id == newMessageReceived.sender._id) return;
      socket.in(user._id).emit("message recieved", newMessageReceived);
    });
  });

  // Message delivered event
  socket.on("message delivered", ({ messageId, userId }) => {
    socket.broadcast.emit("message delivery status", { messageId, userId });
  });

  // Message read event
  socket.on("messages read", ({ chatId, userId, messageIds }) => {
    socket.broadcast.emit("messages read status", { chatId, userId, messageIds });
  });

  // Message edited event
  socket.on("message edited", (editedMessage) => {
    var chat = editedMessage.chat;

    if (!chat.users) return console.log("chat.users not defined");

    chat.users.forEach((user) => {
      socket.in(user._id).emit("message updated", editedMessage);
    });
  });

  // User disconnection
  socket.on("disconnect", async () => {
    console.log("USER DISCONNECTED");
    
    // Find user by socket ID and mark as offline
    const user = await User.findOne({ socketId: socket.id });
    if (user) {
      await User.findByIdAndUpdate(user._id, {
        isOnline: false,
        lastSeen: new Date(),
        socketId: null
      });
      
      // Broadcast offline status
      socket.broadcast.emit("user offline", { 
        userId: user._id, 
        lastSeen: new Date() 
      });
    }
  });
});
