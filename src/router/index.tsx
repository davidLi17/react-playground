import { createBrowserRouter, Outlet } from "react-router-dom";
import type { RouteObject, DOMRouterOpts } from "react-router-dom";
import ExamMonitoring from "@/CameraRecoder/index";
import ReactPlayground from "@/ReactPlayground/index";
import NotFound from "./components/NotFound";
import Navigation from "./components/Navigation";
const router = createBrowserRouter([
	{
		path: "/",
		element: (
			<>
				<Navigation />
				<Outlet />
			</>
		),
		children: [
			{
				path: "/",
				element: <ReactPlayground />,
			},
			{
				path: "/camera",
				element: <ExamMonitoring />,
			},
		],
		// 设置404路由
		errorElement: <NotFound />,
	},
]);

export default router;
