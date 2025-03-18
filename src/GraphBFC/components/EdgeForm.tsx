import React from "react";
import { Node, Edge, EdgeToAdd } from "../types";

interface EdgeFormProps {
	edgeToAdd: EdgeToAdd;
	setEdgeToAdd: (value: EdgeToAdd) => void;
	setEdges: (value: Edge[]) => void;
	nodes: Node[];
	edges: Edge[];
	setShowEdgeForm: (value: boolean) => void;
	isDarkMode: boolean;
}

const EdgeForm = ({
	edgeToAdd,
	setEdgeToAdd,
	setEdges,
	nodes,
	edges,
	setShowEdgeForm,
	isDarkMode,
}) => {
	const handleAddEdge = () => {
		if (edgeToAdd.from === "" || edgeToAdd.to === "") return;

		const fromId = parseInt(edgeToAdd.from);
		const toId = parseInt(edgeToAdd.to);

		const edgeExists = edges.some(
			(edge) => edge.from === fromId && edge.to === toId
		);

		if (!edgeExists) {
			const newEdge = {
				id: edges.length,
				from: fromId,
				to: toId,
			};
			setEdges([...edges, newEdge]);
		}

		setEdgeToAdd({ from: "", to: "" });
		setShowEdgeForm(false);
	};

	return (
		<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
			<div
				className={`${
					isDarkMode ? "bg-gray-800 text-white" : "bg-white text-gray-800"
				} p-6 rounded-lg w-80`}>
				<h3 className="text-lg font-bold mb-4">Add New Edge</h3>
				<div className="mb-4">
					<label className="block mb-1">From Node:</label>
					<select
						value={edgeToAdd.from}
						onChange={(e) =>
							setEdgeToAdd({ ...edgeToAdd, from: e.target.value })
						}
						className={`w-full p-2 border rounded ${
							isDarkMode
								? "bg-gray-700 border-gray-600"
								: "bg-white border-gray-300"
						}`}>
						<option value="">Select Node</option>
						{nodes.map((node) => (
							<option
								key={`from-${node.id}`}
								value={node.id}>
								{node.label} (ID: {node.id})
							</option>
						))}
					</select>
				</div>
				<div className="mb-4">
					<label className="block mb-1">To Node:</label>
					<select
						value={edgeToAdd.to}
						onChange={(e) => setEdgeToAdd({ ...edgeToAdd, to: e.target.value })}
						className={`w-full p-2 border rounded ${
							isDarkMode
								? "bg-gray-700 border-gray-600"
								: "bg-white border-gray-300"
						}`}>
						<option value="">Select Node</option>
						{nodes.map((node) => (
							<option
								key={`to-${node.id}`}
								value={node.id}>
								{node.label} (ID: {node.id})
							</option>
						))}
					</select>
				</div>
				<div className="flex justify-between">
					<button
						onClick={handleAddEdge}
						className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600">
						Add
					</button>
					<button
						onClick={() => setShowEdgeForm(false)}
						className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600">
						Cancel
					</button>
				</div>
			</div>
		</div>
	);
};

export default EdgeForm;
