import React from "react";
import { Node, NodeToAdd } from "../types";

interface NodeFormProps {
	nodeToAdd: NodeToAdd;
	setNodeToAdd: (value: NodeToAdd) => void;
	setNodes: (value: Node[]) => void;
	nodes: Node[];
	setShowNodeForm: (value: boolean) => void;
	isDarkMode: boolean;
}

const NodeForm = ({
	nodeToAdd,
	setNodeToAdd,
	setNodes,
	nodes,
	setShowNodeForm,
	isDarkMode,
}) => {
	const handleAddNode = () => {
		if (nodeToAdd.label.trim() === "") return;

		const newNode = {
			id: nodes.length,
			label: nodeToAdd.label,
			x: parseInt(nodeToAdd.x),
			y: parseInt(nodeToAdd.y),
		};

		setNodes([...nodes, newNode]);
		setNodeToAdd({ label: "", x: 250, y: 150 });
		setShowNodeForm(false);
	};

	return (
		<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
			<div
				className={`${
					isDarkMode ? "bg-gray-800 text-white" : "bg-white text-gray-800"
				} p-6 rounded-lg w-80`}>
				<h3 className="text-lg font-bold mb-4">Add New Node</h3>
				<div className="mb-4">
					<label className="block mb-1">Label:</label>
					<input
						type="text"
						value={nodeToAdd.label}
						onChange={(e) =>
							setNodeToAdd({ ...nodeToAdd, label: e.target.value })
						}
						className={`w-full p-2 border rounded ${
							isDarkMode
								? "bg-gray-700 border-gray-600"
								: "bg-white border-gray-300"
						}`}
					/>
				</div>
				<div className="mb-4">
					<label className="block mb-1">X Coordinate:</label>
					<input
						type="number"
						value={nodeToAdd.x}
						onChange={(e) => setNodeToAdd({ ...nodeToAdd, x: e.target.value })}
						className={`w-full p-2 border rounded ${
							isDarkMode
								? "bg-gray-700 border-gray-600"
								: "bg-white border-gray-300"
						}`}
					/>
				</div>
				<div className="mb-4">
					<label className="block mb-1">Y Coordinate:</label>
					<input
						type="number"
						value={nodeToAdd.y}
						onChange={(e) => setNodeToAdd({ ...nodeToAdd, y: e.target.value })}
						className={`w-full p-2 border rounded ${
							isDarkMode
								? "bg-gray-700 border-gray-600"
								: "bg-white border-gray-300"
						}`}
					/>
				</div>
				<div className="flex justify-between">
					<button
						onClick={handleAddNode}
						className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600">
						Add
					</button>
					<button
						onClick={() => setShowNodeForm(false)}
						className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600">
						Cancel
					</button>
				</div>
			</div>
		</div>
	);
};

export default NodeForm;
