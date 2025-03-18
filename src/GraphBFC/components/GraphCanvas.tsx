import React, { useEffect, MouseEvent } from "react";

// 定义节点类型
interface Node {
	id: number;
	x: number;
	y: number;
	label: string;
}

// 定义边类型
interface Edge {
	id: number;
	from: number;
	to: number;
}

// 定义偏移量类型
interface Offset {
	x: number;
	y: number;
}

// 定义组件属性类型
interface GraphCanvasProps {
	nodes: Node[];
	edges: Edge[];
	visitedNodes: Record<number, boolean>;
	selectedNode: number | null;
	startNode: number | null;
	isEditMode: boolean;
	isRunning: boolean;
	setNodes: (nodes: Node[]) => void;
	setEdges: (edges: Edge[]) => void;
	setSelectedNode: (nodeId: number | null) => void;
	setStartNode: (nodeId: number | null) => void;
	setReset: (reset: boolean) => void;
	draggedNode: number | null;
	setDraggedNode: (nodeId: number | null) => void;
	dragOffset: Offset;
	setDragOffset: (offset: Offset) => void;
}

const GraphCanvas: React.FC<GraphCanvasProps> = ({
	nodes,
	edges,
	visitedNodes,
	selectedNode,
	startNode,
	isEditMode,
	isRunning,
	setNodes,
	setEdges,
	setSelectedNode,
	setStartNode,
	setReset,
	draggedNode,
	setDraggedNode,
	dragOffset,
	setDragOffset,
}) => {
	const handleNodeClick = (node: Node) => {
		if (isEditMode) {
			setSelectedNode(node.id === selectedNode ? null : node.id);
		} else {
			setStartNode(node.id);
			setReset(true);
		}
	};

	const handleNodeDragStart = (e: MouseEvent<SVGGElement>, node: Node) => {
		if (!isEditMode || isRunning) return;
		const svg = (e.target as Element).closest("svg") as SVGSVGElement;
		const pt = svg.createSVGPoint();
		pt.x = e.clientX;
		pt.y = e.clientY;
		const svgP = pt.matrixTransform(svg.getScreenCTM()!.inverse());

		setDraggedNode(node.id);
		setDragOffset({
			x: node.x - svgP.x,
			y: node.y - svgP.y,
		});
	};

	const handleMouseMove = (e: MouseEvent) => {
		if (draggedNode === null) return;
		const svg = document.querySelector("svg") as SVGSVGElement;
		const pt = svg.createSVGPoint();
		pt.x = e.clientX;
		pt.y = e.clientY;
		const svgP = pt.matrixTransform(svg.getScreenCTM()!.inverse());

		setNodes(
			nodes.map((node) =>
				node.id === draggedNode
					? { ...node, x: svgP.x + dragOffset.x, y: svgP.y + dragOffset.y }
					: node
			)
		);
	};

	const handleMouseUp = () => {
		setDraggedNode(null);
	};

	useEffect(() => {
		if (draggedNode !== null) {
			document.addEventListener("mousemove", handleMouseMove as any);
			document.addEventListener("mouseup", handleMouseUp);
		}
		return () => {
			document.removeEventListener("mousemove", handleMouseMove as any);
			document.removeEventListener("mouseup", handleMouseUp);
		};
	}, [draggedNode]);

	const handleDeleteEdge = (edgeId: number) => {
		const newEdges = edges
			.filter((edge) => edge.id !== edgeId)
			.map((edge, index) => ({
				...edge,
				id: index,
			}));
		setEdges(newEdges);
	};

	return (
		<div className="bg-white dark:bg-gray-800 rounded-lg p-2.5 mb-5 shadow-md">
			<svg
				width="100%"
				height="400">
				{edges.map((edge) => {
					const fromNode = nodes.find((n) => n.id === edge.from);
					const toNode = nodes.find((n) => n.id === edge.to);
					if (!fromNode || !toNode) return null;

					const angle =
						(Math.atan2(toNode.y - fromNode.y, toNode.x - fromNode.x) * 180) /
						Math.PI;

					return (
						<g key={`edge-${edge.id}`}>
							<line
								x1={fromNode.x}
								y1={fromNode.y}
								x2={toNode.x}
								y2={toNode.y}
								className={`stroke-gray-400 stroke-2 ${
									isEditMode
										? "cursor-pointer hover:stroke-red-500 hover:stroke-3"
										: ""
								}`}
								onClick={() => isEditMode && handleDeleteEdge(edge.id)}
							/>
							<polygon
								points="0,-5 10,0 0,5"
								className="fill-gray-400"
								transform={`translate(${toNode.x},${toNode.y}) rotate(${angle})`}
							/>
						</g>
					);
				})}

				{nodes.map((node) => (
					<g
						key={`node-${node.id}`}
						transform={`translate(${node.x},${node.y})`}
						className={`cursor-pointer ${
							node.id === selectedNode ? "selected" : ""
						} ${node.id === startNode ? "start-node" : ""}`}
						onClick={() => handleNodeClick(node)}
						onMouseDown={(e) => handleNodeDragStart(e, node)}>
						<circle
							r="20"
							className={`fill-gray-200 stroke-gray-600 stroke-2 ${
								visitedNodes[node.id] ? "fill-green-400" : ""
							} ${node.id === selectedNode ? "stroke-blue-500 stroke-3" : ""} ${
								node.id === startNode ? "stroke-orange-500 stroke-3" : ""
							}`}
						/>
						<text
							dy=".3em"
							textAnchor="middle"
							className="fill-gray-800 dark:fill-white text-sm select-none">
							{node.label}
						</text>
					</g>
				))}
			</svg>
		</div>
	);
};

export default GraphCanvas;
