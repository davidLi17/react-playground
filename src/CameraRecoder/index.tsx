import React, { useState, useEffect, useRef, useCallback } from "react";
import { Allotment } from "allotment";
import "allotment/dist/style.css";
import { Button } from "antd";
import { throttle } from "lodash";
import { CameraOutlined, AudioOutlined, SaveOutlined } from "@ant-design/icons";
import {
	Camera,
	Video,
	Monitor,
	AlertTriangle,
	Settings,
	X,
	Download,
} from "lucide-react";
import P2PConnection from "./components/P2PConnection";

// 媒体流状态接口
interface StreamState {
	cameraStream: MediaStream | null;
	screenStream: MediaStream | null;
}

// 分辨率选项接口
interface ResolutionOption {
	width: number;
	height: number;
}

/**
 * 考试监控组件
 * 提供在线考试期间的摄像头监控、屏幕录制和音频录制功能
 */
const ExamMonitoring: React.FC = () => {
	// 状态管理
	const [streamState, setStreamState] = useState<StreamState>({
		cameraStream: null,
		screenStream: null,
	});
	const [cameraEnabled, setCameraEnabled] = useState(true);
	const [recording, setRecording] = useState(false);
	const [isRecordingAudio, setIsRecordingAudio] = useState(false);
	const [screenSwitchCount, setScreenSwitchCount] = useState(0);
	const [resolution, setResolution] = useState("720p");
	const [showSettings, setShowSettings] = useState(false);
	const [showWarning, setShowWarning] = useState(false);
	const [recordedChunks, setRecordedChunks] = useState<BlobPart[]>([]);
	const [audioChunks, setAudioChunks] = useState<Blob[]>([]);
	const [audioVolume, setAudioVolume] = useState(0);

	// Refs
	const videoRef = useRef<HTMLVideoElement>(null);
	const screenVideoRef = useRef<HTMLVideoElement>(null);
	const mediaRecorderRef = useRef<MediaRecorder | null>(null);
	const audioRecorderRef = useRef<MediaRecorder | null>(null);
	const warningTimeoutRef = useRef<number | null>(null);
	const visibilityChangeTimeRef = useRef<string | null>(null);
	const audioContextRef = useRef<AudioContext | null>(null);
	const analyserRef = useRef<AnalyserNode | null>(null);
	const animationFrameRef = useRef<number | null>(null);

	// 配置项
	const webTitle = "React游乐场";
	const resolutionOptions: Record<string, ResolutionOption> = {
		"480p": { width: 640, height: 480 },
		"720p": { width: 1280, height: 720 },
		"1080p": { width: 1920, height: 1080 },
		"2k": { width: 2560, height: 1440 },
	};

	// 工具函数
	const stopTracks = (stream: MediaStream | null) => {
		stream?.getTracks().forEach((track) => track.stop());
	};

	// 摄像头初始化
	const initCamera = useCallback(async () => {
		try {
			stopTracks(streamState.cameraStream);
			if (cameraEnabled) {
				const stream = await navigator.mediaDevices.getUserMedia({
					video: resolutionOptions[resolution],
					audio: true,
				});
				if (videoRef.current) {
					videoRef.current.srcObject = stream;
				}
				setStreamState((prev) => ({ ...prev, cameraStream: stream }));
			} else if (videoRef.current) {
				videoRef.current.srcObject = null;
			}
		} catch (err) {
			console.error("Error accessing camera:", err);
			setCameraEnabled(false);
		}
	}, [cameraEnabled, resolution]);

	// 拍照功能
	const takePhoto = useCallback(() => {
		if (!videoRef.current) return;
		const canvas = document.createElement("canvas");
		canvas.width = videoRef.current.videoWidth;
		canvas.height = videoRef.current.videoHeight;
		const ctx = canvas.getContext("2d");
		ctx?.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
		const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
		const link = document.createElement("a");
		link.download = `${webTitle}-拍照记录-${timestamp}.png`;
		link.href = canvas.toDataURL("image/png");
		link.click();
	}, []);

	// 屏幕录制初始化
	const initScreenRecording = useCallback(async () => {
		try {
			setRecordedChunks([]);
			setRecording(true);
			stopTracks(streamState.screenStream);
			const stream = await navigator.mediaDevices.getDisplayMedia({
				video: resolutionOptions[resolution],
				audio: true,
			});
			stream.getVideoTracks()[0].onended = stopRecording;
			if (screenVideoRef.current) {
				screenVideoRef.current.srcObject = stream;
				await screenVideoRef.current.play();
			}
			setStreamState((prev) => ({ ...prev, screenStream: stream }));
			const mediaRecorder = new MediaRecorder(stream, {
				mimeType: "video/webm; codecs=vp9",
			});
			mediaRecorder.ondataavailable = (event) => {
				if (event.data.size > 0)
					setRecordedChunks((prev) => [...prev, event.data]);
			};
			mediaRecorder.start(1000);
			mediaRecorderRef.current = mediaRecorder;
		} catch (err) {
			console.error("Error starting screen recording:", err);
			setRecording(false);
		}
	}, [resolution]);

	// 停止屏幕录制
	const stopRecording = useCallback(() => {
		if (
			mediaRecorderRef.current &&
			mediaRecorderRef.current.state !== "inactive"
		) {
			mediaRecorderRef.current.stop();
		}
		stopTracks(streamState.screenStream);
		setStreamState((prev) => ({ ...prev, screenStream: null }));
		setRecording(false);
	}, [streamState.screenStream]);

	// 保存录制视频
	const saveRecording = useCallback(() => {
		if (recordedChunks.length === 0) return;
		const blob = new Blob(recordedChunks, { type: "video/webm" });
		const url = URL.createObjectURL(blob);
		const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
		const a = document.createElement("a");
		a.href = url;
		a.download = `${webTitle}-录屏-${timestamp}.webm`;
		a.click();
		URL.revokeObjectURL(url);
	}, [recordedChunks]);

	// 音频录制相关
	const startVolumeMonitoring = useCallback((stream: MediaStream) => {
		const audioContext = new AudioContext();
		const analyser = audioContext.createAnalyser();
		const microphone = audioContext.createMediaStreamSource(stream);
		analyser.fftSize = 256;
		microphone.connect(analyser);
		const dataArray = new Uint8Array(analyser.frequencyBinCount);
		const throttledSetVolume = throttle(
			(volume: number) => setAudioVolume(volume),
			180
		);

		const updateVolume = () => {
			analyser.getByteFrequencyData(dataArray);
			const volume = Math.floor(
				((dataArray.reduce((a, b) => a + b) / dataArray.length) * 100) / 256
			);
			throttledSetVolume(volume);
			animationFrameRef.current = requestAnimationFrame(updateVolume);
		};

		updateVolume();
		audioContextRef.current = audioContext;
		analyserRef.current = analyser;
	}, []);

	const startAudioRecording = useCallback(async () => {
		try {
			setIsRecordingAudio(true);
			setAudioChunks([]);
			const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
			const mediaRecorder = new MediaRecorder(stream);
			mediaRecorder.ondataavailable = (event) => {
				if (event.data.size > 0)
					setAudioChunks((prev) => [...prev, event.data]);
			};
			mediaRecorder.onstop = () => stopTracks(stream);
			mediaRecorder.start();
			audioRecorderRef.current = mediaRecorder;
			startVolumeMonitoring(stream);
		} catch (err) {
			console.error("Error starting audio recording:", err);
			setIsRecordingAudio(false);
		}
	}, []);

	const stopAudioRecording = useCallback(() => {
		if (
			audioRecorderRef.current &&
			audioRecorderRef.current.state !== "inactive"
		) {
			audioRecorderRef.current.stop();
			setIsRecordingAudio(false);
			if (animationFrameRef.current)
				cancelAnimationFrame(animationFrameRef.current);
			if (audioContextRef.current) audioContextRef.current.close();
			setAudioVolume(0);
		}
	}, []);

	const saveAudioRecording = useCallback(() => {
		if (audioChunks.length === 0) return;
		const blob = new Blob(audioChunks, { type: "audio/webm" });
		const url = URL.createObjectURL(blob);
		const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
		const a = document.createElement("a");
		a.href = url;
		a.download = `${webTitle}-音频记录-${timestamp}.webm`;
		a.click();
		URL.revokeObjectURL(url);
	}, [audioChunks]);

	// 副作用管理
	useEffect(() => {
		initCamera();
		return () => stopTracks(streamState.cameraStream);
	}, [initCamera]);

	useEffect(() => {
		const handleVisibilityChange = () => {
			if (document.hidden && recording) {
				setScreenSwitchCount((prev) => prev + 1);
				setShowWarning(true);
				visibilityChangeTimeRef.current = new Date().toISOString();
				if (warningTimeoutRef.current) clearTimeout(warningTimeoutRef.current);
				warningTimeoutRef.current = window.setTimeout(
					() => setShowWarning(false),
					3000
				);
			}
		};
		document.addEventListener("visibilitychange", handleVisibilityChange);
		return () => {
			document.removeEventListener("visibilitychange", handleVisibilityChange);
			if (warningTimeoutRef.current) clearTimeout(warningTimeoutRef.current);
		};
	}, [recording]);

	useEffect(() => {
		const handleBlur = () => {
			if (recording) {
				setScreenSwitchCount((prev) => prev + 1);
				setShowWarning(true);
				visibilityChangeTimeRef.current = new Date().toISOString();
			}
		};
		window.addEventListener("blur", handleBlur);
		return () => window.removeEventListener("blur", handleBlur);
	}, [recording]);

	// 渲染
	return (
		<div className="flex flex-col h-[100vh] bg-gray-100">
			<header className="bg-blue-600 text-white p-4 flex justify-between items-center">
				<h1 className="text-xl font-bold">在线考试监测系统</h1>
				<div className="flex items-center gap-4">
					<div className="flex items-center gap-2">
						<Monitor size={30} />
						<span>切屏次数: {screenSwitchCount}</span>
					</div>
					<button
						className="p-2 rounded-full hover:bg-blue-700 flex items-center"
						onClick={() => setShowSettings(!showSettings)}>
						<Settings size={30} />
						<span className="ml-2">设置</span>
					</button>
				</div>
			</header>

			<Allotment className="flex-1">
				<Allotment.Pane minSize={300}>
					<CameraView
						cameraEnabled={cameraEnabled}
						streamState={streamState}
						videoRef={videoRef as React.RefObject<HTMLVideoElement>}
						takePhoto={takePhoto}
						isRecordingAudio={isRecordingAudio}
						startAudioRecording={startAudioRecording}
						stopAudioRecording={stopAudioRecording}
						saveAudioRecording={saveAudioRecording}
						audioVolume={audioVolume}
						setCameraEnabled={setCameraEnabled}
						audioChunks={audioChunks}
					/>
				</Allotment.Pane>
				<Allotment.Pane>
					<P2PConnection localStream={streamState.cameraStream} />
				</Allotment.Pane>
				<Allotment.Pane snap>
					<ScreenRecordingView
						recording={recording}
						streamState={streamState}
						screenVideoRef={screenVideoRef as React.RefObject<HTMLVideoElement>}
						toggleRecording={() =>
							recording ? stopRecording() : initScreenRecording()
						}
						saveRecording={saveRecording}
						recordedChunks={recordedChunks}
					/>
				</Allotment.Pane>
			</Allotment>

			{showWarning && (
				<WarningDialog
					screenSwitchCount={screenSwitchCount}
					visibilityChangeTime={visibilityChangeTimeRef.current}
					onClose={() => setShowWarning(false)}
				/>
			)}

			{showSettings && (
				<SettingsPanel
					resolution={resolution}
					setResolution={setResolution}
					cameraEnabled={cameraEnabled}
					setCameraEnabled={setCameraEnabled}
					resolutionOptions={resolutionOptions}
					onClose={() => setShowSettings(false)}
				/>
			)}
		</div>
	);
};

// 子组件：摄像头视图
const CameraView: React.FC<{
	cameraEnabled: boolean;
	streamState: StreamState;
	videoRef: React.RefObject<HTMLVideoElement>;
	takePhoto: () => void;
	isRecordingAudio: boolean;
	startAudioRecording: () => void;
	stopAudioRecording: () => void;
	saveAudioRecording: () => void;
	audioVolume: number;
	setCameraEnabled: (value: boolean) => void;
	audioChunks: Blob[];
}> = ({
	cameraEnabled,
	streamState,
	videoRef,
	takePhoto,
	isRecordingAudio,
	startAudioRecording,
	stopAudioRecording,
	saveAudioRecording,
	audioVolume,
	setCameraEnabled,
	audioChunks,
}) => (
	<div className="w-full h-full bg-white rounded-lg shadow-md p-4 flex flex-col">
		<div className="flex justify-between items-center mb-4 flex-wrap">
			<h2 className="text-lg font-semibold flex items-center gap-2 mb-2">
				<Camera size={20} />
				摄像机区域
			</h2>
			<div className="flex flex-wrap gap-4">
				<Button
					type="primary"
					icon={<CameraOutlined />}
					onClick={takePhoto}>
					拍照
				</Button>
				{isRecordingAudio ? (
					<Button
						danger
						icon={<AudioOutlined />}
						onClick={stopAudioRecording}>
						停止录音
					</Button>
				) : (
					<Button
						type="primary"
						icon={<AudioOutlined />}
						onClick={startAudioRecording}>
						开始录音
					</Button>
				)}
				<Button
					type="default"
					icon={<SaveOutlined />}
					onClick={saveAudioRecording}
					disabled={audioChunks.length === 0}>
					保存录音
				</Button>
				{isRecordingAudio && (
					<div className="flex items-center gap-2">
						<div className="h-2 w-32 bg-gray-200 rounded-full overflow-hidden">
							<div
								className="h-full bg-blue-500 transition-all duration-100"
								style={{ width: `${audioVolume}%` }}
							/>
						</div>
						<span className="text-sm text-gray-600">{audioVolume}%</span>
					</div>
				)}
				<button
					className={`whitespace-nowrap px-3 py-1 rounded ${
						cameraEnabled ? "bg-green-500 text-white" : "bg-red-500 text-white"
					}`}
					onClick={() => setCameraEnabled(!cameraEnabled)}>
					{cameraEnabled ? "激活状态" : "未激活状态"}
				</button>
			</div>
		</div>
		<div className="flex-1 bg-black rounded-lg overflow-hidden relative">
			{cameraEnabled ? (
				<video
					ref={videoRef}
					autoPlay
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
);

// 子组件：屏幕录制视图
const ScreenRecordingView: React.FC<{
	recording: boolean;
	streamState: StreamState;
	screenVideoRef: React.RefObject<HTMLVideoElement>;
	toggleRecording: () => void;
	saveRecording: () => void;
	recordedChunks: BlobPart[];
}> = ({
	recording,
	streamState,
	screenVideoRef,
	toggleRecording,
	saveRecording,
	recordedChunks,
}) => (
	<div className="w-full h-full bg-white rounded-lg shadow-md p-4 flex flex-col">
		<div className="flex justify-between items-center mb-4">
			<h2 className="text-lg font-semibold flex items-center gap-2">
				<Video size={20} />
				屏幕录制
			</h2>
			<div className="flex gap-2">
				<button
					className={`text-lg px-3 py-2 rounded ${
						recording ? "bg-green-500 text-white" : "bg-red-500 text-white"
					}`}
					onClick={toggleRecording}>
					{recording ? "正在记录" : "开始记录"}
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
);

// 子组件：警告对话框
const WarningDialog: React.FC<{
	screenSwitchCount: number;
	visibilityChangeTime: string | null;
	onClose: () => void;
}> = ({ screenSwitchCount, visibilityChangeTime, onClose }) => (
	<div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
		<div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full">
			<div className="flex items-center gap-3 text-red-500 mb-4">
				<AlertTriangle size={32} />
				<h3 className="text-xl font-bold">警告！</h3>
			</div>
			<p className="mb-4">您已离开考试页面，此行为已被记录。</p>
			<p className="mb-4 font-semibold">切换次数: {screenSwitchCount}</p>
			<p className="text-sm text-gray-600 mb-4">
				记录时间: {visibilityChangeTime}
			</p>
			<button
				className="w-full py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
				onClick={onClose}>
				返回考试
			</button>
		</div>
	</div>
);

// 子组件：设置面板
const SettingsPanel: React.FC<{
	resolution: string;
	setResolution: (value: string) => void;
	cameraEnabled: boolean;
	setCameraEnabled: (value: boolean) => void;
	resolutionOptions: Record<string, ResolutionOption>;
	onClose: () => void;
}> = ({
	resolution,
	setResolution,
	cameraEnabled,
	setCameraEnabled,
	resolutionOptions,
	onClose,
}) => (
	<div className="fixed inset-0 flex items-center justify-center z-50 bg-gray-50/50">
		<div className="bg-white rounded-lg shadow-lg max-w-[35vh] max-h-[25vh] h-full w-full p-6 flex flex-col">
			<div className="flex justify-between items-center mb-8">
				<h3 className="text-2xl font-bold">设置面板</h3>
				<button
					className="text-gray-500 hover:text-gray-700"
					onClick={onClose}>
					<X size={32} />
				</button>
			</div>
			<div className="mb-6">
				<label className="block text-lg font-medium text-gray-700 mb-2">
					分辨率设置
				</label>
				<select
					value={resolution}
					onChange={(e) => setResolution(e.target.value)}
					className="w-full border-2 border-gray-300 rounded-lg py-2 px-3 text-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
					{Object.entries(resolutionOptions).map(([key, value]) => (
						<option
							key={key}
							value={key}>
							{key} ({value.width} x {value.height})
						</option>
					))}
				</select>
			</div>
			<div className="mb-6">
				<label className="flex items-center">
					<input
						type="checkbox"
						checked={cameraEnabled}
						onChange={() => setCameraEnabled(!cameraEnabled)}
						className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
					/>
					<span className="ml-2 text-lg text-gray-700">激活摄像头</span>
				</label>
			</div>
			<button
				className="w-full py-3 bg-blue-500 text-white text-lg font-semibold rounded-lg hover:bg-blue-600"
				onClick={onClose}>
				Apply Settings
			</button>
		</div>
	</div>
);

export default ExamMonitoring;
