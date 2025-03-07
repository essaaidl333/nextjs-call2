'use client';
import { useEffect, useRef, useState } from "react";
import io from "socket.io-client";
import Modal from "react-modal";
import { PhoneIcon, XMarkIcon, VideoCameraIcon, MicrophoneIcon } from "@heroicons/react/24/solid";
import { VideoCameraSlashIcon } from "@heroicons/react/24/outline";
import { motion } from "framer-motion";

let socket;
Modal.setAppElement('body');

export default function Voice({ username_get1 }) {
  const [stream, setStream] = useState(null);
  const [incomingCall, setIncomingCall] = useState(null);
  const [targetUser, setTargetUser] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isopenAnswer, setOpenAnswer] = useState(false);
  const remoteVideoRef = useRef(null);
  const localVideoRef = useRef(null);
  const peerConnection = useRef(null);
  const socketRef = useRef(null);
  const audioContextRef = useRef(null);
  const [username_get, setuserget] = useState("");
  const [ringtoneInterval, settime] = useState(null);
  const [isMuted, setIsMuted] = useState(true);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [fromcall, setfromcall] = useState("");
  const targetUserRef = useRef(targetUser);
  const fromcallRef = useRef(fromcall);
  useEffect(() => {
    targetUserRef.current = targetUser;
  }, [targetUser]);

  useEffect(() => {
    fromcallRef.current = fromcall;
  }, [fromcall]);

  const handleBeforeUnload = (event) => {
    // استخدام القيم من useRef
    const currentTargetUser = targetUserRef.current;
    const currentFromcall = fromcallRef.current;

    alert(`targetUser: ${currentTargetUser}, fromcall: ${currentFromcall}`);

    if (socket) {
      if (currentFromcall !== "") {
        socket.emit("end-call", { targetUser: currentFromcall });
      } else {
        socket.emit("end-call", { targetUser: currentTargetUser });
      }
    }

    // رسالة تأكيد (اختياري)
    event.returnValue = "هل أنت متأكد أنك تريد تحديث الصفحة؟ سيتم إغلاق الاتصال.";
  };
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
    // const us = prompt("أدخل اسم المستخدم:");
    // if (us) setuserget(us);
    // console.log(username_get);

    socket= io("https://nodesocket-40y8.onrender.com", {
      transports: ["websocket"], // استخدم WebSocket فقط
    });
    socket.emit("register", username_get1);

    accesstomedia();

    socket.on("incoming-call", handleIncomingCall);
    socket.on("not-found", notFound);
    socket.on("call-accepted", handleCallAccepted);
    socket.on("call-rejected", handleCallRejected);
    socket.on("ice-candidate", handleICECandidate);
    socket.on("end-call", hendlendCall);
    socket.on("video-toggle", handleVideoToggle);
    // const handleBeforeUnload = (event) => {
    //   alert(targetUser);
    //   // event.preventDefault();
    //   if (socket) {
    //     if (fromcall !== "") {
    //       socket.emit("end-call", { targetUser: fromcall });
    //     } else {
    //       socket.emit("end-call", { targetUser });
    //     }
    //   }
    //   // تنظيف الاتصال
    
    //   // رسالة تأكيد (اختياري)
    //   event.returnValue = "هل أنت متأكد أنك تريد تحديث الصفحة؟ سيتم إغلاق الاتصال.";
    // };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      if (socket) socket.disconnect();
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
      if (peerConnection.current) {
        peerConnection.current.close();
      }
      stopRingtone();
      window.removeEventListener("beforeunload", handleBeforeUnload);
      if (socket) {
        if (fromcall !== "") {
          socket.emit("end-call", { targetUser: fromcall });
        } else {
          socket.emit("end-call", { targetUser });
        }
      }
    };
  }, []);

  const endCall = () => {
    if (peerConnection.current) {
      peerConnection.current.close();
      peerConnection.current = null;
    }

    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }

    if (socket) {
      if (fromcall !== "") {
        socket.emit("end-call", { targetUser: fromcall });
      } else {
        socket.emit("end-call", { targetUser });
      }
    }

    setOpenAnswer(false);
    console.log("Call ended. Ready for a new call.");
  };

  const handleVideoToggle = ({ videoEnabled }) => {
    if (remoteVideoRef.current && remoteVideoRef.current.srcObject instanceof MediaStream) {
      const mediaStream = remoteVideoRef.current.srcObject;
      const videoTracks = mediaStream.getVideoTracks();
      if (videoTracks && videoTracks.length > 0) {
        videoTracks[0].enabled = videoEnabled;
      }
    }
  };

  const hendlendCall = () => {
    if (peerConnection.current) {
      peerConnection.current.close();
      peerConnection.current = null;
    }

    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }

    setOpenAnswer(false);
    alert('تم انهاء المكالمة');
  };

  const handleIncomingCall = ({ caller, offer }) => {
    accesstomedia();
    setIncomingCall({ caller, offer });
    setIsModalOpen(true);
    playIphoneLikeRingtone();
  };

  const notFound = ({ targetUser }) => {
    alert(`username ${targetUser} not found`);
    endCall();
    stopRingtone();
  };

  const handleCallAccepted = async ({ answer }) => {
    if (peerConnection.current) {
      console.log("Call accepted, setting remote description:", answer);
      await peerConnection.current.setRemoteDescription(new RTCSessionDescription(answer))
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

  const handleICECandidate = (candidate) => {
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
        peerConnection.current.addTrack(track, stream);
      });
    }

    const offer = await peerConnection.current.createOffer();
    console.log("Offer created:", offer);
    await peerConnection.current.setLocalDescription(offer);
    console.log("Local description set:", peerConnection.current.localDescription);

    if (socket) {
      console.log("Sending offer to target user:", targetUser);
      socket.emit("call-user", { targetUser, offer, username_get });
    }
  };

  const acceptCall = async () => {
    setIsModalOpen(false);
    setOpenAnswer(true);
    accesstomedia();
    if (incomingCall && !peerConnection.current) {
      console.log("Accepting call from:", incomingCall.caller);
      setfromcall(incomingCall.caller);
      peerConnection.current = createPeerConnection();

      if (stream) {
        stream.getTracks().forEach(async (track) => {
          await peerConnection.current.addTrack(track, stream);
        });
      }

      await peerConnection.current.setRemoteDescription(new RTCSessionDescription(incomingCall.offer))
        .then(() => {
          console.log("Remote description set successfully.");
          return peerConnection.current.createAnswer();
        })
        .then(async (answer) => {
          console.log("Answer created:", answer);
          return await peerConnection.current.setLocalDescription(answer);
        })
        .then(() => {
          if (socket) {
            console.log("Sending answer to caller:", incomingCall.caller);
            socket.emit("call-response", {
              caller: incomingCall.caller,
              response: "accepted",
              answer: peerConnection.current.localDescription,
            });
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
    if (incomingCall && socket) {
      console.log("Rejecting call from:", incomingCall.caller);
      socket.emit("call-response", { caller: incomingCall.caller, response: "rejected" });
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
        socket.emit("ice-candidate", { targetUser: incomingCall?.caller || targetUser, candidate: event.candidate });
      }
    };

    pc.ontrack = (event) => {
      if (remoteVideoRef.current) {
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

        if (socket) {
          socket.emit("video-toggle", {
            targetUser: fromcall || targetUser,
            videoEnabled: !isVideoOn,
          });
        }
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
        <h2>لديك مكالمة من  {incomingCall?.caller}</h2>
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
            <video ref={localVideoRef} autoPlay muted style={{ width: "100%", height: "100px" }} />
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