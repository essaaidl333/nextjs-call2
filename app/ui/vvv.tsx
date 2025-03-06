'use client';
import { useEffect, useRef, useState } from "react";
import io, { Socket } from "socket.io-client";

export default function Voice() {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [incomingCall, setIncomingCall] = useState<{ caller: string; offer: RTCSessionDescriptionInit } | null>(null);
  const [targetUser, setTargetUser] = useState<string>(""); // حالة لتخزين اسم المستخدم الهدف
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const peerConnection = useRef<RTCPeerConnection | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const [username_get,setuserget] = useState<string>("");

  useEffect(() => {
    const us =prompt("أدخل اسم المستخدم:");
    if(us)
     setuserget(us);
    // Initialize socket connection
    socketRef.current = io("https://localhostessa.giize.com:3001");
    socketRef.current.emit("register", us);
    console.log(`Registered as ${username_get}`);

    // Access user media (audio and video)
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices
        .getUserMedia({ audio: true, video: true })
        .then((mediaStream) => {
          setStream(mediaStream);
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = mediaStream;
          }
          console.log("Microphone access granted.");
        })
        .catch((err) => {
          console.error("Error accessing media devices:", err);
          alert("Failed to access microphone. Please check permissions.");
        });
    } else {
      console.error("getUserMedia is not supported in this browser.");
      alert("getUserMedia is not supported in your browser.");
    }

    // Socket event listeners
    const socket = socketRef.current;
    socket.on("incoming-call", handleIncomingCall);
    socket.on("call-accepted", handleCallAccepted);
    socket.on("call-rejected", handleCallRejected);
    socket.on("ice-candidate", handleICECandidate);

    // Cleanup on component unmount
    return () => {
      socket.disconnect();
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
      if (peerConnection.current) {
        peerConnection.current.close();
      }
    };
  }, []);

  const handleIncomingCall = ({ caller, offer }: { caller: string; offer: RTCSessionDescriptionInit }) => {
    setIncomingCall({ caller, offer });
  };

  const handleCallAccepted = ({ answer }: { answer: RTCSessionDescriptionInit }) => {
    if (peerConnection.current) {
      console.log("Call accepted, setting remote description:", answer);
      peerConnection.current.setRemoteDescription(new RTCSessionDescription(answer))
        .then(() => {
          console.log("Remote description set successfully.");
        })
        .catch((error) => {
          console.error("Error setting remote description:", error);
        });
    }
  };

  const handleCallRejected = () => {
    alert("Call rejected by the other user.");
    setIncomingCall(null);
  };

  const handleICECandidate = (candidate: RTCIceCandidateInit) => {
    if (peerConnection.current) {
      peerConnection.current.addIceCandidate(new RTCIceCandidate(candidate))
        .then(() => {
          console.log("ICE candidate added successfully.");
        })
        .catch((error) => {
          console.error("Error adding ICE candidate:", error);
        });
    }
  };

  const startCall = async () => {
    if (!targetUser) {
      alert("Please enter a target username to call.");
      return;
    }

    if (!peerConnection.current) {
      peerConnection.current = createPeerConnection();
    }

    if (stream) {
      stream.getTracks().forEach((track) => {
        peerConnection.current!.addTrack(track, stream);
      });
    }

    const offer = await peerConnection.current.createOffer();
    console.log("Offer created:", offer);
    await peerConnection.current.setLocalDescription(offer);
    console.log("Local description set:", peerConnection.current.localDescription);

    if (socketRef.current) {
      console.log("Sending offer to target user:", targetUser);
      socketRef.current.emit("call-user", { targetUser, offer });
    }
  };

  const acceptCall = () => {
    if (incomingCall && !peerConnection.current) {
      console.log("Accepting call from:", incomingCall.caller);

      // إنشاء اتصال PeerConnection جديد
      peerConnection.current = createPeerConnection();

      // إضافة المسار الصوتي إلى الاتصال
      if (stream) {
        stream.getTracks().forEach((track) => {
          peerConnection.current!.addTrack(track, stream);
        });
      }

      // تعيين وصف الجلسة البعيدة (Remote Description)
      peerConnection.current.setRemoteDescription(new RTCSessionDescription(incomingCall.offer))
        .then(() => {
          console.log("Remote description set successfully.");
          return peerConnection.current!.createAnswer();
        })
        .then((answer) => {
          console.log("Answer created:", answer);
          return peerConnection.current!.setLocalDescription(answer);
        })
        .then(() => {
          if (socketRef.current) {
            console.log("Sending answer to caller:", incomingCall.caller);
            socketRef.current.emit("call-response", {
              caller: incomingCall.caller,
              response: "accepted",
              answer: peerConnection.current!.localDescription,
            });
          }
        })
        .catch((error) => {
          console.error("Error accepting call:", error);
        });

      setIncomingCall(null);
    }
  };

  const rejectCall = () => {
    if (incomingCall && socketRef.current) {
      console.log("Rejecting call from:", incomingCall.caller);
      socketRef.current.emit("call-response", { caller: incomingCall.caller, response: "rejected" });
      setIncomingCall(null);
    }
  };

  const createPeerConnection = () => {
    const pc = new RTCPeerConnection({
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

    pc.onicecandidate = (event) => {
      if (event.candidate && socketRef.current && incomingCall) {
        socketRef.current.emit("ice-candidate", { targetUser: incomingCall.caller, candidate: event.candidate });
      }
    };

    pc.ontrack = (event) => {
      if (remoteVideoRef.current && !remoteVideoRef.current.srcObject) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    };

    return pc;
  };

  return (
    <div>
      <h1>Voice Call</h1>
      <div>
        <input
          type="text"
          placeholder="Enter target username"
          value={targetUser}
          onChange={(e) => setTargetUser(e.target.value)}
        />
        <button onClick={startCall}>Call</button>
      </div>
      {incomingCall && (
        <div>
          <p>Incoming call from {incomingCall.caller}</p>
          <button onClick={acceptCall}>Accept</button>
          <button onClick={rejectCall}>Reject</button>
        </div>
      )}
      <video ref={localVideoRef} autoPlay muted style={{ width: "100%", height: "auto" }} />
      <video ref={remoteVideoRef} autoPlay controls style={{ width: "100%", height: "auto" }} />
    </div>
  );
}