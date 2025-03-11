import React, { useEffect, useRef, useState, useCallback, memo } from "react";
import { Button, message, Input, Space, Badge, Tooltip, Progress } from "antd";
import {
	PhoneOutlined,
	ReloadOutlined,
	SettingOutlined,
	UserOutlined,
	InfoCircleOutlined,
} from "@ant-design/icons";
import { io, Socket } from "socket.io-client";

// 定义类型
interface P2PConnectionProps {
	localStream: MediaStream | null;
}

interface IceServer {
	urls: string | string[];
	username?: string;
	credential?: string;
}

// 连接状态类型
type ConnectionState =
	| "new"
	| "connecting"
	| "connected"
	| "disconnected"
	| "failed"
	| "closed"
	| "";

const handleError = (message: string, error: any): void => {
	console.error(`${message}:`, error);
};

// 使用React.memo优化组件渲染性能
const P2PConnection: React.FC<P2PConnectionProps> = memo(({ localStream }) => {
	// 从环境变量或配置获取基础URL
	const baseURL = useRef("https://check.znjz.online:3002");

	// 状态管理
	const [isConnected, setIsConnected] = useState(false);
	const [isCalling, setIsCalling] = useState(false);
	const [roomId, setRoomId] = useState("");
	const [connectionState, setConnectionState] = useState<ConnectionState>("");
	const [reconnectAttempts, setReconnectAttempts] = useState(0);
	const [roomUsers, setRoomUsers] = useState<string[]>([]);
	const [selectedUser, setSelectedUser] = useState<string>("");
	const [networkStats, setNetworkStats] = useState<{
		bandwidth?: string;
		latency?: number;
		packetLoss?: number;
	}>({});

	// Refs
	const socketRef = useRef<Socket | null>(null);
	const localVideoRef = useRef<HTMLVideoElement>(null);
	const remoteVideoRef = useRef<HTMLVideoElement>(null);
	const peerConnection = useRef<RTCPeerConnection | null>(null);
	const dataChannel = useRef<RTCDataChannel | null>(null);
	const statsTimerRef = useRef<NodeJS.Timeout | null>(null);
	useEffect(() => {
		if (localVideoRef.current) {
			localVideoRef.current.srcObject = localStream;
		}
	}, []);
	// 获取优化的ICE服务器配置
	const getIceServers = useCallback((): IceServer[] => {
		return [
			{ urls: "stun:stun.l.google.com:19302" },
			{ urls: "stun:stun1.l.google.com:19302" },
			{ urls: "stun:stun2.l.google.com:19302" },
		].filter((server) => server.urls); // 过滤掉没有URL的服务器
	}, []);

	// 设置数据通道
	const setupDataChannel = useCallback((channel: RTCDataChannel) => {
		channel.onopen = () => {
			message.success("数据通道已打开");
			console.log("数据通道已打开");
		};

		channel.onmessage = (event) => {
			try {
				const data = JSON.parse(event.data);
				console.log("收到消息：", data);
				// 处理不同类型的消息
				if (data.type === "chat") {
					message.info(`收到消息: ${data.content}`);
				}
			} catch (error) {
				console.log("收到文本消息：", event.data);
			}
		};

		channel.onerror = (error) => {
			handleError("数据通道错误", error);
		};

		channel.onclose = () => {
			console.log("数据通道已关闭");
		};
	}, []);

	// 收集网络统计信息
	const collectNetworkStats = useCallback(async () => {
		if (!peerConnection.current || connectionState !== "connected") return;

		try {
			const stats = await peerConnection.current.getStats();
			let inboundRtp: any = null;
			let candidatePair: any = null;

			stats.forEach((report) => {
				if (report.type === "inbound-rtp" && report.kind === "video") {
					inboundRtp = report;
				} else if (
					report.type === "candidate-pair" &&
					report.state === "succeeded"
				) {
					candidatePair = report;
				}
			});

			if (inboundRtp && candidatePair) {
				const bandwidth = inboundRtp.bytesReceived
					? `${Math.round((inboundRtp.bytesReceived * 8) / 1000)} kbps`
					: undefined;

				const latency = candidatePair.currentRoundTripTime
					? Math.round(candidatePair.currentRoundTripTime * 1000)
					: undefined;

				const packetLoss =
					inboundRtp.packetsLost && inboundRtp.packetsReceived
						? Math.round(
								(inboundRtp.packetsLost /
									(inboundRtp.packetsLost + inboundRtp.packetsReceived)) *
									100
						  )
						: undefined;

				setNetworkStats({ bandwidth, latency, packetLoss });
			}
		} catch (error) {
			console.error("获取网络统计信息失败:", error);
		}
	}, [connectionState]);

	// 初始化WebRTC连接
	const initPeerConnection = useCallback(() => {
		try {
			const configuration = {
				iceServers: getIceServers(),
				iceTransportPolicy: "all" as RTCIceTransportPolicy,
				bundlePolicy: "max-bundle" as RTCBundlePolicy,
				rtcpMuxPolicy: "require" as RTCRtcpMuxPolicy,
				// 启用ICE重启，允许在连接失败时重新进行ICE协商
				iceRestart: true,
			};

			// 关闭旧连接
			if (peerConnection.current) {
				peerConnection.current.close();
			}

			peerConnection.current = new RTCPeerConnection(configuration);

			// 添加本地流
			if (localStream) {
				localStream.getTracks().forEach((track) => {
					peerConnection.current?.addTrack(track, localStream);
				});
			} else {
				message.warning("未找到本地流，视频/音频功能将不可用");
			}

			// 处理连接状态变化
			peerConnection.current.onconnectionstatechange = () => {
				const newState =
					(peerConnection.current?.connectionState as ConnectionState) || "";
				setConnectionState(newState);
				console.log("连接状态变化:", newState);

				if (newState === "connected") {
					message.success("连接已建立");
					setReconnectAttempts(0);

					// 开始收集网络统计信息
					if (statsTimerRef.current) {
						clearInterval(statsTimerRef.current);
					}
					statsTimerRef.current = setInterval(collectNetworkStats, 2000);
				} else if (newState === "failed") {
					message.error("连接失败");
					if (reconnectAttempts < 3) {
						handleReconnect();
					}
				} else if (newState === "disconnected") {
					message.warning("连接中断，正在尝试恢复...");
				} else if (newState === "closed") {
					if (statsTimerRef.current) {
						clearInterval(statsTimerRef.current);
					}
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
								message.error("远程视频播放失败，请检查浏览器设置");
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
			dataChannel.current = peerConnection.current.createDataChannel(
				"messageChannel",
				{
					ordered: true, // 确保消息按顺序到达
					maxRetransmits: 3, // 消息最多重试3次
				}
			);
			setupDataChannel(dataChannel.current);

			// 接收对方创建的数据通道
			peerConnection.current.ondatachannel = (event) => {
				dataChannel.current = event.channel;
				setupDataChannel(dataChannel.current);
			};

			// 监听ICE候选者
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
				console.log(
					"ICE连接状态：",
					peerConnection.current?.iceConnectionState
				);

				// 当ICE连接失败时尝试重连
				if (peerConnection.current?.iceConnectionState === "failed") {
					console.log("ICE连接失败，尝试重连...");
					if (reconnectAttempts < 3) {
						// 尝试ICE重启而不是完全重连
						if (peerConnection.current && dataChannel.current) {
							try {
								peerConnection.current.restartIce();
								message.info("正在尝试ICE重启...");
							} catch (error) {
								console.error("ICE重启失败:", error);
								handleReconnect();
							}
						} else {
							handleReconnect();
						}
					}
				}
			};

			// 添加ICE收集状态监听
			peerConnection.current.onicegatheringstatechange = () => {
				console.log("ICE收集状态：", peerConnection.current?.iceGatheringState);
			};

			return true;
		} catch (error) {
			handleError("初始化连接失败", error);
			return false;
		}
	}, [
		localStream,
		roomId,
		reconnectAttempts,
		getIceServers,
		setupDataChannel,
		collectNetworkStats,
	]);

	// 发送消息的辅助函数
	const sendMessage = useCallback((message: string) => {
		if (dataChannel.current && dataChannel.current.readyState === "open") {
			try {
				dataChannel.current.send(
					JSON.stringify({
						type: "chat",
						content: message,
						timestamp: new Date().toISOString(),
					})
				);
				return true;
			} catch (error) {
				handleError("发送消息失败", error);
				return false;
			}
		} else {
			handleError("数据通道未打开，无法发送消息", "error!!!");
			return false;
		}
	}, []);

	// 重连机制
	const handleReconnect = useCallback(() => {
		if (reconnectAttempts >= 3) {
			message.error("重连失败，请检查网络连接");
			hangUp();
			return;
		}

		setReconnectAttempts((prev) => prev + 1);
		message.info(`正在尝试重连...(${reconnectAttempts + 1}/3)`);

		// 临时保存状态
		const currentRoomId = roomId;

		// 关闭当前连接
		hangUp();

		// 短暂延迟后重新连接
		setTimeout(() => {
			if (currentRoomId) {
				setRoomId(currentRoomId);
				joinRoom(currentRoomId);
				startCall();
			}
		}, 1000);
	}, [reconnectAttempts, roomId]);

	// 挂断
	const hangUp = useCallback(() => {
		// 停止网络统计收集
		if (statsTimerRef.current) {
			clearInterval(statsTimerRef.current);
			statsTimerRef.current = null;
		}

		// 关闭数据通道
		if (dataChannel.current) {
			try {
				dataChannel.current.close();
			} catch (error) {
				console.error("关闭数据通道失败:", error);
			}
			dataChannel.current = null;
		}

		// 关闭对等连接
		if (peerConnection.current) {
			try {
				peerConnection.current.close();
			} catch (error) {
				console.error("关闭对等连接失败:", error);
			}
			peerConnection.current = null;
		}

		// 清空远程视频
		if (remoteVideoRef.current) {
			remoteVideoRef.current.srcObject = null;
		}

		setIsCalling(false);
		setConnectionState("");
		setNetworkStats({});
	}, []);

	// 初始化Socket连接
	const initSocketConnection = useCallback(() => {
		try {
			if (socketRef.current?.connected) {
				console.log("Socket已连接，跳过初始化");
				return;
			}

			socketRef.current = io(baseURL.current, {
				rejectUnauthorized: false,
				secure: true,
				reconnection: true,
				reconnectionAttempts: 5,
				reconnectionDelay: 1000,
				timeout: 10000,
			});

			// 连接成功
			socketRef.current.on("connect", () => {
				message.success("已连接到信令服务器");
				setIsConnected(true);
				console.log("Socket.io连接成功, ID:", socketRef.current?.id);
			});

			// 连接失败
			socketRef.current.on("connect_error", (error) => {
				console.error("信令服务器连接错误:", error);
				setIsConnected(false);
				message.error("连接信令服务器失败，请检查网络");
			});

			// 断开连接
			socketRef.current.on("disconnect", (reason) => {
				setIsConnected(false);
				console.log("与信令服务器断开连接，原因:", reason);
				message.error("与信令服务器断开连接");

				// 如果不是主动关闭，尝试重新连接
				if (reason !== "io client disconnect") {
					setTimeout(() => {
						initSocketConnection();
					}, 2000);
				}
			});

			// 服务器错误
			socketRef.current.on("error", (error) => {
				message.error(`服务器错误: ${error.message || "未知错误"}`);
				console.error("服务器错误:", error);
			});

			// 房间加入成功
			socketRef.current.on("room-joined", (data) => {
				message.success(`成功加入房间 ${data.roomId}`);
				console.log("加入房间成功:", data);

				// 请求房间内的用户列表
				socketRef.current?.emit("get-room-users", data.roomId);
			});

			// 接收房间用户列表
			socketRef.current.on("room-users", (data) => {
				setRoomUsers(data.users);
				console.log("房间用户列表:", data.users);

				// 如果没有选择用户且有其他用户，自动选择第一个非自己的用户
				if (!selectedUser && data.users.length > 1) {
					const otherUsers = data.users.filter(
						(id: any) => id !== socketRef.current?.id
					);
					if (otherUsers.length > 0) {
						setSelectedUser(otherUsers[0]);
					}
				}
			});

			// 新用户连接
			socketRef.current.on("user-connected", (userId) => {
				message.info(`新用户 ${userId.substring(0, 6)}... 已连接`);
				console.log("新用户连接:", userId);

				// 更新房间用户列表
				socketRef.current?.emit("get-room-users", roomId);
			});

			// 处理offer
			socketRef.current.on("offer", async ({ offer, callerId }) => {
				try {
					console.log("收到offer:", offer);
					message.info("收到通话请求");

					if (!peerConnection.current) {
						const initSuccess = initPeerConnection();
						if (!initSuccess) throw new Error("初始化连接失败");
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
					handleError("处理offer失败", err);
				}
			});

			// 处理answer
			socketRef.current.on("answer", async ({ answer }) => {
				try {
					console.log("收到answer:", answer);
					await peerConnection.current?.setRemoteDescription(
						new RTCSessionDescription(answer)
					);
					message.success("对方已接受通话");
				} catch (err) {
					handleError("处理answer失败", err);
				}
			});

			// 处理ICE候选者
			socketRef.current.on("ice-candidate", async ({ candidate }) => {
				try {
					await peerConnection.current?.addIceCandidate(
						new RTCIceCandidate(candidate)
					);
					console.log("添加ICE候选成功");
				} catch (err) {
					// 忽略非关键ICE错误，这些通常是正常的
					console.warn("添加ICE候选时出现非关键错误:", err);
				}
			});

			// 处理用户断开连接
			socketRef.current.on("user-disconnected", (userId) => {
				message.info(`用户 ${userId.substring(0, 6)}... 已断开连接`);
				console.log("用户断开连接:", userId);

				// 如果正在通话，则挂断
				if (isCalling) {
					hangUp();
				}

				// 更新房间用户列表
				socketRef.current?.emit("get-room-users", roomId);
			});
		} catch (error) {
			handleError("初始化Socket连接失败", error);
		}
	}, [roomId, isCalling, hangUp, initPeerConnection]);

	const joinRoom = useCallback(
		(id?: string) => {
			const roomToJoin = id || roomId;
			if (!roomToJoin) {
				message.warning("请输入房间ID");
				return;
			}

			try {
				// 确保socket连接已初始化
				if (!socketRef.current) {
					initSocketConnection();
				}

				// 发送加入房间请求
				socketRef.current?.emit("join-room", roomToJoin);
				console.log("正在加入房间:", roomToJoin);
			} catch (error) {
				handleError("加入房间失败", error);
			}
		},
		[roomId, initSocketConnection]
	);

	// 开始通话
	const startCall = useCallback(async () => {
		try {
			if (!socketRef.current?.connected) {
				message.error("未连接到信令服务器");
				return;
			}

			if (!roomId) {
				message.warning("请先加入房间");
				return;
			}

			if (!selectedUser) {
				message.warning("请选择一个用户进行通话");
				return;
			}

			// 初始化对等连接
			const initSuccess = initPeerConnection();
			if (!initSuccess) return;

			setIsCalling(true);

			// 创建并发送offer
			const offer = await peerConnection.current?.createOffer({
				offerToReceiveAudio: true,
				offerToReceiveVideo: true,
			});

			await peerConnection.current?.setLocalDescription(offer);

			// 修改：发送offer到特定用户而不是整个房间
			socketRef.current.emit("offer", {
				offer,
				roomId,
				targetId: selectedUser, // 修改为选定的用户ID
			});

			console.log("已发送通话请求到用户:", selectedUser);
			message.info("正在等待对方接受通话...");
		} catch (error) {
			handleError("发起通话失败", error);
			setIsCalling(false);
		}
	}, [roomId, initPeerConnection, selectedUser]);

	// 渲染组件
	return (
		<div className="p-4 bg-gray-100 rounded-lg shadow-md">
			<div className="space-y-4 w-full">
				{/* 连接状态显示 */}
				<div className="flex items-center space-x-4">
					<div className="flex items-center">
						<div
							className={`w-3 h-3 rounded-full mr-2 ${
								isConnected ? "bg-green-500" : "bg-red-500"
							}`}></div>
						<span>{isConnected ? "已连接到服务器" : "未连接"}</span>
					</div>
					{connectionState && (
						<div className="flex items-center">
							<div
								className={`w-3 h-3 rounded-full mr-2 ${
									connectionState === "connected"
										? "bg-green-500"
										: connectionState === "connecting"
										? "bg-blue-500"
										: "bg-red-500"
								}`}></div>
							<span>连接状态: {connectionState}</span>
						</div>
					)}
				</div>

				{/* 房间控制 */}
				<div className="flex space-x-2">
					<div className="relative">
						<span className="absolute inset-y-0 left-0 flex items-center pl-3">
							<UserOutlined className="text-gray-400" />
						</span>
						<Input
							className="pl-10 pr-10"
							placeholder="输入房间ID"
							value={roomId}
							onChange={(e) => setRoomId(e.target.value)}
							style={{ width: 200 }}
							suffix={
								<Tooltip title="输入相同的房间ID以建立连接">
									<InfoCircleOutlined className="text-gray-400" />
								</Tooltip>
							}
						/>
					</div>
					<Button
						type="primary"
						onClick={() => joinRoom()}
						disabled={!roomId || isCalling}
						className={`${
							!roomId || isCalling ? "opacity-50 cursor-not-allowed" : ""
						}`}>
						加入房间
					</Button>
				</div>

				{/* 用户选择 */}
				{roomUsers.length > 1 && (
					<div className="mt-4">
						<h4 className="text-sm font-medium text-gray-700 mb-2">
							选择通话用户:
						</h4>
						<div className="flex flex-wrap gap-2">
							{roomUsers
								.filter((userId) => userId !== socketRef.current?.id)
								.map((userId) => (
									<Button
										key={userId}
										type={selectedUser === userId ? "primary" : "default"}
										onClick={() => setSelectedUser(userId)}
										className={`text-xs ${
											selectedUser === userId ? "bg-blue-500" : "bg-gray-200"
										}`}>
										{userId.substring(0, 6)}...
									</Button>
								))}
						</div>
					</div>
				)}

				{/* 通话控制 */}
				<div className="flex space-x-2">
					<Button
						type="primary"
						icon={<PhoneOutlined />}
						onClick={startCall}
						disabled={!isConnected || !roomId || isCalling || !selectedUser}
						loading={isCalling}
						className={`${
							!isConnected || !roomId || isCalling || !selectedUser
								? "opacity-50 cursor-not-allowed"
								: ""
						}`}>
						{isCalling ? "通话中" : "开始通话"}
					</Button>
					<Button
						danger
						onClick={hangUp}
						disabled={!isCalling}
						className={`${!isCalling ? "opacity-50 cursor-not-allowed" : ""}`}>
						挂断
					</Button>
					<Button
						icon={<ReloadOutlined />}
						onClick={handleReconnect}
						disabled={!isCalling || reconnectAttempts >= 3}
						className={`${
							!isCalling || reconnectAttempts >= 3
								? "opacity-50 cursor-not-allowed"
								: ""
						}`}>
						重新连接 ({reconnectAttempts}/3)
					</Button>
					<Button
						icon={<SettingOutlined />}
						onClick={() =>
							message.info("网络统计：" + JSON.stringify(networkStats))
						}
						disabled={!isCalling}
						className={`${!isCalling ? "opacity-50 cursor-not-allowed" : ""}`}>
						网络状态
					</Button>
				</div>

				{/* 在线用户列表 */}
				{roomUsers.length > 0 && (
					<div className="mt-4 p-3 bg-white rounded-md shadow-sm">
						<h4 className="text-sm font-medium text-gray-700 mb-2">
							在线用户 ({roomUsers.length})
						</h4>
						<ul className="space-y-1">
							{roomUsers.map((userId) => (
								<li
									key={userId}
									className="flex items-center">
									<div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
									<span className="text-sm">
										{userId === socketRef.current?.id
											? "你"
											: userId.substring(0, 6) + "..."}
									</span>
									{userId === socketRef.current?.id && (
										<span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
											你自己
										</span>
									)}
								</li>
							))}
						</ul>
					</div>
				)}

				{/* 网络状态显示 */}
				{isCalling && networkStats.bandwidth && (
					<div className="mt-4 p-3 bg-white rounded-md shadow-sm">
						<h4 className="text-sm font-medium text-gray-700 mb-2">网络状态</h4>
						<div className="flex items-center space-x-4">
							<Tooltip title="带宽">
								<div className="flex items-center">
									<span className="text-blue-500 mr-1">🌐</span>
									<span className="text-sm">{networkStats.bandwidth}</span>
								</div>
							</Tooltip>
							{networkStats.latency && (
								<Tooltip title="延迟">
									<div className="flex items-center">
										<span className="text-yellow-500 mr-1">⏱️</span>
										<span className="text-sm">{networkStats.latency}ms</span>
									</div>
								</Tooltip>
							)}
							{networkStats.packetLoss !== undefined && (
								<Tooltip title="丢包率">
									<div>
										<Progress
											type="circle"
											percent={networkStats.packetLoss}
											width={30}
											format={(percent) => `${percent}%`}
											status={
												networkStats.packetLoss > 10
													? "exception"
													: networkStats.packetLoss > 5
													? "normal"
													: "success"
											}
										/>
									</div>
								</Tooltip>
							)}
						</div>
					</div>
				)}
				{/* 视频显示区域 */}
				<div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
					<div className="relative bg-black rounded-lg overflow-hidden">
						<video
							ref={localVideoRef}
							autoPlay
							playsInline
							muted
							className="w-full h-[225px] object-cover"
						/>
						<div className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white px-2 py-1 text-xs rounded">
							本地视频
						</div>
					</div>
					<div className="relative bg-black rounded-lg overflow-hidden">
						<video
							ref={remoteVideoRef}
							autoPlay
							playsInline
							className="w-full h-[225px] object-cover"
						/>
						<div className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white px-2 py-1 text-xs rounded">
							远程视频
						</div>
						{connectionState !== "connected" && (
							<div className="absolute inset-0 flex items-center justify-center bg-gray-900 bg-opacity-70">
								<div className="text-center">
									<div className="text-white mb-2">
										{connectionState === "connecting" ? (
											<>
												<ReloadOutlined className="animate-spin text-xl mb-2" />
												<div>正在连接...</div>
											</>
										) : (
											<>
												<div className="text-lg">未连接</div>
												<div className="text-xs mt-1">
													请先加入房间并开始通话
												</div>
											</>
										)}
									</div>
								</div>
							</div>
						)}
					</div>
				</div>

				{/* 错误处理和状态提示 */}
				{reconnectAttempts > 0 && (
					<div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
						<div className="flex items-start">
							<InfoCircleOutlined className="text-yellow-500 mr-2 mt-0.5" />
							<div>
								<p className="text-sm text-yellow-700">
									连接不稳定，已尝试重连 {reconnectAttempts} 次
									{reconnectAttempts >= 3 && "，请检查网络或重新加入房间"}
								</p>
							</div>
						</div>
					</div>
				)}

				{/* 调试信息 - 仅在开发环境显示 */}
				{process.env.NODE_ENV === "development" && (
					<div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded-md">
						<details>
							<summary className="text-sm font-medium text-gray-700 cursor-pointer">
								调试信息
							</summary>
							<div className="mt-2 text-xs font-mono whitespace-pre-wrap break-all">
								<div>房间ID: {roomId || "未加入"}</div>
								<div>连接状态: {connectionState || "未初始化"}</div>
								<div>在线用户: {roomUsers.length}</div>
								<div>选中用户: {selectedUser || "未选择"}</div>
								<div>Socket ID: {socketRef.current?.id || "未连接"}</div>
							</div>
						</details>
					</div>
				)}
			</div>
		</div>
	);
});

// 导出组件
export default P2PConnection;
