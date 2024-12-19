import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { getMedia, makeConnection } from '../services/WebrtcService';
import { useSocket } from '../context/SocketContext';
import DefaultProfile from '../assets/default-profile.svg';
import CallSetting from './CallSetting';
import CallChatScreen from './CallChatScreen';
import CallVoiceScreen from './CallVoiceScreen';
import { useUserInfo } from '../context/UserInfoContext';
import { usePeer } from '../context/PeerContext';
import Modal from './common/Modal';
import { useRoomName } from '../hooks/useRoomName';
import './CallScreen.css';
import api from '../interceptors/LoginInterceptor'; 


const CallScreen = () => {
  const { roomName: decodedRoomName } = useRoomName(useParams().roomName);
  // const { talkId: }
  const roomName = decodedRoomName;
 
  // const [ talkId, setTalkId ] = useState('');

  const talkId = useRef('');
  useEffect(() => {
    const splitRoomName = roomName.split("?talkId=");
    const mainRoomName = splitRoomName[0]; // "Mzk4OTZmZGMtYzYzNC00OQ=="
    talkId.current = splitRoomName[1]; // "272"


    console.log("[callscreen mainRoomName] :", mainRoomName);
    console.log("[callscreen talkId] :", talkId.current);
}, [roomName]);
  const location = useLocation();
  const navigate = useNavigate();

  const myVideoRef = useRef(null);
  const peerVideoRef = useRef(null);

  const myStream = useRef(null);
  const myPeerConnection = useRef(null);
  const myDataChannel = useRef(null);

  const socket = useSocket();

  const { userInfo, setUserInfo } = useUserInfo();
  const {
    peerNickname,
    setPeerNickname,
    peerProfileImage,
    setPeerProfileImage,
  } = usePeer();

  const screenType = useRef(null);
  const [isSelectionLocked, setSelectionLocked] = useState(false);

  const audioProcessorNode = useRef(null);
  const audioContext = useRef(null);

  const [chatMessages, setChatMessages] = useState([]);
  const [recommendations, setRecommendations] = useState([]);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMessage, setModalMessage] = useState('');
  const [modalCallback, setModalCallback] = useState(null);

  const showModal = (message, callback) => {
    console.log('[CallScreen] showModal called with message:', message);
    setModalMessage(message);
    setModalCallback(() => callback);
    setModalOpen(true);
  };

  const closeModal = () => {
    console.log('[CallScreen] closeModal called');
    setModalOpen(false);
    if (modalCallback) {
      console.log('[CallScreen] closeModal callback excuting');
      modalCallback();
      setModalCallback(null);
    }
  };

  useEffect(() => {
    console.log('Decoded Room Name:', decodedRoomName);
    if (!roomName) {
      showModal(
        <>
          잘못된 방 이름입니다.
          <br />
          홈으로 이동합니다.
        </>,
        () => {
          navigate('/call/home');
        }
      );
    }
  }, [roomName]);

  useEffect(() => {
    const storedUserInfo = localStorage.getItem('userInfo');

    if (storedUserInfo) {
      setUserInfo(JSON.parse(storedUserInfo));
    } else {
      const defaultUserInfo = {
        nickname: '익명',
        email: 'callee@parrotalk.com',
        profileImage: DefaultProfile,
      };
      setUserInfo(defaultUserInfo);
      localStorage.setItem('userInfo', JSON.stringify(defaultUserInfo));
    }
  }, [setUserInfo]);

  useEffect(() => {
    const initialize = async () => {
      if (socket && socket.connected) {
        registerSocketEvents(socket);
      } else {
        socket.on('connect', () => {
          console.log('Socket connected:', socket.id);
          registerSocketEvents(socket);
        });
      }
    };

    initialize();

    return () => {};
  }, []);

  const cleanupSocketEvents = socket => {
    socket.off('disconnect', () => handleDisconnect(socket));
    socket.off('welcome_self');
    socket.off('welcome');
    socket.off('notification_hi');
    socket.off('offer');
    socket.off('answer');
    socket.off('ice');
    socket.off('room_not_found');
    socket.off('peer_left');
    socket.off('room_full');
    socket.off('transcript', handleTranscript);
    socket.off('stop_audio_chunk', handleStopAudioChunk);
    socket.off('recommendations', handleRecommendations);
    socket.off('tts_response', handleTTS);
  };

  const registerSocketEvents = socket => {
    cleanupSocketEvents(socket);
    socket.on('disconnect', () => handleDisconnect(socket));
    socket.on('welcome_self', handleWelcomeSelf);
    socket.on('welcome', handleWelcome);
    socket.on('notification_hi', handleNotificationHi);
    socket.on('offer', handleOffer);
    socket.on('answer', handleAnswer);
    socket.on('ice', handleIce);
    socket.on('room_not_found', handleRoomNotFound);
    socket.on('peer_left', handlePeerLeft);
    socket.on('room_full', handleRoomFull);
    socket.on('transcript', handleTranscript);
    socket.on('stop_audio_chunk', handleStopAudioChunk);
    socket.on('recommendations', handleRecommendations);
    socket.on('tts_response', handleTTS);
    console.log('Socket events registered.');
  };

  const handleTTS = audioBase64 => {
    // Base64 디코딩 후 ArrayBuffer로 변환 및 오디오 재생
    const playAudio = async () => {
      try {
        const audioData = atob(audioBase64['data']);
        const arrayBuffer = new Uint8Array(audioData.length).map((_, i) =>
          audioData.charCodeAt(i)
        ).buffer;

        const audioContext = new window.AudioContext();
        const decodedData = await audioContext.decodeAudioData(arrayBuffer);

        const source = audioContext.createBufferSource();
        source.buffer = decodedData;

        // 오디오 재생
        source.connect(audioContext.destination);
        source.start(0);

        // 재생 완료 후 리소스 정리
        source.onended = () => {
          source.disconnect();
          audioContext.close();
          console.log('TTS audio playback finished');
        };
      } catch (error) {
        console.error('Error playing TTS audio:', error);
      }
    };

    // 오디오 재생 호출
    playAudio();
  };

  const handleRecommendations = data => {
    console.log('Received recommendations:', data);
    setRecommendations(data);
  };

  const clearRecommendations = () => {
    setRecommendations([]);
  };

  const handleConfirm = option => {
    screenType.current = option;
    setSelectionLocked(true);
    handleStartCall();
  };

  const handleStartCall = async () => {
    console.log(roomName);
    console.log(userInfo.email);
    console.log(socket);
    if (!roomName || !userInfo.email || !socket) {
      showModal('오류가 발생해서 방 생성 페이지로 돌아갑니다.');
      navigate('/call/home');
      return;
    }

    setSelectionLocked(true);

    try {
      console.log('Joining room:', roomName, 'with email:', userInfo.email);
      const stream = await getMedia();
      console.log('Media stream obtained:', stream);
      myStream.current = stream;

      // 마지막에 들어온 사람은 이전에 들어온 사람의 이메일을 알 수 없음
      socket.on('another_user', users => {
        console.log('Received users:', users);
        users.forEach(user => {
          setPeerNickname(user.nickname || '익명');
          setPeerProfileImage(user.profileImage || DefaultProfile);
        });
      });

      if (myVideoRef.current) {
        console.log('myStream added.');
        myVideoRef.current.srcObject = stream;
      }

      console.log('Initializing WebRTC connection...');
      if (!myPeerConnection.current) {
        myPeerConnection.current = makeConnection(
          socket,
          roomName,
          handleAddStream
        );
      }
      console.log('PeerConnection initialized:', myPeerConnection.current);

      myDataChannel.current =
        myPeerConnection.current.createDataChannel('chat');
      myDataChannel.current.onmessage = handleReceiveMessage;
      console.log('DataChannel created for chat');

      socket.emit(
        'join_room',
        roomName,
        userInfo.email,
        userInfo.nickname,
        userInfo.profileImage,
        screenType.current
      );
    } catch (error) {
      console.error('Error during call setup:', error);
    }
  };

  const handleRoomNotFound = () => {
    showModal(
      '해당 방이 존재하지 않습니다. 통화 시작 페이지로 돌아갑니다.',
      () => {
        navigate('/call/home');
      }
    );
  };

  const handleWelcomeSelf = async () => {
    console.log('Myself joined the room:', roomName);
    if (!myPeerConnection.current) {
      console.error('PeerConnection is not initialized in handleWelcomeSelf.');
      return;
    }

    try {
      const offer = await myPeerConnection.current.createOffer();
      console.log('Offer created:', offer);

      await myPeerConnection.current.setLocalDescription(offer);
      console.log(
        'LocalDescription set:',
        myPeerConnection.current.localDescription
      );

      socket.emit('offer', offer, roomName);
      console.log('Offer sent to room:', roomName);
    } catch (error) {
      console.error('Error during offer creation or sending:', error);
    }
  };

  const handleWelcome = () => {
    showModal('상대방이 입장했습니다.', () => {
      console.log('Peer joined the room:', roomName);
    });
    myPeerConnection.current.ondatachannel = event => {
      myDataChannel.current = event.channel;
      myDataChannel.current.onmessage = handleReceiveMessage;
      console.log('DataChannel received from peer');
    };
  };

  const handleReceiveMessage = event => {
    console.log('Message received:', event.data);
    setChatMessages(prev => [
      ...prev,
      { type: 'peer_message', content: event.data },
    ]);
    socket.emit('request_tts', event.data, roomName);
  };

  const handleSendMessage = message => {
    if (myDataChannel.current && myDataChannel.current.readyState === 'open') {
      myDataChannel.current.send(message);
      setChatMessages(prev => [
        ...prev,
        { type: 'my_message', content: message },
      ]);
    } else {
      console.warn('DataChannel is not open');
    }
  };

  const handleNotificationHi = peerEmail => {
    console.log("[callscreen notifiactionhi] ",talkId.current);
    console.log("[callscreen notifiactionhi] ",peerEmail);
    api
      .post(
        '/api/v1/talk/peer',
        {
          talkId: talkId.current, // useRef로 저장된 talkId 사용
          receiverEmail: peerEmail,
        },
      )
      .then(response => {
        console.log("[callscreen notifiactionhi] ", response);
        const imageUrl =
          response.data.profileImage === 'default'
            ? DefaultProfile
            : response.data.profileImage;
        setPeerNickname(response.data.nickname);
        setPeerProfileImage(imageUrl);
      });
  };

  const handleOffer = async offer => {
    console.log('Offer received:', offer);

    if (!myPeerConnection.current) {
      myPeerConnection.current = makeConnection(
        socket,
        roomName,
        handleAddStream
      );
    }

    try {
      await myPeerConnection.current.setRemoteDescription(offer);
      const answer = await myPeerConnection.current.createAnswer();
      await myPeerConnection.current.setLocalDescription(answer);
      console.log('Answer created and set as local description:', answer);
      socket.emit('answer', answer, roomName);
    } catch (error) {
      console.error('Error handling offer:', error);
    }
  };

  const handleAnswer = async answer => {
    console.log('Answer received:', answer);
    if (!myPeerConnection.current) {
      console.error('PeerConnection is not initialized in handleAnswer.');
      return;
    }
    try {
      await myPeerConnection.current.setRemoteDescription(answer);
    } catch (error) {
      console.error('Error setting remote description:', error);
    }
  };

  const handleIce = async ice => {
    console.log('ICE candidate received:', ice);
    if (!myPeerConnection.current) {
      console.error('PeerConnection is not initialized in handleIce.');
      return;
    }

    try {
      await myPeerConnection.current.addIceCandidate(ice);
    } catch (error) {
      console.error('Error adding ICE candidate:', error);
    }
  };

  const handleAddStream = async stream => {
    peerVideoRef.current.srcObject = stream;
    console.log('peer video Stream added:', stream);

    try {
      audioContext.current = new AudioContext();
      await audioContext.current.audioWorklet.addModule(
        '/js/audio-processor.js'
      );

      const source = audioContext.current.createMediaStreamSource(stream);
      audioProcessorNode.current = new AudioWorkletNode(
        audioContext.current,
        'audio-processor'
      );

      audioProcessorNode.current.port.onmessage = event => {
        const audioChunk = event.data;
        if (screenType.current === 'chat') {
          socket.emit('audio_chunk', audioChunk, roomName);
        }
      };

      source.connect(audioProcessorNode.current);
    } catch (error) {
      console.error('Error during AudioProcessor setup:', error);
    }
  };

  const handleStopAudioChunk = async roomName => {
    console.log(`Stop audio chunk transmission for room: ${roomName}`);

    if (audioProcessorNode?.current) {
      try {
        await audioProcessorNode.current.port.close();
        audioProcessorNode.current.disconnect();
        console.log('AudioProcessorNode disconnected and closed.');
      } catch (error) {
        console.error('Error closing AudioProcessorNode:', error);
      } finally {
        audioProcessorNode.current = null;
      }
    } else {
      console.warn('audioProcessorNode is not defined or already cleared.');
    }

    if (audioContext?.current) {
      try {
        await audioContext.current.close();
        console.log('AudioContext closed.');
      } catch (error) {
        console.error('Error closing AudioContext:', error);
      } finally {
        audioContext.current = null;
      }
    } else {
      console.warn('audioContext is not defined or already cleared.');
    }
  };

  const handleDisconnect = socket => {
    console.log('User disconnected: ${socket.id}');

    // 각 방에서 해당 소켓 ID 제거
    for (const roomName in rooms) {
      const userIndex = rooms[roomName]?.findIndex(
        user => user.id === socket.id
      );
      if (userIndex !== -1) {
        const userEmail = rooms[roomName][userIndex].email;
        rooms[roomName].splice(userIndex, 1);
        console.log('[Room] ${userEmail} removed from room: ${roomName}');

        // 방에 남은 유저가 없으면 방 정리
        const userCount =
          wsServer.sockets.adapter.rooms.get(roomName)?.size || 0;
        if (userCount === 0) {
          console.log('[Room] Last user left. Cleaning up room: ${roomName}');
          transcribeService.stopTranscribe(roomName); // AWS Transcribe 및 스트림 종료
          roomManager.removeRoom(roomName);
          delete rooms[roomName];
        } else {
          socket.to(roomName).emit('peer_left', userEmail);
          console.log(`${userEmail} has left the room: ${roomName}`);
        }
        break; // 한 방만 찾으면 루프 종료
      }
    }
  };

  const handleLeaveRoom = async () => {
    console.log(`${userInfo.email} leaves room: ${roomName}`);

    try {
      if (socket && screenType.current === 'chat') {
        console.log('Requesting Transcribe termination for room:', roomName);
        socket.emit('stop_transcribe', roomName); // 서버에서 Transcribe 종료 요청
      }
    } catch (error) {
      console.error('Error while stopping Transcribe session:', error);
    }

    try {
      // WebRTC 연결 종료
      if (myPeerConnection.current) {
        console.log('Closing PeerConnection...');
        myPeerConnection.current.close();
        myPeerConnection.current = null;
        console.log('PeerConnection closed successfully.');
      }
    } catch (error) {
      console.error('Error during PeerConnection closure:', error);
    }

    try {
      // 스트림 정리
      if (myStream.current && myStream.current instanceof MediaStream) {
        console.log('Stopping MediaStream tracks...');
        myStream.current.getTracks().forEach(track => track.stop());
        myStream.current = null;
        console.log('MediaStream tracks stopped successfully.');
      }
    } catch (error) {
      console.error('Error while stopping MediaStream tracks:', error);
    }

    try {
      // 소켓 이벤트 정리 및 leave_room 이벤트 전송
      if (socket) {
        console.log('Sending leave_room event to server...');
        socket.off('audio_chunk'); // audio_chunk 리스너 제거
        socket.emit('leave_room', { roomName });

        navigate(`/call/end?roomName=${roomName}`, {
          state: { 
            talkId: talkId.current || null, 
            chatMessages: chatMessages || [] 
          },
        });  
        console.log('leave_room event sent successfully.');
      }
    } catch (error) {
      console.error('Error while sending leave_room event:', error);
    }
  };

  const handleRoomFull = () => {
    showModal(
      <>
        방이 이미 꽉 찼습니다.
        <br />
        통화 홈으로 이동합니다.
      </>,
      () => {
        console.log('Room is full.');
        navigate('/call/home');
      }
    );
  };

  const handlePeerLeft = async peerEmail => {
    console.log(`${peerEmail} has left the room.`);
    showModal(
      <>
        상대방이 통화를 종료했습니다.
        <br />
        종료 화면으로 이동합니다.
      </>,
      async () => {
        // AudioChunk Listener 제거 및 AudioProcessor 정리
        if (screenType.current === 'chat') {
          console.log('Stopping Audio Processor due to peer leave...');
          await handleStopAudioChunk(roomName);
        }

        await handleLeaveRoom();
      }
    );
  };

  // ChatBox에 Transcribe 결과를 표시하는 핸들러
  const handleTranscript = transcript => {
    console.log('Received transcript:', transcript);
    setChatMessages(prev => [
      ...prev,
      { type: 'peer_message', content: transcript },
    ]);
  };

  return (
    <div id="call">
      <video ref={myVideoRef} autoPlay playsInline width="0" height="0" muted />
      <video ref={peerVideoRef} autoPlay playsInline width="0" height="0" />
      <Modal isOpen={modalOpen} onClose={closeModal} message={modalMessage} />
      {!isSelectionLocked ? (
        <CallSetting onConfirm={handleConfirm} />
      ) : screenType.current === 'voice' ? (
        <CallVoiceScreen
          nickname={peerNickname}
          profileImage={peerProfileImage}
          onEndCall={handleLeaveRoom}
        />
      ) : (
        <CallChatScreen
          nickname={peerNickname}
          profileImage={peerProfileImage}
          onEndCall={handleLeaveRoom}
          messages={chatMessages}
          onSendMessage={handleSendMessage}
          recommendations={recommendations}
          clearRecommendations={clearRecommendations}
        />
      )}
    </div>
  );
};

export default CallScreen;
