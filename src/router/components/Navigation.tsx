import React from "react";
import { NavLink } from "react-router-dom";

const Navigation: React.FC = () => {
	return (
		<nav className="bg-slate-800 text-white p-6 shadow-lg">
			<div className="container mx-auto flex justify-between items-center">
				<div className="text-2xl font-bold tracking-wide hover:text-slate-300 transition-colors duration-300">
					Navigation
				</div>
				<div className="flex gap-6">
					<NavLink
						to="/"
						className={({ isActive }) =>
							`px-6 py-3 rounded-lg font-medium transition-all duration-300 transform hover:scale-105 ${
								isActive ? "bg-slate-700 shadow-md" : "hover:bg-slate-700/70"
							}`
						}>
						在线React游乐场
					</NavLink>
					<NavLink
						to="/camera"
						className={({ isActive }) =>
							`px-6 py-3 rounded-lg font-medium transition-all duration-300 transform hover:scale-105 ${
								isActive ? "bg-slate-700 shadow-md" : "hover:bg-slate-700/70"
							}`
						}>
						在线视频和网页录屏
					</NavLink>
					<NavLink
						to="/graph"
						className={({ isActive }) =>
							`px-6 py-3 rounded-lg font-medium transition-all duration-300 transform hover:scale-105 ${
								isActive ? "bg-slate-700 shadow-md" : "hover:bg-slate-700/70"
							}`
						}>
						图解DFS和BFS
					</NavLink>
				</div>
			</div>
		</nav>
	);
};

export default Navigation;
