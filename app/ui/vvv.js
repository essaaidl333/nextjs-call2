'use client';
import { useEffect, useRef, useState } from "react";
import io from "socket.io-client";

let socket;

export default function Home() {
const [stream, setStream] = useState(null);
const remoteAudioRef = useRef(null);
const peerConnection = useRef(null);

useEffect(() => {
// تأكد من استخدام IP الصحيح
socket = io("https://localhostessa.giize.com:3001");



if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
  navigator.mediaDevices
    .getUserMedia({ audio: true, video: false })
    .then((mediaStream) => {
      setStream(mediaStream);
    })
    .catch((err) => console.error("Error accessing audio devices:", err));
} else {
  console.error("getUserMedia is not supported in this browser.");
}

socket.on("offer", handleOffer);
socket.on("answer", handleAnswer);
socket.on("ice-candidate", handleICECandidate);

return () => {
  socket.disconnect();
};
}, []);

const createPeerConnection = () => {
const pc = new RTCPeerConnection({
  iceServers: [
    {
      urls: "stun:stun.relay.metered.ca:80",
    },
    {
      urls: "turn:global.relay.metered.ca:80",
      username: "963da3298763f94ced0627b7",
      credential: "J7D9VjSuubb8AveC",
    },
    {
      urls: "turn:global.relay.metered.ca:80?transport=tcp",
      username: "963da3298763f94ced0627b7",
      credential: "J7D9VjSuubb8AveC",
    },
    {
      urls: "turn:global.relay.metered.ca:443",
      username: "963da3298763f94ced0627b7",
      credential: "J7D9VjSuubb8AveC",
    },
    {
      urls: "turns:global.relay.metered.ca:443?transport=tcp",
      username: "963da3298763f94ced0627b7",
      credential: "J7D9VjSuubb8AveC",
    },
],
});


pc.onicecandidate = (event) => {
  if (event.candidate) {
    socket.emit("ice-candidate", event.candidate);
  }
};

pc.ontrack = (event) => {
  remoteAudioRef.current.srcObject = event.streams[0];
};

return pc;
};

const handleOffer = async (offer) => {
peerConnection.current = createPeerConnection();
if (stream) {
stream.getTracks().forEach((track) => {
peerConnection.current.addTrack(track, stream);
});
} else {
console.error("Stream is not initialized");
}


await peerConnection.current.setRemoteDescription(new RTCSessionDescription(offer));
const answer = await peerConnection.current.createAnswer();
await peerConnection.current.setLocalDescription(answer);
socket.emit("answer", answer);
};

const handleAnswer = async (answer) => {
await peerConnection.current.setRemoteDescription(new RTCSessionDescription(answer));
};

const handleICECandidate = (candidate) => {
peerConnection.current.addIceCandidate(new RTCIceCandidate(candidate));
};

const startCall = async () => {
peerConnection.current = createPeerConnection();
if (stream) {
stream.getTracks().forEach((track) => {
peerConnection.current.addTrack(track, stream);
});
} else {
console.error("Stream is not initialized");
return;
}



const offer = await peerConnection.current.createOffer();
await peerConnection.current.setLocalDescription(offer);
socket.emit("offer", offer);
};

return (
<div>
<h1>Next.js Audio-Only WebRTC</h1>
<audio ref={remoteAudioRef} autoPlay controls />
<button onClick={startCall}>Start Call</button>
</div>
);
} 