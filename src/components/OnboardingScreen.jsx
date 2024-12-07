import React, { useEffect, useRef } from 'react';
import Header from '../components/common/Header';
import './OnboardingScreen.css';
import Login from './Login';
import lottie from 'lottie-web';
import animationData from '../assets/lottie/onboarding.json';

const OnboardingScreen = () => {
  const animationContainer = useRef(null);

  useEffect(() => {
    const animation = lottie.loadAnimation({
      container: animationContainer.current,
      renderer: 'svg',
      loop: true,
      autoplay: true,
      animationData,
    });

    return () => {
      animation.destroy(); // Cleanup 애니메이션
    };
  }, []);

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
          <div ref={animationContainer} className="onboarding-lottie"></div>
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
