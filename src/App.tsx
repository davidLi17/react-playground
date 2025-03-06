import ReactPlayground from "./ReactPlayground/index";
import "./App.scss";
import { PlaygroundProvider } from "./ReactPlayground/PlaygroundContext";
import { ThemeProvider } from "./ReactPlayground/ThemeContext";

function App() {
	return (
		<ThemeProvider>
			<PlaygroundProvider>
				<ReactPlayground />
			</PlaygroundProvider>
		</ThemeProvider>
	);
}

export default App;
