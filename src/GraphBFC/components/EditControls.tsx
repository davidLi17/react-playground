import React from "react";
import { Node, Edge } from "../types";

interface EditControlsProps {
	setShowNodeForm: (value: boolean) => void;
	setShowEdgeForm: (value: boolean) => void;
	selectedNode: number | null;
	setNodes: (value: Node[]) => void;
	setEdges: (value: Edge[]) => void;
	nodes: Node[];
	edges: Edge[];
	startNode: number;
	setStartNode: (value: number) => void;
	setSelectedNode: (value: number | null) => void;
	setReset: (value: boolean) => void;
}

const EditControls = ({
	setShowNodeForm,
	setShowEdgeForm,
	selectedNode,
	setNodes,
	setEdges,
	nodes,
	edges,
	startNode,
	setStartNode,
	setSelectedNode,
	setReset,
}) => {
	const handleDeleteNode = () => {
		if (selectedNode === null) return;

		const newNodes = nodes.filter((node) => node.id !== selectedNode);
		const newEdges = edges.filter(
			(edge) => edge.from !== selectedNode && edge.to !== selectedNode
		);

		const reindexedNodes = newNodes.map((node, index) => ({
			...node,
			id: index,
		}));

		const nodeIdMap = {};
		nodes.forEach((node, index) => {
			if (node.id !== selectedNode) {
				const newIndex = index > selectedNode ? index - 1 : index;
				nodeIdMap[node.id] = newIndex;
			}
		});

		const reindexedEdges = newEdges
			.map((edge) => ({
				...edge,
				from: nodeIdMap[edge.from],
				to: nodeIdMap[edge.to],
			}))
			.map((edge, index) => ({
				...edge,
				id: index,
			}));

		setNodes(reindexedNodes);
		setEdges(reindexedEdges);
		setSelectedNode(null);
		setReset(true);

		if (selectedNode === startNode) {
			setStartNode(0);
		} else if (startNode > selectedNode) {
			setStartNode(startNode - 1);
		}
	};

	const handleClearGraph = () => {
		setNodes([]);
		setEdges([]);
		setSelectedNode(null);
		setStartNode(0);
		setReset(true);
	};

	const handleResetGraph = () => {
		setNodes([
			{ id: 0, label: "A", x: 250, y: 50 },
			{ id: 1, label: "B", x: 150, y: 150 },
			{ id: 2, label: "C", x: 350, y: 150 },
			{ id: 3, label: "D", x: 100, y: 250 },
			{ id: 4, label: "E", x: 200, y: 250 },
			{ id: 5, label: "F", x: 300, y: 250 },
			{ id: 6, label: "G", x: 400, y: 250 },
		]);
		setEdges([
			{ id: 0, from: 0, to: 1 },
			{ id: 1, from: 0, to: 2 },
			{ id: 2, from: 1, to: 3 },
			{ id: 3, from: 1, to: 4 },
			{ id: 4, from: 2, to: 5 },
			{ id: 5, from: 2, to: 6 },
		]);
		setSelectedNode(null);
		setStartNode(0);
		setReset(true);
	};

	return (
		<div className="flex gap-2 mb-5 flex-wrap">
			<button
				onClick={() => setShowNodeForm(true)}
				className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
				Add Node
			</button>
			<button
				onClick={() => setShowEdgeForm(true)}
				className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
				Add Edge
			</button>
			<button
				onClick={handleDeleteNode}
				disabled={selectedNode === null}
				className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:bg-gray-400">
				Delete Node
			</button>
			<button
				onClick={handleClearGraph}
				className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600">
				Clear Graph
			</button>
			<button
				onClick={handleResetGraph}
				className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600">
				Reset Graph
			</button>
		</div>
	);
};

export default EditControls;
