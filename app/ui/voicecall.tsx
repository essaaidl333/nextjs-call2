'use client';
import { useEffect, useRef, useState } from "react";
import Modal from "react-modal";
import { PhoneIcon, XMarkIcon, VideoCameraIcon, MicrophoneIcon } from "@heroicons/react/24/solid";
import { VideoCameraSlashIcon } from "@heroicons/react/24/outline";
import { motion } from "framer-motion";

// تعيين العنصر الجذر للدايلوج (مطلوب لـ react-modal)
Modal.setAppElement('body');

export default function Voice({ username_get }: { username_get: string }) {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [incomingCall, setIncomingCall] = useState<{ caller: string; offer: RTCSessionDescriptionInit } | null>(null);
  const [targetUser, setTargetUser] = useState<string>("");
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isopenAnswer, setOpenAnswer] = useState<boolean>(false);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const peerConnection = useRef<RTCPeerConnection | null>(null);
  const webSocketRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  const [ringtoneInterval, settime] = useState<NodeJS.Timeout | null>(null);

  const video = remoteVideoRef.current;

  const [isMuted, setIsMuted] = useState(true);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [fromcall, setfromcall] = useState<string>("");

  const accesstomedia = () => {
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
  };

  useEffect(() => {
    const ws = new WebSocket('wss://nodesocket-40y8.onrender.com');
    // const ws = new WebSocket('ws://localhost:3001');
    webSocketRef.current = ws;

    ws.onopen = () => {
      console.log("تم الاتصال بالخادم");

      // تسجيل المستخدم عند الاتصال
    
          ws.send(JSON.stringify({ type: "register", username_get }));
      
  };
    ws.onmessage = (event) => {
      const rawData = event.data; // البيانات الواردة كـ نص عادي
      console.log("Raw data received:", rawData);
  
      if (rawData.includes("تم استلام")) {
          console.log("تم استلام مكالمة");
          // معالجة البيانات كـ نص عادي
      } else {
          try {
              const data = JSON.parse(rawData);
              console.log(data.type); // محاولة تحليل البيانات كـ JSON
              switch (data.type) {
                case "incoming-call":
                  handleIncomingCall(data);
                  break;
                case "call-accepted":
                  handleCallAccepted(data);
                  break;
                case "call-rejected":
                  handleCallRejected();
                  break;
                case "ice-candidate":
                  handleICECandidate(data.candidate);
                  break;
                case "end-call":
                  hendlendCall();
                  break;
                case "not-found":
                  notFound(data);
                  break;
                default:
                  console.log("Unknown message type:", data.type);
              }
              // معالجة البيانات كـ JSON
          } catch (error) {
              console.error("Error parsing WebSocket message:", error);
          }
      }
  };
    // ws.onmessage = (event) => {
    //   const data = JSON.parse(event.data);
    //   switch (data.type) {
    //     case "incoming-call":
    //       handleIncomingCall(data);
    //       break;
    //     case "call-accepted":
    //       handleCallAccepted(data);
    //       break;
    //     case "call-rejected":
    //       handleCallRejected();
    //       break;
    //     case "ice-candidate":
    //       handleICECandidate(data.candidate);
    //       break;
    //     case "end-call":
    //       hendlendCall();
    //       break;
    //     case "not-found":
    //       notFound(data);
    //       break;
    //     default:
    //       console.log("Unknown message type:", data.type);
    //   }
    // };

    ws.onclose = () => {
      console.log("WebSocket connection closed.");
    };

    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
    };

    return () => {
      ws.close();
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
      stopRingtone();
    };
  }, []);

  const endCall = () => {
    if (peerConnection.current) {
      peerConnection.current.close();
      peerConnection.current = null;
    }

    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }

    if (webSocketRef.current) {
      if (fromcall != '') {
        webSocketRef.current.send(JSON.stringify({ type: "end-call", targetUser: fromcall }));
      } else {
        webSocketRef.current.send(JSON.stringify({ type: "end-call", targetUser }));
      }
    }

    setOpenAnswer(false);
    console.log("Call ended. Ready for a new call.");
  };

  const hendlendCall = () => {
    if (peerConnection.current) {
      peerConnection.current.close();
      peerConnection.current = null;
    }

    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }

    setOpenAnswer(false);
    alert('تم انهاء المكالمة');
  };

  const handleIncomingCall = ({ caller, offer }: { caller: string; offer: RTCSessionDescriptionInit }) => {
    setIncomingCall({ caller, offer });
    setIsModalOpen(true);
    playIphoneLikeRingtone();
  };

  const notFound = ({ targetUser }: { targetUser: string }) => {
    alert(`username ${targetUser} not found`);
    stopRingtone();
    endCall();
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
    setOpenAnswer(true);
    stopRingtone();
  };

  const handleCallRejected = () => {
    alert("Call rejected by the other user.");
    setIncomingCall(null);
    if (stream) {
      setStream(null);
    }
    endCall();
    setIsModalOpen(false);
    stopRingtone();
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
    
    setOpenAnswer(true);
    accesstomedia();
    playIphoneLikeRingtone();
    if (!targetUser) {
      alert("الرجاء ادخل ايميل الشخص الذي تريد الاتصال به");
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

    if (webSocketRef.current) {
      console.log("Sending offer to target user:", targetUser);
      webSocketRef.current.send(JSON.stringify({ type: "call-user", targetUser, offer, username: username_get }));
    }
  };

  const acceptCall = () => {
    setIsModalOpen(false);
    setOpenAnswer(true);
    accesstomedia();
    if (incomingCall && !peerConnection.current) {
      console.log("Accepting call from:", incomingCall.caller);
      setfromcall(incomingCall.caller);
      peerConnection.current = createPeerConnection();

      if (stream) {
        stream.getTracks().forEach((track) => {
          peerConnection.current!.addTrack(track, stream);
        });
      }

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
          if (webSocketRef.current) {
            console.log("Sending answer to caller:", incomingCall.caller);
            webSocketRef.current.send(JSON.stringify({ type: "call-response", caller: incomingCall.caller, response: "accepted", answer: peerConnection.current!.localDescription }));
          }
        })
        .catch((error) => {
          console.error("Error accepting call:", error);
        });

      setIncomingCall(null);
      stopRingtone();
    }
  };

  const rejectCall = () => {
    if (incomingCall && webSocketRef.current) {
      console.log("Rejecting call from:", incomingCall.caller);
      webSocketRef.current.send(JSON.stringify({ type: "call-response", caller: incomingCall.caller, response: "rejected" }));
      setIncomingCall(null);
      setIsModalOpen(false);
      stopRingtone();
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
      ],
    });

    pc.onicecandidate = (event) => {
      if (event.candidate && webSocketRef.current && incomingCall) {
        webSocketRef.current.send(JSON.stringify({ type: "ice-candidate", targetUser: incomingCall.caller, candidate: event.candidate }));
      }
    };

    pc.ontrack = (event) => {
      if (remoteVideoRef.current && !remoteVideoRef.current.srcObject) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    };

    return pc;
  };

  const playIphoneLikeRingtone = () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext();
    }

    const ctx = audioContextRef.current;
    const a = ctx.createOscillator();
    const gainNode = ctx.createGain();

    a.type = "sine";
    a.frequency.setValueAtTime(450, ctx.currentTime);
    gainNode.gain.setValueAtTime(1, ctx.currentTime);
    gainNode.gain.setValueAtTime(0, ctx.currentTime + 0.4);
    gainNode.gain.setValueAtTime(1, ctx.currentTime + 0.8);

    a.connect(gainNode);
    gainNode.connect(ctx.destination);
    a.start();

    settime(setInterval(() => {
      gainNode.gain.setValueAtTime(1, ctx.currentTime);
      gainNode.gain.setValueAtTime(0, ctx.currentTime + 0.4);
      gainNode.gain.setValueAtTime(1, ctx.currentTime + 0.8);
    }, 1000));
  };

  const toggleMute = () => {
    if (stream) {
      const audioTracks = stream.getAudioTracks();
      if (audioTracks.length > 0) {
        audioTracks[0].enabled = !isMuted;
        setIsMuted(!isMuted);
      }
    }
  };

  const toggleVideo = () => {
    if (stream) {
      const videoTracks = stream.getVideoTracks();
      if (videoTracks.length > 0) {
        videoTracks[0].enabled = !isVideoOn;
        setIsVideoOn(!isVideoOn);
      }
    }
  };

  const stopRingtone = () => {
    if (ringtoneInterval) {
      clearInterval(ringtoneInterval);
      settime(null);
    }
    audioContextRef.current?.close();
    audioContextRef.current = null;
  };

  return (
    <div>
      <center><h1>اتصل مجانا</h1></center>
      <div className="border-2 border-blue-500 focus:border-blue-700 rounded-lg p-2 w-full outline-none">
        <input
          type="text"
          placeholder="ادخل الايميل "
          value={targetUser}
          onChange={(e) => setTargetUser(e.target.value)}
        />
        <button onClick={startCall}>
          <PhoneIcon className="w-6 text-green-500" />
        </button>
      </div>
      <Modal
        isOpen={isModalOpen}
        onRequestClose={rejectCall}
        contentLabel="Incoming Call"
        style={{
          content: {
            top: '50%',
            left: '50%',
            right: 'auto',
            bottom: 'auto',
            marginRight: '-50%',
            transform: 'translate(-50%, -50%)',
          },
        }}
      >
        <h2>Incoming Call from {incomingCall?.caller}</h2>
        <div className="flex justify-between pt-10">
          <div>
            <button onClick={acceptCall}>
              <PhoneIcon className="w-6 text-green-500" />
            </button>
          </div>
          <div>
            <button onClick={rejectCall}>
              <XMarkIcon className="w-6 text-red-500" />
            </button>
          </div>
        </div>
      </Modal>
      <Modal
        isOpen={isopenAnswer}
        contentLabel="Incoming Call"
        style={{
          content: {
            background: "rgba(0, 0, 0, 0.8)",
            top: "50%",
            left: "50%",
            right: "auto",
            bottom: "auto",
            marginRight: "-50%",
            transform: "translate(-50%, -50%)",
            borderRadius: "20px",
            padding: "20px",
            border: "none",
            width: "90%",
            maxWidth: "400px",
            color: "#fff",
          },
          overlay: { backgroundColor: "rgba(0, 0, 0, 0.5)" },
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
        >
          <div className="flex flex-col items-center">
            <video ref={localVideoRef} autoPlay style={{ width: "50%", height: "auto" }} />
            <video ref={remoteVideoRef} autoPlay controls={true} style={{ width: "100%", height: "auto" }} />
            <div className="flex justify-around w-full mt-4">
              <button
                onClick={toggleMute}
                className="relative bg-gray-700 w-12 h-12 rounded-full flex items-center justify-center shadow-lg"
              >
                <MicrophoneIcon className="w-6 text-white" />
                {!isMuted && (
                  <div className="absolute w-6 h-0.5 bg-red-500 rotate-45"></div>
                )}
              </button>
              <button
                onClick={toggleVideo}
                className="bg-gray-700 w-12 h-12 rounded-full flex items-center justify-center shadow-lg"
              >
                {isVideoOn ? <VideoCameraIcon className="w-6 text-white" /> : <VideoCameraSlashIcon className="w-6 text-white" />}
              </button>
            </div>
            <button
              onClick={endCall}
              className="bg-red-500 mt-4 w-16 h-16 rounded-full flex items-center justify-center shadow-lg"
            >
              <XMarkIcon className="w-8 text-white" />
            </button>
          </div>
        </motion.div>
      </Modal>
    </div>
  );
}