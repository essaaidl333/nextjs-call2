'use client';
import { useEffect, useRef, useState } from "react";
import io, { Socket } from "socket.io-client";
import Modal from "react-modal";
import { PhoneIcon, XMarkIcon, VideoCameraIcon, MicrophoneIcon   } from "@heroicons/react/24/solid";
import {  VideoCameraSlashIcon } from "@heroicons/react/24/outline"; 


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
  const socketRef = useRef<Socket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  const [ringtoneInterval,settime]= useState<NodeJS.Timeout| null>(null);

  const video = remoteVideoRef.current;

  const [isMuted, setIsMuted] = useState(true);
  const [isVideoOn, setIsVideoOn] = useState<boolean>(true);
  const [fromcall, setfromcall] = useState<string>("");

  const accesstomedia =()=>{
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
  }}
  useEffect(() => {
    
  //  alert(`${window.location.protocol === "https:" ? "wss" : "ws"}://${window.location.host}`);
   socketRef.current  = io("https://localhostessa.giize.com:3001", {
    transports: ["websocket"], // استخدم WebSocket فقط
  });
  
    // socketRef.current = io("https://nodesocket-40y8.onrender.com");
    // socketRef.current = io("http://localhost:3001");
    // socketRef.current=soo;
    socketRef.current.emit("register", username_get);
    // console.log(`Registered as ${username_get}`);
   
    
    // Access user media (audio and video)
    if(!isopenAnswer){
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
    }

    // Socket event listeners
    const socket = socketRef.current;
    socket.on("incoming-call", handleIncomingCall);
    socket.on("not-found", notFound);
    socket.on("call-accepted", handleCallAccepted);
    socket.on("call-rejected", handleCallRejected);
    socket.on("ice-candidate", handleICECandidate);
    socket.on("end-call", hendlendCall);
    socket.on("video-toggle", handleVideoToggle);
    // Cleanup on component unmount
    return () => {
      if(video)
     
      socket.disconnect();
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
      if (peerConnection.current) {
        peerConnection.current.close();
      }
      stopRingtone(); // إيقاف الصوت عند إغلاق المكون
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
  
    if (socketRef.current) {
   
      if(fromcall !=''){
      
        socketRef.current.emit("end-call",{targetUser:fromcall});
      }
      else{
        socketRef.current.emit("end-call",{targetUser}) ;
      }
     
    }
    // socketRef.current.emit("end-call")
   setOpenAnswer(false);
    console.log("Call ended. Ready for a new call.");
  };
  const handleVideoToggle = ({ videoEnabled }: { videoEnabled: boolean }) => {
    console.log('vsfz');
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
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    // socketRef.current.emit("end-call")
   setOpenAnswer(false);
    alert('تم انهاء المكالمة');
  };
  
  const handleIncomingCall = ({ caller, offer }: { caller: string; offer: RTCSessionDescriptionInit }) => {
    accesstomedia();
    setIncomingCall({ caller, offer });
    setIsModalOpen(true);
    playIphoneLikeRingtone(); // تشغيل الصوت عند استقبال المكالمة
  };

  const notFound = ({targetUser}:{targetUser:string}) =>{
    alert(`username ${targetUser} not found` );
    endCall();
  }

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
    // إيقاف الصوت عند قبول المكالمة
    stopRingtone();
  };

  const handleCallRejected = () => {
    alert("Call rejected by the other user.");
    setIncomingCall(null);
      if (stream) {
        setStream(null);
      }
      // if (peerConnection.current) {
      //   peerConnection.current.close();
      // }
   // إيقاف الصوت عند إغلاق المكون
   endCall();
    setIsModalOpen(false);
    stopRingtone(); // إيقاف الصوت عند رفض المكالمة
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
    // endCall();
    // accesstomedia();
    setOpenAnswer(true);
    accesstomedia();
    playIphoneLikeRingtone();
    if (!targetUser) {
      alert("الرجاء ادخل ايميل الشخص الذي تريد الاتصال به");
      return;
    }
    // if(peerConnection.current){
    //   peerConnection.current!.removeEventListener;
    // }
    if (!peerConnection.current) {
      
      
      peerConnection.current = createPeerConnection();
    }

    if (stream) {
      // endCall();
      // const b=peerConnection.current?.getSenders();
      // peerConnection.current.removeTrack(b[0]);
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
      socketRef.current.emit("call-user", { targetUser, offer, username_get  });
    }
  };

  const acceptCall = () => {
    
    
    setIsModalOpen(false);
      setOpenAnswer(true);
      accesstomedia();
    if (incomingCall && !peerConnection.current) {
      console.log("Accepting call from:", incomingCall.caller);
      setfromcall(incomingCall.caller);
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
      stopRingtone();// إيقاف الصوت عند قبول المكالمة
    
    }
  };

  const rejectCall = () => {
    // accesstomedia();
    if (incomingCall && socketRef.current) {
      console.log("Rejecting call from:", incomingCall.caller);
      socketRef.current.emit("call-response", { caller: incomingCall.caller, response: "rejected" });
      setIncomingCall(null);
      setIsModalOpen(false);
      stopRingtone(); // إيقاف الصوت عند رفض المكالمة
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
        // const s=peerConnection.current;
        // const totalSeconds = Math.floor(remoteVideoRef.current.duration); // الحصول على المدة بالثواني
        // const minutes = Math.floor(totalSeconds / 60); // تحويل الثواني إلى دقائق
        // const seconds = totalSeconds % 60; // الثواني المتبقية
        // const formattedTime = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`; // تنسيق الوقت
        // setDuration(formattedTime); 
      }
    };

    return pc;
  };
  
  const playIphoneLikeRingtone = () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext();
    }
  
    const ctx = audioContextRef.current;
  
    // إنشاء مذبذبين لمحاكاة نغمة iPhone
    const a =ctx.createOscillator()

    const  gainNode = ctx.createGain();

    a.type = "sine"; // نغمة جيبية
    // osc2.type = "sine";
  
    // ضبط الترددات مثل نغمة iPhone
    a.frequency.setValueAtTime(450, ctx.currentTime); // 450 هرتز
    // osc2.frequency.setValueAtTime(550, ctx.currentTime); // 550 هرتز (تردد أعلى)
  
    // التحكم في الصوت لعمل تأثير النبضات مثل iPhone
    gainNode.gain.setValueAtTime(1, ctx.currentTime);
    gainNode.gain.setValueAtTime(0, ctx.currentTime + 0.4); // كتم الصوت بعد 0.4 ثانية
    gainNode.gain.setValueAtTime(1, ctx.currentTime + 0.8); // إعادة تشغيله
  
    // ربط المذبذبات بالمضخم ثم بالمخرجات
    a.connect(gainNode);
    // osc2.connect(gainNode);
    gainNode.connect(ctx.destination);
  
    
    a.start();

    settime( setInterval(() => {
      gainNode.gain.setValueAtTime(1, ctx.currentTime);
      gainNode.gain.setValueAtTime(0, ctx.currentTime + 0.4);
      gainNode.gain.setValueAtTime(1, ctx.currentTime + 0.8);
    }, 1000)); // التكرار كل ثانية
   
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
  
        // إرسال إشارة إلى الطرف الآخر لتغيير حالة الفيديو
        if (socketRef.current) {
          socketRef.current.emit("video-toggle", {
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
        settime( null);
    }
    audioContextRef.current?.close();
    audioContextRef.current = null; // إعادة تعيين الـ AudioContext
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
                <button  onClick={acceptCall}>
                <PhoneIcon className="w-6 text-green-500" />
                </button>
           </div>

          <div>
            <button  onClick={rejectCall}>
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
          background: "rgba(0, 0, 0, 0.8)", // خلفية شفافة داكنة
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
        initial={{ opacity: 0, scale: 0.8 }} // تأثير البداية
        animate={{ opacity: 1, scale: 1 }} // التحول للحالة الطبيعية
        transition={{ duration: 0.3, ease: "easeOut" }} // مدة التحريك
      >
       
        
          <div className="flex flex-col items-center">
          <video ref={localVideoRef} autoPlay muted style={{ width: "100%", height: "auto" }} />
          <video ref={remoteVideoRef} autoPlay  style={{ width: "100%", height: "auto" }} />
            
            
            <div className="flex justify-around w-full mt-4">
             
              <button
                onClick={toggleMute}
                className="relative bg-gray-700 w-12 h-12 rounded-full flex items-center justify-center shadow-lg"
              >
                <MicrophoneIcon className="w-6 text-white" />
                {!isMuted && (
                  <div className="absolute w-6 h-0.5 bg-red-500 rotate-45"></div> // خط الكتم
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
       {/* <video ref={localVideoRef} autoPlay muted style={{ width: "100%", height: "auto" }} /> */}
       {/* <video ref={remoteVideoRef} autoPlay controls={true}  style={{ width: "100%", height: "auto" }} />  */}
      
    </div>
  );
} 