import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ShareButton from './ShareButton';
import { useSocket } from '../context/SocketContext';
import PhoneIcon from '../assets/phone-icon.svg';
import DefaultProfile from '../assets/default-profile.svg';
import './CallHomeScreen.css';
import { useUserInfo } from '../context/UserInfoContext';
import axios from 'axios';

const CallHomeScreen = () => {
  const [roomLink, setRoomLink] = useState('');
  const [createButtonText, setCreateButtonText] = useState('방 생성');
  const navigate = useNavigate();
  const socket = useSocket();
  const { userInfo, setUserInfo } = useUserInfo();

  const fetchUserInfo = async (accessToken) => {
    try {
      const response = await axios.get(
        `${import.meta.env.VITE_API_BASE_URL}/api/v1/user/info`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: 'application/json',
          },
        }
      );
      const data = response.data;
      console.log(data);
      setUserInfo({
        nickname: data.nickname,
        email: data.email,
        profileImage: data.profileImage
      });
      localStorage.setItem('userInfo', JSON.stringify(data));
      
    } catch (error) {
      console.error('Error fetching user info:', error);
    }
  };

  const fetchToken = async () => {
    try {
      const response = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL}/api/v1/auth/access`,
        {},
        {
          withCredentials: true, // 쿠키 포함
        }
      );

      const accessToken = response.headers['authorization']?.replace('Bearer ', '');
      if (accessToken) {
        localStorage.setItem('accessToken', accessToken);
        console.log('Access Token 저장 완료:', accessToken);
        await fetchUserInfo(accessToken);
      }
    } catch (error) {
      console.error('Fetch Error:', error);
    }
  };

  useEffect(() => {
    fetchToken();
  }, []);

  const handleCreateRoom = () => {
    socket.emit('create_room', (roomName) => {
      const link = `${window.location.origin}/call/${roomName}`;
      setRoomLink(link);
      console.log('Room created with link:', link);
      setCreateButtonText('방 생성 완료!');
    });
  };

  const handleJoinRoom = () => {
    if (roomLink) {
      const roomName = roomLink.split('/').pop();
      const email = userInfo.email;
      
      try {
        axios.post(
          `${import.meta.env.VITE_API_BASE_URL}/api/v1/talk/create`,
          {
            roomName: roomName
          },
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
              Accept: 'application/json',
            },
          }
        )
        .then((response) => {
          console.log(response);
          navigate(`/call/${roomName}?talkId=${response.data}`, {
            state: { email },
          });
        });
      } catch (error) {
        console.error('Error creating room in DB:', error);
      }
    }
  };

  return (
    <div className='call-home-view'>
      <div className="call-home-container">
        <div className="profile-section">
          <img src={userInfo.profileImage} alt="Default Profile" className="profile-picture" />
          <div className="profile-info">
            <span className="nickname">{userInfo.nickname || '익명'}</span>
            <button
              type="button"
              className="create-room-button"
              onClick={handleCreateRoom}
            >
              <img src={PhoneIcon} alt="Phone Icon" className="phone-icon" />
              <span className="phone-text">{createButtonText}</span>
            </button>
          </div>
        </div>

        {roomLink && (
          <div className="room-link-container">
            <p className="room-link-title">통화 코드</p>
            <div className="room-code">{roomLink.split('/').pop()}</div>
            <div className="button-group">
              <ShareButton roomLink={roomLink} className="custom-button" />
              <button
                type="button"
                className="join-room-button"
                onClick={handleJoinRoom}
              >
                통화 시작
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CallHomeScreen;
