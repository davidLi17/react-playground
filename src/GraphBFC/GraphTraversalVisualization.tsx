import React, { useState, useEffect } from "react";
import Controls from "./components/Controls.tsx";
import EditControls from "./components/EditControls.tsx";
import GraphCanvas from "./components/GraphCanvas.tsx";
import InfoPanel from "./components/InfoPanel.tsx";
import NodeForm from "./components/NodeForm.tsx";
import EdgeForm from "./components/EdgeForm.tsx";
import { bfsSteps, dfsSteps } from "../utils/graphAlgorithms.ts";
import { Node, Edge, NodeToAdd, EdgeToAdd } from "./types";

const GraphTraversalVisualization = () => {
	const [algorithm, setAlgorithm] = useState("BFS");
	const [isRunning, setIsRunning] = useState(false);
	const [speed, setSpeed] = useState(1000);
	const [reset, setReset] = useState(false);
	const [visitedNodes, setVisitedNodes] = useState<boolean[]>([]);
	const [currentQueue, setCurrentQueue] = useState<string[]>([]);
	const [currentNode, setCurrentNode] = useState<string | number | null>(null);
	const [step, setStep] = useState(0);
	const [stepDescription, setStepDescription] = useState("");
	const [isDarkMode, setIsDarkMode] = useState(false);
	const [isEditMode, setIsEditMode] = useState(false);
	const [selectedNode, setSelectedNode] = useState(null);
	const [startNode, setStartNode] = useState(0);
	const [showNodeForm, setShowNodeForm] = useState(false);
	const [showEdgeForm, setShowEdgeForm] = useState(false);
	const [nodeToAdd, setNodeToAdd] = useState({ label: "", x: 250, y: 150 });
	const [edgeToAdd, setEdgeToAdd] = useState({ from: "", to: "" });
	const [draggedNode, setDraggedNode] = useState(null);
	const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

	const [nodes, setNodes] = useState<Node[]>([
		{ id: 0, label: "A", x: 250, y: 50 },
		{ id: 1, label: "B", x: 150, y: 150 },
		{ id: 2, label: "C", x: 350, y: 150 },
		{ id: 3, label: "D", x: 100, y: 250 },
		{ id: 4, label: "E", x: 200, y: 250 },
		{ id: 5, label: "F", x: 300, y: 250 },
		{ id: 6, label: "G", x: 400, y: 250 },
	]);

	const [edges, setEdges] = useState<Edge[]>([
		{ id: 0, from: 0, to: 1 },
		{ id: 1, from: 0, to: 2 },
		{ id: 2, from: 1, to: 3 },
		{ id: 3, from: 1, to: 4 },
		{ id: 4, from: 2, to: 5 },
		{ id: 5, from: 2, to: 6 },
	]);

	useEffect(() => {
		if (isRunning) {
			const steps =
				algorithm === "BFS"
					? bfsSteps(nodes, edges, startNode)
					: dfsSteps(nodes, edges, startNode);

			if (steps.length === 0) {
				setStepDescription("No nodes to visit, please check graph structure");
				setIsRunning(false);
				return;
			}

			if (step < steps.length) {
				const timer = setTimeout(() => {
					const currentStep = steps[step];
					setVisitedNodes(currentStep.visited as boolean[]);
					setCurrentQueue(
						currentStep.queue.map((id) => nodes[id]?.label || String(id))
					);
					setCurrentNode(
						currentStep.current !== null
							? nodes[currentStep.current]?.label || currentStep.current
							: null
					);
					setStepDescription(currentStep.description);
					setStep(step + 1);
				}, speed);

				return () => clearTimeout(timer);
			} else {
				setIsRunning(false);
			}
		}
	}, [isRunning, step, algorithm, speed, nodes, edges, startNode]);

	useEffect(() => {
		if (reset) {
			setVisitedNodes([]);
			setCurrentQueue([]);
			setCurrentNode(null);
			setStep(0);
			setStepDescription("");
			setReset(false);
		}
	}, [reset]);

	return (
		<div
			className={`min-h-screen font-sans p-5 flex items-center justify-center ${
				isDarkMode ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-800"
			}`}>
			<div className="max-w-5xl mx-auto">
				<Controls
					algorithm={algorithm}
					setAlgorithm={setAlgorithm}
					speed={speed}
					setSpeed={setSpeed}
					isRunning={isRunning}
					setIsRunning={setIsRunning}
					setReset={setReset}
					isDarkMode={isDarkMode}
					setIsDarkMode={setIsDarkMode}
					isEditMode={isEditMode}
					setIsEditMode={setIsEditMode}
				/>

				{isEditMode && (
					<EditControls
						setShowNodeForm={setShowNodeForm}
						setShowEdgeForm={setShowEdgeForm}
						selectedNode={selectedNode}
						setNodes={setNodes}
						setEdges={setEdges}
						nodes={nodes}
						edges={edges}
						startNode={startNode}
						setStartNode={setStartNode}
						setSelectedNode={setSelectedNode}
						setReset={setReset}
					/>
				)}

				<GraphCanvas
					nodes={nodes}
					edges={edges}
					visitedNodes={visitedNodes}
					selectedNode={selectedNode}
					startNode={startNode}
					isEditMode={isEditMode}
					isRunning={isRunning}
					setNodes={setNodes}
					setEdges={setEdges}
					//@ts-ignore
					setSelectedNode={setSelectedNode}
					//@ts-ignore
					setStartNode={setStartNode}
					setReset={setReset}
					draggedNode={draggedNode}
					//@ts-ignore
					setDraggedNode={setDraggedNode}
					dragOffset={dragOffset}
					setDragOffset={setDragOffset}
				/>

				<InfoPanel
					algorithm={algorithm}
					startNode={startNode}
					nodes={nodes}
					step={step}
					currentNode={currentNode}
					currentQueue={currentQueue}
					stepDescription={stepDescription}
					isEditMode={isEditMode}
					isDarkMode={isDarkMode}
				/>

				{showNodeForm && (
					<NodeForm
						nodeToAdd={nodeToAdd}
						setNodeToAdd={setNodeToAdd}
						setNodes={setNodes}
						nodes={nodes}
						setShowNodeForm={setShowNodeForm}
						isDarkMode={isDarkMode}
					/>
				)}

				{showEdgeForm && (
					<EdgeForm
						edgeToAdd={edgeToAdd}
						setEdgeToAdd={setEdgeToAdd}
						setEdges={setEdges}
						nodes={nodes}
						edges={edges}
						setShowEdgeForm={setShowEdgeForm}
						isDarkMode={isDarkMode}
					/>
				)}
			</div>
		</div>
	);
};

export default GraphTraversalVisualization;
