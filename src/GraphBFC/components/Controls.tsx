import React from "react";

interface ControlsProps {
	algorithm: string;
	setAlgorithm: (value: string) => void;
	speed: number;
	setSpeed: (value: number) => void;
	isRunning: boolean;
	setIsRunning: (value: boolean) => void;
	setReset: (value: boolean) => void;
	isDarkMode: boolean;
	setIsDarkMode: (value: boolean) => void;
	isEditMode: boolean;
	setIsEditMode: (value: boolean) => void;
}

const Controls = ({
	algorithm,
	setAlgorithm,
	speed,
	setSpeed,
	isRunning,
	setIsRunning,
	setReset,
	isDarkMode,
	setIsDarkMode,
	isEditMode,
	setIsEditMode,
}) => {
	const handleToggleRunning = () => {
		if (isRunning) {
			setIsRunning(false);
		} else {
			setReset(true);
			setTimeout(() => setIsRunning(true), 100);
		}
	};

	return (
		<div className="flex flex-wrap gap-4 mb-5">
			<div className="flex items-center gap-2">
				<label className="font-medium">Algorithm:</label>
				<select
					value={algorithm}
					onChange={(e) => setAlgorithm(e.target.value)}
					disabled={isRunning}
					className={`p-2 rounded ${
						isDarkMode ? "bg-gray-800 text-white" : "bg-white text-black"
					}`}>
					<option value="BFS">Breadth First Search (BFS)</option>
					<option value="DFS">Depth First Search (DFS)</option>
				</select>
			</div>

			<div className="flex items-center gap-2">
				<label className="font-medium">Speed:</label>
				<input
					type="range"
					min="100"
					max="2000"
					step="100"
					value={speed}
					onChange={(e) => setSpeed(parseInt(e.target.value))}
					className="w-32"
				/>
				<span>{speed}ms</span>
			</div>

			<div className="flex gap-2">
				<button
					onClick={handleToggleRunning}
					className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:bg-gray-400">
					{isRunning ? "Stop" : "Start"}
				</button>
				<button
					onClick={() => setReset(true)}
					disabled={isRunning}
					className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400">
					Reset
				</button>
			</div>

			<div className="flex gap-2">
				<button
					onClick={() => setIsDarkMode(!isDarkMode)}
					className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600">
					{isDarkMode ? "Light Mode" : "Dark Mode"}
				</button>
				<button
					onClick={() => setIsEditMode(!isEditMode)}
					disabled={isRunning}
					className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:bg-gray-400">
					{isEditMode ? "Exit Edit" : "Edit Graph"}
				</button>
			</div>
		</div>
	);
};

export default Controls;
