// server.js
const { createServer } = require("http");
const { Server }   =require("socket.io");
const next = require('next');

const dev = process.env.NODE_ENV !== "production";
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    handle(req, res); // تعامل مع طلبات Next.js
  });
  const io = new Server(httpServer);
  const users = new Map();

  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);
  
    // تسجيل اسم المستخدم عند الاتصال
    socket.on("register", (username) => {
      socket.username = username;
      users.set(username, socket.id); // تخزين الاسم و socket.id
      console.log(`User registered: ${username} - ${socket.id}`);
    });
  
    // استقبال طلب الاتصال وإرساله إلى المستخدم الهدف
    socket.on("call-user", ({ targetUser, offer, username_get }) => {
      const targetSocketId = users.get(targetUser);
      const mySocketId = users.get(username_get);
      if (targetSocketId) {
        console.log(`Sending offer to ${targetUser} (${targetSocketId})`);
        io.to(targetSocketId).emit("incoming-call", { offer, caller: socket.username });
      } else {
        // console.error(`User ${username_get} not found.`);
        io.to(mySocketId).emit("not-found",{targetUser});
      }
    });
  
    // استقبال رد المستخدم الهدف (قبول أو رفض)
    socket.on("call-response", ({ caller, response, answer }) => {
      const callerSocketId = users.get(caller);
      if (callerSocketId) {
        if (response === "accepted") {
          console.log(`Call accepted by ${caller}, sending answer to ${callerSocketId}`);
          io.to(callerSocketId).emit("call-accepted", { answer });
        } else {
          console.log(`Call rejected by ${caller}`);
          io.to(callerSocketId).emit("call-rejected");
        }
      } else {
        console.error(`User ${caller} not found.`);
      }
    });
  
    // استقبال مرشح ICE وإرساله
    socket.on("ice-candidate", ({ targetUser, candidate }) => {
      const targetSocketId = users.get(targetUser);
      if (targetSocketId) {
        io.to(targetSocketId).emit("ice-candidate", candidate);
      } else {
        console.error(`User ${targetUser} not found.`);
      }
    });
  
    //استقبال انهاء المكالمة 
    socket.on("end-call", ({ targetUser }) => {
      const targetSocketId = users.get(targetUser);
      // const mySocketId = users.get(username_get);
      if (targetSocketId) {
        console.log(`Sending offer to ${targetUser} (${targetSocketId})`);
        io.to(targetSocketId).emit("end-call");
      } else {
        console.error(`User ${targetUser}  not found.`);
        
      }
    });
  
    // التعامل مع فصل الاتصال
    socket.on("disconnect", () => {
      // حذف المستخدم من الخريطة عند قطع الاتصال
      for (let [username, id] of users.entries()) {
        if (id === socket.id) {
          users.delete(username);
          console.log(`User ${username} disconnected`);
          break;
        }
      }
    });
  });
  httpServer.listen(3000, () => {
    console.log("Server is running on http://localhost:3000");
  });
});
