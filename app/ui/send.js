'use client';
import { useEffect, useRef, useState } from "react";
import io from "socket.io-client";

let socket;

export default function Home() {
    const [messages, setMessages] = useState([]);
    const [inputMessage, setInputMessage] = useState("");
    const pcRef = useRef(null);
    const dataChannelRef = useRef(null);

    useEffect(() => {
        // الاتصال بخادم Socket.io
        socket = io("https://localhostessa.giize.com:3001");
        startConnection();
        // تنظيف عند فصل المكون
        return () => {
            socket.disconnect();
        };
    }, []);

    const startConnection = async () => {
        if (pcRef.current) return; // منع إعادة التهيئة إذا كان الاتصال موجودًا بالفعل

        // إنشاء RTCPeerConnection
        pcRef.current = new RTCPeerConnection({
            iceServers: [
                {
                  urls: "stun:stun.relay.metered.ca:80",
                },
                {
                  urls: "turn:global.relay.metered.ca:80",
                  username: "9cba688aa082b8e8f4b67294",
                  credential: "6ciMJec/WcPpRrYb",
                },
                {
                  urls: "turn:global.relay.metered.ca:80?transport=tcp",
                  username: "9cba688aa082b8e8f4b67294",
                  credential: "6ciMJec/WcPpRrYb",
                },
                {
                  urls: "turn:global.relay.metered.ca:443",
                  username: "9cba688aa082b8e8f4b67294",
                  credential: "6ciMJec/WcPpRrYb",
                },
                {
                  urls: "turns:global.relay.metered.ca:443?transport=tcp",
                  username: "9cba688aa082b8e8f4b67294",
                  credential: "6ciMJec/WcPpRrYb",
                },
            ],
        });

        // إدارة المرشحين (ICE candidates)
        pcRef.current.onicecandidate = (event) => {
            if (event.candidate) {
                console.log("Sending ICE candidate:", event.candidate);
                socket.emit("ice-candidate", event.candidate);
            }
        };

        // إنشاء قناة البيانات
        dataChannelRef.current = pcRef.current.createDataChannel("myDataChannel");

        dataChannelRef.current.onopen = () => {
            console.log('Data channel is open on sender');
        };

        dataChannelRef.current.onclose = () => {
            console.log('Data channel is closed on sender');
        };

        dataChannelRef.current.onmessage = (event) => {
            console.log("Message received on sender:", event.data);
            setMessages((prevMessages) => [...prevMessages, `Received: ${event.data}`]);
        };

        // استقبال العرض (Offer)
        socket.on("offer", async (offer) => {
            console.log("Offer received:", offer);
            await pcRef.current.setRemoteDescription(new RTCSessionDescription(offer));

            const answer = await pcRef.current.createAnswer();
            await pcRef.current.setLocalDescription(answer);

            console.log("Answer sent:", answer);
            socket.emit("answer", answer);
        });

        // استقبال الإجابة (Answer)
        socket.on("answer", async (answer) => {
            console.log("Answer received:", answer);
            await pcRef.current.setRemoteDescription(new RTCSessionDescription(answer));
        });

        // استقبال مرشح (ICE candidate)
        socket.on("ice-candidate", async (candidate) => {
            console.log("ICE candidate received:", candidate);
            await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
        });

        // إنشاء عرض (Offer)
        const offer = await pcRef.current.createOffer();
        await pcRef.current.setLocalDescription(offer);

        console.log("Offer sent:", offer);
        socket.emit("offer", offer);

        // استقبال قناة البيانات على الطرف الآخر
        pcRef.current.ondatachannel = (event) => {
            console.log("Data channel received:", event.channel);
            dataChannelRef.current = event.channel;

            dataChannelRef.current.onopen = () => {
                console.log("Data channel is open on receiver");
            };

            dataChannelRef.current.onmessage = (event) => {
                console.log("Message received on receiver:", event.data);
                setMessages((prevMessages) => [...prevMessages, `Received: ${event.data}`]);
            };
        };
    };

    const sendMessage = () => {
        if (dataChannelRef.current && dataChannelRef.current.readyState === "open") {
            console.log("Sending message:", inputMessage);
            dataChannelRef.current.send(inputMessage);
            setMessages((prevMessages) => [...prevMessages, `Sent: ${inputMessage}`]);
            setInputMessage('');
        } else {
            console.warn("Data channel is not open");
        }
    };

    return (
        <div style={{ padding: "20px", fontFamily: "Arial, sans-serif" }}>
            <h1>WebRTC Chat</h1>
            <button onClick={startConnection} style={{ marginBottom: "20px", padding: "10px" }}>
                Start Connection
            </button>
            <div>
                <input
                    type="text"
                    placeholder="Enter your message"
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    style={{
                        padding: "10px",
                        width: "70%",
                        marginRight: "10px",
                        border: "1px solid #ccc",
                        borderRadius: "5px",
                    }}
                />
                <button onClick={sendMessage} style={{ padding: "10px" }}>
                    Send
                </button>
            </div>
            <div style={{ marginTop: "20px", border: "1px solid #ccc", padding: "10px", borderRadius: "5px" }}>
                <h3>Messages:</h3>
                {messages.map((msg, index) => (
                    <p key={index} style={{ margin: "5px 0" }}>{msg}</p>
                ))}
            </div>
        </div>
    );
}
