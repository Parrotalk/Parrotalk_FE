import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './EndCallScreen.css';
import CallControl from './CallControl';
import { useSocket } from '../context/SocketContext';
import { usePeer } from '../context/PeerContext';
import api from '../interceptors/LoginInterceptor'; 
import Modal from './common/Modal';

const EndCallScreen = () => {
  const navigate = useNavigate();
  const location = useLocation(); 
  const [todos, setTodos] = useState([]);
  const [checkedTodos, setCheckedTodos] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const socket = useSocket();
  const { peerNickname, setPeerNickname, peerProfileImage, setPeerProfileImage } = usePeer();

  const searchParams = new URLSearchParams(location.search);
  const roomName = searchParams.get('roomName');
  const { talkId, chatMessages } = location.state || {};

  useEffect(() => {
    const handleLeavePage = () => {
      console.log('EndCallScreen 페이지를 떠납니다.');
      setPeerNickname(null);
      setPeerProfileImage(null);
    };
  
    return () => {
      handleLeavePage(); // 컴포넌트를 떠날 때 실행
    };
  }, [roomName, socket]);
  

  useEffect(() => {
    const checkLoginStatus = () => {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        setIsModalOpen(true); // 로그인 상태가 아니면 모달 열기
      }
    };

    checkLoginStatus();
  }, []); // 컴포넌트가 처음 렌더링될 때만 실행

  useEffect(() => {
    const fetchTodos = async () => {
      setIsLoading(true);
      try {
        if (chatMessages && chatMessages.length > 0) {
          const combinedContent = chatMessages.map(msg => msg.content).join(' ');
  
          // Socket을 통해 Node.js 서버로 AI 요약 요청
          socket.emit('request_ai_summary', { roomName, combinedContent });
  
          // 서버에서 반환되는 이벤트를 수신
          socket.on('ai_summary_response', (data) => {
            if (data.success) {
              setTodos(data.todo);
              setCheckedTodos(new Array(data.todo.length).fill(false));
              console.log('AI 요약 완료:', data.todo);
            } else {
              console.error('AI 요약 실패:', data.message);
            }
            setIsLoading(false);
          });
        } else {
          socket.emit('fetch_todo', roomName, response => {
            if (response.success) {
              setTodos(response.todo);
              setCheckedTodos(new Array(response.todo.length).fill(false));
            } else {
              console.error('Todo 데이터 없음:', response.message);
            }
            setIsLoading(false);
          });
        }
      } catch (error) {
        console.error('데이터 요청 중 오류 발생:', error);
        setIsLoading(false);
      }
    };
  
    fetchTodos();
  
    // Clean-up: 이벤트 리스너 제거
    return () => {
      socket.off('ai_summary_response');
    };
  }, [roomName, chatMessages, socket]);
  

  // 체크박스 상태 업데이트
  const handleCheckboxChange = index => {
    const newCheckedTodos = [...checkedTodos];
    newCheckedTodos[index] = !newCheckedTodos[index];
    setCheckedTodos(newCheckedTodos);
  };
  const handleModalClose = () => {
    setIsModalOpen(false);
  };

  const handleConfirm = async () => {
    const selectedTodos = todos.filter((_, index) => checkedTodos[index]);

    const accessToken = localStorage.getItem('accessToken');

    if (selectedTodos.length === 0) {
      navigate('/call/home');
      return;
    }

    try {
      // 서버로 요청 데이터 전송
      const response = await api.post(
        '/api/v1/todo/create',
        {
          todos: selectedTodos,
          talk: { talkId: talkId },
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: 'application/json',
          },
        }
      );

      console.log('서버 응답:', response.data);
      navigate('/call/home');
    } catch (error) {
      console.error('Todo 저장 중 오류 발생:', error);
    }
  };

  return (
    <div className="end-call-screen">
      <CallControl nickname={peerNickname} profileImage={peerProfileImage} />
      <div className="summary-todo">
        <h3>앵픽된 Todo</h3>
        {isLoading ? (
          <p>로딩 중입니다...</p>
        ) : todos.length > 0 ? (
          <ul>
            {todos.map((todo, index) => (
              <li key={index}>
                <label>
                  <input
                    type="checkbox"
                    checked={checkedTodos[index]}
                    onChange={() => handleCheckboxChange(index)}
                  />
                  {todo}
                </label>
              </li>
            ))}
          </ul>
        ) : (
          <p id="notodo">Todo가 없습니다.</p>
        )}
      </div>
      <button className="select-button" onClick={handleConfirm}>
        선택 항목 기록하기
      </button>
      <Modal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        message={
          <>
            로그인 하시면
            <br />
            통화 요약을 쓸 수 있어요!
          </>
        }
      />
    </div>
  );
};

export default EndCallScreen;
