import { RouterProvider } from "react-router-dom";
import "./App.scss";
import { PlaygroundProvider } from "./ReactPlayground/PlaygroundContext";
import { ThemeProvider } from "./ReactPlayground/ThemeContext";
import router from "./router";

function App() {
	return (
		<ThemeProvider>
			<PlaygroundProvider>
				<RouterProvider router={router} />
			</PlaygroundProvider>
		</ThemeProvider>
	);
}

export default App;
