import React, { useEffect, useRef, useState, useCallback } from "react";
import { Button, message, Input, Space, Badge } from "antd";
import { PhoneOutlined, ReloadOutlined } from "@ant-design/icons";
import { io, Socket } from "socket.io-client";

interface P2PConnectionProps {
	localStream: MediaStream | null;
}

const P2PConnectionStore: React.FC<P2PConnectionProps> = ({ localStream }) => {
	const baseURL = useRef("https://check.znjz.online:3002");
	const [isConnected, setIsConnected] = useState(false);
	const [isCalling, setIsCalling] = useState(false);
	const [roomId, setRoomId] = useState("");
	const [connectionState, setConnectionState] = useState<string>("");
	const [reconnectAttempts, setReconnectAttempts] = useState(0);

	const socketRef = useRef<Socket | null>(null);
	const localVideoRef = useRef<HTMLVideoElement>(null);
	const remoteVideoRef = useRef<HTMLVideoElement>(null);
	const peerConnection = useRef<RTCPeerConnection | null>(null);
	const dataChannel = useRef<RTCDataChannel | null>(null);

	// 初始化 WebRTC 连接
	const initPeerConnection = useCallback(() => {
		const configuration = {
			iceServers: [
				{ urls: "stun:stun.l.google.com:19302" },
				{ urls: "stun:stun1.l.google.com:19302" },
				{ urls: "stun:stun2.l.google.com:19302" },
			],
		};

		peerConnection.current = new RTCPeerConnection(configuration);

		// 添加本地流
		if (localStream) {
			localStream.getTracks().forEach((track) => {
				peerConnection.current?.addTrack(track, localStream);
			});
		}

		// 处理连接状态变化
		peerConnection.current.onconnectionstatechange = () => {
			setConnectionState(peerConnection.current?.connectionState || "");

			if (peerConnection.current?.connectionState === "failed") {
				handleReconnect();
			}
		};

		// 处理远程流
		peerConnection.current.ontrack = (event) => {
			console.log("收到远程流:", event.streams);
			if (event.streams && event.streams[0]) {
				if (remoteVideoRef.current) {
					remoteVideoRef.current.srcObject = event.streams[0];

					// 监听视频加载状态
					remoteVideoRef.current.onloadedmetadata = () => {
						console.log("远程视频元数据已加载");
						remoteVideoRef.current?.play().catch((err) => {
							console.error("远程视频播放失败:", err);
						});
					};

					// 监听错误
					remoteVideoRef.current.onerror = (err) => {
						console.error("远程视频错误:", err);
					};
				} else {
					console.error("远程视频元素未找到");
				}
			} else {
				console.error("远程流不可用");
			}
		};

		// 创建数据通道
		dataChannel.current =
			peerConnection.current.createDataChannel("messageChannel");
		setupDataChannel(dataChannel.current);

		// 监听 ICE 候选者
		peerConnection.current.onicecandidate = (event) => {
			if (event.candidate && socketRef.current) {
				socketRef.current.emit("ice-candidate", {
					candidate: event.candidate,
					targetId: roomId,
				});
			}
		};

		// 添加ICE连接状态监听
		peerConnection.current.oniceconnectionstatechange = () => {
			console.log("ICE连接状态：", peerConnection.current?.iceConnectionState);
			// 当ICE连接失败时尝试重连
			if (peerConnection.current?.iceConnectionState === "failed") {
				handleReconnect();
			}
		};
	}, [localStream, roomId]);

	// 设置数据通道
	const setupDataChannel = (channel: RTCDataChannel) => {
		channel.onopen = () => {
			console.log("数据通道已打开");
		};

		channel.onmessage = (event) => {
			console.log("收到消息：", event.data);
		};

		channel.onerror = (error) => {
			console.error("数据通道错误：", error);
		};

		channel.onclose = () => {
			console.log("数据通道已关闭");
		};
	};

	// 重连机制
	const handleReconnect = useCallback(() => {
		if (reconnectAttempts >= 3) {
			message.error("重连失败，请检查网络连接");
			return;
		}

		setReconnectAttempts((prev) => prev + 1);
		hangUp();
		setTimeout(() => {
			startCall();
		}, 1000);
	}, [reconnectAttempts]);

	// 挂断
	const hangUp = () => {
		if (peerConnection.current) {
			peerConnection.current.close();
			peerConnection.current = null;
		}
		if (dataChannel.current) {
			dataChannel.current.close();
			dataChannel.current = null;
		}
		setIsCalling(false);
		setConnectionState("");
	};

	// 初始化 Socket 连接
	useEffect(() => {
		initSocketConnection();

		return () => {
			hangUp();
			socketRef.current?.disconnect();
		};
	}, []);
	const initSocketConnection = useCallback(() => {
		socketRef.current = io(baseURL.current, {
			rejectUnauthorized: false, // 忽略证书验证
			secure: true,
			reconnection: true, // 启用自动重连
			reconnectionAttempts: 5, // 最大重连次数
			reconnectionDelay: 1000, // 重连延迟
		});

		socketRef.current.on("connect", () => {
			message.success("已连接到信令服务器");
			setIsConnected(true);
		});

		socketRef.current.on("disconnect", () => {
			setIsConnected(false);
			message.error("与信令服务器断开连接");
		});

		socketRef.current.on("offer", async ({ offer, callerId }) => {
			try {
				if (!peerConnection.current) {
					initPeerConnection();
				}
				await peerConnection.current?.setRemoteDescription(
					new RTCSessionDescription(offer)
				);
				const answer = await peerConnection.current?.createAnswer();
				await peerConnection.current?.setLocalDescription(answer);

				socketRef.current?.emit("answer", {
					answer,
					callerId,
				});

				setIsCalling(true);
			} catch (err) {
				message.error("处理 offer 失败");
				console.error(err);
			}
		});

		socketRef.current.on("answer", async ({ answer }) => {
			try {
				await peerConnection.current?.setRemoteDescription(
					new RTCSessionDescription(answer)
				);
			} catch (err) {
				message.error("处理 answer 失败");
				console.error(err);
			}
		});

		socketRef.current.on("ice-candidate", async ({ candidate }) => {
			try {
				await peerConnection.current?.addIceCandidate(
					new RTCIceCandidate(candidate)
				);
			} catch (err) {
				message.error("处理 ICE candidate 失败");
				console.error(err);
			}
		});

		socketRef.current.on("user-disconnected", () => {
			message.info("对方已断开连接");
			hangUp();
		});
	}, [initPeerConnection]);

	// 加入房间
	const joinRoom = useCallback(() => {
		if (!roomId) {
			message.warning("请输入房间号");
			return;
		}
		socketRef.current?.emit("join-room", roomId);
		message.success(`已加入房间: ${roomId}`);
	}, [roomId]);

	// 发起呼叫
	const startCall = async () => {
		try {
			if (!isConnected) {
				message.error("未连接到信令服务器");
				return;
			}

			if (!roomId) {
				message.warning("请先加入房间");
				return;
			}

			setIsCalling(true);
			initPeerConnection();

			const offer = await peerConnection.current?.createOffer();
			await peerConnection.current?.setLocalDescription(offer);

			socketRef.current?.emit("offer", {
				offer,
				roomId,
				targetId: roomId,
			});
		} catch (err) {
			message.error("发起呼叫失败");
			console.error(err);
			setIsCalling(false);
		}
	};

	// 渲染连接状态标志
	const renderConnectionState = () => {
		const stateColors: Record<string, string> = {
			new: "default",
			connecting: "processing",
			connected: "success",
			disconnected: "warning",
			failed: "error",
			closed: "default",
		};

		return (
			<Badge
				status={
					stateColors[connectionState as keyof typeof stateColors] as
						| "default"
						| "processing"
						| "success"
						| "warning"
						| "error"
				}
				text={connectionState || "未连接"}
			/>
		);
	};

	// 显示本地视频
	useEffect(() => {
		if (localVideoRef.current && localStream) {
			localVideoRef.current.srcObject = localStream;
		}
	}, [localStream]);

	return (
		<div className="p-4 bg-white rounded-lg shadow-md">
			<div className="flex justify-between items-center mb-4">
				<h2 className="text-lg font-semibold">点对点通信</h2>
				<Space>
					<Input
						placeholder="输入房间号"
						value={roomId}
						onChange={(e) => setRoomId(e.target.value)}
					/>
					<Button
						onClick={joinRoom}
						disabled={!isConnected}>
						加入房间
					</Button>
					<Button
						type={isCalling ? "default" : "primary"}
						icon={<PhoneOutlined />}
						onClick={isCalling ? hangUp : startCall}
						disabled={!roomId || !isConnected}>
						{isCalling ? "挂断" : "呼叫"}
					</Button>
					<Button
						icon={<ReloadOutlined />}
						onClick={handleReconnect}
						disabled={!isCalling}>
						重连
					</Button>
				</Space>
			</div>

			<div className="flex flex-col justify-center items-center gap-4">
				<div className="relative bg-gray-100 rounded-lg overflow-hidden aspect-video">
					<video
						ref={localVideoRef}
						autoPlay
						muted
						playsInline
						className="w-full h-full object-cover"
					/>
					<div className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-xs">
						本地视频
					</div>
				</div>
				<div className="relative bg-gray-100 rounded-lg overflow-hidden aspect-video">
					<video
						ref={remoteVideoRef}
						autoPlay
						playsInline
						className="w-full h-full object-cover"
					/>
					<div className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-xs">
						远程视频
					</div>
				</div>
			</div>

			<div className="mt-4 flex justify-between items-center">
				<p className="text-sm text-gray-600">
					连接状态: {renderConnectionState()}
				</p>
				<p className="text-sm text-gray-600">重连次数: {reconnectAttempts}/3</p>
			</div>
		</div>
	);
};

export default P2PConnectionStore;
