import React, { useEffect, useState } from 'react';
import './MyPage.css';
import { useUserInfo } from '../context/UserInfoContext';
import axios from 'axios';
import DefaultProfile from '../assets/default-profile.svg';

const MyPage = () => {
    const { userInfo, setUserInfo } = useUserInfo();
    const [profileImage, setProfileImage] = useState(DefaultProfile);
    const [roomDetails, setRoomDetails] = useState([]);

    useEffect(() => {
        const fetchRoomDetails = async () => {
            try {
                const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/v1/details`, {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
                        Accept: 'application/json',
                    },
                });
                setRoomDetails(response.data);
                console.log(response.data);

            } catch (error) {
                console.error("Error fetching room details:", error);
            }
        };
        fetchRoomDetails();
    }, []);

    useEffect(() => {
        const storedUserInfo = localStorage.getItem('userInfo');
        if (storedUserInfo) {
            const parsedUserInfo = JSON.parse(storedUserInfo);
            setUserInfo(parsedUserInfo);
            setProfileImage(parsedUserInfo.profileImage || DefaultProfile);
        }
    }, [setUserInfo]);

    // Todo 상태 관리 함수
    const toggleTodoStatus = async (talkId, todoTitle) => {
        try {
            // roomDetails에서 talkId에 해당하는 항목 찾기
            const updatedDetails = roomDetails.map((detail) => {
                if (detail.talkId === talkId && detail.todoTitle === todoTitle) {
                    // 새로운 상태 계산
                    const newStatus = detail.todoStatus === 'PENDING' ? 'DONE' : 'PENDING';

                    // 클라이언트 상태 업데이트
                    return {
                        ...detail,
                        todoStatus: newStatus, // todoStatus만 업데이트
                    };
                }
                return detail;
            });

            setRoomDetails(updatedDetails); // 클라이언트 상태 업데이트

            // 서버에 상태 업데이트 요청
            const updatedStatus = updatedDetails.find(
                (detail) => detail.talkId === talkId && detail.todoTitle === todoTitle
            ).todoStatus;

            await axios.patch(
                `${import.meta.env.VITE_API_BASE_URL}/api/v1/todo/update`,
                {
                    talkId: talkId,
                    todoTitle: todoTitle,
                    newTodoStatus: updatedStatus,
                },
                {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
                        Accept: 'application/json',
                    },
                }
            );

            console.log(`Todo "${todoTitle}" updated successfully to "${updatedStatus}"`);
        } catch (error) {
            console.error("Error updating todo status:", error);
        }
    };

    const handleLogout = async () => {
        try {
            await axios.post(`${import.meta.env.VITE_API_BASE_URL}/logout`, null, {
                withCredentials: true, // 쿠키 포함
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
                    Accept: 'application/json',
                },
            });

            // 로그아웃 성공 시 localStorage 및 상태 초기화
            localStorage.removeItem('accessToken');
            localStorage.removeItem('userInfo');
            setUserInfo(null);

            // 메인 페이지 또는 로그인 페이지로 리디렉션
            window.location.href = '/';
        } catch (error) {
            console.error('Error during logout:', error);
        }
    };

    return (
        <div className="mypage-container">
            <header className="profile-header">
                <img src={profileImage} alt="Profile" className="my-profile-image" />
                <div className="profile-info">
                    <p className="nickname">{userInfo.nickname || '익명'}</p>
                    <button className="logout-button" onClick={handleLogout}>
                        로그아웃
                    </button>
                </div>
            </header>

            <section className="content">
                {Object.values(
                    roomDetails.reduce((acc, detail) => {
                        if (!acc[detail.talkId]) {
                            acc[detail.talkId] = {
                                talkId: detail.talkId, // talkId 추가
                                receiverName: detail.receiverName,
                                receiverProfileImage: detail.receiverProfileImage == "default" ? DefaultProfile : detail.receiverProfileImage, // Placeholder image
                                talkCreatedAt: detail.talkCreatedAt,
                                todos: [],
                            };
                        }
                        acc[detail.talkId].todos.push({
                            todoTitle: detail.todoTitle,
                            todoStatus: detail.todoStatus,
                        });
                        return acc;
                    }, {})
                ).map((talkDetail, index) => (
                    <div className="chat-card" key={index}>
                        <div className="chat-header">
                            <div className="chat-profile">
                                <img
                                    src={talkDetail.receiverProfileImage}
                                    alt="Profile"
                                    className="profile-icon"
                                />
                                <div className="chat-info">
                                    <p className="chat-title">{`${talkDetail.receiverName}님과의 통화`}</p>
                                    <span className="chat-date">
                                        {(() => {
                                            const date = new Date(talkDetail.talkCreatedAt);
                                            const month = String(date.getMonth() + 1).padStart(2, '0'); // 월
                                            const day = String(date.getDate()).padStart(2, '0'); // 일
                                            const hours = String(date.getHours()).padStart(2, '0'); // 시
                                            const minutes = String(date.getMinutes()).padStart(2, '0'); // 분
                                            return `${month}/${day} ${hours}:${minutes}`; // 최종 포맷
                                        })()}
                                    </span>
                                </div>
                            </div>
                        </div>
                        <div className="task-list">
                            {talkDetail.todos.map((todo, todoIndex) => (
                                <div className="task-item" key={todoIndex}>
                                    <input
                                        type="checkbox"
                                        id={`todo-${todo.todoTitle}`}
                                        checked={todo.todoStatus === 'DONE'}
                                        onChange={() => {
                                            toggleTodoStatus(talkDetail.talkId, todo.todoTitle);
                                        }
                                        }
                                    />
                                    <label
                                        htmlFor={`todo-${todo.todoTitle}`}
                                        className={todo.todoStatus === 'DONE' ? 'checked' : ''}
                                    >
                                        {todo.todoTitle}
                                    </label>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </section>
        </div>
    );
};

export default MyPage;