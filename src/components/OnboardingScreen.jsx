import React from 'react';
import Header from '../components/common/Header';
import './OnboardingScreen.css';
import Login from './Login';

const OnboardingScreen = () => {
  // 쿠키에서 refreshToken 체크
  const refreshToken = document.cookie
    .split('; ')
    .find(row => row.startsWith('refreshToken='));

  return (
    <div className="onboarding-container">
      {/* Header */}
      <Header showMyPageButton={false} />

      {/* Body */}
      {!refreshToken && (
        <div className="onboarding-image-container">
          <img
            src="/path/to/how-to-use-image.jpg"
            alt="앵무말 서비스 사용 방법"
            className="onboarding-image"
          />
          <p className="onboarding-description">
            앵무말 서비스를 시작해 보세요. 쉽고 빠르게 소통하세요!
          </p>
        </div>
      )}

      {/* Login 컴포넌트 */}
      <div className="onboarding-login">
        <Login />
      </div>
    </div>
  );
};

export default OnboardingScreen;
