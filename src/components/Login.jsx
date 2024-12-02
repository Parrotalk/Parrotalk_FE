import React from 'react';
import './Login.css';
import GoogleIcon from '/google-icon.svg';
import KakaoIcon from '/kakao-icon.svg';

const Login = () => {
  const handleSocialLogin = (provider) => {
    const loginUrl = `${import.meta.env.VITE_API_BASE_URL}/oauth2/authorization/${provider}`;

    console.log(`Redirecting to ${provider} login:`, loginUrl);

    // 브라우저를 지정된 소셜 로그인 URL로 리다이렉트
    window.location.href = loginUrl;
  };


  
  return (
    <div className="login-container">
      {/* 구글 로그인 버튼 */}
      <button className="login-button google-login" onClick={() => handleSocialLogin('google')}>
        <img src={GoogleIcon} alt="Google Logo" id="google-logo" />
        구글로 시작하기
      </button>

      {/* 카카오 로그인 버튼 */}
      <button className="login-button kakao-login" onClick={() => handleSocialLogin('kakao')}>
        <img src={KakaoIcon} alt="Kakao Logo" id="kakao-logo" />
        카카오로 시작하기
      </button>
    </div>
  );
};

export default Login;
