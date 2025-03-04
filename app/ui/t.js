"use client"; // تأكد من استخدام هذا الديكوراتيف
import { useEffect, useState } from 'react';
import io from 'socket.io-client';

let socket;

export default function Chat() {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    // Initialize the Socket.io connection
    socket = io("/api/socket");

    // Listen for incoming messages from the server
    socket.on('message', (msg) => {
      setMessages((prevMessages) => [...prevMessages, msg]);
    });

    // Cleanup when component unmounts
    return () => socket.disconnect();
  }, []);

  const sendMessage = () => {
    if (message.trim()) {
      // Emit the message to the server
      socket.emit('message', message);
      setMessage(''); // Clear the input field after sending the message
    }
  };

  return (
    <div>
      <h1>Real-Time Chat</h1>
      <div>
        {messages.map((msg, index) => (
          <p key={index}>{msg}</p>
        ))}
      </div>
      <input
        type="text"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Type a message..."
      />
      <button onClick={sendMessage}>Send</button>
    </div>
  );
}