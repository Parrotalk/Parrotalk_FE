import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import EndCallIcon from '../assets/decline-button.svg';
import DefaultProfile from '../assets/default-profile.svg';
import './CallControl.css';

const CallControl = ({ nickname, profileImage, onEndCall }) => {
  const location = useLocation();
  const isEndCallScreen = location.pathname === '/call/end';
  const resolvedProfileImage = profileImage || DefaultProfile;

  // displayName을 React 상태로 관리
  const [displayName, setDisplayName] = useState('');

  useEffect(() => {
    if (isEndCallScreen) {
      if (!nickname) {
        setDisplayName('비정상적 종료!');
      } else {
        setDisplayName(`${nickname}님과의 통화 종료!`);
      }
    } else {
      if (!nickname) {
        setDisplayName('익명님과 통화 중');
      } else {
        setDisplayName(`${nickname}님과 통화 중`);
      }
    }
  }, [nickname, isEndCallScreen]);

  return (
    <div className="call-control">
      <div className="call-control-left">
        <img
          src={resolvedProfileImage}
          alt="Profile"
          className="call-control-profile"
          onError={e => {
            e.target.onerror = null;
            e.target.src = DefaultProfile;
          }}
        />        
        <span className="call-control-nickname">
          {displayName}
        </span>
      </div>
      {!isEndCallScreen && (
        <button className="call-control-end-button" onClick={onEndCall}>
          <img src={EndCallIcon} alt="End Call" />
        </button>
      )}
    </div>
  );
};

export default CallControl;
