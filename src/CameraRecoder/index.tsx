import React, { useState, useEffect, useRef } from "react";
import {
	Camera, // 摄像头图标
	Video, // 视频图标
	Monitor, // 显示器图标
	AlertTriangle, // 警告三角图标
	Settings, // 设置图标
	X, // 关闭图标
	Download, // 下载图标
} from "lucide-react";

// 媒体流状态对象接口
interface StreamState {
	cameraStream: MediaStream | null; // 摄像头媒体流
	screenStream: MediaStream | null; // 屏幕共享媒体流
}

// 分辨率配置选项接口
interface ResolutionOption {
	width: number; // 视频宽度像素值
	height: number; // 视频高度像素值
}

/**
 * 考试监控组件
 * 提供在线考试期间的摄像头监控和屏幕录制功能
 */
const ExamMonitoring: React.FC = () => {
	// ==================== 状态管理 ====================
	const [cameraEnabled, setCameraEnabled] = useState<boolean>(true); // 控制摄像头开关状态
	const [recording, setRecording] = useState<boolean>(false); // 控制屏幕录制状态
	const [screenSwitchCount, setScreenSwitchCount] = useState<number>(0); // 切换标签页计数器
	const [resolution, setResolution] = useState<string>("720p"); // 视频分辨率设置
	const [showSettings, setShowSettings] = useState<boolean>(false); // 设置面板显示控制
	const [showWarning, setShowWarning] = useState<boolean>(false); // 警告弹窗显示控制
	const [recordedChunks, setRecordedChunks] = useState<BlobPart[]>([]); // 存储录制的视频数据块数组

	const [streamState, setStreamState] = useState<StreamState>({
		cameraStream: null, // 摄像头媒体流
		screenStream: null, // 屏幕共享媒体流
	});
	// 音频部分:
	const [isRecordingAudio, setIsRecordingAudio] = useState(false);
	// 修改状态定义 - 将 MediaStream 改为 Blob[] 类型
	const [audioChunks, setaudioChunks] = useState<Blob[]>([]);
	// ==================== Refs ====================
	const videoRef = useRef<HTMLVideoElement | null>(null); // 摄像头视频元素的引用
	const screenVideoRef = useRef<HTMLVideoElement | null>(null); // 屏幕录制视频元素的引用
	const mediaRecorderRef = useRef<MediaRecorder | null>(null); // MediaRecorder对象引用
	const warningTimeoutRef = useRef<number | null>(null); // 警告定时器引用
	const visibilityChangeTimeRef = useRef<string | null>(null); // 标签页切换时间引用
	// 音频部分:
	const audioRecorderRef = useRef<MediaRecorder | null>(null);
	// ==================== 配置项 ====================
	// 分辨率配置选项
	const resolutionOptions: Record<string, ResolutionOption> = {
		"480p": { width: 640, height: 480 },
		"720p": { width: 1280, height: 720 },
		"1080p": { width: 1920, height: 1080 },
	};

	// ==================== 监听标签页切换 ====================
	useEffect(() => {
		/**
		 * 处理页面可见性变化（切换标签页/窗口）
		 */
		const handleVisibilityChange = (): void => {
			if (document.hidden && recording) {
				// 当页面不可见且正在录制时，增加切换计数
				setScreenSwitchCount((prev) => prev + 1);
				setShowWarning(true);

				// 记录可见性变化的时间
				visibilityChangeTimeRef.current = new Date().toISOString();

				// 清除之前的定时器（如果存在）
				if (warningTimeoutRef.current) {
					clearTimeout(warningTimeoutRef.current);
				}

				// 设置3秒后自动关闭警告
				warningTimeoutRef.current = window.setTimeout(() => {
					setShowWarning(false);
				}, 3000);
			}
		};

		// 添加页面可见性变化事件监听器
		document.addEventListener("visibilitychange", handleVisibilityChange);

		// 组件卸载时清理
		return () => {
			document.removeEventListener("visibilitychange", handleVisibilityChange);
			if (warningTimeoutRef.current) {
				clearTimeout(warningTimeoutRef.current);
			}
		};
	}, [recording]);

	// ==================== 摄像头处理 ====================
	/**
	 * 初始化摄像头
	 * 根据当前设置启用或禁用摄像头
	 */
	const initCamera = async (): Promise<void> => {
		try {
			// 如果已存在摄像头流，先停止所有轨道
			if (streamState.cameraStream) {
				streamState.cameraStream.getTracks().forEach((track) => track.stop());
			}

			if (cameraEnabled) {
				// 如果摄像头已启用，获取媒体流
				const stream = await navigator.mediaDevices.getUserMedia({
					video: resolutionOptions[resolution], // 根据选择的分辨率配置
					audio: false, // 不包含音频
				});

				// 将媒体流设置到视频元素
				if (videoRef.current) {
					videoRef.current.srcObject = stream;
				}

				// 更新摄像头流状态
				setStreamState((prev) => ({ ...prev, cameraStream: stream }));
			} else if (videoRef.current) {
				// 如果摄像头禁用，清除视频源
				videoRef.current.srcObject = null;
			}
		} catch (err) {
			// 捕获摄像头访问错误
			console.error("Error accessing camera:", err);
			setCameraEnabled(false);
		}
	};
	//拍照功能:
	const takePhoto = () => {
		if (videoRef.current) {
			//get canvas
			const canvas = document.createElement("canvas");
			canvas.width = videoRef.current.videoWidth;
			canvas.height = videoRef.current.videoHeight;
			//draw Images from Video Source
			const ctx = canvas.getContext("2d");
			ctx?.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
			//not regExp:'2025-01-10T14:38:23.244Z',after regExp:'2025-01-10T14-38-36-810Z'
			const timeStamp = new Date().toISOString().replace(/[:.]/g, "-");
			//download this photo
			const link = document.createElement("a");
			link.download = `photo-${timeStamp}.png`;
			link.href = canvas.toDataURL("image/png");
			link.click();
		}
	};
	//开始音频录制
	const startAudioRecording = async (): Promise<void> => {
		try {
			const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
			const mediaRecorder = new MediaRecorder(stream);

			mediaRecorder.ondataavailable = (event: BlobEvent) => {
				if (event.data.size > 0) {
					setaudioChunks((prev) => [...prev, event.data]);
				}
			};

			mediaRecorder.onstop = () => {
				stream.getTracks().forEach((track) => track.stop());
			};

			mediaRecorder.start();
			audioRecorderRef.current = mediaRecorder;
			setIsRecordingAudio(true);
			setaudioChunks([]); // 初始化为空数组
		} catch (err) {
			console.error("Error starting audio recording:", err);
		}
	};
	const stopAudioRecording = () => {
		if (
			audioRecorderRef.current &&
			audioRecorderRef.current.state !== "inactive"
		) {
			audioRecorderRef.current.stop();
			setIsRecordingAudio(false);
		}
	};
	const saveAudioRecorded = () => {
		if (audioChunks.length === 0) return;
		const blob = new Blob(audioChunks, { type: "audio/webm" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		const timeStamp = new Date().toISOString().replace(/[:.]/g, "-");
		a.href = url;
		a.download = `React游乐场-音频记录-${timeStamp}.webm`;
		a.click();
		URL.revokeObjectURL(url);
	};
	// ==================== 屏幕录制处理 ====================
	/**
	 * 初始化屏幕录制
	 * 获取屏幕共享媒体流并开始录制
	 */
	const initScreenRecording = async (): Promise<void> => {
		try {
			// 如果已存在屏幕流，先停止所有轨道
			if (streamState.screenStream) {
				streamState.screenStream.getTracks().forEach((track) => track.stop());
			}

			// 获取屏幕共享媒体流
			const stream = await navigator.mediaDevices.getDisplayMedia({
				video: resolutionOptions[resolution], // 根据选择的分辨率配置
				audio: true, // 包含音频
			});

			// 监听用户结束屏幕共享事件
			stream.getVideoTracks()[0].onended = () => {
				stopRecording();
			};

			// 将媒体流设置到屏幕视频元素
			if (screenVideoRef.current) {
				screenVideoRef.current.srcObject = stream;
			}

			// 更新屏幕流状态
			setStreamState((prev) => ({ ...prev, screenStream: stream }));

			// 开始录制
			const options = { mimeType: "video/webm; codecs=vp9" }; // 设置视频格式和编码
			const mediaRecorder = new MediaRecorder(stream, options);

			// 设置数据可用时的处理函数
			mediaRecorder.ondataavailable = handleDataAvailable;
			mediaRecorder.start(1000); // 每秒收集一次数据

			// 保存MediaRecorder引用并更新状态
			mediaRecorderRef.current = mediaRecorder;
			setRecording(true);
			setRecordedChunks([]);
		} catch (err) {
			// 捕获屏幕录制错误
			console.error("Error starting screen recording:", err);
		}
	};

	/**
	 * 处理录制的数据块
	 * @param event - 媒体录制器数据事件
	 */
	const handleDataAvailable = (event: BlobEvent): void => {
		if (event.data.size > 0) {
			// 如果数据块大小>0，添加到已录制数据数组中
			setRecordedChunks((prev) => [...prev, event.data]);
		}
	};

	/**
	 * 停止录制
	 * 停止MediaRecorder和所有媒体轨道
	 */
	const stopRecording = (): void => {
		// 停止媒体录制器（如果存在且不是非活动状态）
		if (
			mediaRecorderRef.current &&
			mediaRecorderRef.current.state !== "inactive"
		) {
			mediaRecorderRef.current.stop();
		}

		// 停止屏幕共享媒体轨道并清除状态
		if (streamState.screenStream) {
			streamState.screenStream.getTracks().forEach((track) => track.stop());
			setStreamState((prev) => ({ ...prev, screenStream: null }));
		}

		// 更新录制状态
		setRecording(false);
	};

	/**
	 * 保存录制的视频
	 * 将录制的数据块合并为一个Blob并下载
	 */
	const saveRecording = (): void => {
		if (recordedChunks.length === 0) return; // 如果没有录制数据，直接返回

		// 创建Blob对象
		const blob = new Blob(recordedChunks, { type: "video/webm" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");

		// 添加时间戳到文件名
		const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
		a.href = url;
		a.download = `exam-recording-${timestamp}.webm`;
		a.click(); // 触发下载

		// 释放URL对象
		URL.revokeObjectURL(url);
	};

	/**
	 * 切换录制状态
	 * 如果正在录制则停止，否则开始新录制
	 */
	const toggleRecording = (): void => {
		if (recording) {
			stopRecording();
		} else {
			initScreenRecording();
		}
	};

	// ==================== 生命周期管理 ====================
	// 当组件挂载或设置改变时初始化摄像头
	useEffect(() => {
		initCamera();

		// 组件卸载时清理所有媒体流
		return () => {
			// 停止摄像头流的所有轨道
			if (streamState.cameraStream) {
				streamState.cameraStream.getTracks().forEach((track) => track.stop());
			}
			// 停止屏幕共享流的所有轨道
			if (streamState.screenStream) {
				streamState.screenStream.getTracks().forEach((track) => track.stop());
			}
		};
	}, [cameraEnabled, resolution]); // 依赖于摄像头启用状态和分辨率设置

	// ==================== 渲染UI ====================
	return (
		<div className="flex flex-col h-screen bg-gray-100">
			{/* 头部 */}
			<header className="bg-blue-600 text-white p-4 flex justify-between items-center">
				<h1 className="text-xl font-bold">Online Exam Monitoring</h1>
				<div className="flex items-center gap-4">
					<div className="flex items-center gap-2">
						<Monitor size={20} />
						<span>Switch Count: {screenSwitchCount}</span>
					</div>
					<button
						className="p-2 rounded-full hover:bg-blue-700"
						onClick={() => setShowSettings(!showSettings)}>
						<Settings size={20} />
					</button>
				</div>
			</header>

			{/* 主内容区域 */}
			<div className="flex flex-1 p-4 gap-4">
				{/* 左侧面板 - 摄像头视频 */}
				<div className="w-1/3 bg-white rounded-lg shadow-md p-4 flex flex-col">
					<div className="flex justify-between items-center mb-4">
						<h2 className="text-lg font-semibold flex items-center gap-2">
							<Camera size={20} />
							摄像机区域
						</h2>
						<button
							className={`text-lg px-3 py-1 rounded ${
								cameraEnabled
									? "bg-red-500 text-white"
									: "bg-green-500 text-white"
							}`}
							onClick={() => setCameraEnabled(!cameraEnabled)}>
							{cameraEnabled ? "未激活状态" : "激活状态"}
						</button>
					</div>
					<div className="flex-1 bg-black rounded-lg overflow-hidden relative">
						{cameraEnabled ? (
							<video
								ref={videoRef}
								autoPlay
								muted
								playsInline
								className="w-full h-full object-cover"
							/>
						) : (
							<div className="w-full h-full flex items-center justify-center text-white">
								<Camera size={48} />
								<p className="mt-2">Camera is disabled</p>
							</div>
						)}
					</div>
				</div>

				{/* 右侧面板 - 屏幕录制 */}
				<div className="w-2/3 bg-white rounded-lg shadow-md p-4 flex flex-col">
					<div className="flex justify-between items-center mb-4">
						<h2 className="text-lg font-semibold flex items-center gap-2">
							<Video size={20} />
							屏幕录制
						</h2>
						<div className="flex gap-2">
							<button
								className={`text-lg px-3 py-2 rounded ${
									recording
										? "bg-red-500 text-white"
										: "bg-green-500 text-white"
								}`}
								onClick={toggleRecording}>
								{recording ? "暂停记录" : "开始记录"}
							</button>
							{recordedChunks.length > 0 && !recording && (
								<button
									className="text-sm px-3 py-1 rounded bg-blue-500 text-white flex items-center gap-1"
									onClick={saveRecording}>
									<Download size={16} />
									Save
								</button>
							)}
						</div>
					</div>
					<div className="flex-1 bg-gray-900 rounded-lg overflow-hidden relative">
						{recording ? (
							<video
								ref={screenVideoRef}
								autoPlay
								muted
								playsInline
								className="w-full h-full object-contain"
							/>
						) : (
							<div className="w-full h-full flex flex-col items-center justify-center text-white">
								<Video size={48} />
								<p className="mt-2">
									{recordedChunks.length > 0
										? "Recording completed. Click Save to download."
										: "Click Start Recording to begin screen capture."}
								</p>
							</div>
						)}
					</div>
				</div>
			</div>

			{/* 警告对话框 */}
			{showWarning && (
				<div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
					<div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full">
						<div className="flex items-center gap-3 text-red-500 mb-4">
							<AlertTriangle size={32} />
							<h3 className="text-xl font-bold">Warning!</h3>
						</div>
						<p className="mb-4">
							You have left the exam tab. This action has been recorded.
						</p>
						<p className="mb-4 font-semibold">
							Screen switch count: {screenSwitchCount}
						</p>
						<p className="text-sm text-gray-600 mb-4">
							Time: {visibilityChangeTimeRef.current}
						</p>
						<button
							className="w-full py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
							onClick={() => setShowWarning(false)}>
							Return to Exam
						</button>
					</div>
				</div>
			)}

			{/* 设置面板 */}
			{showSettings && (
				<div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
					<div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full">
						<div className="flex justify-between items-center mb-4">
							<h3 className="text-xl font-bold">Settings</h3>
							<button
								className="text-gray-500 hover:text-gray-700"
								onClick={() => setShowSettings(false)}>
								<X size={24} />
							</button>
						</div>

						<div className="mb-4">
							<label className="block text-sm font-medium text-gray-700 mb-1">
								Resolution
							</label>
							<select
								value={resolution}
								onChange={(e) => setResolution(e.target.value)}
								className="w-full border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500">
								<option value="480p">480p</option>
								<option value="720p">720p</option>
								<option value="1080p">1080p</option>
							</select>
						</div>

						<div className="mb-4">
							<label className="flex items-center">
								<input
									type="checkbox"
									checked={cameraEnabled}
									onChange={() => setCameraEnabled(!cameraEnabled)}
									className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
								/>
								<span className="ml-2 text-sm text-gray-700">
									Enable Camera
								</span>
							</label>
						</div>

						<button
							className="w-full py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
							onClick={() => setShowSettings(false)}>
							Apply Settings
						</button>
					</div>
				</div>
			)}
		</div>
	);
};

export default ExamMonitoring;
