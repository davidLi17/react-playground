import React from "react";
import { Node } from "../types";

interface InfoPanelProps {
	algorithm: string;
	startNode: number;
	nodes: Node[];
	step: number;
	currentNode: string | null;
	currentQueue: string[];
	stepDescription: string;
	isEditMode: boolean;
	isDarkMode: boolean;
}

const InfoPanel = ({
	algorithm,
	startNode,
	nodes,
	step,
	currentNode,
	currentQueue,
	stepDescription,
	isEditMode,
	isDarkMode,
}) => {
	return (
		<div className="flex gap-5 flex-col md:flex-row">
			<div
				className={`flex-1 ${
					isDarkMode ? "bg-gray-800" : "bg-white"
				} rounded-lg p-4 shadow-md`}>
				<h3 className="text-lg font-bold mb-2">
					{algorithm === "BFS" ? "Breadth First Search" : "Depth First Search"}
				</h3>
				<p>Start Node: {nodes[startNode]?.label || startNode}</p>
				<p>Current Step: {step}</p>
				<p>Current Node: {currentNode || "None"}</p>
				<p>
					{algorithm === "BFS" ? "Queue" : "Stack"}: [{currentQueue.join(", ")}]
				</p>
				<p>Description: {stepDescription}</p>
			</div>

			<div
				className={`flex-1 ${
					isDarkMode ? "bg-gray-800" : "bg-white"
				} rounded-lg p-4 shadow-md`}>
				<h3 className="text-lg font-bold mb-2">Legend</h3>
				<div className="flex items-center mb-2">
					<div className="w-5 h-5 rounded-full border-2 border-orange-500 mr-2"></div>
					<span>Start Node</span>
				</div>
				<div className="flex items-center mb-2">
					<div className="w-5 h-5 rounded-full bg-green-400 mr-2"></div>
					<span>Visited Node</span>
				</div>
				{isEditMode && (
					<div className="flex items-center mb-2">
						<div className="w-5 h-5 rounded-full border-2 border-blue-500 mr-2"></div>
						<span>Selected Node</span>
					</div>
				)}
			</div>
		</div>
	);
};

export default InfoPanel;
