import React, { useEffect, useRef, useState } from 'react';
import './ChatBox.css';

const ChatBox = ({
  messages,
  onSendMessage,
  recommendations,
  clearRecommendations,
}) => {
  const [localRecommendations, setLocalRecommendations] =
    useState(recommendations);
  const chatInputRef = useRef();
  const messagesEndRef = useRef();

  useEffect(() => {
    const buttons = document.querySelectorAll('.recommendation-button');
    buttons.forEach(button => {
      if (button.scrollWidth > button.clientWidth) {
        button.classList.add('marquee');
      } else {
        button.classList.remove('marquee');
      }
    });
  }, [recommendations]);

  const sendMessage = message => {
    if (message.trim()) {
      onSendMessage(message);
      setLocalRecommendations([]); // 전송 시 추천 문구 제거
    }
  };

  const handleSendButtonClick = () => {
    const message = chatInputRef.current.value.trim();
    if (message) {
      sendMessage(message);
      chatInputRef.current.value = '';
    }
  };

  const handleRecommendationClick = rec => {
    sendMessage(rec);
    clearRecommendations();
    setLocalRecommendations([]); // 클릭 시 추천 문구 제거
  };

  // 추천 문구 변경 시 업데이트
  useEffect(() => {
    setLocalRecommendations(recommendations);
  }, [recommendations]);

  // 메시지 추가 시 자동 스크롤
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  return (
    <div className="chat-box">
      {/* 메시지 영역 */}
      <div className="chat-messages">
        {messages.map((msg, idx) => (
          <div key={idx} className={`chat-message ${msg.type}`}>
            <span className="message-bubble">{msg.content}</span>
          </div>
        ))}
        <div ref={messagesEndRef}></div>
      </div>

      {/* 추천 버튼과 입력창 영역 */}
      <div className="chat-input-container">
        {recommendations.length > 0 && (
          <div className="chat-recommendations">
            {recommendations.map((rec, idx) => (
              <button
                key={idx}
                className="recommendation-button"
                onClick={() => handleRecommendationClick(rec)}
              >
                {rec}
              </button>
            ))}
          </div>
        )}

        <form
          className="chat-input-form"
          onSubmit={e => {
            e.preventDefault();
            handleSendButtonClick();
          }}
        >
          <input
            className="chat-input"
            type="text"
            placeholder="메시지를 입력하세요..."
            ref={chatInputRef}
          />
          <button type="submit" className="send-button">
            전송
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatBox;
